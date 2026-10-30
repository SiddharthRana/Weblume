import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { PgBossService } from '../jobs/pg-boss.service';
import { ScanProcessor } from './scan.processor';
import { SCAN_JOB, type ScanQueue } from './scan-queue';

/** Scan jobs on pg-boss. Also runs the worker when WORKER_ENABLED=true. */
@Injectable()
export class PgBossScanQueue implements ScanQueue, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PgBossScanQueue.name);
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly processor: ScanProcessor,
    private readonly jobs: PgBossService,
  ) {}

  async onModuleInit(): Promise<void> {
    const boss = await this.jobs.get();
    await boss.createQueue(SCAN_JOB, {
      retryLimit: 0,
      expireInSeconds: Math.ceil(this.env.SCAN_TIMEOUT_MS / 1000) + 60,
      deleteAfterSeconds: 7 * 24 * 3600,
    });
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
    const boss = await this.jobs.get();
    await boss.send(SCAN_JOB, { scanId });
  }

  onApplicationShutdown(): void {
    if (this.sweeper) clearInterval(this.sweeper);
  }
}
