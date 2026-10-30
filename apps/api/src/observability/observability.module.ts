import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ENV, type Env } from '../config/env';
import { ERROR_REPORTER, NoopErrorReporter, SentryErrorReporter } from './error-reporter';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ReportingExceptionFilter } from './reporting-exception.filter';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: ERROR_REPORTER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.SENTRY_DSN
          ? new SentryErrorReporter(
              env.SENTRY_DSN,
              env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
              process.env.npm_package_version,
            )
          : new NoopErrorReporter(),
    },
    { provide: APP_FILTER, useClass: ReportingExceptionFilter },
  ],
  exports: [ERROR_REPORTER, MetricsService],
})
export class ObservabilityModule {}
