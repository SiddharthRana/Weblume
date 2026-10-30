import { ApiProperty, ApiPropertyOptional, type ApiPropertyOptions } from '@nestjs/swagger';

// @nestjs/swagger doesn't export its nested schema type, so derive it.
type SchemaObjectMetadata = NonNullable<
  Extract<ApiPropertyOptions, { properties?: unknown }>['properties']
>[string];
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

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
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

const severityCountsSchema: ApiPropertyOptions = {
  type: 'object',
  properties: Object.fromEntries(SEVERITIES.map((s) => [s, { type: 'integer' }])),
};

export class ScanSummaryDtoClass {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() targetUrl: string;
  @ApiProperty() normalizedUrl: string;
  @ApiProperty({ type: String, nullable: true }) finalUrl: string | null;
  @ApiProperty({ enum: SCAN_STATUSES }) status: ScanStatus;
  @ApiProperty({ enum: Object.keys(SCAN_FAILURE_CODES), nullable: true })
  failureCode: ScanFailureCode | null;
  @ApiProperty({ type: String, nullable: true }) failureMessage: string | null;
  @ApiProperty(severityCountsSchema) severityCounts: SeverityCounts;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt: string | null;
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
}

const sourceStatusSchema: SchemaObjectMetadata = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['ok', 'skipped', 'failed'] },
    reason: {
      type: 'string',
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
    },
  },
};

const lighthouseResultSchema: SchemaObjectMetadata = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: Object.fromEntries(
        ['performance', 'accessibility', 'seo', 'bestPractices'].map((k) => [
          k,
          { type: 'integer', nullable: true },
        ]),
      ),
    },
    metrics: {
      type: 'object',
      properties: Object.fromEntries(
        [
          'firstContentfulPaint',
          'largestContentfulPaint',
          'totalBlockingTime',
          'cumulativeLayoutShift',
          'speedIndex',
        ].map((k) => [k, { type: 'number' }]),
      ),
    },
    lighthouseVersion: { type: 'string' },
    fetchedAt: { type: 'string', format: 'date-time' },
  },
};

export class ScanReportDtoClass extends ScanSummaryDtoClass {
  @ApiProperty({
    type: 'object',
    properties: Object.fromEntries(REPORT_SOURCES.map((s) => [s, sourceStatusSchema])),
    description: 'Outcome of each data source',
  })
  sources: SourcesMap;

  @ApiProperty({
    type: 'object',
    nullable: true,
    properties: { mobile: lighthouseResultSchema, desktop: lighthouseResultSchema },
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
  @ApiProperty() statusCode: number;
  @ApiProperty({ example: 'quota_exceeded' }) code: string;
  @ApiProperty() message: string;
}
