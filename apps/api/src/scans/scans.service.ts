import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, inArray, lt, ne, type SQL } from 'drizzle-orm';
import {
  getPlan,
  normalizeUrl,
  SCAN_FAILURE_CODES,
  type PlanId,
  type ScanFailureCode,
  type ScanReportDto,
  type ScanSummaryDto,
} from '@weblume/shared';
import type { AuthUser } from '../auth/auth.types';
import { FeatureFlags } from '../common/feature-flags.service';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { findings, scans, type ScanRow } from '../database/schema';
import { GuardedFetchError, type GuardedHttpClient } from '../scanner/http/guarded-client';
import { composeFindings } from '../scanner/report-composer';
import { GUARDED_CLIENT } from './scan.processor';
import { SCAN_QUEUE, type ScanQueue } from './scan-queue';
import { ApiError } from './scans.errors';
import { TURNSTILE_VERIFIER, type TurnstileVerifier } from './turnstile';

export type Requester = { user: AuthUser } | { guest: { ip: string; turnstileToken?: string } };
export type Viewer = { user?: AuthUser; scanToken?: string };

export const DEDUPE_WINDOW_MS = 10 * 60_000;
const ACTIVE = ['queued', 'running'] as const;

export interface CreateScanResult {
  scan: ScanSummaryDto;
  /** Only for guest scans: the secret needed to view this scan. Returned once. */
  scanToken?: string;
  deduplicated: boolean;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class ScansService {
  private readonly guestSecret: string;

  constructor(
    private readonly database: Database,
    private readonly flags: FeatureFlags,
    @Inject(SCAN_QUEUE) private readonly queue: ScanQueue,
    @Inject(TURNSTILE_VERIFIER) private readonly turnstile: TurnstileVerifier,
    @Inject(GUARDED_CLIENT) private readonly client: GuardedHttpClient,
    @Inject(ENV) private readonly env: Env,
  ) {
    // Without a configured secret (development only), guest hashes are stable per process.
    this.guestSecret = env.GUEST_HASH_SECRET ?? randomBytes(32).toString('hex');
  }

  /** Plan lookup. Phase 3 replaces this with subscription-aware entitlements. */
  private planFor(requester: Requester): PlanId {
    return 'user' in requester ? 'free' : 'guest';
  }

  async create(rawUrl: string, requester: Requester): Promise<CreateScanResult> {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized.ok)
      throw new ApiError(HttpStatus.BAD_REQUEST, normalized.code, normalized.message);
    try {
      this.client.assertAllowedUrl(normalized.url);
    } catch (e) {
      if (e instanceof GuardedFetchError) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'blocked_destination',
          'That address points to a private or restricted network, which Weblume doesn’t scan.',
        );
      }
      throw e;
    }

    const db = this.database.db;
    let owner: SQL;
    let guestKeyHash: string | null = null;
    if ('guest' in requester) {
      if (!(await this.flags.isEnabled('guest_scans'))) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'guest_scans_disabled',
          'Please sign in to run a scan.',
        );
      }
      if (this.turnstile.disabled && this.env.NODE_ENV === 'production') {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'guest_scans_disabled',
          'Please sign in to run a scan.',
        );
      }
      const okHuman = await this.turnstile.verify(
        requester.guest.turnstileToken ?? '',
        requester.guest.ip,
      );
      if (!okHuman)
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'captcha_failed',
          'Please complete the verification and try again.',
        );
      guestKeyHash = createHmac('sha256', this.guestSecret)
        .update(requester.guest.ip)
        .digest('hex');
      owner = eq(scans.guestKeyHash, guestKeyHash);
    } else {
      owner = eq(scans.userId, requester.user.id);
    }

    // Dedupe: same owner + URL recently, not failed → return it instead of scanning again.
    // Guests can't re-view an earlier scan without its token, so they only dedupe through quota.
    if ('user' in requester) {
      const [recent] = await db
        .select()
        .from(scans)
        .where(
          and(
            owner,
            eq(scans.normalizedUrl, normalized.url),
            ne(scans.status, 'failed'),
            gte(scans.createdAt, new Date(Date.now() - DEDUPE_WINDOW_MS)),
          ),
        )
        .orderBy(desc(scans.createdAt))
        .limit(1);
      if (recent) return { scan: toSummary(recent), deduplicated: true };
    }

    const [active] = await db
      .select({ id: scans.id })
      .from(scans)
      .where(and(owner, inArray(scans.status, [...ACTIVE])))
      .limit(1);
    if (active) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'scan_in_progress',
        'You already have a scan running. Wait for it to finish, then try again.',
        {
          scanId: active.id,
        },
      );
    }

    const plan = getPlan(this.planFor(requester));
    await this.assertQuota(owner, plan.id);

    const scanToken = guestKeyHash ? randomBytes(24).toString('base64url') : undefined;
    const [row] = await db
      .insert(scans)
      .values({
        userId: 'user' in requester ? requester.user.id : null,
        guestKeyHash,
        claimTokenHash: scanToken ? sha256(scanToken) : null,
        targetUrl: rawUrl.trim().slice(0, 2048),
        normalizedUrl: normalized.url,
        expiresAt: new Date(Date.now() + plan.entitlements.retentionDays * 86_400_000),
      })
      .returning();
    await this.queue.enqueue(row!.id);
    return { scan: toSummary(row!), scanToken, deduplicated: false };
  }

  private async assertQuota(
    owner: SQL,
    planId: PlanId,
    extra?: { excludeId?: string },
  ): Promise<void> {
    const plan = getPlan(planId);
    const { start, resetsAt } = quotaWindow(plan.entitlements.quotaPeriod);
    const conds = [owner, eq(scans.countsTowardQuota, true), gte(scans.createdAt, start)];
    if (extra?.excludeId) conds.push(ne(scans.id, extra.excludeId));
    const [{ used } = { used: 0 }] = await this.database.db
      .select({ used: count() })
      .from(scans)
      .where(and(...conds));
    if (used >= plan.entitlements.scansPerPeriod) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        'quota_exceeded',
        quotaMessage(planId, plan.entitlements.scansPerPeriod),
        {
          limit: plan.entitlements.scansPerPeriod,
          used,
          resetsAt: resetsAt.toISOString(),
        },
      );
    }
  }

  /** Returns the full report if the viewer owns the scan (or holds its guest token); 404 otherwise. */
  async get(id: string, viewer: Viewer): Promise<ScanReportDto> {
    const row = await this.findOwned(id, viewer);
    const rows = await this.database.db.select().from(findings).where(eq(findings.scanId, row.id));
    return {
      ...toSummary(row),
      sources: row.sources,
      lighthouse: row.lighthouse,
      passedChecks: row.passedChecks,
      findings: composeFindings(rows),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async list(
    user: AuthUser,
    opts: { q?: string; limit: number; before?: string },
  ): Promise<{ items: ScanSummaryDto[]; nextCursor: string | null }> {
    const conds: SQL[] = [eq(scans.userId, user.id), gte(scans.expiresAt, new Date())];
    if (opts.q)
      conds.push(ilike(scans.normalizedUrl, `%${opts.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
    if (opts.before) {
      const d = new Date(opts.before);
      if (!Number.isNaN(d.getTime())) conds.push(lt(scans.createdAt, d));
    }
    const rows = await this.database.db
      .select()
      .from(scans)
      .where(and(...conds))
      .orderBy(desc(scans.createdAt))
      .limit(opts.limit + 1);
    const items = rows.slice(0, opts.limit).map(toSummary);
    return { items, nextCursor: rows.length > opts.limit ? items.at(-1)!.createdAt : null };
  }

  /** Retries a failed scan as a new scan. Free when the failure was ours or an integration's. */
  async retry(id: string, viewer: Viewer, requester: Requester): Promise<CreateScanResult> {
    const original = await this.findOwned(id, viewer);
    if (original.status !== 'failed')
      throw new ApiError(HttpStatus.CONFLICT, 'not_failed', 'Only failed scans can be retried.');
    const owner = original.userId
      ? eq(scans.userId, original.userId)
      : eq(scans.guestKeyHash, original.guestKeyHash!);
    const [active] = await this.database.db
      .select({ id: scans.id })
      .from(scans)
      .where(and(owner, inArray(scans.status, [...ACTIVE])))
      .limit(1);
    if (active)
      throw new ApiError(
        HttpStatus.CONFLICT,
        'scan_in_progress',
        'You already have a scan running. Wait for it to finish, then try again.',
        { scanId: active.id },
      );

    const free =
      SCAN_FAILURE_CODES[(original.failureCode ?? 'internal_error') as ScanFailureCode] === 'ours';
    const planId = original.userId
      ? this.planFor({ user: { id: original.userId } })
      : this.planFor(requester);
    if (!free) await this.assertQuota(owner, planId);

    const scanToken = original.guestKeyHash ? randomBytes(24).toString('base64url') : undefined;
    const [row] = await this.database.db
      .insert(scans)
      .values({
        userId: original.userId,
        guestKeyHash: original.guestKeyHash,
        claimTokenHash: scanToken ? sha256(scanToken) : null,
        targetUrl: original.targetUrl,
        normalizedUrl: original.normalizedUrl,
        countsTowardQuota: !free,
        retryOf: original.id,
        expiresAt: new Date(Date.now() + getPlan(planId).entitlements.retentionDays * 86_400_000),
      })
      .returning();
    await this.queue.enqueue(row!.id);
    return { scan: toSummary(row!), scanToken, deduplicated: false };
  }

  private async findOwned(id: string, viewer: Viewer): Promise<ScanRow> {
    const notFound = new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'Scan not found.');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound;
    const [row] = await this.database.db.select().from(scans).where(eq(scans.id, id)).limit(1);
    if (!row || row.expiresAt < new Date()) throw notFound;
    const ownsAsUser = !!viewer.user && row.userId === viewer.user.id;
    const ownsAsGuest =
      !row.userId &&
      !!row.claimTokenHash &&
      !!viewer.scanToken &&
      safeEqualHex(sha256(viewer.scanToken), row.claimTokenHash);
    // Same 404 whether it doesn't exist or isn't yours, so ids can't be probed.
    if (!ownsAsUser && !ownsAsGuest) throw notFound;
    return row;
  }
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function quotaWindow(
  period: 'day' | 'calendar_month' | 'billing_period',
  now = new Date(),
): { start: Date; resetsAt: Date } {
  if (period === 'day')
    return {
      start: new Date(now.getTime() - 86_400_000),
      resetsAt: new Date(now.getTime() + 86_400_000),
    };
  // calendar_month (and billing_period until Phase 5 provides real period dates): UTC month.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, resetsAt };
}

function quotaMessage(planId: PlanId, limit: number): string {
  if (planId === 'guest')
    return `Guests can run ${limit} free scan per day. Create a free account for more scans.`;
  return `You’ve used all ${limit} scans included in your plan for this period.`;
}

export function toSummary(r: ScanRow): ScanSummaryDto {
  return {
    id: r.id,
    targetUrl: r.targetUrl,
    normalizedUrl: r.normalizedUrl,
    finalUrl: r.finalUrl,
    status: r.status,
    failureCode: (r.failureCode as ScanFailureCode | null) ?? null,
    failureMessage: r.failureMessage,
    severityCounts: r.severityCounts,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  };
}
