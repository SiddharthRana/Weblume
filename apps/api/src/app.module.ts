import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { ENV, type Env } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { PlansController } from './plans/plans.controller';

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

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
              path: req.url.split('?')[0],
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [{ ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }],
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [HealthController, PlansController, MeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
