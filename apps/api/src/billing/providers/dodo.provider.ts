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
import { verifyStandardWebhook } from './signatures';

interface DodoSubscription {
  subscription_id: string;
  status:
    | 'pending'
    | 'active'
    | 'on_hold'
    | 'paused'
    | 'cancelled'
    | 'failed'
    | 'expired'
    | 'past_due'
    | string;
  product_id: string;
  customer?: { customer_id?: string; email?: string };
  metadata?: { user_id?: string } | null;
  previous_billing_date?: string | null;
  next_billing_date?: string | null;
  cancel_at_next_billing_date?: boolean;
}

/**
 * Dodo Payments (India-based Merchant of Record; supports UPI AutoPay and RBI e-mandates for Indian
 * buyers). Webhooks follow the Standard Webhooks spec. Paths, request and response fields were
 * checked against Dodo's API reference on 2026-11-04; still confirm one test-mode purchase end to
 * end before launch (docs/payments-setup.md).
 */
export class DodoProvider implements WebPaymentProvider {
  readonly id = 'dodo' as const;
  private readonly baseUrl: string;

  constructor(
    private readonly cfg: { apiKey?: string; webhookSecret?: string; env: 'test' | 'live' },
    private readonly catalog: ProductCatalog,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl =
      cfg.env === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
  }

  get configured(): boolean {
    return Boolean(
      this.cfg.apiKey &&
      this.cfg.webhookSecret &&
      this.catalog.entries.some((e) => e.provider === 'dodo'),
    );
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new ProviderError(`Dodo API ${path} failed`, res.status);
    return (await res.json()) as T;
  }

  async createCheckout(input: {
    userId: string;
    email?: string;
    productId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const res = await this.call<{ checkout_url?: string }>('/checkouts', {
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      ...(input.email ? { customer: { email: input.email } } : {}),
      metadata: { user_id: input.userId },
      return_url: input.returnUrl,
    });
    if (!res.checkout_url) throw new ProviderError('Dodo returned no checkout URL');
    return { url: res.checkout_url };
  }

  async createPortalSession(input: { customerId: string }): Promise<{ url: string }> {
    const res = await this.call<{ link?: string }>(
      `/customers/${encodeURIComponent(input.customerId)}/customer-portal/session`,
      {},
    );
    if (!res.link) throw new ProviderError('Dodo returned no portal URL');
    return { url: res.link };
  }

  parseWebhook(req: WebhookRequest, now = new Date()): ParsedWebhook {
    const id = header(req.headers, 'webhook-id');
    verifyStandardWebhook(
      {
        id,
        timestamp: header(req.headers, 'webhook-timestamp'),
        signature: header(req.headers, 'webhook-signature'),
      },
      req.rawBody,
      this.cfg.webhookSecret ?? '',
      now,
    );
    const event = JSON.parse(req.rawBody.toString('utf8')) as {
      type: string;
      timestamp: string;
      data: DodoSubscription;
    };
    if (!event.type.startsWith('subscription.')) {
      return {
        eventId: id!,
        eventType: event.type,
        subscription: null,
        ignoredReason: 'unhandled_event',
      };
    }
    const d = event.data;
    const entry = this.catalog.find('dodo', d.product_id);
    if (!entry)
      return {
        eventId: id!,
        eventType: event.type,
        subscription: null,
        ignoredReason: 'unknown_product',
      };
    const cancelAtEnd = Boolean(d.cancel_at_next_billing_date);
    const status: SubscriptionStatus =
      d.status === 'active'
        ? cancelAtEnd
          ? 'canceled'
          : 'active'
        : d.status === 'past_due'
          ? 'grace_period' // renewal failed; Dodo keeps the customer's access while it retries
          : d.status === 'on_hold' || d.status === 'pending'
            ? 'on_hold'
            : d.status === 'paused'
              ? 'paused'
              : d.status === 'cancelled'
                ? 'canceled' // keeps access only until next_billing_date (if in the future)
                : 'expired'; // failed / expired / unknown
    const sub: NormalizedSubscription = {
      provider: 'dodo',
      providerSubscriptionId: d.subscription_id,
      providerCustomerId: d.customer?.customer_id ?? null,
      productId: d.product_id,
      planId: entry.planId,
      interval: entry.interval,
      status,
      currentPeriodStart: d.previous_billing_date ? new Date(d.previous_billing_date) : null,
      currentPeriodEnd: d.next_billing_date ? new Date(d.next_billing_date) : null,
      cancelAtPeriodEnd: cancelAtEnd,
      userId: d.metadata?.user_id ?? null,
      customerEmail: d.customer?.email ?? null,
      eventAt: new Date(event.timestamp),
    };
    return { eventId: id!, eventType: event.type, subscription: sub };
  }
}
