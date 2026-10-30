import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  HS_SECRET,
  makeKeys,
  setTestEnv,
  signEs256,
  signHs256,
  type PrivateKey,
} from './helpers';

describe('API (e2e, in-process)', () => {
  let app: NestExpressApplication;
  let privateKey: PrivateKey;

  beforeAll(async () => {
    setTestEnv();
    const keys = await makeKeys();
    privateKey = keys.privateKey;
    app = await createTestApp({ jwks: keys.jwks });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('health', () => {
    it('GET /health returns ok without auth', async () => {
      await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    });

    it('GET /ready returns ok when the database is reachable', async () => {
      await request(app.getHttpServer()).get('/ready').expect(200);
    });

    it('sets security headers and hides x-powered-by', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('public routes', () => {
    it('GET /v1/plans lists plans without auth', async () => {
      const res = await request(app.getHttpServer()).get('/v1/plans').expect(200);
      expect(res.body.map((p: { id: string }) => p.id)).toEqual(['guest', 'free', 'starter']);
    });
  });

  describe('authentication', () => {
    const me = () => request(app.getHttpServer()).get('/v1/me');

    it('rejects requests without a token', async () => {
      const res = await me().expect(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('rejects a malformed Authorization header', async () => {
      await me().set('Authorization', 'Bearer not-a-jwt').expect(401);
      await me().set('Authorization', 'Basic abc').expect(401);
    });

    it('accepts a valid ES256 token verified via JWKS', async () => {
      const token = await signEs256(privateKey, { sub: '00000000-0000-0000-0000-0000000000aa' });
      const res = await me().set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body).toEqual({
        id: '00000000-0000-0000-0000-0000000000aa',
        email: 'user@example.test',
      });
    });

    it('accepts a valid legacy HS256 token when the secret is configured', async () => {
      const token = await signHs256(HS_SECRET);
      await me().set('Authorization', `Bearer ${token}`).expect(200);
    });

    it.each([
      ['expired', { expiresIn: '-1m' }],
      ['wrong issuer', { iss: 'https://evil.example/auth/v1' }],
      ['wrong audience', { aud: 'something-else' }],
      ['anon role', { role: 'anon' }],
      ['service role', { role: 'service_role' }],
    ])('rejects a token with %s', async (_label, opts) => {
      const token = await signEs256(privateKey, opts);
      const res = await me().set('Authorization', `Bearer ${token}`).expect(401);
      // The reason is never leaked to the client.
      expect(res.body.message).toBe('Invalid or expired session');
    });

    it('rejects a token signed by an unknown key', async () => {
      const other = await makeKeys();
      const token = await signEs256(other.privateKey);
      await me().set('Authorization', `Bearer ${token}`).expect(401);
    });

    it('rejects an HS256 token signed with the wrong secret', async () => {
      const token = await signHs256('a-completely-different-secret-value-xyz');
      await me().set('Authorization', `Bearer ${token}`).expect(401);
    });

    it('rejects alg=none tokens', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(
        JSON.stringify({ sub: 'x', role: 'authenticated', aud: 'authenticated' }),
      ).toString('base64url');
      await me().set('Authorization', `Bearer ${header}.${body}.`).expect(401);
    });
  });

  describe('errors', () => {
    it('returns 404 JSON for unknown routes without leaking internals', async () => {
      const token = await signEs256(privateKey);
      const res = await request(app.getHttpServer())
        .get('/v1/does-not-exist')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(res.body.statusCode).toBe(404);
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts/);
    });
  });
});

describe('readiness when the database is down', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    setTestEnv();
    app = await createTestApp({ jwks: (await makeKeys()).jwks, dbUp: false });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /ready returns 503', async () => {
    await request(app.getHttpServer()).get('/ready').expect(503);
  });
});

describe('rate limiting', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    setTestEnv({ RATE_LIMIT_PER_MINUTE: '3' });
    app = await createTestApp({ jwks: (await makeKeys()).jwks });
  });

  afterAll(async () => {
    await app?.close();
    setTestEnv();
  });

  it('returns 429 after the per-minute limit', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 3; i++) await request(server).get('/v1/plans').expect(200);
    await request(server).get('/v1/plans').expect(429);
  });

  it('does not rate limit health checks', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 6; i++) await request(server).get('/health').expect(200);
  });
});

describe('per-user rate limiting', () => {
  let app: NestExpressApplication;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Generous per-IP limit, tight per-user limit; one proxy so X-Forwarded-For sets the client IP.
    setTestEnv({
      RATE_LIMIT_PER_MINUTE: '100',
      USER_RATE_LIMIT_PER_MINUTE: '3',
      TRUST_PROXY_HOPS: '1',
    });
    const keys = await makeKeys();
    app = await createTestApp({ jwks: keys.jwks });
    tokenA = await signEs256(keys.privateKey, { sub: '00000000-0000-4000-8000-0000000000e1' });
    tokenB = await signEs256(keys.privateKey, { sub: '00000000-0000-4000-8000-0000000000e2' });
  });

  afterAll(async () => {
    await app?.close();
    setTestEnv();
  });

  it('limits a signed-in user across different IPs, without affecting other users', async () => {
    const server = app.getHttpServer();
    const me = (token: string, ip: string) =>
      request(server)
        .get('/v1/me')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', ip);
    for (let i = 0; i < 3; i++) await me(tokenA, `203.0.113.${i + 1}`).expect(200);
    await me(tokenA, '203.0.113.99').expect(429);
    await me(tokenB, '203.0.113.99').expect(200);
    // Anonymous requests aren't counted against users.
    await request(server).get('/v1/plans').set('X-Forwarded-For', '203.0.113.99').expect(200);
  });
});
