import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, or } from 'drizzle-orm';
import {
  compareReports,
  COMPARABLE_SCAN_STATUSES,
  type Entitlements,
  type ReportComparison,
  type ScanReportDto,
} from '@weblume/shared';
import type { AuthUser } from '../auth/auth.types';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { scans, shareLinks, type ScanRow, type ShareLinkRow } from '../database/schema';
import { EntitlementService } from '../entitlements/entitlement.service';
import { ApiError } from '../scans/scans.errors';
import { ScansService } from '../scans/scans.service';
import { renderReportPdf } from './report-pdf';
import { SHARE_DEFAULT_DAYS } from './reports.dto';

/** Per scan, so a leaked account can't mint unlimited links. Revoked/expired ones don't count. */
export const MAX_ACTIVE_SHARES_PER_SCAN = 20;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

type PaidFeature = keyof Pick<Entitlements, 'comparison' | 'pdfExport' | 'shareLinks'>;

const FEATURE_MESSAGES: Record<PaidFeature, string> = {
  comparison: 'Comparing scans is part of the Starter plan.',
  pdfExport: 'PDF reports are part of the Starter plan.',
  shareLinks: 'Share links are part of the Starter plan.',
};

export interface ShareLinkView {
  id: string;
  scanId: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly database: Database,
    private readonly scans: ScansService,
    private readonly entitlements: EntitlementService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async compare(user: AuthUser, aId: string, bId: string): Promise<ReportComparison> {
    await this.requireFeature(user, 'comparison');
    if (aId === bId)
      throw new ApiError(HttpStatus.BAD_REQUEST, 'same_scan', 'Choose two different scans.');
    const [a, b] = await Promise.all([
      this.scans.get(aId, { user }),
      this.scans.get(bId, { user }),
    ]);
    const result = compareReports(a, b);
    if (result.ok) return result.comparison;
    throw result.error === 'different_urls'
      ? new ApiError(
          HttpStatus.BAD_REQUEST,
          'different_urls',
          'Only scans of the same address can be compared.',
        )
      : new ApiError(
          HttpStatus.CONFLICT,
          'report_not_ready',
          'Both scans must have finished with a report.',
        );
  }

  async pdf(user: AuthUser, scanId: string): Promise<{ pdf: Buffer; filename: string }> {
    await this.requireFeature(user, 'pdfExport');
    const report = await this.scans.get(scanId, { user });
    this.assertFinished(report);
    const pdf = await renderReportPdf(report, { siteUrl: this.env.PUBLIC_SITE_URL });
    const host = new URL(report.normalizedUrl).hostname.replace(/[^a-z0-9.-]/gi, '');
    const day = (report.completedAt ?? report.createdAt).slice(0, 10);
    return { pdf, filename: `weblume-${host}-${day}.pdf` };
  }

  async createShare(
    user: AuthUser,
    scanId: string,
    expiresInDays = SHARE_DEFAULT_DAYS,
  ): Promise<{ share: ShareLinkView; token: string; url: string }> {
    await this.requireFeature(user, 'shareLinks');
    const row = await this.scans.findOwned(scanId, { user });
    this.assertFinished(row);
    const db = this.database.db;
    const now = new Date();
    const [{ n }] = (await db
      .select({ n: count() })
      .from(shareLinks)
      .where(and(eq(shareLinks.scanId, row.id), activeShare(now)))) as [{ n: number }];
    if (n >= MAX_ACTIVE_SHARES_PER_SCAN) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'too_many_share_links',
        `This report already has ${MAX_ACTIVE_SHARES_PER_SCAN} active share links. Revoke one first.`,
      );
    }
    // 128 random bits; only the hash is stored, so a database leak doesn't expose working links.
    const token = randomBytes(16).toString('base64url');
    const requested = new Date(now.getTime() + expiresInDays * 86_400_000);
    // A link never outlives the report it points to.
    const expiresAt = requested < row.expiresAt ? requested : row.expiresAt;
    const [share] = await db
      .insert(shareLinks)
      .values({ scanId: row.id, createdBy: user.id, tokenHash: sha256(token), expiresAt })
      .returning();
    const url = `${this.env.PUBLIC_SITE_URL.replace(/\/$/, '')}/r/${token}`;
    return { share: toShareView(share!, now), token, url };
  }

  async listShares(user: AuthUser, scanId: string): Promise<ShareLinkView[]> {
    const row = await this.scans.findOwned(scanId, { user });
    const rows = await this.database.db
      .select()
      .from(shareLinks)
      .where(and(eq(shareLinks.scanId, row.id), eq(shareLinks.createdBy, user.id)))
      .orderBy(desc(shareLinks.createdAt));
    const now = new Date();
    return rows.map((r) => toShareView(r, now));
  }

  /** Revoking is always allowed, even after a downgrade, so owners can withdraw links. */
  async revokeShare(user: AuthUser, shareId: string): Promise<ShareLinkView> {
    const db = this.database.db;
    const [updated] = await db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(shareLinks.id, shareId),
          eq(shareLinks.createdBy, user.id),
          isNull(shareLinks.revokedAt),
        ),
      )
      .returning();
    if (updated) return toShareView(updated, new Date());
    const [existing] = await db
      .select()
      .from(shareLinks)
      .where(and(eq(shareLinks.id, shareId), eq(shareLinks.createdBy, user.id)))
      .limit(1);
    if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'Share link not found.');
    return toShareView(existing, new Date()); // already revoked: idempotent
  }

  /**
   * Public, read-only view of a shared report. Unknown, revoked and expired tokens all get the
   * same 404 so tokens can't be probed. Links keep working until they expire even if the owner
   * later downgrades: they may already have sent them to clients.
   */
  async viewShared(
    token: string,
  ): Promise<{ report: ScanReportDto; shareExpiresAt: string | null }> {
    const notFound = new ApiError(
      HttpStatus.NOT_FOUND,
      'not_found',
      'This link doesn’t work. It may have expired or been turned off by its owner.',
    );
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw notFound;
    const now = new Date();
    const [hit] = await this.database.db
      .select({ share: shareLinks, scan: scans })
      .from(shareLinks)
      .innerJoin(scans, eq(scans.id, shareLinks.scanId))
      .where(
        and(eq(shareLinks.tokenHash, sha256(token)), activeShare(now), gt(scans.expiresAt, now)),
      )
      .limit(1);
    if (!hit || hit.scan.userId !== hit.share.createdBy) throw notFound;
    // A shared report shows what its owner's plan includes.
    const report = await this.scans.buildReport(
      hit.scan,
      await this.scans.codeFixesFor(hit.scan.userId).catch(() => false),
    );
    return { report, shareExpiresAt: hit.share.expiresAt?.toISOString() ?? null };
  }

  private async requireFeature(user: AuthUser, feature: PaidFeature): Promise<void> {
    const resolved = await this.entitlements.forUser(user.id);
    if (!resolved.entitlements[feature]) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'upgrade_required', FEATURE_MESSAGES[feature], {
        feature,
      });
    }
  }

  private assertFinished(r: Pick<ScanRow | ScanReportDto, 'status'>): void {
    if (!(COMPARABLE_SCAN_STATUSES as readonly string[]).includes(r.status)) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'report_not_ready',
        'This scan hasn’t produced a report yet.',
      );
    }
  }
}

function activeShare(now: Date) {
  return and(
    isNull(shareLinks.revokedAt),
    or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
  );
}

function toShareView(r: ShareLinkRow, now: Date): ShareLinkView {
  return {
    id: r.id,
    scanId: r.scanId,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    active: !r.revokedAt && (!r.expiresAt || r.expiresAt > now),
  };
}
