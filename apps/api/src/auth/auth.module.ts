import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from '../common/throttle.guards';
import { ENV, type Env } from '../config/env';
import { AuthGuard } from './auth.guard';
import { createSupabaseKeyResolver, JWT_KEY_RESOLVER, JwtVerifier } from './jwt-verifier';

@Module({
  providers: [
    {
      provide: JWT_KEY_RESOLVER,
      inject: [ENV],
      useFactory: (env: Env) => createSupabaseKeyResolver(env),
    },
    JwtVerifier,
    { provide: APP_GUARD, useClass: AuthGuard },
    // Must come after AuthGuard: it limits by the verified user id.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
  exports: [JwtVerifier],
})
export class AuthModule {}
