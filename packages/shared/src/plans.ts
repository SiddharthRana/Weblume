/**
 * Plan + entitlement configuration. Prices and limits are hypotheses: change them here
 * (and in the payment provider dashboards) — business logic must only read entitlements.
 */
export const PLAN_IDS = ['guest', 'free', 'starter'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type QuotaPeriod = 'day' | 'calendar_month' | 'billing_period';

export interface Entitlements {
  scansPerPeriod: number;
  quotaPeriod: QuotaPeriod;
  /** How long scans are kept before the retention job deletes them. */
  retentionDays: number;
  lighthouseData: boolean;
  comparison: boolean;
  pdfExport: boolean;
  shareLinks: boolean;
}

export interface DisplayPrice {
  currency: 'INR' | 'USD';
  /** Minor units (paise / cents) to avoid float rounding. */
  monthly: number;
  annual: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Paid plans are purchasable; guest/free are not. */
  paid: boolean;
  entitlements: Entitlements;
  /**
   * Indicative prices for marketing pages only. The amount actually charged always comes
   * from the payment provider (localised by billing country), never from this table.
   */
  displayPrices?: DisplayPrice[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  guest: {
    id: 'guest',
    name: 'Guest',
    paid: false,
    entitlements: {
      scansPerPeriod: 1,
      quotaPeriod: 'day',
      retentionDays: 1,
      lighthouseData: true,
      comparison: false,
      pdfExport: false,
      shareLinks: false,
    },
  },
  free: {
    id: 'free',
    name: 'Free',
    paid: false,
    entitlements: {
      scansPerPeriod: 5,
      quotaPeriod: 'calendar_month',
      retentionDays: 30,
      lighthouseData: true,
      comparison: false,
      pdfExport: false,
      shareLinks: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    paid: true,
    entitlements: {
      scansPerPeriod: 60,
      quotaPeriod: 'billing_period',
      retentionDays: 365,
      lighthouseData: true,
      comparison: true,
      pdfExport: true,
      shareLinks: true,
    },
    displayPrices: [
      { currency: 'INR', monthly: 14900, annual: 119900 },
      { currency: 'USD', monthly: 399, annual: 2999 },
    ],
  },
};

export function getPlan(id: PlanId): PlanConfig {
  return PLANS[id];
}

export function formatPrice(
  minor: number,
  currency: DisplayPrice['currency'],
  locale = 'en',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'grace_period',
  'on_hold',
  'paused',
  'canceled',
  'expired',
  'refunded',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Whether a subscription in this state grants its plan right now. `canceled` keeps access until
 * the end of the paid period; `grace_period` keeps access while the store retries payment.
 */
export function subscriptionGrantsAccess(
  status: SubscriptionStatus,
  currentPeriodEnd: Date | null,
  now = new Date(),
): boolean {
  switch (status) {
    case 'trialing':
    case 'active':
    case 'grace_period':
      return true;
    case 'canceled':
      return currentPeriodEnd !== null && currentPeriodEnd > now;
    default:
      return false;
  }
}

/** Plans ordered from least to most generous; used to pick the best of several subscriptions. */
export function planRank(id: PlanId): number {
  return PLAN_IDS.indexOf(id);
}
