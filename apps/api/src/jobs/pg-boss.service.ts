import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { PgBoss as PgBossType } from 'pg-boss';
import { ENV, type Env } from '../config/env';

/** Owns the single pg-boss instance (Postgres-backed jobs). Started lazily on first use. */
@Injectable()
export class PgBossService implements OnApplicationShutdown {
  private readonly logger = new Logger(PgBossService.name);
  private starting: Promise<PgBossType> | null = null;

  constructor(@Inject(ENV) private readonly env: Env) {}

  get(): Promise<PgBossType> {
    this.starting ??= (async () => {
      const { PgBoss } = await import('pg-boss');
      const boss = new PgBoss({
        connectionString: this.env.DATABASE_URL,
        schema: 'pgboss',
        max: 4,
      });
      boss.on('error', (err: Error) => this.logger.error(`Queue error: ${err.message}`));
      await boss.start();
      return boss;
    })();
    return this.starting;
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.starting) return;
    const boss = await this.starting.catch(() => null);
    await boss?.stop({ graceful: true, timeout: 10_000 });
  }
}

@Global()
@Module({ providers: [PgBossService], exports: [PgBossService] })
export class JobsModule {}
