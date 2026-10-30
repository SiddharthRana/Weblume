import { createHmac } from 'node:crypto';

export const PADDLE_SECRET = 'pdl_ntfset_test_secret_123';
export const DODO_SECRET = `whsec_${Buffer.from('dodo-test-signing-key-0123456789').toString('base64')}`;

export function paddleHeaders(body: string, opts: { secret?: string; ts?: number } = {}) {
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const h1 = createHmac('sha256', opts.secret ?? PADDLE_SECRET)
    .update(`${ts}:${body}`)
    .digest('hex');
  return { 'paddle-signature': `ts=${ts};h1=${h1}` };
}

export function dodoHeaders(
  body: string,
  opts: { id?: string; secret?: string; ts?: number } = {},
) {
  const id = opts.id ?? `msg_${Math.random().toString(36).slice(2)}`;
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const key = Buffer.from((opts.secret ?? DODO_SECRET).replace(/^whsec_/, ''), 'base64');
  const sig = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': `v1,${sig}` };
}

export function paddleEvent(over: {
  eventId?: string;
  type?: string;
  occurredAt?: string;
  status?: string;
  userId?: string | null;
  priceId?: string;
  subId?: string;
  scheduledCancel?: boolean;
  periodEnd?: string;
}) {
  return JSON.stringify({
    event_id: over.eventId ?? `evt_${Math.random().toString(36).slice(2)}`,
    event_type: over.type ?? 'subscription.activated',
    occurred_at: over.occurredAt ?? new Date().toISOString(),
    notification_id: 'ntf_1',
    data: {
      id: over.subId ?? 'sub_01',
      status: over.status ?? 'active',
      customer_id: 'ctm_01',
      custom_data: over.userId === null ? null : { user_id: over.userId },
      items: [{ price: { id: over.priceId ?? 'pri_monthly', product_id: 'pro_1' }, quantity: 1 }],
      current_billing_period: {
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        ends_at: over.periodEnd ?? new Date(Date.now() + 29 * 86_400_000).toISOString(),
      },
      scheduled_change: over.scheduledCancel
        ? {
            action: 'cancel',
            effective_at: over.periodEnd ?? new Date(Date.now() + 29 * 86_400_000).toISOString(),
          }
        : null,
    },
  });
}

export function dodoEvent(over: {
  type?: string;
  status?: string;
  userId?: string;
  productId?: string;
  cancelAtEnd?: boolean;
  timestamp?: string;
}) {
  return JSON.stringify({
    business_id: 'bus_1',
    type: over.type ?? 'subscription.active',
    timestamp: over.timestamp ?? new Date().toISOString(),
    data: {
      payload_type: 'Subscription',
      subscription_id: 'sub_dodo_1',
      status: over.status ?? 'active',
      product_id: over.productId ?? 'pdt_monthly',
      customer: { customer_id: 'cus_1', email: 'a@x.dev' },
      metadata: over.userId ? { user_id: over.userId } : {},
      previous_billing_date: new Date(Date.now() - 86_400_000).toISOString(),
      next_billing_date: new Date(Date.now() + 29 * 86_400_000).toISOString(),
      cancel_at_next_billing_date: over.cancelAtEnd ?? false,
    },
  });
}
