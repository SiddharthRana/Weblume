import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { Entitlements, ScanReportDto } from '@weblume/shared';
import type { AuthUser } from '../auth/auth.types';
import { Database } from '../database/database.module';
import { findings, profiles, scans, shareLinks, subscriptions } from '../database/schema';
import { EntitlementService } from '../entitlements/entitlement.service';
import { composeFindings } from '../scanner/report-composer';
import { toSummary } from '../scans/scans.service';
import { AUTH_ADMIN, type AuthAdmin } from './auth-admin';

export interface AccountDto {
  id: string;
  email?: string;
  displayName: string | null;
  createdAt: string;
  plan: { id: string; name: string; paid: boolean; source: 'default' | 'subscription' };
  entitlements: Entitlements;
  usage: { used: number; limit: number; periodStart: string; resetsAt: string };
  subscriptions: {
    provider: string;
    planId: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }[];
}

export type DeletionResult = { status: 'deleted' } | { status: 'pending' };

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly database: Database,
    private readonly entitlements: EntitlementService,
    @Inject(AUTH_ADMIN) private readonly authAdmin: AuthAdmin,
  ) {}

  async get(user: AuthUser): Promise<AccountDto> {
    const resolved = await this.entitlements.forUser(user.id);
    const db = this.database.db;
    const [[profile], subs, usage] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
      db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
      this.entitlements.usage(eq(scans.userId, user.id), resolved),
    ]);
    return {
      id: user.id,
      email: user.email,
      displayName: profile?.displayName ?? null,
      createdAt: (profile?.createdAt ?? new Date()).toISOString(),
      plan: {
        id: resolved.plan.id,
        name: resolved.plan.name,
        paid: resolved.plan.paid,
        source: resolved.source,
      },
      entitlements: resolved.entitlements,
      usage: {
        used: usage.used,
        limit: usage.limit,
        periodStart: usage.periodStart.toISOString(),
        resetsAt: usage.resetsAt.toISOString(),
      },
      subscriptions: subs.map((s) => ({
        provider: s.provider,
        planId: s.planId,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      })),
    };
  }

  async updateProfile(user: AuthUser, displayName: string | null): Promise<AccountDto> {
    await this.entitlements.forUser(user.id); // rejects deleted accounts
    const value = displayName?.trim() ? displayName.trim() : null;
    await this.database.db
      .update(profiles)
      .set({ displayName: value })
      .where(eq(profiles.id, user.id));
    return this.get(user);
  }

  /** Everything we hold about the user, as JSON (data portability). */
  async export(user: AuthUser) {
    const account = await this.get(user);
    const db = this.database.db;
    const rows = await db.select().from(scans).where(eq(scans.userId, user.id));
    const ids = rows.map((r) => r.id);
    const allFindings = ids.length
      ? await db.select().from(findings).where(inArray(findings.scanId, ids))
      : [];
    const byScan = new Map<string, typeof allFindings>();
    for (const f of allFindings) byScan.set(f.scanId, [...(byScan.get(f.scanId) ?? []), f]);
    const reports: ScanReportDto[] = rows.map((r) => ({
      ...toSummary(r),
      sources: r.sources,
      lighthouse: r.lighthouse,
      passedChecks: r.passedChecks,
      findings: composeFindings(byScan.get(r.id) ?? [], {
        pageUrl: r.finalUrl ?? r.normalizedUrl,
        includeCodeFixes: account.entitlements.codeFixes,
      }),
      expiresAt: r.expiresAt.toISOString(),
    }));
    return {
      format: 'weblume-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      account,
      scans: reports,
    };
  }

  /**
   * Deletes the account. App data (scans, findings, share links, profile details) is removed
   * immediately; the Supabase Auth user (and, by cascade, profile and subscription records) is
   * then deleted. If that step can't run now, the account is marked and the retention job retries.
   */
  async delete(user: AuthUser): Promise<DeletionResult> {
    await this.entitlements.forUser(user.id); // 403 if already deleted
    await this.database.db.transaction(async (tx) => {
      await tx.delete(shareLinks).where(eq(shareLinks.createdBy, user.id));
      await tx.delete(scans).where(eq(scans.userId, user.id));
      await tx
        .update(profiles)
        .set({ displayName: null, deletionRequestedAt: new Date() })
        .where(eq(profiles.id, user.id));
    });
    return (await this.deleteAuthUser(user.id)) ? { status: 'deleted' } : { status: 'pending' };
  }

  /** Returns true when the auth user is gone. */
  async deleteAuthUser(userId: string): Promise<boolean> {
    if (!this.authAdmin.configured) return false;
    try {
      await this.authAdmin.deleteUser(userId);
      return true;
    } catch (err) {
      this.logger.warn(
        `Auth user deletion deferred: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      return false;
    }
  }
}
