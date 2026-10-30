import { Global, Module } from '@nestjs/common';
import { FeatureFlags } from '../common/feature-flags.service';
import { EntitlementService } from './entitlement.service';

@Global()
@Module({
  providers: [EntitlementService, FeatureFlags],
  exports: [EntitlementService, FeatureFlags],
})
export class EntitlementsModule {}
