export const SCAN_STATUSES = ['queued', 'running', 'completed', 'partial', 'failed'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const TERMINAL_SCAN_STATUSES: readonly ScanStatus[] = ['completed', 'partial', 'failed'];

export const AUDIT_CATEGORIES = ['performance', 'seo', 'accessibility', 'technical'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Where a piece of report data came from. Reports must say which sources ran or failed. */
export const REPORT_SOURCES = [
  'page_fetch',
  'psi_mobile',
  'psi_desktop',
  'link_check',
  'robots_sitemap',
] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

/** Distinguishes measured data from automated detections and advice (see docs/scoring.md). */
export const FINDING_KINDS = ['measured', 'detected', 'recommendation'] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];
