import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { PgBoss as PgBossType } from 'pg-boss';
import { ENV, type Env } from '../config/env';
import { ScanProcessor } from './scan.processor';
import { SCAN_JOB, type ScanQueue } from './scan-queue';

/** Postgres-backed job queue (pg-boss). Also runs the worker when WORKER_ENABLED=true. */
@Injectable()
export class PgBossScanQueue implements ScanQueue, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PgBossScanQueue.name);
  private boss: PgBossType | null = null;
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly processor: ScanProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    const { PgBoss } = await import('pg-boss');
    const boss = new PgBoss({ connectionString: this.env.DATABASE_URL, schema: 'pgboss', max: 4 });
    boss.on('error', (err: Error) => this.logger.error(`Queue error: ${err.message}`));
    await boss.start();
    await boss.createQueue(SCAN_JOB, {
      retryLimit: 0,
      expireInSeconds: Math.ceil(this.env.SCAN_TIMEOUT_MS / 1000) + 60,
      deleteAfterSeconds: 7 * 24 * 3600,
    });
    this.boss = boss;
    if (this.env.WORKER_ENABLED) {
      await boss.work<{ scanId: string }>(
        SCAN_JOB,
        { localConcurrency: this.env.SCAN_GLOBAL_CONCURRENCY, pollingIntervalSeconds: 1 },
        async ([job]) => {
          if (job) await this.processor.process(job.data.scanId);
        },
      );
      await this.processor.failStuckScans();
      this.sweeper = setInterval(() => void this.processor.failStuckScans(), 5 * 60_000);
      this.sweeper.unref();
      this.logger.log(`Scan worker started (concurrency ${this.env.SCAN_GLOBAL_CONCURRENCY})`);
    }
  }

  async enqueue(scanId: string): Promise<void> {
    if (!this.boss) throw new Error('Queue not started');
    await this.boss.send(SCAN_JOB, { scanId });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    await this.boss?.stop({ graceful: true, timeout: 10_000 });
  }
}
