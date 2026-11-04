import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule, rateLimitStore } from '../src/app.module';
import { configureApp } from '../src/app';
import { PgThrottlerStorage } from '../src/common/pg-throttler-storage';
import { Database } from '../src/database/database.module';
import { SCAN_QUEUE } from '../src/scans/scan-queue';
import { setTestEnv } from './helpers';

const DB_URL = process.env.TEST_DATABASE_URL;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('rate limit store selection', () => {
  it('uses Postgres in production and memory elsewhere, unless set explicitly', () => {
    expect(rateLimitStore({ NODE_ENV: 'production' })).toBe('postgres');
    expect(rateLimitStore({ NODE_ENV: 'test' })).toBe('memory');
    expect(rateLimitStore({ NODE_ENV: 'development' })).toBe('memory');
    expect(rateLimitStore({ NODE_ENV: 'production', RATE_LIMIT_STORE: 'memory' })).toBe('memory');
    expect(rateLimitStore({ NODE_ENV: 'development', RATE_LIMIT_STORE: 'postgres' })).toBe(
      'postgres',
    );
  });

  it('lets requests through when the database is unreachable', async () => {
    const sql = postgres('postgres://test:test@127.0.0.1:1/test', {
      connect_timeout: 1,
      max: 1,
      onnotice: () => undefined,
    });
    const r = await new PgThrottlerStorage(sql).increment('k', 60_000, 1, 60_000, 'default');
    expect(r).toMatchObject({ isBlocked: false, totalHits: 0 });
    await sql.end({ timeout: 1 });
  });
});

describe.skipIf(!DB_URL)('Postgres rate limit store (database e2e)', () => {
  // Two pools stand in for two API instances.
  let sqlA: postgres.Sql;
  let sqlB: postgres.Sql;
  let a: PgThrottlerStorage;
  let b: PgThrottlerStorage;

  beforeAll(() => {
    sqlA = postgres(DB_URL!, { max: 5, onnotice: () => undefined });
    sqlB = postgres(DB_URL!, { max: 5, onnotice: () => undefined });
    a = new PgThrottlerStorage(sqlA);
    b = new PgThrottlerStorage(sqlB);
  });

  afterAll(async () => {
    await sqlA?.end({ timeout: 5 });
    await sqlB?.end({ timeout: 5 });
  });

  it('shares one limit between instances and blocks once it is exceeded', async () => {
    const key = randomUUID();
    expect(await a.increment(key, 60_000, 3, 30_000, 'default')).toMatchObject({
      totalHits: 1,
      isBlocked: false,
      timeToExpire: 60,
    });
    expect((await b.increment(key, 60_000, 3, 30_000, 'default')).totalHits).toBe(2);
    expect((await a.increment(key, 60_000, 3, 30_000, 'default')).totalHits).toBe(3);
    const blocked = await b.increment(key, 60_000, 3, 30_000, 'default');
    expect(blocked).toMatchObject({ totalHits: 4, isBlocked: true, timeToBlockExpire: 30 });
    // Blocked requests aren't counted.
    expect(await a.increment(key, 60_000, 3, 30_000, 'default')).toMatchObject({
      totalHits: 4,
      isBlocked: true,
    });
    // Another throttler on the same key has its own counter.
    expect((await a.increment(key, 60_000, 3, 30_000, 'user')).totalHits).toBe(1);
  });

  it('counts concurrent requests exactly', async () => {
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? a : b).increment(key, 60_000, 10, 60_000, 'default'),
      ),
    );
    expect(results.filter((r) => !r.isBlocked)).toHaveLength(10);
    expect(
      results
        .filter((r) => !r.isBlocked)
        .map((r) => r.totalHits)
        .sort((x, y) => x - y),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('starts counting again when the window ends', async () => {
    const key = randomUUID();
    await a.increment(key, 200, 1, 200, 'default');
    expect((await a.increment(key, 200, 1, 200, 'default')).isBlocked).toBe(true);
    await sleep(250);
    expect(await b.increment(key, 200, 1, 200, 'default')).toMatchObject({
      totalHits: 1,
      isBlocked: false,
    });
  });

  it('starts counting again when a block shorter than the window ends', async () => {
    const key = randomUUID();
    await a.increment(key, 60_000, 1, 150, 'default');
    expect((await a.increment(key, 60_000, 1, 150, 'default')).isBlocked).toBe(true);
    await sleep(200);
    expect(await a.increment(key, 60_000, 1, 150, 'default')).toMatchObject({
      totalHits: 1,
      isBlocked: false,
    });
  });

  it('sweeps counters that have expired, and keeps live ones', async () => {
    const old = randomUUID();
    const live = randomUUID();
    await a.increment(old, 50, 5, 50, 'default');
    await a.increment(live, 60_000, 5, 60_000, 'default');
    await sleep(100);
    expect(await a.sweep()).toBeGreaterThanOrEqual(1);
    const keys = await sqlA<{ key: string }[]>`
      select key from public.rate_limits where key in (${old}, ${live})`;
    expect(keys.map((k) => k.key)).toEqual([live]);
  });

  describe('two API instances', () => {
    let apps: NestExpressApplication[] = [];

    beforeAll(async () => {
      setTestEnv({ RATE_LIMIT_PER_MINUTE: '3', RATE_LIMIT_STORE: 'postgres' });
      // A clean slate for the plans route, which both instances share.
      await sqlA`delete from public.rate_limits`;
      apps = await Promise.all(
        [sqlA, sqlB].map(async (sql) => {
          const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(Database)
            .useValue({ sql, ping: async () => true, onApplicationShutdown: async () => undefined })
            .overrideProvider(SCAN_QUEUE)
            .useValue({ enqueue: async () => undefined })
            .compile();
          const app = moduleRef.createNestApplication<NestExpressApplication>({
            bodyParser: false,
            logger: false,
          });
          configureApp(app);
          await app.init();
          return app;
        }),
      );
    });

    afterAll(async () => {
      await Promise.all(apps.map((app) => app.close()));
      delete process.env.RATE_LIMIT_STORE;
      setTestEnv();
    });

    it('enforce one per-IP limit between them', async () => {
      const one = apps[0]!.getHttpServer();
      const two = apps[1]!.getHttpServer();
      await request(one).get('/v1/plans').expect(200);
      await request(two).get('/v1/plans').expect(200);
      await request(one).get('/v1/plans').expect(200);
      const res = await request(two).get('/v1/plans').expect(429);
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });
  });
});
