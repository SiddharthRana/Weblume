import type { AuditCategory, LighthouseResult, SourceFailReason } from '@weblume/shared';

export type Strategy = 'mobile' | 'desktop';

/** A failing Lighthouse audit, trimmed to what we store and display. */
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue?: string;
  category: AuditCategory;
  /** Lighthouse category id the audit came from (performance, accessibility, seo, best-practices). */
  lhCategory: string;
  weight: number;
  group?: string;
}

export interface TrimmedLighthouse extends LighthouseResult {
  failingAudits: LighthouseAudit[];
}

export type PsiOutcome =
  | { ok: true; result: TrimmedLighthouse }
  | { ok: false; reason: SourceFailReason | 'not_configured' };

export interface PsiProvider {
  readonly configured: boolean;
  run(url: string, strategy: Strategy, signal?: AbortSignal): Promise<PsiOutcome>;
}

export const PSI_PROVIDER = Symbol('PSI_PROVIDER');
