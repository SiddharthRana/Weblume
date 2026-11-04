import { ApiProperty } from '@nestjs/swagger';
import {
  MONITOR_FREQUENCIES,
  PLAN_IDS,
  type MonitorFrequency,
  type PlanId,
  type QuotaPeriod,
} from '@weblume/shared';

export class EntitlementsDto {
  @ApiProperty({ type: 'integer' }) scansPerPeriod: number;
  @ApiProperty({ enum: ['day', 'calendar_month', 'billing_period'] }) quotaPeriod: QuotaPeriod;
  @ApiProperty({ type: 'integer' }) retentionDays: number;
  @ApiProperty() lighthouseData: boolean;
  @ApiProperty() comparison: boolean;
  @ApiProperty() pdfExport: boolean;
  @ApiProperty() codeFixes: boolean;
  @ApiProperty() shareLinks: boolean;
  @ApiProperty({ type: 'integer', description: 'Sites that can be monitored (0 = none)' })
  monitoredSites: number;
  @ApiProperty({
    enum: MONITOR_FREQUENCIES,
    nullable: true,
    description: 'Fastest re-scan frequency allowed; slower ones are allowed too',
  })
  monitorFrequency: MonitorFrequency | null;
}

export class DisplayPriceDto {
  @ApiProperty({ enum: ['INR', 'USD'] }) currency: 'INR' | 'USD';
  @ApiProperty({ type: 'integer', description: 'Monthly price in minor units (paise/cents)' })
  monthly: number;
  @ApiProperty({ type: 'integer', description: 'Annual price in minor units (paise/cents)' })
  annual: number;
}

export class PlanDto {
  @ApiProperty({ enum: PLAN_IDS }) id: PlanId;
  @ApiProperty() name: string;
  @ApiProperty() paid: boolean;
  @ApiProperty({ type: EntitlementsDto }) entitlements: EntitlementsDto;
  @ApiProperty({
    type: [DisplayPriceDto],
    required: false,
    description: 'Indicative prices only; the charged amount comes from the payment provider.',
  })
  displayPrices?: DisplayPriceDto[];
}
