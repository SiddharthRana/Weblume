import type { SubscriptionStatus } from '@weblume/shared';
import type { BillingInterval, NormalizedSubscription } from '../billing.types';
import type { SubscriptionPurchaseV2 } from './play-client';

/** RTDN SubscriptionNotification types we treat specially (others just trigger a re-read). */
export const PLAY_NOTIFICATION = { REVOKED: 12 } as const;

export function intervalFromBasePlan(basePlanId: string | undefined): BillingInterval | null {
  if (!basePlanId) return null;
  if (/annual|year|yearly|12m/i.test(basePlanId)) return 'annual';
  if (/month|1m/i.test(basePlanId)) return 'monthly';
  return null;
}

/**
 * Maps a Play SubscriptionPurchaseV2 to our model. The API is the source of truth; RTDN only says
 * "something changed". `revoked` marks refunds/revocations (notification type 12).
 */
export function mapPlaySubscription(
  purchaseToken: string,
  p: SubscriptionPurchaseV2,
  opts: { eventAt: Date; revoked?: boolean },
): Omit<NormalizedSubscription, 'planId'> & { planId: 'starter' } {
  const item = p.lineItems?.[0];
  const expiry = item?.expiryTime ? new Date(item.expiryTime) : null;
  const interval = intervalFromBasePlan(item?.offerDetails?.basePlanId);
  const autoRenew = item?.autoRenewingPlan?.autoRenewEnabled !== false;
  let status: SubscriptionStatus;
  switch (p.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      status = autoRenew ? 'active' : 'canceled';
      break;
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      status = 'grace_period';
      break;
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      status = 'on_hold';
      break;
    case 'SUBSCRIPTION_STATE_PAUSED':
      status = 'paused';
      break;
    case 'SUBSCRIPTION_STATE_CANCELED':
      status = 'canceled'; // access continues until expiryTime
      break;
    case 'SUBSCRIPTION_STATE_PENDING':
      status = 'on_hold'; // payment not completed yet: no access
      break;
    default:
      status = 'expired'; // EXPIRED, PENDING_PURCHASE_CANCELED, unknown
  }
  if (opts.revoked) status = 'refunded';
  // The v2 resource has no current-period start; derive it from the expiry and the base plan length.
  let start: Date | null = null;
  if (expiry && interval) {
    start = new Date(expiry);
    if (interval === 'annual') start.setUTCFullYear(start.getUTCFullYear() - 1);
    else start.setUTCMonth(start.getUTCMonth() - 1);
  }
  return {
    provider: 'google_play',
    providerSubscriptionId: purchaseToken,
    productId: item?.productId ?? '',
    planId: 'starter',
    interval,
    status,
    currentPeriodStart: start,
    currentPeriodEnd: expiry,
    cancelAtPeriodEnd: status === 'canceled',
    accountRef: p.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    linkedProviderSubscriptionId: p.linkedPurchaseToken ?? null,
    eventAt: opts.eventAt,
  };
}
