import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerStorageService } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { AuthModule } from './auth/auth.module';
import { IpThrottlerGuard, USER_THROTTLER } from './common/throttle.guards';
import { PgThrottlerStorage } from './common/pg-throttler-storage';
import type { AuthUser } from './auth/auth.types';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { Database, DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { PlansController } from './plans/plans.controller';
import { ObservabilityModule } from './observability/observability.module';
import { ReportsModule } from './reports/reports.module';
import { ScansModule } from './scans/scans.module';
import { AccountModule } from './account/account.module';
import { BillingModule } from './billing/billing.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { JobsModule } from './jobs/pg-boss.service';
import { EmailModule } from './email/email';
import { MonitorsModule } from './monitors/monitors.module';

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Request path for logs: no query string, and share-link tokens masked (they grant access). */
export function logPath(url: string): string {
  return url.split('?')[0]!.replace(/^(\/v\d+\/shared\/)[^/]+/, '$1[token]');
}

export function rateLimitStore(env: Pick<Env, 'NODE_ENV' | 'RATE_LIMIT_STORE'>) {
  return env.RATE_LIMIT_STORE ?? (env.NODE_ENV === 'production' ? 'postgres' : 'memory');
}

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
          genReqId: (req: IncomingMessage) => {
            const incoming = req.headers['x-request-id'];
            return typeof incoming === 'string' && REQUEST_ID.test(incoming)
              ? incoming
              : randomUUID();
          },
          // Allow-list serializers: never log headers (auth/cookies), bodies, or query strings.
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              path: logPath(req.url),
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV, Database],
      useFactory: (env: Env, database: Database) => ({
        // Shared counters in Postgres so several API instances enforce one limit (no Redis).
        storage:
          rateLimitStore(env) === 'postgres'
            ? new PgThrottlerStorage(database.sql)
            : new ThrottlerStorageService(),
        throttlers: [
          // Per client IP (all requests).
          { name: 'default', ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE },
          // Per signed-in user, so rotating IPs doesn't lift the limit (UserThrottlerGuard, after auth).
          {
            name: USER_THROTTLER,
            ttl: 60_000,
            limit: env.USER_RATE_LIMIT_PER_MINUTE,
            skipIf: (ctx) => !ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user,
            getTracker: (req: Record<string, unknown>) => `user:${(req.user as AuthUser).id}`,
          },
        ],
      }),
    }),
    DatabaseModule,
    ObservabilityModule,
    AuthModule,
    JobsModule,
    EntitlementsModule,
    ScansModule,
    AccountModule,
    BillingModule,
    ReportsModule,
    EmailModule,
    MonitorsModule,
  ],
  controllers: [HealthController, PlansController],
  providers: [{ provide: APP_GUARD, useClass: IpThrottlerGuard }],
})
export class AppModule {}
