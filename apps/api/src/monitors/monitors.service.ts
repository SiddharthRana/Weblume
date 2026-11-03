import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import {
  compareReports,
  COMPARABLE_SCAN_STATUSES,
  monitorFrequencyAllowed,
  SCAN_FAILURE_MESSAGES,
  type MonitorAlert,
  type MonitorFrequency,
  type ScanFailureCode,
  type ScanSummaryDto,
} from '@weblume/shared';
import type { AuthUser } from '../auth/auth.types';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { scans, scheduledScans, type ScheduledScanRow } from '../database/schema';
import { EMAIL_SENDER, type EmailSender } from '../email/email';
import { EntitlementService, type ResolvedPlan } from '../entitlements/entitlement.service';
import { ERROR_REPORTER, type ErrorReporter } from '../observability/error-reporter';
import { MetricsService } from '../observability/metrics.service';
import { ScanHooks } from '../scans/scan-hooks';
import { SCAN_QUEUE, type ScanQueue } from '../scans/scan-queue';
import { ApiError } from '../scans/scans.errors';
import { ScansService, toSummary } from '../scans/scans.service';
import {
  DEFAULT_SCORE_THRESHOLD,
  NOTIFY_FAILURES,
  renderChangeDigest,
  renderFailureNotice,
  shouldNotify,
  summarize,
  type DigestLinks,
  type RenderedEmail,
} from './digest';

const INTERVAL_MS: Record<MonitorFrequency, number> = {
  daily: 86_400_000,
  weekly: 7 * 86_400_000,
  monthly: 30 * 86_400_000,
};
/** Due monitors started per tick; the rest wait for the next tick. */
export const TICK_BATCH = 50;

export type SkipReason = 'plan' | 'plan_limit' | 'account_deleted' | 'previous_run_active';

export interface MonitorView {
  id: string;
  targetUrl: string;
  normalizedUrl: string;
  frequency: MonitorFrequency;
  alert: MonitorAlert;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastDigestAt: string | null;
  lastSkipReason: string | null;
  lastScan: ScanSummaryDto | null;
  createdAt: string;
}

export interface MonitorList {
  items: MonitorView[];
  limit: number;
  fastestFrequency: MonitorFrequency | null;
}

export interface TickResult {
  started: number;
  skipped: number;
}

@Injectable()
export class MonitorsService implements OnModuleInit {
  private readonly logger = new Logger(MonitorsService.name);
  private readonly linkSecret: string;

  constructor(
    private readonly database: Database,
    private readonly scansService: ScansService,
    private readonly entitlements: EntitlementService,
    private readonly hooks: ScanHooks,
    private readonly metrics: MetricsService,
    @Inject(SCAN_QUEUE) private readonly queue: ScanQueue,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(ERROR_REPORTER) private readonly reporter: ErrorReporter,
    @Inject(ENV) private readonly env: Env,
  ) {
    // Without a configured secret (development only), pause links work until the process restarts.
    this.linkSecret = env.MONITOR_LINK_SECRET ?? randomBytes(32).toString('hex');
  }

  onModuleInit(): void {
    this.hooks.onFinished((scanId) => this.onScanFinished(scanId));
  }

  // ---------------------------------------------------------------------------
  // Owner actions
  // ---------------------------------------------------------------------------

  async list(user: AuthUser): Promise<MonitorList> {
    const resolved = await this.entitlements.forUser(user.id);
    const rows = await this.database.db
      .select()
      .from(scheduledScans)
      .where(eq(scheduledScans.userId, user.id))
      .orderBy(asc(scheduledScans.createdAt));
    const lastIds = rows.map((r) => r.lastScanId).filter((id): id is string => !!id);
    const last = lastIds.length
      ? await this.database.db.select().from(scans).where(inArray(scans.id, lastIds))
      : [];
    const byId = new Map(last.map((s) => [s.id, toSummary(s)]));
    return {
      items: rows.map((r) => toView(r, r.lastScanId ? (byId.get(r.lastScanId) ?? null) : null)),
      limit: resolved.entitlements.monitoredSites,
      fastestFrequency: resolved.entitlements.monitorFrequency,
    };
  }

  async create(
    user: AuthUser,
    input: { url: string; frequency?: MonitorFrequency; alert?: MonitorAlert },
  ): Promise<MonitorView> {
    const resolved = await this.entitlements.forUser(user.id);
    const ent = resolved.entitlements;
    if (ent.monitoredSites <= 0 || !ent.monitorFrequency) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'upgrade_required',
        'Create a free account to monitor a site.',
        { feature: 'monitoring' },
      );
    }
    const frequency = input.frequency ?? ent.monitorFrequency;
    this.assertFrequency(resolved, frequency);
    const normalizedUrl = this.scansService.normalizeTarget(input.url);

    const db = this.database.db;
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(scheduledScans)
      .where(eq(scheduledScans.userId, user.id));
    if (n >= ent.monitoredSites) throw limitError(resolved);

    const [existing] = await db
      .select({ id: scheduledScans.id })
      .from(scheduledScans)
      .where(
        and(eq(scheduledScans.userId, user.id), eq(scheduledScans.normalizedUrl, normalizedUrl)),
      )
      .limit(1);
    if (existing) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'already_monitored',
        'You’re already monitoring this site.',
        { monitorId: existing.id },
      );
    }

    // Start from the most recent finished scan of this address if there is one, so the first
    // scheduled run already has something to compare with. Otherwise run (almost) right away.
    const [recent] = await db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.userId, user.id),
          eq(scans.normalizedUrl, normalizedUrl),
          inArray(scans.status, [...COMPARABLE_SCAN_STATUSES]),
        ),
      )
      .orderBy(desc(scans.createdAt))
      .limit(1);
    const now = Date.now();
    const nextRunAt = recent
      ? new Date(Math.max(now, recent.createdAt.getTime() + INTERVAL_MS[frequency]))
      : new Date(now);

    const [row] = await db
      .insert(scheduledScans)
      .values({
        userId: user.id,
        targetUrl: input.url.trim().slice(0, 2048),
        normalizedUrl,
        frequency,
        alert: input.alert ?? 'any_change',
        scoreDropThreshold: DEFAULT_SCORE_THRESHOLD,
        nextRunAt,
        lastScanId: recent?.id ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'already_monitored',
        'You’re already monitoring this site.',
      );
    }
    return toView(row, recent ? toSummary(recent) : null);
  }

  async update(
    user: AuthUser,
    id: string,
    patch: { enabled?: boolean; frequency?: MonitorFrequency; alert?: MonitorAlert },
  ): Promise<MonitorView> {
    const row = await this.findOwned(user, id);
    const resolved = await this.entitlements.forUser(user.id);
    const set: Partial<ScheduledScanRow> = {};
    if (patch.frequency && patch.frequency !== row.frequency) {
      this.assertFrequency(resolved, patch.frequency);
      set.frequency = patch.frequency;
      // Keep the next run within one interval of the new frequency.
      const base = row.lastRunAt?.getTime() ?? Date.now();
      set.nextRunAt = new Date(Math.max(Date.now(), base + INTERVAL_MS[patch.frequency]));
    }
    if (patch.alert) set.alert = patch.alert;
    if (patch.enabled !== undefined && patch.enabled !== row.enabled) {
      if (patch.enabled) {
        // A site paused by a downgrade resumes at the fastest frequency the plan now allows.
        const fastest = resolved.entitlements.monitorFrequency;
        if (
          !set.frequency &&
          fastest &&
          !monitorFrequencyAllowed(resolved.entitlements, row.frequency)
        )
          set.frequency = fastest;
        this.assertFrequency(resolved, set.frequency ?? row.frequency);
        const [{ n } = { n: 0 }] = await this.database.db
          .select({ n: count() })
          .from(scheduledScans)
          .where(
            and(
              eq(scheduledScans.userId, user.id),
              eq(scheduledScans.enabled, true),
              ne(scheduledScans.id, row.id),
            ),
          );
        if (n >= resolved.entitlements.monitoredSites) throw limitError(resolved);
        set.lastSkipReason = null;
        if (row.nextRunAt.getTime() < Date.now()) set.nextRunAt = new Date();
      }
      set.enabled = patch.enabled;
    }
    if (!Object.keys(set).length) return this.viewOf(row);
    const [updated] = await this.database.db
      .update(scheduledScans)
      .set(set)
      .where(eq(scheduledScans.id, row.id))
      .returning();
    return this.viewOf(updated!);
  }

  /** Stops monitoring. Scans it already produced stay in the history. */
  async remove(user: AuthUser, id: string): Promise<void> {
    const row = await this.findOwned(user, id);
    await this.database.db.delete(scheduledScans).where(eq(scheduledScans.id, row.id));
  }

  /** The signed "pause monitoring" link from a digest email. Works without signing in. */
  async pauseByToken(token: string): Promise<{ targetUrl: string; alreadyPaused: boolean }> {
    const id = this.verifyPauseToken(token);
    const notFound = new ApiError(
      HttpStatus.NOT_FOUND,
      'not_found',
      'This link doesn’t work any more. The site may no longer be monitored.',
    );
    if (!id) throw notFound;
    const [row] = await this.database.db
      .select()
      .from(scheduledScans)
      .where(eq(scheduledScans.id, id))
      .limit(1);
    if (!row) throw notFound;
    if (row.enabled) {
      await this.database.db
        .update(scheduledScans)
        .set({ enabled: false })
        .where(eq(scheduledScans.id, id));
    }
    return { targetUrl: row.normalizedUrl, alreadyPaused: !row.enabled };
  }

  pauseToken(monitorId: string): string {
    return `${monitorId}.${this.sign(monitorId)}`;
  }

  private verifyPauseToken(token: string): string | null {
    const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/i.exec(token);
    if (!m) return null;
    const expected = Buffer.from(this.sign(m[1]!));
    const given = Buffer.from(m[2]!);
    return expected.length === given.length && timingSafeEqual(expected, given) ? m[1]! : null;
  }

  private sign(monitorId: string): string {
    return createHmac('sha256', this.linkSecret)
      .update(`monitor-pause:${monitorId.toLowerCase()}`)
      .digest('base64url');
  }

  private assertFrequency(resolved: ResolvedPlan, frequency: MonitorFrequency): void {
    if (!monitorFrequencyAllowed(resolved.entitlements, frequency)) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'upgrade_required',
        'Daily monitoring is part of the Starter plan.',
        { feature: 'monitorFrequency' },
      );
    }
  }

  private async findOwned(user: AuthUser, id: string): Promise<ScheduledScanRow> {
    const [row] = await this.database.db
      .select()
      .from(scheduledScans)
      .where(and(eq(scheduledScans.id, id), eq(scheduledScans.userId, user.id)))
      .limit(1);
    if (!row) throw new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'Monitored site not found.');
    return row;
  }

  private async viewOf(row: ScheduledScanRow): Promise<MonitorView> {
    if (!row.lastScanId) return toView(row, null);
    const [s] = await this.database.db
      .select()
      .from(scans)
      .where(eq(scans.id, row.lastScanId))
      .limit(1);
    return toView(row, s ? toSummary(s) : null);
  }

  // ---------------------------------------------------------------------------
  // Scheduler (runs in the worker; see MonitorsScheduler)
  // ---------------------------------------------------------------------------

  /**
   * Starts every due monitor. Each due row is claimed by moving its next_run_at forward in the
   * same statement (SKIP LOCKED), so overlapping ticks or several workers never double-run it.
   * The next run keeps the original time of day unless the worker was down for a whole interval.
   */
  async tick(now = new Date()): Promise<TickResult> {
    const at = now.toISOString();
    const claimed = await this.database.sql<{ id: string }[]>`
      update public.scheduled_scans s
      set next_run_at = case
        when s.next_run_at + i.step > ${at}::timestamptz then s.next_run_at + i.step
        else ${at}::timestamptz + i.step
      end
      from (
        select id,
          case frequency when 'daily' then interval '1 day'
                         when 'weekly' then interval '7 days'
                         else interval '1 month' end as step
        from public.scheduled_scans
        where enabled and next_run_at <= ${at}::timestamptz
        order by next_run_at
        limit ${TICK_BATCH}
        for update skip locked
      ) i
      where s.id = i.id
      returning s.id`;
    let started = 0;
    let skipped = 0;
    for (const { id } of claimed) {
      try {
        if (await this.startRun(id, now)) started++;
        else skipped++;
      } catch (err) {
        skipped++;
        this.logger.error(
          `Monitor ${id} failed to start: ${err instanceof Error ? err.name : 'unknown'}`,
        );
        this.reporter.capture(err, { job: 'monitor-tick', monitorId: id });
      }
    }
    if (started) {
      this.metrics.inc(
        'weblume_monitor_scans_started_total',
        {},
        started,
        'Scheduled (monitoring) scans queued by this instance',
      );
    }
    return { started, skipped };
  }

  /** Queues the scan for one claimed monitor. Returns false when the run was skipped. */
  private async startRun(id: string, now: Date): Promise<boolean> {
    const db = this.database.db;
    const [row] = await db.select().from(scheduledScans).where(eq(scheduledScans.id, id)).limit(1);
    if (!row || !row.enabled) return false;

    let resolved: ResolvedPlan;
    try {
      resolved = await this.entitlements.forUser(row.userId, now);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.getResponse() as { code?: string }).code === 'account_deleted'
      ) {
        await this.skip(row, 'account_deleted', true);
        return false;
      }
      throw err;
    }
    const ent = resolved.entitlements;
    if (ent.monitoredSites <= 0 || !ent.monitorFrequency) {
      await this.skip(row, 'plan', true);
      return false;
    }
    // After a downgrade, only the oldest sites within the new limit keep running.
    const enabledIds = await db
      .select({ id: scheduledScans.id })
      .from(scheduledScans)
      .where(and(eq(scheduledScans.userId, row.userId), eq(scheduledScans.enabled, true)))
      .orderBy(asc(scheduledScans.createdAt), asc(scheduledScans.id));
    if (enabledIds.findIndex((r) => r.id === row.id) >= ent.monitoredSites) {
      await this.skip(row, 'plan_limit', true);
      return false;
    }
    let frequency = row.frequency;
    if (!monitorFrequencyAllowed(ent, frequency)) {
      frequency = ent.monitorFrequency;
      await db
        .update(scheduledScans)
        .set({
          frequency,
          nextRunAt: new Date(now.getTime() + INTERVAL_MS[frequency]),
        })
        .where(eq(scheduledScans.id, row.id));
    }

    const [active] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(and(eq(scans.scheduledScanId, row.id), inArray(scans.status, ['queued', 'running'])))
      .limit(1);
    if (active) {
      await this.skip(row, 'previous_run_active', false);
      return false;
    }

    // Scheduled scans don't use up the plan's scan quota (docs/DECISIONS.md, "Monitoring").
    const [scan] = await db
      .insert(scans)
      .values({
        userId: row.userId,
        targetUrl: row.targetUrl,
        normalizedUrl: row.normalizedUrl,
        countsTowardQuota: false,
        scheduledScanId: row.id,
        expiresAt: this.entitlements.expiresAt(resolved, now),
      })
      .returning({ id: scans.id });
    await db
      .update(scheduledScans)
      .set({ lastRunAt: now, lastScanId: scan!.id, lastSkipReason: null })
      .where(eq(scheduledScans.id, row.id));
    await this.queue.enqueue(scan!.id);
    return true;
  }

  private async skip(row: ScheduledScanRow, reason: SkipReason, pause: boolean): Promise<void> {
    await this.database.db
      .update(scheduledScans)
      .set({ lastSkipReason: reason, ...(pause ? { enabled: false } : {}) })
      .where(eq(scheduledScans.id, row.id));
  }

  // ---------------------------------------------------------------------------
  // Digests
  // ---------------------------------------------------------------------------

  /** Called by the scan worker for every finished scan; acts only on scheduled ones. */
  async onScanFinished(scanId: string): Promise<void> {
    const db = this.database.db;
    const [scan] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    if (!scan?.scheduledScanId || !scan.userId) return;
    const [monitor] = await db
      .select()
      .from(scheduledScans)
      .where(eq(scheduledScans.id, scan.scheduledScanId))
      .limit(1);
    if (!monitor || !monitor.enabled || monitor.alert === 'none') return;

    const email = await this.buildEmail(monitor, scanId);
    if (!email) return;
    const to = await this.ownerEmail(monitor.userId);
    if (!to) {
      this.logger.warn(`Monitor ${monitor.id}: owner has no email address; digest skipped`);
      return;
    }
    const pauseUrl = this.links(monitor, scanId, null).pause;
    await this.email.send({
      to,
      ...email,
      headers: { 'List-Unsubscribe': `<${pauseUrl}>` },
    });
    await db
      .update(scheduledScans)
      .set({ lastDigestAt: new Date() })
      .where(eq(scheduledScans.id, monitor.id));
    this.metrics.inc(
      'weblume_monitor_digests_total',
      { delivered: String(this.email.delivers) },
      1,
      'Monitoring change digests produced by this instance',
    );
  }

  /** The email for a finished scheduled scan, or null when nothing is worth telling. */
  async buildEmail(monitor: ScheduledScanRow, scanId: string): Promise<RenderedEmail | null> {
    const db = this.database.db;
    const [scan] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
    if (!scan) return null;

    if (scan.status === 'failed') {
      if (!scan.failureCode || !NOTIFY_FAILURES.has(scan.failureCode)) return null;
      // Only on the first failure in a row, so a site that stays down doesn't email every run.
      const [prev] = await db
        .select({ status: scans.status })
        .from(scans)
        .where(and(eq(scans.scheduledScanId, monitor.id), lt(scans.createdAt, scan.createdAt)))
        .orderBy(desc(scans.createdAt))
        .limit(1);
      if (prev?.status === 'failed') return null;
      return renderFailureNotice(
        scan.normalizedUrl,
        scan.failureMessage ?? SCAN_FAILURE_MESSAGES[scan.failureCode as ScanFailureCode],
        this.links(monitor, scanId, null),
      );
    }

    const [previous] = await db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.userId, scan.userId!),
          eq(scans.normalizedUrl, scan.normalizedUrl),
          inArray(scans.status, [...COMPARABLE_SCAN_STATUSES]),
          lt(scans.createdAt, scan.createdAt),
          sql`${scans.expiresAt} > now()`,
        ),
      )
      .orderBy(desc(scans.createdAt))
      .limit(1);
    if (!previous) return null; // first scan: the baseline, nothing to compare yet

    const [before, after] = await Promise.all([
      this.scansService.buildReport(previous, false),
      this.scansService.buildReport(scan, false),
    ]);
    const result = compareReports(before, after);
    if (!result.ok) return null;
    const summary = summarize(
      result.comparison,
      monitor.scoreDropThreshold ?? DEFAULT_SCORE_THRESHOLD,
    );
    if (!shouldNotify(monitor.alert, summary)) return null;
    const plan = await this.entitlements.forUser(monitor.userId).catch(() => null);
    return renderChangeDigest(
      scan.normalizedUrl,
      summary,
      this.links(monitor, scanId, plan?.entitlements.comparison ? previous.id : null),
    );
  }

  private links(monitor: ScheduledScanRow, scanId: string, baseId: string | null): DigestLinks {
    const site = this.env.PUBLIC_SITE_URL.replace(/\/$/, '');
    return {
      report: `${site}/scan/${scanId}`,
      compare: baseId ? `${site}/compare?base=${baseId}&target=${scanId}` : null,
      manage: `${site}/dashboard#monitoring`,
      pause: `${site}/monitoring/pause?token=${encodeURIComponent(this.pauseToken(monitor.id))}`,
    };
  }

  /** The address the user signed up with (Supabase Auth). The API never stores a copy. */
  private async ownerEmail(userId: string): Promise<string | null> {
    const rows = await this.database.sql<{ email: string | null }[]>`
      select email from auth.users where id = ${userId}`;
    return rows[0]?.email ?? null;
  }
}

function limitError(resolved: ResolvedPlan): ApiError {
  const limit = resolved.entitlements.monitoredSites;
  const message = resolved.plan.paid
    ? `Your ${resolved.plan.name} plan can monitor ${limit} sites. Remove one to add another.`
    : `The ${resolved.plan.name} plan can monitor ${limit} site. Upgrade to Starter to monitor more, daily.`;
  return new ApiError(HttpStatus.FORBIDDEN, 'monitor_limit_reached', message, { limit });
}

function toView(r: ScheduledScanRow, lastScan: ScanSummaryDto | null): MonitorView {
  return {
    id: r.id,
    targetUrl: r.targetUrl,
    normalizedUrl: r.normalizedUrl,
    frequency: r.frequency,
    alert: r.alert,
    enabled: r.enabled,
    nextRunAt: r.nextRunAt.toISOString(),
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    lastDigestAt: r.lastDigestAt?.toISOString() ?? null,
    lastSkipReason: r.lastSkipReason,
    lastScan,
    createdAt: r.createdAt.toISOString(),
  };
}
