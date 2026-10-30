import { Inject, Injectable } from '@nestjs/common';
import type { PlanId } from '@weblume/shared';
import { ENV, type Env } from '../config/env';
import type { PaymentProviderId } from '../database/schema';
import type { BillingInterval } from './billing.types';

export interface CatalogEntry {
  provider: PaymentProviderId;
  productId: string;
  planId: PlanId;
  interval: BillingInterval;
}

/**
 * Maps provider product/price ids (configured per environment) to Weblume plans. Prices themselves
 * live in the provider dashboards; this mapping is the only place a provider id becomes a plan.
 */
@Injectable()
export class ProductCatalog {
  readonly entries: CatalogEntry[];

  constructor(@Inject(ENV) env: Env) {
    const raw: [PaymentProviderId, string | undefined, PlanId, BillingInterval][] = [
      ['paddle', env.PADDLE_PRICE_STARTER_MONTHLY, 'starter', 'monthly'],
      ['paddle', env.PADDLE_PRICE_STARTER_ANNUAL, 'starter', 'annual'],
      ['dodo', env.DODO_PRODUCT_STARTER_MONTHLY, 'starter', 'monthly'],
      ['dodo', env.DODO_PRODUCT_STARTER_ANNUAL, 'starter', 'annual'],
      // Google Play: one subscription product, base plans "monthly"/"annual" (interval comes from the base plan).
      ['google_play', env.GOOGLE_PLAY_SUBSCRIPTION_ID, 'starter', 'monthly'],
    ];
    this.entries = raw
      .filter((r): r is [PaymentProviderId, string, PlanId, BillingInterval] => Boolean(r[1]))
      .map(([provider, productId, planId, interval]) => ({
        provider,
        productId,
        planId,
        interval,
      }));
  }

  find(provider: PaymentProviderId, productId: string): CatalogEntry | undefined {
    return this.entries.find((e) => e.provider === provider && e.productId === productId);
  }

  forPlan(
    provider: PaymentProviderId,
    planId: PlanId,
    interval: BillingInterval,
  ): CatalogEntry | undefined {
    return this.entries.find(
      (e) => e.provider === provider && e.planId === planId && e.interval === interval,
    );
  }
}
