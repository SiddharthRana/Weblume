import { Module } from '@nestjs/common';
import { ScansModule } from '../scans/scans.module';
import { MonitorsController } from './monitors.controller';
import { MonitorsScheduler } from './monitors.scheduler';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [ScansModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsScheduler],
  exports: [MonitorsService],
})
export class MonitorsModule {}
