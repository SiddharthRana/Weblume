import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { PgBossService } from '../jobs/pg-boss.service';
import { MonitorsService } from './monitors.service';

export const MONITOR_TICK_JOB = 'monitor-tick';

/** Every few minutes (MONITOR_TICK_CRON), queues scans for monitors that are due. Worker only. */
@Injectable()
export class MonitorsScheduler implements OnModuleInit {
  private readonly logger = new Logger(MonitorsScheduler.name);

  constructor(
    private readonly monitors: MonitorsService,
    private readonly jobs: PgBossService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.WORKER_ENABLED) return;
    const boss = await this.jobs.get();
    // A tick that is still running when the next one is due is skipped (singleton by expiry).
    await boss.createQueue(MONITOR_TICK_JOB, { retryLimit: 0, expireInSeconds: 240 });
    await boss.schedule(MONITOR_TICK_JOB, this.env.MONITOR_TICK_CRON);
    await boss.work(MONITOR_TICK_JOB, async () => {
      const r = await this.monitors.tick();
      if (r.started || r.skipped)
        this.logger.log(`Monitoring: ${r.started} scheduled scan(s) queued, ${r.skipped} skipped`);
    });
    this.logger.log(`Monitoring scheduler started (${this.env.MONITOR_TICK_CRON})`);
  }
}
