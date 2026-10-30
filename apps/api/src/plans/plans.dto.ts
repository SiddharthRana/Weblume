import { ApiProperty } from '@nestjs/swagger';
import { PLAN_IDS, type PlanId, type QuotaPeriod } from '@weblume/shared';

export class EntitlementsDto {
  @ApiProperty({ type: 'integer' }) scansPerPeriod: number;
  @ApiProperty({ enum: ['day', 'calendar_month', 'billing_period'] }) quotaPeriod: QuotaPeriod;
  @ApiProperty({ type: 'integer' }) retentionDays: number;
  @ApiProperty() lighthouseData: boolean;
  @ApiProperty() comparison: boolean;
  @ApiProperty() pdfExport: boolean;
  @ApiProperty() shareLinks: boolean;
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
