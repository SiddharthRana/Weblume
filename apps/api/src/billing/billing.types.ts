import type { PlanId, SubscriptionStatus } from '@weblume/shared';
import type { PaymentProviderId } from '../database/schema';

export type BillingInterval = 'monthly' | 'annual';

/** Provider-independent subscription state derived from a verified provider event or API read. */
export interface NormalizedSubscription {
  provider: PaymentProviderId;
  providerSubscriptionId: string;
  providerCustomerId?: string | null;
  productId: string;
  planId: PlanId;
  interval: BillingInterval | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** Weblume user id when the provider echoes it back (web checkout custom data). */
  userId?: string | null;
  /** Opaque account reference (Google Play obfuscatedAccountId). */
  accountRef?: string | null;
  linkedProviderSubscriptionId?: string | null;
  /** When the state was true at the provider; older events never overwrite newer state. */
  eventAt: Date;
}

/** A verified, parsed provider webhook. `subscription` is null for events we don't act on. */
export interface ParsedWebhook {
  eventId: string;
  eventType: string;
  subscription: NormalizedSubscription | null;
  /** Reason when subscription is null and the event is still interesting to log. */
  ignoredReason?: string;
}

export interface WebhookRequest {
  rawBody: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

/** A Merchant-of-Record web payment provider (Paddle, Dodo, …). */
export interface WebPaymentProvider {
  readonly id: Extract<PaymentProviderId, 'paddle' | 'dodo'>;
  /** True when API key, webhook secret and prices are configured. */
  readonly configured: boolean;
  createCheckout(input: {
    userId: string;
    email?: string;
    productId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  createPortalSession(input: {
    customerId: string;
    subscriptionId: string;
  }): Promise<{ url: string }>;
  /** Verifies the signature (throws WebhookSignatureError) and parses the event. */
  parseWebhook(req: WebhookRequest, now?: Date): ParsedWebhook;
}

export class WebhookSignatureError extends Error {}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export function header(headers: WebhookRequest['headers'], name: string): string | undefined {
  const v = headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

export const WEB_PAYMENT_PROVIDER = Symbol('WEB_PAYMENT_PROVIDER');
