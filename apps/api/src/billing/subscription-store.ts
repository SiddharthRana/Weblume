import { Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { Database } from '../database/database.module';
import { profiles, subscriptions } from '../database/schema';
import type { NormalizedSubscription } from './billing.types';

export type ApplyResult =
  | { applied: true; userId: string }
  | { applied: false; reason: 'unknown_user' | 'stale' | 'account_deleted' };

/** Writes verified subscription state. The only writer of the subscriptions table. */
@Injectable()
export class SubscriptionStore {
  private readonly logger = new Logger(SubscriptionStore.name);

  constructor(private readonly database: Database) {}

  /** Finds the Weblume user an event belongs to: explicit id, existing row, linked token, or account ref. */
  private async resolveUser(s: NormalizedSubscription): Promise<string | null> {
    const db = this.database.db;
    if (s.userId) return s.userId;
    const ids = [s.providerSubscriptionId, s.linkedProviderSubscriptionId].filter(
      (x): x is string => Boolean(x),
    );
    const conds = [
      ...ids.map((id) => eq(subscriptions.providerSubscriptionId, id)),
      ...(s.accountRef ? [eq(subscriptions.providerAccountRef, s.accountRef)] : []),
    ];
    if (conds.length) {
      const [row] = await db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(and(eq(subscriptions.provider, s.provider), or(...conds)))
        .limit(1);
      if (row) return row.userId;
    }
    if (s.accountRef) {
      const [p] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.billingAccountRef, s.accountRef))
        .limit(1);
      if (p) return p.id;
    }
    return null;
  }

  async apply(s: NormalizedSubscription): Promise<ApplyResult> {
    const userId = await this.resolveUser(s);
    if (!userId) return { applied: false, reason: 'unknown_user' };
    const [profile] = await this.database.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, userId), isNull(profiles.deletionRequestedAt)))
      .limit(1);
    if (!profile) return { applied: false, reason: 'account_deleted' };

    const values = {
      userId,
      provider: s.provider,
      providerSubscriptionId: s.providerSubscriptionId,
      providerCustomerId: s.providerCustomerId ?? null,
      productId: s.productId,
      planId: s.planId,
      status: s.status,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      lastEventAt: s.eventAt,
      providerAccountRef: s.accountRef ?? null,
      linkedProviderSubscriptionId: s.linkedProviderSubscriptionId ?? null,
      billingInterval: s.interval,
    };
    const rows = await this.database.db
      .insert(subscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: [subscriptions.provider, subscriptions.providerSubscriptionId],
        set: {
          status: values.status,
          productId: values.productId,
          planId: values.planId,
          currentPeriodStart: values.currentPeriodStart,
          currentPeriodEnd: values.currentPeriodEnd,
          cancelAtPeriodEnd: values.cancelAtPeriodEnd,
          lastEventAt: values.lastEventAt,
          billingInterval: values.billingInterval,
          providerCustomerId: sql`coalesce(excluded.provider_customer_id, ${subscriptions.providerCustomerId})`,
          providerAccountRef: sql`coalesce(excluded.provider_account_ref, ${subscriptions.providerAccountRef})`,
        },
        // Out-of-order safety: never let an older event overwrite newer state.
        setWhere: lte(subscriptions.lastEventAt, values.lastEventAt),
      })
      .returning({ id: subscriptions.id });
    if (!rows.length) return { applied: false, reason: 'stale' };
    // A replacement Play token supersedes the old one: the old row stops granting access.
    if (s.linkedProviderSubscriptionId) {
      await this.database.db
        .update(subscriptions)
        .set({ status: 'expired', lastEventAt: s.eventAt })
        .where(
          and(
            eq(subscriptions.provider, s.provider),
            eq(subscriptions.providerSubscriptionId, s.linkedProviderSubscriptionId),
            lte(subscriptions.lastEventAt, s.eventAt),
          ),
        );
    }
    return { applied: true, userId };
  }
}
