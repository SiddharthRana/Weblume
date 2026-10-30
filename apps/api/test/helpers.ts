import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import {
  createSupabaseKeyResolver,
  JWT_KEY_RESOLVER,
  type KeyResolver,
} from '../src/auth/jwt-verifier';
import { loadEnv } from '../src/config/env';
import { Database } from '../src/database/database.module';
import { SCAN_QUEUE } from '../src/scans/scan-queue';
import { AccountService } from '../src/account/account.service';

export const SUPABASE_URL = 'http://supabase.test';
export const ISSUER = `${SUPABASE_URL}/auth/v1`;
export const HS_SECRET = 'test-secret-that-is-long-enough-for-hs256!!';

export function setTestEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test',
    SUPABASE_URL,
    SUPABASE_JWT_SECRET: HS_SECRET,
    LOG_LEVEL: 'silent',
    CORS_ORIGINS: 'http://localhost:3000',
    RATE_LIMIT_PER_MINUTE: '1000',
    WORKER_ENABLED: 'false',
    ...overrides,
  });
}

export type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

export async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };
  return { privateKey, jwks: createLocalJWKSet({ keys: [jwk] }) };
}

export interface TokenOptions {
  sub?: string;
  role?: string;
  aud?: string;
  iss?: string;
  expiresIn?: string;
  email?: string;
}

export async function signEs256(privateKey: PrivateKey, opts: TokenOptions = {}) {
  return new SignJWT({
    role: opts.role ?? 'authenticated',
    email: opts.email ?? 'user@example.test',
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setSubject(opts.sub ?? '00000000-0000-0000-0000-0000000000aa')
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '5m')
    .sign(privateKey);
}

export async function signHs256(secret: string, opts: TokenOptions = {}) {
  return new SignJWT({ role: opts.role ?? 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(opts.sub ?? '00000000-0000-0000-0000-0000000000bb')
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '5m')
    .sign(new TextEncoder().encode(secret));
}

/** Boots the real AppModule with a local JWKS (plus the HS256 secret) and a fake database. */
export async function createTestApp(opts: {
  jwks: ReturnType<typeof createLocalJWKSet>;
  dbUp?: boolean;
}) {
  const env = loadEnv();
  const remoteResolver = createSupabaseKeyResolver(env);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(JWT_KEY_RESOLVER)
    .useValue(((header, token) =>
      header.alg === 'HS256'
        ? remoteResolver(header, token)
        : opts.jwks(header, token)) satisfies KeyResolver)
    .overrideProvider(Database)
    .useValue({ ping: async () => opts.dbUp ?? true, onApplicationShutdown: async () => undefined })
    .overrideProvider(SCAN_QUEUE)
    .useValue({ enqueue: async () => undefined })
    // /v1/me reads the database; these tests only exercise authentication, so echo the user back.
    .overrideProvider(AccountService)
    .useValue({ get: async (u: { id: string; email?: string }) => ({ id: u.id, email: u.email }) })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}
