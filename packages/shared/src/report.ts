import type { AuditCategory, FindingKind, ReportSource, ScanStatus } from './scan.js';
import type { Severity } from './severity.js';

/** Outcome of one data source during a scan. Reports must show which sources ran or failed. */
export type SourceStatus =
  | { status: 'ok' }
  | { status: 'skipped'; reason: SourceSkipReason }
  | { status: 'failed'; reason: SourceFailReason };

export type SourceSkipReason = 'not_configured' | 'disabled' | 'not_applicable';
export type SourceFailReason =
  'timeout' | 'quota_exceeded' | 'upstream_error' | 'blocked' | 'invalid_response';

export type SourcesMap = Partial<Record<ReportSource, SourceStatus>>;

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
}

export interface LighthouseMetrics {
  /** Milliseconds unless noted. */
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalBlockingTime?: number;
  /** Unitless. */
  cumulativeLayoutShift?: number;
  speedIndex?: number;
}

export interface LighthouseResult {
  scores: LighthouseScores;
  metrics: LighthouseMetrics;
  lighthouseVersion?: string;
  fetchedAt: string;
}

export type LighthouseByStrategy = Partial<Record<'mobile' | 'desktop', LighthouseResult>>;

export type SeverityCounts = Partial<Record<Severity, number>>;

/**
 * Failure codes for whole scans. `ours` = caused by Weblume or an integration (retry is free);
 * `target` = caused by the scanned site or the submitted address.
 */
export const SCAN_FAILURE_CODES = {
  invalid_url: 'target',
  blocked_destination: 'target',
  dns_failure: 'target',
  connection_failed: 'target',
  tls_error: 'target',
  timeout: 'target',
  too_many_redirects: 'target',
  response_too_large: 'target',
  not_html: 'target',
  http_error: 'target',
  internal_error: 'ours',
  scan_timeout: 'ours',
} as const;
export type ScanFailureCode = keyof typeof SCAN_FAILURE_CODES;

export const SCAN_FAILURE_MESSAGES: Record<ScanFailureCode, string> = {
  invalid_url: 'That address can’t be scanned.',
  blocked_destination:
    'That address points to a private or restricted network, which Weblume doesn’t scan.',
  dns_failure: 'We couldn’t find that website. Check the address for typos.',
  connection_failed:
    'We couldn’t connect to that website. It may be down or blocking automated visitors.',
  tls_error: 'The website’s HTTPS certificate couldn’t be verified.',
  timeout: 'The website took too long to respond.',
  too_many_redirects: 'The address redirected too many times.',
  response_too_large: 'The page is larger than the maximum size we scan.',
  not_html: 'That address doesn’t return a web page (HTML).',
  http_error: 'The website returned an error instead of the page.',
  internal_error: 'Something went wrong on our side. Retrying won’t count against your quota.',
  scan_timeout: 'The scan took too long to finish. Retrying won’t count against your quota.',
};

export interface FindingDto {
  id: string;
  checkId: string;
  category: AuditCategory;
  severity: Severity;
  kind: FindingKind;
  source: ReportSource;
  title: string;
  whatItMeans: string;
  whyItMatters: string;
  howToFix: string[];
  learnMoreUrl?: string;
  /** Check-specific evidence, e.g. offending URLs, measured value. */
  details: Record<string, unknown>;
}

export interface ScanSummaryDto {
  id: string;
  targetUrl: string;
  normalizedUrl: string;
  finalUrl: string | null;
  status: ScanStatus;
  failureCode: ScanFailureCode | null;
  failureMessage: string | null;
  severityCounts: SeverityCounts;
  createdAt: string;
  completedAt: string | null;
}

export interface ScanReportDto extends ScanSummaryDto {
  sources: SourcesMap;
  lighthouse: LighthouseByStrategy | null;
  passedChecks: string[];
  findings: FindingDto[];
  expiresAt: string;
}
