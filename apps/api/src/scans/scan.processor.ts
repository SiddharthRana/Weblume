import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { SCAN_FAILURE_CODES, SCAN_FAILURE_MESSAGES, type ScanFailureCode } from '@weblume/shared';
import { FeatureFlags } from '../common/feature-flags.service';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { findings, scans } from '../database/schema';
import { GuardedHttpClient } from '../scanner/http/guarded-client';
import { PsiService } from '../scanner/psi/psi-cache.service';
import { runScan, type ScanResult } from '../scanner/scan-runner';
import { ERROR_REPORTER, type ErrorReporter } from '../observability/error-reporter';
import { MetricsService } from '../observability/metrics.service';
import { ScanHooks } from './scan-hooks';

export const GUARDED_CLIENT = Symbol('GUARDED_CLIENT');
/** Test seam for the http→https probe port. */
export const HTTP_PROBE_PORT = Symbol('HTTP_PROBE_PORT');

/** Executes a queued scan and persists the result. Safe to call twice for the same scan. */
@Injectable()
export class ScanProcessor implements OnApplicationShutdown {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(
    private readonly database: Database,
    private readonly psi: PsiService,
    private readonly flags: FeatureFlags,
    @Inject(GUARDED_CLIENT) private readonly client: GuardedHttpClient,
    @Inject(ENV) private readonly env: Env,
    @Inject(HTTP_PROBE_PORT) private readonly httpPort: number | undefined,
    @Inject(ERROR_REPORTER) private readonly reporter: ErrorReporter,
    private readonly metrics: MetricsService,
    private readonly hooks: ScanHooks,
  ) {}

  async process(scanId: string): Promise<void> {
    const db = this.database.db;
    // Claim atomically: only a queued scan moves to running.
    const [scan] = await db
      .update(scans)
      .set({ status: 'running', startedAt: new Date() })
      .where(and(eq(scans.id, scanId), eq(scans.status, 'queued')))
      .returning({ id: scans.id, normalizedUrl: scans.normalizedUrl });
    if (!scan) return;

    const started = performance.now();
    let result: ScanResult;
    try {
      const [psiOn, linksOn] = await Promise.all([
        this.flags.isEnabled('psi'),
        this.flags.isEnabled('link_check'),
      ]);
      result = await runScan(scan.normalizedUrl, {
        client: this.client,
        runPsi: psiOn ? (url, strategy, signal) => this.psi.run(url, strategy, signal) : null,
        linkCheckEnabled: linksOn,
        limits: {
          scanTimeoutMs: this.env.SCAN_TIMEOUT_MS,
          pageTimeoutMs: this.env.SCAN_PAGE_TIMEOUT_MS,
          pageMaxBytes: this.env.SCAN_PAGE_MAX_BYTES,
        },
        httpPort: this.httpPort,
      });
    } catch (err) {
      // Log the type only — never the URL or page content.
      this.logger.error(`Scan ${scanId} crashed: ${err instanceof Error ? err.name : 'unknown'}`);
      this.reporter.capture(withoutMessage(err), { job: 'scan', scanId });
      result = { status: 'failed', failureCode: 'internal_error', finalUrl: null };
    }
    await this.persist(scanId, result);
    await this.hooks.runFinished(scanId);
    this.metrics.inc(
      'weblume_scans_finished_total',
      { status: result.status, reason: result.status === 'failed' ? result.failureCode : 'none' },
      1,
      'Scans finished by this instance, by status and failure reason',
    );
    this.metrics.observeMs(
      'weblume_scan_duration',
      {},
      performance.now() - started,
      'Scan run time',
    );
  }

  private async persist(scanId: string, result: ScanResult): Promise<void> {
    const now = new Date();
    if (result.status === 'failed') {
      await this.database.db
        .update(scans)
        .set({
          status: 'failed',
          finalUrl: result.finalUrl,
          failureCode: result.failureCode,
          failureMessage: failureMessage(result.failureCode, result.details),
          // Failures caused by us or an integration don't use up the user's quota. Never flip a
          // non-counting scan (e.g. a free retry) back to counting.
          ...(SCAN_FAILURE_CODES[result.failureCode] === 'ours'
            ? { countsTowardQuota: false }
            : {}),
          completedAt: now,
        })
        .where(eq(scans.id, scanId));
      return;
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(findings).where(eq(findings.scanId, scanId));
      if (result.findings.length) {
        await tx.insert(findings).values(result.findings.map((f) => ({ ...f, scanId })));
      }
      await tx
        .update(scans)
        .set({
          status: result.status,
          finalUrl: result.finalUrl,
          sources: result.sources,
          lighthouse: result.lighthouse,
          severityCounts: result.severityCounts,
          passedChecks: result.passedChecks,
          completedAt: now,
        })
        .where(eq(scans.id, scanId));
    });
  }

  /** Marks scans stuck in "running" (e.g. after a crash or deploy) as failed so users can retry for free. */
  async failStuckScans(): Promise<number> {
    const cutoff = new Date(Date.now() - (this.env.SCAN_TIMEOUT_MS + 5 * 60_000));
    const rows = await this.database.db
      .update(scans)
      .set({
        status: 'failed',
        failureCode: 'scan_timeout',
        failureMessage: SCAN_FAILURE_MESSAGES.scan_timeout,
        countsTowardQuota: false,
        completedAt: new Date(),
      })
      .where(and(eq(scans.status, 'running'), lt(scans.startedAt, cutoff)))
      .returning({ id: scans.id });
    if (rows.length) this.logger.warn(`Marked ${rows.length} stuck scan(s) as failed`);
    return rows.length;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}

function failureMessage(code: ScanFailureCode, details?: Record<string, unknown>): string {
  const base = SCAN_FAILURE_MESSAGES[code];
  if (code === 'http_error' && typeof details?.status === 'number')
    return `${base} (HTTP ${details.status})`;
  return base;
}

/** Keeps an error's type and stack but drops its message, which may contain the scanned URL. */
export function withoutMessage(err: unknown): Error {
  const name = err instanceof Error ? err.name : 'UnknownError';
  const safe = new Error(`Scan crashed (${name})`);
  safe.name = name;
  if (err instanceof Error && err.stack) {
    const frames = err.stack.split('\n').filter((l) => /^\s+at /.test(l));
    safe.stack = [`${name}: Scan crashed`, ...frames].join('\n');
  }
  return safe;
}
