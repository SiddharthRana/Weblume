import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MONITOR_ALERTS,
  MONITOR_FREQUENCIES,
  type MonitorAlert,
  type MonitorFrequency,
} from '@weblume/shared';
import { ScanSummaryDtoClass } from '../scans/scans.dto';

export class CreateMonitorBody {
  @ApiProperty({ example: 'example.com', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({
    enum: MONITOR_FREQUENCIES,
    description: 'Defaults to the fastest frequency the plan allows (Free: weekly, Starter: daily)',
  })
  @IsOptional()
  @IsIn(MONITOR_FREQUENCIES)
  frequency?: MonitorFrequency;

  @ApiPropertyOptional({ enum: MONITOR_ALERTS, description: 'Defaults to any_change' })
  @IsOptional()
  @IsIn(MONITOR_ALERTS)
  alert?: MonitorAlert;
}

export class UpdateMonitorBody {
  @ApiPropertyOptional({ description: 'false pauses scheduled scans and emails' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: MONITOR_FREQUENCIES })
  @IsOptional()
  @IsIn(MONITOR_FREQUENCIES)
  frequency?: MonitorFrequency;

  @ApiPropertyOptional({ enum: MONITOR_ALERTS })
  @IsOptional()
  @IsIn(MONITOR_ALERTS)
  alert?: MonitorAlert;
}

export class PauseMonitorBody {
  @ApiProperty({ description: 'The token from the "Pause monitoring" link in a digest email' })
  @IsString()
  @MaxLength(200)
  token: string;
}

export class MonitorDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() targetUrl: string;
  @ApiProperty() normalizedUrl: string;
  @ApiProperty({ enum: MONITOR_FREQUENCIES }) frequency: MonitorFrequency;
  @ApiProperty({ enum: MONITOR_ALERTS }) alert: MonitorAlert;
  @ApiProperty() enabled: boolean;
  @ApiProperty({ format: 'date-time' }) nextRunAt: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lastRunAt: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) lastDigestAt: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Why the last run was skipped: plan (plan has no monitoring), plan_limit (over the plan limit), previous_run_active, account_deleted',
  })
  lastSkipReason: string | null;
  @ApiProperty({ type: ScanSummaryDtoClass, nullable: true }) lastScan: ScanSummaryDtoClass | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class MonitorListResponse {
  @ApiProperty({ type: [MonitorDto] }) items: MonitorDto[];
  @ApiProperty({ type: 'integer', description: 'Sites the plan can monitor' }) limit: number;
  @ApiProperty({ enum: MONITOR_FREQUENCIES, nullable: true })
  fastestFrequency: MonitorFrequency | null;
}

export class PauseMonitorResponse {
  @ApiProperty() targetUrl: string;
  @ApiProperty() alreadyPaused: boolean;
}
