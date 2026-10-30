import { HttpStatus, Injectable } from '@nestjs/common';
import { and, count, eq, gte, type SQL } from 'drizzle-orm';
import {
  getPlan,
  planRank,
  subscriptionGrantsAccess,
  type Entitlements,
  type PlanConfig,
} from '@weblume/shared';
import { FeatureFlags } from '../common/feature-flags.service';
import { Database } from '../database/database.module';
import { profiles, scans, subscriptions } from '../database/schema';
import { ApiError } from '../scans/scans.errors';

export interface ResolvedPlan {
  plan: PlanConfig;
  entitlements: Entitlements;
  /** Where the plan came from: a verified subscription, or the default for the account type. */
  source: 'default' | 'subscription';
  /** Billing period of the granting subscription (for billing_period quotas). */
  period?: { start: Date; end: Date };
}

export interface Usage {
  used: number;
  limit: number;
  periodStart: Date;
  resetsAt: Date;
}

/**
 * The single place that decides what a user may do. Plans come only from server-side
 * subscription records (written by verified provider events in Phase 5), never from clients.
 */
@Injectable()
export class EntitlementService {
  constructor(
    private readonly database: Database,
    private readonly flags: FeatureFlags,
  ) {}

  forGuest(): ResolvedPlan {
    const plan = getPlan('guest');
    return { plan, entitlements: plan.entitlements, source: 'default' };
  }

  /** Resolves the user's plan. Throws 403 account_deleted for accounts being deleted. */
  async forUser(userId: string, now = new Date()): Promise<ResolvedPlan> {
    const db = this.database.db;
    const [profile] = await db
      .select({ deletionRequestedAt: profiles.deletionRequestedAt })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!profile || profile.deletionRequestedAt) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'account_deleted', 'This account has been deleted.');
    }

    const free = getPlan('free');
    const fallback: ResolvedPlan = {
      plan: free,
      entitlements: free.entitlements,
      source: 'default',
    };
    // With billing switched off, everyone gets free-plan entitlements.
    if (!(await this.flags.isEnabled('billing'))) return fallback;

    const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    let best: ResolvedPlan = fallback;
    for (const s of subs) {
      if (!subscriptionGrantsAccess(s.status, s.currentPeriodEnd, now)) continue;
      const plan = getPlan(s.planId);
      if (!plan.paid || planRank(plan.id) <= planRank(best.plan.id)) continue;
      best = {
        plan,
        entitlements: plan.entitlements,
        source: 'subscription',
        period:
          s.currentPeriodStart && s.currentPeriodEnd
            ? { start: s.currentPeriodStart, end: s.currentPeriodEnd }
            : undefined,
      };
    }
    return best;
  }

  /** Scans counted against the plan in its current quota window. */
  async usage(owner: SQL, resolved: ResolvedPlan, now = new Date()): Promise<Usage> {
    const { start, resetsAt } = quotaWindow(resolved, now);
    const [{ used } = { used: 0 }] = await this.database.db
      .select({ used: count() })
      .from(scans)
      .where(and(owner, eq(scans.countsTowardQuota, true), gte(scans.createdAt, start)));
    return { used, limit: resolved.entitlements.scansPerPeriod, periodStart: start, resetsAt };
  }

  async assertQuota(owner: SQL, resolved: ResolvedPlan): Promise<void> {
    const usage = await this.usage(owner, resolved);
    if (usage.used >= usage.limit) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        'quota_exceeded',
        quotaMessage(resolved, usage.limit),
        {
          limit: usage.limit,
          used: usage.used,
          resetsAt: usage.resetsAt.toISOString(),
        },
      );
    }
  }

  expiresAt(resolved: ResolvedPlan, from = new Date()): Date {
    return new Date(from.getTime() + resolved.entitlements.retentionDays * 86_400_000);
  }
}

export function quotaWindow(
  resolved: Pick<ResolvedPlan, 'entitlements' | 'period'>,
  now = new Date(),
): { start: Date; resetsAt: Date } {
  const period = resolved.entitlements.quotaPeriod;
  if (period === 'day') {
    return {
      start: new Date(now.getTime() - 86_400_000),
      resetsAt: new Date(now.getTime() + 86_400_000),
    };
  }
  if (period === 'billing_period' && resolved.period && resolved.period.end > now) {
    return { start: resolved.period.start, resetsAt: resolved.period.end };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, resetsAt };
}

function quotaMessage(resolved: ResolvedPlan, limit: number): string {
  if (resolved.plan.id === 'guest') {
    return `Guests can run ${limit} free scan per day. Create a free account for more scans.`;
  }
  return `You’ve used all ${limit} scans included in your ${resolved.plan.name} plan for this period.`;
}
