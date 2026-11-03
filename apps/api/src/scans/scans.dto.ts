import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  AUDIT_CATEGORIES,
  FINDING_KINDS,
  REPORT_SOURCES,
  SCAN_FAILURE_CODES,
  SCAN_STATUSES,
  SEVERITIES,
  type AuditCategory,
  type CodeLanguage,
  type FindingKind,
  type LighthouseByStrategy,
  type ReportSource,
  type ScanFailureCode,
  type ScanStatus,
  type Severity,
  type SeverityCounts,
  type SourcesMap,
} from '@weblume/shared';

export class CreateScanBody {
  @ApiProperty({ example: 'example.com', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({
    description: 'Cloudflare Turnstile token. Required for guest (signed-out) scans.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}

export class ListScansQuery {
  @ApiPropertyOptional({ description: 'Filter by URL substring' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ type: 'integer', default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Cursor: return scans created before this time (nextCursor from the previous page)',
  })
  @IsOptional()
  @IsISO8601()
  before?: string;
}

// Named schemas (rather than inline objects) so generated clients get one reusable type each.
export class SeverityCountsDto {
  @ApiPropertyOptional({ type: 'integer' }) critical?: number;
  @ApiPropertyOptional({ type: 'integer' }) high?: number;
  @ApiPropertyOptional({ type: 'integer' }) medium?: number;
  @ApiPropertyOptional({ type: 'integer' }) low?: number;
  @ApiPropertyOptional({ type: 'integer' }) info?: number;
}

export class ScanSummaryDtoClass {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() targetUrl: string;
  @ApiProperty() normalizedUrl: string;
  @ApiProperty({ type: String, nullable: true }) finalUrl: string | null;
  @ApiProperty({ enum: SCAN_STATUSES }) status: ScanStatus;
  @ApiProperty({ enum: Object.keys(SCAN_FAILURE_CODES), nullable: true })
  failureCode: ScanFailureCode | null;
  @ApiProperty({ type: String, nullable: true }) failureMessage: string | null;
  @ApiProperty({ type: SeverityCountsDto }) severityCounts: SeverityCounts;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt: string | null;
}

export class CodeSnippetDto {
  @ApiProperty({ description: 'Where the code goes, e.g. "In the page’s <head>" or "nginx"' })
  label: string;
  @ApiProperty({ enum: ['html', 'xml', 'nginx', 'apache', 'text'] }) language: CodeLanguage;
  @ApiProperty() code: string;
}

export class CodeFixDto {
  @ApiProperty({ type: [CodeSnippetDto] }) snippets: CodeSnippetDto[];
  @ApiPropertyOptional() note?: string;
}

export class FindingDtoClass {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({
    description: 'Stable check identifier, e.g. seo.title.missing or lighthouse.<audit-id>',
  })
  checkId: string;
  @ApiProperty({ enum: AUDIT_CATEGORIES }) category: AuditCategory;
  @ApiProperty({ enum: SEVERITIES }) severity: Severity;
  @ApiProperty({ enum: FINDING_KINDS }) kind: FindingKind;
  @ApiProperty({ enum: REPORT_SOURCES }) source: ReportSource;
  @ApiProperty() title: string;
  @ApiProperty() whatItMeans: string;
  @ApiProperty() whyItMatters: string;
  @ApiProperty({ type: [String] }) howToFix: string[];
  @ApiPropertyOptional() learnMoreUrl?: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) details: Record<string, unknown>;
  @ApiProperty({
    description: 'Whether a code fix exists for this finding, even if this plan doesn’t include it',
  })
  codeFixAvailable: boolean;
  @ApiPropertyOptional({ type: CodeFixDto, description: 'Only on plans with code fixes' })
  codeFix?: CodeFixDto;
}

export class SourceStatusDto {
  @ApiProperty({ enum: ['ok', 'skipped', 'failed'] }) status: 'ok' | 'skipped' | 'failed';
  @ApiPropertyOptional({
    enum: [
      'not_configured',
      'disabled',
      'not_applicable',
      'timeout',
      'quota_exceeded',
      'upstream_error',
      'blocked',
      'invalid_response',
    ],
  })
  reason?: string;
}

export class ScanSourcesDto {
  @ApiPropertyOptional({ type: SourceStatusDto }) page_fetch?: SourceStatusDto;
  @ApiPropertyOptional({ type: SourceStatusDto }) psi_mobile?: SourceStatusDto;
  @ApiPropertyOptional({ type: SourceStatusDto }) psi_desktop?: SourceStatusDto;
  @ApiPropertyOptional({ type: SourceStatusDto }) link_check?: SourceStatusDto;
  @ApiPropertyOptional({ type: SourceStatusDto }) robots_sitemap?: SourceStatusDto;
}

export class LighthouseScoresDto {
  @ApiProperty({ type: 'integer', nullable: true }) performance: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) accessibility: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) seo: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) bestPractices: number | null;
}

export class LighthouseMetricsDto {
  @ApiPropertyOptional({ description: 'Milliseconds' }) firstContentfulPaint?: number;
  @ApiPropertyOptional({ description: 'Milliseconds' }) largestContentfulPaint?: number;
  @ApiPropertyOptional({ description: 'Milliseconds' }) totalBlockingTime?: number;
  @ApiPropertyOptional({ description: 'Unitless' }) cumulativeLayoutShift?: number;
  @ApiPropertyOptional({ description: 'Milliseconds' }) speedIndex?: number;
}

export class LighthouseResultDto {
  @ApiProperty({ type: LighthouseScoresDto }) scores: LighthouseScoresDto;
  @ApiProperty({ type: LighthouseMetricsDto }) metrics: LighthouseMetricsDto;
  @ApiPropertyOptional() lighthouseVersion?: string;
  @ApiProperty({ format: 'date-time' }) fetchedAt: string;
}

export class LighthouseByStrategyDto {
  @ApiPropertyOptional({ type: LighthouseResultDto }) mobile?: LighthouseResultDto;
  @ApiPropertyOptional({ type: LighthouseResultDto }) desktop?: LighthouseResultDto;
}

export class ScanReportDtoClass extends ScanSummaryDtoClass {
  @ApiProperty({ type: ScanSourcesDto, description: 'Outcome of each data source' })
  sources: SourcesMap;

  @ApiProperty({
    type: LighthouseByStrategyDto,
    nullable: true,
    description: 'Lighthouse results from Google PageSpeed Insights; null when unavailable',
  })
  lighthouse: LighthouseByStrategy | null;

  @ApiProperty({ type: [String] }) passedChecks: string[];
  @ApiProperty({ type: [FindingDtoClass] }) findings: FindingDtoClass[];
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
}

export class CreateScanResponse {
  @ApiProperty({ type: ScanSummaryDtoClass }) scan: ScanSummaryDtoClass;
  @ApiPropertyOptional({
    description:
      'Guest scans only: secret required to view the scan (send as X-Scan-Token). Shown once.',
  })
  scanToken?: string;
  @ApiProperty({
    description: 'True when an identical recent scan was returned instead of starting a new one',
  })
  deduplicated: boolean;
}

export class ScanListResponse {
  @ApiProperty({ type: [ScanSummaryDtoClass] }) items: ScanSummaryDtoClass[];
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) nextCursor: string | null;
}

export class ApiErrorDto {
  @ApiProperty({ type: 'integer' }) statusCode: number;
  @ApiProperty({ example: 'quota_exceeded' }) code: string;
  @ApiProperty() message: string;
}
