import type { SubscriptionStatus } from '@weblume/shared';
import type { ProductCatalog } from '../product-catalog';
import {
  header,
  ProviderError,
  type NormalizedSubscription,
  type ParsedWebhook,
  type WebhookRequest,
  type WebPaymentProvider,
} from '../billing.types';
import { verifyPaddleSignature } from './signatures';

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'subscription.canceled',
]);

interface PaddleSubscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';
  customer_id?: string;
  custom_data?: { user_id?: string } | null;
  items?: { price?: { id?: string } }[];
  current_billing_period?: { starts_at?: string; ends_at?: string } | null;
  scheduled_change?: { action?: string; effective_at?: string } | null;
}

/**
 * Paddle Billing (Merchant of Record). Checkout: a server-created transaction carries our user id in
 * custom_data, so it can't be tampered with client-side; the returned checkout URL opens Paddle.js on
 * the site's default payment link page (/checkout/paddle).
 */
export class PaddleProvider implements WebPaymentProvider {
  readonly id = 'paddle' as const;
  private readonly baseUrl: string;

  constructor(
    private readonly cfg: {
      apiKey?: string;
      webhookSecret?: string;
      env: 'sandbox' | 'production';
    },
    private readonly catalog: ProductCatalog,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl =
      cfg.env === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  }

  get configured(): boolean {
    return Boolean(
      this.cfg.apiKey &&
      this.cfg.webhookSecret &&
      this.catalog.entries.some((e) => e.provider === 'paddle'),
    );
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new ProviderError(`Paddle API ${path} failed`, res.status);
    return (await res.json()) as T;
  }

  async createCheckout(input: { userId: string; productId: string }): Promise<{ url: string }> {
    const res = await this.call<{ data?: { checkout?: { url?: string | null } } }>(
      '/transactions',
      {
        items: [{ price_id: input.productId, quantity: 1 }],
        custom_data: { user_id: input.userId },
        collection_mode: 'automatic',
      },
    );
    const url = res.data?.checkout?.url;
    if (!url)
      throw new ProviderError('Paddle returned no checkout URL (is a default payment link set?)');
    return { url };
  }

  async createPortalSession(input: {
    customerId: string;
    subscriptionId: string;
  }): Promise<{ url: string }> {
    const res = await this.call<{ data?: { urls?: { general?: { overview?: string } } } }>(
      `/customers/${encodeURIComponent(input.customerId)}/portal-sessions`,
      { subscription_ids: [input.subscriptionId] },
    );
    const url = res.data?.urls?.general?.overview;
    if (!url) throw new ProviderError('Paddle returned no portal URL');
    return { url };
  }

  parseWebhook(req: WebhookRequest, now = new Date()): ParsedWebhook {
    verifyPaddleSignature(
      header(req.headers, 'paddle-signature'),
      req.rawBody,
      this.cfg.webhookSecret ?? '',
      now,
    );
    const event = JSON.parse(req.rawBody.toString('utf8')) as {
      event_id: string;
      event_type: string;
      occurred_at: string;
      data: PaddleSubscription;
    };
    if (!SUBSCRIPTION_EVENTS.has(event.event_type)) {
      return {
        eventId: event.event_id,
        eventType: event.event_type,
        subscription: null,
        ignoredReason: 'unhandled_event',
      };
    }
    const d = event.data;
    const priceId = d.items?.[0]?.price?.id ?? '';
    const entry = this.catalog.find('paddle', priceId);
    if (!entry)
      return {
        eventId: event.event_id,
        eventType: event.event_type,
        subscription: null,
        ignoredReason: 'unknown_price',
      };

    const scheduledCancel = d.scheduled_change?.action === 'cancel';
    const status: SubscriptionStatus =
      d.status === 'active'
        ? scheduledCancel
          ? 'canceled' // still has access until the period ends
          : 'active'
        : d.status === 'trialing'
          ? 'trialing'
          : d.status === 'past_due'
            ? 'grace_period'
            : d.status === 'paused'
              ? 'paused'
              : 'expired'; // Paddle "canceled" = ended
    const sub: NormalizedSubscription = {
      provider: 'paddle',
      providerSubscriptionId: d.id,
      providerCustomerId: d.customer_id ?? null,
      productId: priceId,
      planId: entry.planId,
      interval: entry.interval,
      status,
      currentPeriodStart: d.current_billing_period?.starts_at
        ? new Date(d.current_billing_period.starts_at)
        : null,
      currentPeriodEnd: d.current_billing_period?.ends_at
        ? new Date(d.current_billing_period.ends_at)
        : d.scheduled_change?.effective_at
          ? new Date(d.scheduled_change.effective_at)
          : null,
      cancelAtPeriodEnd: scheduledCancel,
      userId: d.custom_data?.user_id ?? null,
      eventAt: new Date(event.occurred_at),
    };
    return { eventId: event.event_id, eventType: event.event_type, subscription: sub };
  }
}
