import type { LookupAddress } from 'node:dns';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { AUTH_ADMIN, type AuthAdmin } from '../src/account/auth-admin';
import { RetentionService } from '../src/account/retention.service';
import { JWT_KEY_RESOLVER } from '../src/auth/jwt-verifier';
import { FeatureFlags } from '../src/common/feature-flags.service';
import { GuardedHttpClient } from '../src/scanner/http/guarded-client';
import { PSI_PROVIDER } from '../src/scanner/psi/psi.types';
import { GUARDED_CLIENT, ScanProcessor } from '../src/scans/scan.processor';
import { SCAN_QUEUE, type ScanQueue } from '../src/scans/scan-queue';
import { TURNSTILE_VERIFIER } from '../src/scans/turnstile';
import { makeKeys, setTestEnv, signEs256, type PrivateKey } from './helpers';
import { html, startTestServer } from './scanner/test-server';

const DB_URL = process.env.TEST_DATABASE_URL;
const USER_A = '00000000-0000-4000-8000-0000000000a1';
const USER_B = '00000000-0000-4000-8000-0000000000b1';

class InlineQueue implements ScanQueue {
  processor!: ScanProcessor;
  private pending: Promise<void>[] = [];
  async enqueue(id: string) {
    this.pending.push(this.processor.process(id));
  }
  async drain() {
    while (this.pending.length) await Promise.all(this.pending.splice(0));
  }
}

describe.skipIf(!DB_URL)('account API (database e2e)', () => {
  let app: NestExpressApplication;
  let sql: postgres.Sql;
  let queue: InlineQueue;
  let flags: FeatureFlags;
  let privateKey: PrivateKey;
  let closeServer: () => Promise<void>;
  let tokenA: string;
  let tokenB: string;
  const authAdmin = { configured: true, deleteUser: vi.fn<AuthAdmin['deleteUser']>() };

  beforeAll(async () => {
    const srv = await startTestServer({
      '/': html(
        '<html lang="en"><head><title>Account test fixture page</title></head><body><h1>Hi</h1></body></html>',
      ),
    });
    closeServer = srv.close;
    const client = new GuardedHttpClient({
      userAgent: 'WeblumeBot/test',
      resolve: async (): Promise<LookupAddress[]> => [{ address: '127.0.0.1', family: 4 }],
      isAllowedAddress: (ip) => ip === '127.0.0.1',
      testPortOverride: srv.port,
    });
    setTestEnv({
      DATABASE_URL: DB_URL!,
      WORKER_ENABLED: 'false',
      SCAN_CREATE_RATE_LIMIT_PER_MINUTE: '1000',
    });
    const keys = await makeKeys();
    privateKey = keys.privateKey;
    queue = new InlineQueue();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_KEY_RESOLVER)
      .useValue(keys.jwks)
      .overrideProvider(SCAN_QUEUE)
      .useValue(queue)
      .overrideProvider(GUARDED_CLIENT)
      .useValue(client)
      .overrideProvider(PSI_PROVIDER)
      .useValue({ configured: false, run: async () => ({ ok: false, reason: 'not_configured' }) })
      .overrideProvider(TURNSTILE_VERIFIER)
      .useValue({ disabled: false, verify: async (t: string) => t === 'human' })
      .overrideProvider(AUTH_ADMIN)
      .useValue(authAdmin)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureApp(app);
    await app.init();
    queue.processor = app.get(ScanProcessor);
    flags = app.get(FeatureFlags);
    sql = postgres(DB_URL!, { onnotice: () => undefined });
    tokenA = await signEs256(privateKey, { sub: USER_A, email: 'acct-a@test.dev' });
    tokenB = await signEs256(privateKey, { sub: USER_B, email: 'acct-b@test.dev' });
  });

  beforeEach(async () => {
    await sql`delete from public.scans`;
    await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
    await sql`insert into auth.users (id, email) values (${USER_A}, 'acct-a@test.dev'), (${USER_B}, 'acct-b@test.dev')`;
    await sql`update public.feature_flags set enabled = (key <> 'billing')`;
    flags.clearCache();
    authAdmin.configured = true;
    authAdmin.deleteUser.mockReset();
    // Simulate Supabase: deleting the auth user cascades to profiles/subscriptions.
    authAdmin.deleteUser.mockImplementation(async (id) => {
      await sql`delete from auth.users where id = ${id}`;
    });
  });

  afterAll(async () => {
    await app?.close();
    await sql?.end();
    await closeServer?.();
  });

  const server = () => app.getHttpServer();
  const as = (token: string) => ({
    get: (p: string) => request(server()).get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string) => request(server()).post(p).set('Authorization', `Bearer ${token}`),
    patch: (p: string) => request(server()).patch(p).set('Authorization', `Bearer ${token}`),
    del: (p: string) => request(server()).delete(p).set('Authorization', `Bearer ${token}`),
  });
  const A = () => as(tokenA);

  async function addSubscription(
    userId: string,
    status: string,
    periodEnd: Date | null,
    periodStart: Date | null = null,
  ) {
    await sql`
      insert into public.subscriptions (user_id, provider, provider_subscription_id, product_id, plan_id, status,
        current_period_start, current_period_end, last_event_at)
      values (${userId}, 'paddle', ${'sub_' + Math.random()}, 'pri_starter_monthly', 'starter', ${status},
        ${periodStart}, ${periodEnd}, now())`;
  }
  async function enableBilling() {
    await sql`update public.feature_flags set enabled = true where key = 'billing'`;
    flags.clearCache();
  }

  describe('GET /v1/me', () => {
    it('requires authentication', async () => {
      await request(server()).get('/v1/me').expect(401);
    });

    it('returns profile, the free plan and usage', async () => {
      const res = await A().get('/v1/me').expect(200);
      expect(res.body).toMatchObject({
        id: USER_A,
        email: 'acct-a@test.dev',
        displayName: null,
        plan: { id: 'free', paid: false, source: 'default' },
        entitlements: { scansPerPeriod: 5, retentionDays: 30, pdfExport: false },
        usage: { used: 0, limit: 5 },
        subscriptions: [],
      });
    });

    it('counts completed scans in usage', async () => {
      await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      expect((await A().get('/v1/me').expect(200)).body.usage.used).toBe(1);
    });

    it('updates and clears the display name, with validation', async () => {
      expect(
        (await A().patch('/v1/me').send({ displayName: '  Asha  ' }).expect(200)).body.displayName,
      ).toBe('Asha');
      expect(
        (await A().patch('/v1/me').send({ displayName: null }).expect(200)).body.displayName,
      ).toBeNull();
      await A()
        .patch('/v1/me')
        .send({ displayName: 'x'.repeat(101) })
        .expect(400);
      await A().patch('/v1/me').send({ plan: 'starter' }).expect(400); // clients can't set their plan
    });
  });

  describe('entitlements (server-side only)', () => {
    const future = () => new Date(Date.now() + 10 * 86_400_000);

    it('ignores subscriptions while billing is switched off', async () => {
      await addSubscription(USER_A, 'active', future());
      expect((await A().get('/v1/me').expect(200)).body.plan.id).toBe('free');
    });

    it('grants the subscribed plan when billing is on, with the billing period as quota window', async () => {
      await enableBilling();
      const start = new Date(Date.now() - 5 * 86_400_000);
      const end = future();
      await addSubscription(USER_A, 'active', end, start);
      const body = (await A().get('/v1/me').expect(200)).body;
      expect(body.plan).toMatchObject({ id: 'starter', source: 'subscription' });
      expect(body.usage).toMatchObject({
        limit: 60,
        resetsAt: end.toISOString(),
        periodStart: start.toISOString(),
      });
    });

    it.each([
      ['canceled (until period end)', 'canceled', 'future', 'starter'],
      ['canceled and ended', 'canceled', 'past', 'free'],
      ['grace period', 'grace_period', 'future', 'starter'],
      ['on hold', 'on_hold', 'future', 'free'],
      ['paused', 'paused', 'future', 'free'],
      ['expired', 'expired', 'past', 'free'],
      ['refunded', 'refunded', 'future', 'free'],
    ])('%s → %s', async (_label, status, when, plan) => {
      await enableBilling();
      const end = when === 'future' ? future() : new Date(Date.now() - 86_400_000);
      await addSubscription(USER_A, status, end);
      expect((await A().get('/v1/me').expect(200)).body.plan.id).toBe(plan);
    });

    it('lets a paid plan scan beyond the free limit, and sets longer retention', async () => {
      await enableBilling();
      await addSubscription(USER_A, 'active', future(), new Date(Date.now() - 86_400_000));
      await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, expires_at)
        select ${USER_A}, 'x', 'http://fixture-site.com/p' || g, 'completed', now() + interval '1 day' from generate_series(1, 5) g`;
      const res = await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      const [row] =
        await sql`select round(extract(epoch from expires_at - created_at) / 86400)::int as days from public.scans where id = ${res.body.scan.id}`;
      expect(row!.days).toBe(365);
    });

    it('does not leak another user’s subscription', async () => {
      await enableBilling();
      await addSubscription(USER_B, 'active', future());
      expect((await A().get('/v1/me').expect(200)).body.plan.id).toBe('free');
    });
  });

  describe('claiming guest scans', () => {
    async function guestScan() {
      const res = await request(server())
        .post('/v1/scans')
        .send({ url: 'http://fixture-site.com/', turnstileToken: 'human' })
        .expect(202);
      await queue.drain();
      return res.body as { scan: { id: string }; scanToken: string };
    }

    it('moves a guest scan into the account with the token', async () => {
      const { scan, scanToken } = await guestScan();
      const claimed = await A()
        .post(`/v1/scans/${scan.id}/claim`)
        .set('X-Scan-Token', scanToken)
        .expect(200);
      expect(claimed.body.id).toBe(scan.id);
      const list = await A().get('/v1/scans').expect(200);
      expect(list.body.items.map((s: { id: string }) => s.id)).toEqual([scan.id]);
      await A().get(`/v1/scans/${scan.id}`).expect(200);
      // The guest token no longer grants access, and the retention follows the account's plan.
      await request(server())
        .get(`/v1/scans/${scan.id}`)
        .set('X-Scan-Token', scanToken)
        .expect(404);
      const [row] =
        await sql`select round(extract(epoch from expires_at - created_at) / 86400)::int as days, claim_token_hash from public.scans where id = ${scan.id}`;
      expect(row!.days).toBe(30);
      expect(row!.claim_token_hash).toBeNull();
    });

    it('requires the token, and can’t claim twice or another user’s scan', async () => {
      const { scan, scanToken } = await guestScan();
      await A().post(`/v1/scans/${scan.id}/claim`).expect(404);
      await A().post(`/v1/scans/${scan.id}/claim`).set('X-Scan-Token', 'nope').expect(404);
      await A().post(`/v1/scans/${scan.id}/claim`).set('X-Scan-Token', scanToken).expect(200);
      await as(tokenB)
        .post(`/v1/scans/${scan.id}/claim`)
        .set('X-Scan-Token', scanToken)
        .expect(404);
      await request(server())
        .post(`/v1/scans/${scan.id}/claim`)
        .set('X-Scan-Token', scanToken)
        .expect(401);
    });
  });

  describe('data export', () => {
    it('exports the account and its scans as a JSON download', async () => {
      await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      await as(tokenB).post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      const res = await A().get('/v1/me/export').expect(200);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="weblume-export-\d{4}-\d{2}-\d{2}\.json"/,
      );
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toMatchObject({
        format: 'weblume-export',
        version: 1,
        account: { id: USER_A },
      });
      expect(res.body.scans).toHaveLength(1); // only A's
      expect(res.body.scans[0].findings.length).toBeGreaterThan(0);
    });
  });

  describe('account deletion', () => {
    it('requires typing DELETE', async () => {
      expect((await A().del('/v1/me').send({}).expect(400)).body.message).toEqual(
        expect.arrayContaining(['Type DELETE to confirm account deletion.']),
      );
      await A().del('/v1/me').send({ confirm: 'delete' }).expect(400);
      expect(authAdmin.deleteUser).not.toHaveBeenCalled();
    });

    it('deletes app data and the auth user', async () => {
      await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      await as(tokenB).post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      const res = await A().del('/v1/me').send({ confirm: 'DELETE' }).expect(200);
      expect(res.body).toEqual({ status: 'deleted' });
      expect(authAdmin.deleteUser).toHaveBeenCalledWith(USER_A);
      expect(
        (await sql`select count(*)::int as n from public.scans where user_id = ${USER_A}`)[0]!.n,
      ).toBe(0);
      expect(
        (await sql`select count(*)::int as n from public.profiles where id = ${USER_A}`)[0]!.n,
      ).toBe(0);
      expect(
        (await sql`select count(*)::int as n from public.scans where user_id = ${USER_B}`)[0]!.n,
      ).toBe(1);
      // A still-valid access token can't be used to keep using the account.
      expect((await A().get('/v1/me').expect(403)).body.code).toBe('account_deleted');
      expect(
        (await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(403)).body
          .code,
      ).toBe('account_deleted');
    });

    it('deletes app data immediately and completes auth deletion later when the admin key is missing', async () => {
      authAdmin.configured = false;
      await A().post('/v1/scans').send({ url: 'http://fixture-site.com/' }).expect(202);
      await queue.drain();
      expect((await A().del('/v1/me').send({ confirm: 'DELETE' }).expect(200)).body).toEqual({
        status: 'pending',
      });
      expect(
        (await sql`select count(*)::int as n from public.scans where user_id = ${USER_A}`)[0]!.n,
      ).toBe(0);
      const [p] =
        await sql`select deletion_requested_at, display_name from public.profiles where id = ${USER_A}`;
      expect(p!.deletion_requested_at).not.toBeNull();
      await A().get('/v1/me').expect(403);

      authAdmin.configured = true;
      const r = await app.get(RetentionService).run();
      expect(r.pendingDeletions).toEqual({ completed: 1, remaining: 0 });
      expect(
        (await sql`select count(*)::int as n from auth.users where id = ${USER_A}`)[0]!.n,
      ).toBe(0);
    });

    it('keeps the deletion pending when the auth admin call fails', async () => {
      authAdmin.deleteUser.mockRejectedValue(new Error('HTTP 500'));
      expect((await A().del('/v1/me').send({ confirm: 'DELETE' }).expect(200)).body).toEqual({
        status: 'pending',
      });
      expect((await app.get(RetentionService).run()).pendingDeletions).toEqual({
        completed: 0,
        remaining: 1,
      });
    });
  });

  describe('retention job', () => {
    it('deletes expired scans, stale PSI cache rows and old webhook payloads', async () => {
      await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, expires_at) values
          (${USER_A}, 'x', 'http://old.fixture-site.com/', 'completed', now() - interval '1 minute'),
          (${USER_A}, 'x', 'http://new.fixture-site.com/', 'completed', now() + interval '1 day')`;
      await sql`insert into public.psi_cache (normalized_url, strategy, result, fetched_at) values
        ('http://old.fixture-site.com/', 'mobile', '{}', now() - interval '3 days'),
        ('http://new.fixture-site.com/', 'mobile', '{}', now())
        on conflict do nothing`;
      await sql`insert into public.webhook_events (provider, event_id, event_type, payload, received_at) values
        ('paddle', ${'evt_old_' + Math.random()}, 'x', '{"email":"a@test.dev"}', now() - interval '31 days'),
        ('paddle', ${'evt_new_' + Math.random()}, 'x', '{"email":"a@test.dev"}', now())`;
      const r = await app.get(RetentionService).run();
      expect(r.expiredScans).toBe(1);
      expect(r.psiCacheRows).toBeGreaterThanOrEqual(1);
      expect(r.webhookPayloads).toBeGreaterThanOrEqual(1);
      const urls = (await sql`select normalized_url from public.scans`).map(
        (x) => x.normalized_url,
      );
      expect(urls).toEqual(['http://new.fixture-site.com/']);
      expect(
        (
          await sql`select count(*)::int as n from public.psi_cache where fetched_at < now() - interval '2 days'`
        )[0]!.n,
      ).toBe(0);
      expect(
        (
          await sql`select count(*)::int as n from public.webhook_events where received_at < now() - interval '30 days' and payload is not null`
        )[0]!.n,
      ).toBe(0);
      await sql`delete from public.webhook_events`;
      await sql`delete from public.psi_cache`;
    });
  });
});
