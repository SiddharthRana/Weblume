import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { isNotNull, lt, and } from 'drizzle-orm';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { profiles, psiCache, scans, webhookEvents } from '../database/schema';
import { PgBossService } from '../jobs/pg-boss.service';
import { AccountService } from './account.service';

export const MAINTENANCE_JOB = 'maintenance';
export const WEBHOOK_PAYLOAD_RETENTION_DAYS = 30;

export interface RetentionResult {
  expiredScans: number;
  psiCacheRows: number;
  webhookPayloads: number;
  pendingDeletions: { completed: number; remaining: number };
}

/** Privacy-conscious retention: runs hourly in the worker (see docs/privacy-data-map.md). */
@Injectable()
export class RetentionService implements OnModuleInit {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly database: Database,
    private readonly accounts: AccountService,
    private readonly jobs: PgBossService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.WORKER_ENABLED) return;
    const boss = await this.jobs.get();
    await boss.createQueue(MAINTENANCE_JOB, { retryLimit: 1 });
    await boss.schedule(MAINTENANCE_JOB, '17 * * * *');
    await boss.work(MAINTENANCE_JOB, async () => {
      const r = await this.run();
      this.logger.log(
        `Retention: ${r.expiredScans} scans, ${r.psiCacheRows} cache rows, ${r.webhookPayloads} payloads removed; ` +
          `deletions completed ${r.pendingDeletions.completed}, pending ${r.pendingDeletions.remaining}`,
      );
    });
  }

  async run(now = new Date()): Promise<RetentionResult> {
    const db = this.database.db;
    const expired = await db
      .delete(scans)
      .where(lt(scans.expiresAt, now))
      .returning({ id: scans.id });

    // Keep PSI results a little beyond their useful TTL, never longer than a day past it.
    const psiCutoff = new Date(now.getTime() - (this.env.PSI_CACHE_TTL_HOURS + 24) * 3_600_000);
    const psi = await db
      .delete(psiCache)
      .where(lt(psiCache.fetchedAt, psiCutoff))
      .returning({ url: psiCache.normalizedUrl });

    const payloadCutoff = new Date(now.getTime() - WEBHOOK_PAYLOAD_RETENTION_DAYS * 86_400_000);
    const payloads = await db
      .update(webhookEvents)
      .set({ payload: null })
      .where(and(lt(webhookEvents.receivedAt, payloadCutoff), isNotNull(webhookEvents.payload)))
      .returning({ id: webhookEvents.id });

    const pending = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(isNotNull(profiles.deletionRequestedAt));
    let completed = 0;
    for (const p of pending) if (await this.accounts.deleteAuthUser(p.id)) completed++;

    return {
      expiredScans: expired.length,
      psiCacheRows: psi.length,
      webhookPayloads: payloads.length,
      pendingDeletions: { completed, remaining: pending.length - completed },
    };
  }
}
