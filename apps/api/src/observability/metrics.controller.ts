import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  NotFoundException,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { Public } from '../auth/decorators';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { MetricsService } from './metrics.service';

/**
 * Prometheus-format metrics for a scraper or uptime tool. Disabled (404) unless METRICS_TOKEN is
 * set; then requires `Authorization: Bearer <METRICS_TOKEN>`. Contains counts only, no user data.
 */
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly database: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get('metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @Header('Cache-Control', 'no-store')
  async scrape(@Headers('authorization') auth?: string): Promise<string> {
    const token = this.env.METRICS_TOKEN;
    if (!token) throw new NotFoundException();
    const given = Buffer.from(auth?.replace(/^Bearer\s+/i, '') ?? '');
    const want = Buffer.from(token);
    if (given.length !== want.length || !timingSafeEqual(given, want))
      throw new UnauthorizedException();

    // Database-wide numbers (all instances), cheap aggregate queries over indexed columns.
    const byStatus = await this.database.db.execute<{ status: string; n: number }>(
      sql`select status::text as status, count(*)::int as n from public.scans
          where created_at > now() - interval '24 hours' group by status`,
    );
    const failures = await this.database.db.execute<{ reason: string; n: number }>(
      sql`select coalesce(failure_code, 'unknown') as reason, count(*)::int as n from public.scans
          where status = 'failed' and created_at > now() - interval '24 hours' group by 1`,
    );
    const webhooks = await this.database.db.execute<{ n: number }>(
      sql`select count(*)::int as n from public.webhook_events where status = 'failed'
          and received_at > now() - interval '24 hours'`,
    );
    const rows = <T>(r: unknown) =>
      (Array.isArray(r) ? r : ((r as { rows: T[] }).rows ?? [])) as T[];
    const statusRows = rows<{ status: string; n: number }>(byStatus);
    const count = (s: string) => statusRows.find((r) => r.status === s)?.n ?? 0;

    return this.metrics.render([
      {
        name: 'weblume_scan_queue_depth',
        help: 'Scans waiting to start (queued)',
        value: count('queued'),
      },
      { name: 'weblume_scans_running', help: 'Scans in progress', value: count('running') },
      ...statusRows.map((r) => ({
        name: 'weblume_scans_last_24h',
        help: 'Scans created in the last 24 hours by status',
        labels: { status: r.status },
        value: r.n,
      })),
      ...rows<{ reason: string; n: number }>(failures).map((r) => ({
        name: 'weblume_scan_failures_last_24h',
        help: 'Failed scans in the last 24 hours by reason',
        labels: { reason: r.reason },
        value: r.n,
      })),
      {
        name: 'weblume_webhook_failures_last_24h',
        help: 'Payment webhooks that failed processing in the last 24 hours',
        value: rows<{ n: number }>(webhooks)[0]?.n ?? 0,
      },
    ]);
  }
}
