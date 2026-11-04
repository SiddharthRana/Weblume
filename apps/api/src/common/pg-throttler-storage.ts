import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type postgres from 'postgres';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const SWEEP_INTERVAL_MS = 5 * 60_000;

/**
 * Rate-limit counters in Postgres (`public.rate_limits`, migration 20261104000000), shared by every
 * API instance. Each request is one call to `rate_limit_hit`, which counts and decides atomically.
 *
 * The sweeper timer is unref'd, so it never keeps the process alive.
 *
 * If the database can't be reached the request is let through (and logged): the endpoints behind
 * the limiter need the database anyway, and an outage shouldn't turn into a wall of 429s.
 */
export class PgThrottlerStorage implements ThrottlerStorage {
  private readonly log = new Logger(PgThrottlerStorage.name);
  private sweeper?: NodeJS.Timeout;

  constructor(private readonly sql: postgres.Sql) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    this.startSweeper();
    try {
      const [row] = await this.sql<
        {
          total_hits: number;
          ms_to_expire: number;
          is_blocked: boolean;
          ms_to_block_expire: number;
        }[]
      >`select * from public.rate_limit_hit(${key}, ${throttlerName}, ${Math.ceil(ttl)}, ${limit}, ${Math.ceil(blockDuration)})`;
      return {
        totalHits: row!.total_hits,
        timeToExpire: Math.ceil(row!.ms_to_expire / 1000),
        isBlocked: row!.is_blocked,
        timeToBlockExpire: Math.ceil(row!.ms_to_block_expire / 1000),
      };
    } catch (err) {
      this.log.warn(`Rate limit store unavailable, allowing request: ${(err as Error).message}`);
      return {
        totalHits: 0,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  /** Deletes counters whose window and block have both ended. Safe to run on every instance. */
  async sweep(): Promise<number> {
    const rows = await this.sql`
      delete from public.rate_limits
      where window_ends_at < now() and (blocked_until is null or blocked_until < now())`;
    return rows.count;
  }

  private startSweeper() {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => {
      this.sweep().catch((err: Error) => this.log.warn(`Rate limit sweep failed: ${err.message}`));
    }, SWEEP_INTERVAL_MS);
    this.sweeper.unref();
  }
}
