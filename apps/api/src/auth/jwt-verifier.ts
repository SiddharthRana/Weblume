import { Inject, Injectable } from '@nestjs/common';
import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTHeaderParameters,
  type JWTVerifyGetKey,
  type FlattenedJWSInput,
} from 'jose';
import { ENV, type Env } from '../config/env';
import type { AuthUser } from './auth.types';

export const JWT_KEY_RESOLVER = Symbol('JWT_KEY_RESOLVER');

export type KeyResolver = JWTVerifyGetKey;

/**
 * Supabase signs access tokens either with asymmetric signing keys (published as JWKS — the
 * current default) or, on older projects, with a shared HS256 secret. Support both.
 */
export function createSupabaseKeyResolver(env: Env): KeyResolver {
  const jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL), {
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
    timeoutDuration: 5_000,
  });
  const secret = env.SUPABASE_JWT_SECRET
    ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
    : undefined;

  return async (header: JWTHeaderParameters, token: FlattenedJWSInput) => {
    if (header.alg === 'HS256') {
      if (!secret) throw new errors.JOSEAlgNotAllowed('HS256 tokens require SUPABASE_JWT_SECRET');
      return secret;
    }
    return jwks(header, token);
  };
}

export class InvalidTokenError extends Error {}

@Injectable()
export class JwtVerifier {
  private readonly issuer: string;

  constructor(
    @Inject(ENV) env: Env,
    @Inject(JWT_KEY_RESOLVER) private readonly keys: KeyResolver,
  ) {
    this.issuer = new URL('/auth/v1', env.SUPABASE_URL).toString();
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256', 'HS256'],
        requiredClaims: ['sub', 'exp'],
        clockTolerance: 5,
      });
      // The anon key is also a JWT; only signed-in users carry role=authenticated.
      if (payload.role !== 'authenticated' || typeof payload.sub !== 'string') {
        throw new InvalidTokenError('not an authenticated user token');
      }
      return {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch (err) {
      if (err instanceof InvalidTokenError) throw err;
      throw new InvalidTokenError(err instanceof Error ? err.name : 'invalid token');
    }
  }
}
