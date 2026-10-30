import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SEVERITIES, type Severity } from '@weblume/shared';
import {
  FindingDtoClass,
  ScanReportDtoClass,
  ScanSummaryDtoClass,
  SeverityCountsDto,
} from '../scans/scans.dto';

export const SHARE_DEFAULT_DAYS = 30;
export const SHARE_MAX_DAYS = 365;

export class CompareQuery {
  @ApiProperty({ format: 'uuid', description: 'One scan of the URL' })
  @IsUUID()
  base: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Another scan of the same URL. The older scan is always treated as the base.',
  })
  @IsUUID()
  target: string;
}

export class ScoreDeltaDto {
  @ApiProperty({ type: 'integer', nullable: true }) before: number | null;
  @ApiProperty({ type: 'integer', nullable: true }) after: number | null;
  @ApiProperty({ type: 'integer', nullable: true, description: 'after − before' })
  delta: number | null;
}

export class ScoreDeltasDto {
  @ApiProperty({ type: ScoreDeltaDto }) performance: ScoreDeltaDto;
  @ApiProperty({ type: ScoreDeltaDto }) accessibility: ScoreDeltaDto;
  @ApiProperty({ type: ScoreDeltaDto }) seo: ScoreDeltaDto;
  @ApiProperty({ type: ScoreDeltaDto }) bestPractices: ScoreDeltaDto;
}

export class ScoreComparisonDto {
  @ApiPropertyOptional({ type: ScoreDeltasDto }) mobile?: ScoreDeltasDto;
  @ApiPropertyOptional({ type: ScoreDeltasDto }) desktop?: ScoreDeltasDto;
}

export class UnchangedFindingDto {
  @ApiProperty({ type: FindingDtoClass, description: 'As it appears in the newer scan' })
  finding: FindingDtoClass;
  @ApiPropertyOptional({ enum: SEVERITIES, description: 'Set when the severity changed' })
  previousSeverity?: Severity;
}

export class ReportComparisonDto {
  @ApiProperty({ type: ScanSummaryDtoClass, description: 'The older scan' })
  base: ScanSummaryDtoClass;
  @ApiProperty({ type: ScanSummaryDtoClass, description: 'The newer scan' })
  target: ScanSummaryDtoClass;
  @ApiProperty({ type: ScoreComparisonDto }) scores: ScoreComparisonDto;
  @ApiProperty({ type: [FindingDtoClass] }) newFindings: FindingDtoClass[];
  @ApiProperty({ type: [FindingDtoClass] }) resolvedFindings: FindingDtoClass[];
  @ApiProperty({ type: [UnchangedFindingDto] }) unchangedFindings: UnchangedFindingDto[];
  @ApiProperty({
    type: [FindingDtoClass],
    description:
      'Findings whose data source did not run in one of the scans, so they are neither new nor resolved',
  })
  notComparable: FindingDtoClass[];
  @ApiProperty({ type: SeverityCountsDto, description: 'Newer minus older, per severity' })
  severityDelta: SeverityCountsDto;
}

export class CreateShareBody {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: SHARE_MAX_DAYS,
    default: SHARE_DEFAULT_DAYS,
    description: 'Days until the link stops working. It also stops when the scan is deleted.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SHARE_MAX_DAYS)
  expiresInDays?: number;
}

export class ShareLinkDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) scanId: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) expiresAt: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) revokedAt: string | null;
  @ApiProperty({ description: 'False once revoked or expired' }) active: boolean;
}

export class CreateShareResponse {
  @ApiProperty({ type: ShareLinkDto }) share: ShareLinkDto;
  @ApiProperty({
    description:
      'Secret for the share URL (/r/<token>). Shown once: only a hash is stored, so it cannot be retrieved later.',
  })
  token: string;
  @ApiProperty({ description: 'Full share URL on the public site' }) url: string;
}

export class ShareListResponse {
  @ApiProperty({ type: [ShareLinkDto] }) items: ShareLinkDto[];
}

export class SharedReportDto {
  @ApiProperty({ type: ScanReportDtoClass }) report: ScanReportDtoClass;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  shareExpiresAt: string | null;
}
