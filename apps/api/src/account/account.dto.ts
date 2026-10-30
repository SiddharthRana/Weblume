import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PLAN_IDS, SUBSCRIPTION_STATUSES } from '@weblume/shared';
import { EntitlementsDto } from '../plans/plans.dto';

export class UpdateAccountBody {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(100)
  displayName?: string | null;
}

export class DeleteAccountBody {
  @ApiProperty({ example: 'DELETE', description: 'Must be exactly "DELETE"' })
  @IsString()
  @Equals('DELETE', { message: 'Type DELETE to confirm account deletion.' })
  confirm: string;
}

class AccountPlanDto {
  @ApiProperty({ enum: PLAN_IDS }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() paid: boolean;
  @ApiProperty({ enum: ['default', 'subscription'] }) source: 'default' | 'subscription';
}

class UsageDto {
  @ApiProperty({ type: 'integer' }) used: number;
  @ApiProperty({ type: 'integer' }) limit: number;
  @ApiProperty({ format: 'date-time' }) periodStart: string;
  @ApiProperty({ format: 'date-time' }) resetsAt: string;
}

class AccountSubscriptionDto {
  @ApiProperty() provider: string;
  @ApiProperty({ enum: PLAN_IDS }) planId: string;
  @ApiProperty({ enum: SUBSCRIPTION_STATUSES }) status: string;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) currentPeriodEnd:
    string | null;
  @ApiProperty() cancelAtPeriodEnd: boolean;
}

export class AccountDtoClass {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty({ type: String, nullable: true }) displayName: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: AccountPlanDto }) plan: AccountPlanDto;
  @ApiProperty({ type: EntitlementsDto }) entitlements: EntitlementsDto;
  @ApiProperty({ type: UsageDto }) usage: UsageDto;
  @ApiProperty({ type: [AccountSubscriptionDto] }) subscriptions: AccountSubscriptionDto[];
}

export class DeleteAccountResponse {
  @ApiProperty({
    enum: ['deleted', 'pending'],
    description: 'pending: app data is deleted; the sign-in record will be removed shortly',
  })
  status: 'deleted' | 'pending';
}
