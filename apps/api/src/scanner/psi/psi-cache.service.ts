import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import { ENV, type Env } from '../../config/env';
import { Database } from '../../database/database.module';
import { psiCache } from '../../database/schema';
import { MetricsService } from '../../observability/metrics.service';
import {
  PSI_PROVIDER,
  type PsiOutcome,
  type PsiProvider,
  type Strategy,
  type TrimmedLighthouse,
} from './psi.types';

/** Caches successful PSI results per normalised URL + strategy to save quota and time. */
@Injectable()
export class PsiService {
  constructor(
    private readonly database: Database,
    @Inject(PSI_PROVIDER) private readonly provider: PsiProvider,
    @Inject(ENV) private readonly env: Env,
    private readonly metrics: MetricsService,
  ) {}

  get configured(): boolean {
    return this.provider.configured;
  }

  async run(url: string, strategy: Strategy, signal?: AbortSignal): Promise<PsiOutcome> {
    if (!this.provider.configured) return { ok: false, reason: 'not_configured' };
    const ttlMs = this.env.PSI_CACHE_TTL_HOURS * 3_600_000;
    if (ttlMs > 0) {
      const [hit] = await this.database.db
        .select({ result: psiCache.result })
        .from(psiCache)
        .where(
          and(
            eq(psiCache.normalizedUrl, url),
            eq(psiCache.strategy, strategy),
            gt(psiCache.fetchedAt, new Date(Date.now() - ttlMs)),
          ),
        )
        .limit(1);
      if (hit) {
        this.metrics.inc(
          'weblume_psi_cache_hits_total',
          { strategy },
          1,
          'PSI results served from cache',
        );
        return { ok: true, result: hit.result as TrimmedLighthouse };
      }
    }
    const started = performance.now();
    const outcome = await this.provider.run(url, strategy, signal);
    const result = outcome.ok ? 'ok' : outcome.reason;
    this.metrics.inc(
      'weblume_psi_requests_total',
      { strategy, result },
      1,
      'Calls to PageSpeed Insights by outcome',
    );
    this.metrics.observeMs(
      'weblume_psi_latency',
      { strategy },
      performance.now() - started,
      'PageSpeed Insights call duration',
    );
    if (outcome.ok && ttlMs > 0) {
      const values = {
        normalizedUrl: url,
        strategy,
        result: outcome.result,
        fetchedAt: new Date(),
      };
      await this.database.db
        .insert(psiCache)
        .values(values)
        .onConflictDoUpdate({
          target: [psiCache.normalizedUrl, psiCache.strategy],
          set: { result: values.result, fetchedAt: values.fetchedAt },
        });
    }
    return outcome;
  }
}
