import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app';
import { JWT_KEY_RESOLVER } from '../../src/auth/jwt-verifier';
import { ProviderError, WEB_PAYMENT_PROVIDER } from '../../src/billing/billing.types';
import {
  PLAY_API,
  type PlayApi,
  type SubscriptionPurchaseV2,
} from '../../src/billing/google-play/play-client';
import { RTDN_KEY_RESOLVER } from '../../src/billing/google-play/rtdn-verifier';
import { ProductCatalog } from '../../src/billing/product-catalog';
import { PaddleProvider } from '../../src/billing/providers/paddle.provider';
import { FeatureFlags } from '../../src/common/feature-flags.service';
import { loadEnv } from '../../src/config/env';
import { SCAN_QUEUE } from '../../src/scans/scan-queue';
import { makeKeys, setTestEnv, signEs256 } from '../helpers';
import { PADDLE_SECRET, paddleEvent, paddleHeaders } from './sign';

const DB_URL = process.env.TEST_DATABASE_URL;
const USER_A = '00000000-0000-4000-8000-0000000000c1';
const USER_B = '00000000-0000-4000-8000-0000000000c2';
const RTDN_AUD = 'https://api.test/v1/billing/google-play/rtdn';
const RTDN_SA = 'pubsub-push@weblume.iam.gserviceaccount.com';

describe.skipIf(!DB_URL)('billing (database e2e)', () => {
  let app: NestExpressApplication;
  let sql: postgres.Sql;
  let flags: FeatureFlags;
  let tokenA: string;
  let tokenB: string;
  let signRtdn: (claims: Record<string, unknown>) => Promise<string>;
  const paddleCalls: { url: string; body: Record<string, unknown> }[] = [];
  const play = {
    configured: true,
    getSubscription: vi.fn<PlayApi['getSubscription']>(),
    acknowledge: vi.fn<PlayApi['acknowledge']>(),
  };

  beforeAll(async () => {
    setTestEnv({
      DATABASE_URL: DB_URL!,
      WORKER_ENABLED: 'false',
      WEB_PAYMENT_PROVIDER: 'paddle',
      PADDLE_API_KEY: 'pdl_sdbx_apikey_test',
      PADDLE_WEBHOOK_SECRET: PADDLE_SECRET,
      PADDLE_PRICE_STARTER_MONTHLY: 'pri_monthly',
      PADDLE_PRICE_STARTER_ANNUAL: 'pri_annual',
      GOOGLE_PLAY_RTDN_AUDIENCE: RTDN_AUD,
      GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT: RTDN_SA,
      BILLING_ACCOUNT_SECRET: 'test-billing-account-secret-0123456789abcdef',
    });
    const env = loadEnv();
    const fakePaddleFetch = (async (url: string, init?: RequestInit) => {
      paddleCalls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
      if (String(url).endsWith('/transactions')) {
        return new Response(
          JSON.stringify({
            data: {
              id: 'txn_1',
              checkout: { url: 'https://weblume.test/checkout/paddle?_ptxn=txn_1' },
            },
          }),
        );
      }
      return new Response(
        JSON.stringify({
          data: { urls: { general: { overview: 'https://customer-portal.paddle.com/x' } } },
        }),
      );
    }) as unknown as typeof fetch;

    const keys = await makeKeys();
    const rtdn = await generateKeyPair('RS256');
    const rtdnJwk: JWK = { ...(await exportJWK(rtdn.publicKey)), kid: 'g1', alg: 'RS256' };
    signRtdn = (claims) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'g1' })
        .setIssuer('https://accounts.google.com')
        .setAudience(RTDN_AUD)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(rtdn.privateKey);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_KEY_RESOLVER)
      .useValue(keys.jwks)
      .overrideProvider(SCAN_QUEUE)
      .useValue({ enqueue: async () => undefined })
      .overrideProvider(WEB_PAYMENT_PROVIDER)
      .useValue(
        new PaddleProvider(
          { apiKey: 'k', webhookSecret: PADDLE_SECRET, env: 'sandbox' },
          new ProductCatalog(env),
          fakePaddleFetch,
        ),
      )
      .overrideProvider(PLAY_API)
      .useValue(play)
      .overrideProvider(RTDN_KEY_RESOLVER)
      .useValue(createLocalJWKSet({ keys: [rtdnJwk] }))
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      rawBody: true,
      logger: false,
    });
    configureApp(app);
    await app.init();
    flags = app.get(FeatureFlags);
    sql = postgres(DB_URL!, { onnotice: () => undefined });
    tokenA = await signEs256(keys.privateKey, { sub: USER_A, email: 'bill-a@test.dev' });
    tokenB = await signEs256(keys.privateKey, { sub: USER_B, email: 'bill-b@test.dev' });
  });

  beforeEach(async () => {
    await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
    await sql`insert into auth.users (id, email) values (${USER_A}, 'bill-a@test.dev'), (${USER_B}, 'bill-b@test.dev')`;
    await sql`delete from public.webhook_events`;
    await sql`update public.feature_flags set enabled = true where key = 'billing'`;
    flags.clearCache();
    paddleCalls.length = 0;
    play.getSubscription.mockReset();
    play.acknowledge.mockReset();
  });

  afterAll(async () => {
    await sql?.end();
    await app?.close();
  });

  const server = () => app.getHttpServer();
  const asA = (r: request.Test) => r.set('Authorization', `Bearer ${tokenA}`);
  const plan = async (token = tokenA) =>
    (await request(server()).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(200)).body
      .plan;
  const sendPaddle = (body: string, headers = paddleHeaders(body)) =>
    request(server())
      .post('/v1/billing/webhooks/paddle')
      .set(headers)
      .set('content-type', 'application/json')
      .send(body);

  describe('config and checkout', () => {
    it('reports availability per channel', async () => {
      const on = (await request(server()).get('/v1/billing/config').expect(200)).body;
      expect(on).toEqual({
        enabled: true,
        web: { provider: 'paddle', available: true, intervals: ['monthly', 'annual'] },
        googlePlay: {
          available: true,
          packageName: 'com.weblume.app',
          subscriptionId: 'weblume_starter',
        },
      });
      await sql`update public.feature_flags set enabled = false where key = 'billing'`;
      flags.clearCache();
      const off = (await request(server()).get('/v1/billing/config').expect(200)).body;
      expect(off.enabled).toBe(false);
      expect(off.web.available).toBe(false);
      expect(off.googlePlay.available).toBe(false);
    });

    it('creates a checkout with our user id set server-side', async () => {
      const res = await asA(request(server()).post('/v1/billing/checkout'))
        .send({ interval: 'annual' })
        .expect(200);
      expect(res.body.url).toBe('https://weblume.test/checkout/paddle?_ptxn=txn_1');
      expect(paddleCalls[0]).toMatchObject({
        url: 'https://sandbox-api.paddle.com/transactions',
        body: {
          items: [{ price_id: 'pri_annual', quantity: 1 }],
          custom_data: { user_id: USER_A },
        },
      });
    });

    it('refuses checkout when billing is off, signed out, invalid, or already subscribed', async () => {
      await request(server())
        .post('/v1/billing/checkout')
        .send({ interval: 'monthly' })
        .expect(401);
      await asA(request(server()).post('/v1/billing/checkout'))
        .send({ interval: 'weekly' })
        .expect(400);
      await asA(request(server()).post('/v1/billing/checkout'))
        .send({ interval: 'monthly', userId: USER_B })
        .expect(400);
      await sendPaddle(paddleEvent({ userId: USER_A })).expect(200);
      const dup = await asA(request(server()).post('/v1/billing/checkout'))
        .send({ interval: 'monthly' })
        .expect(409);
      expect(dup.body).toMatchObject({ code: 'already_subscribed', provider: 'paddle' });
      await sql`update public.feature_flags set enabled = false where key = 'billing'`;
      flags.clearCache();
      expect(
        (
          await asA(request(server()).post('/v1/billing/checkout'))
            .send({ interval: 'monthly' })
            .expect(403)
        ).body.code,
      ).toBe('billing_disabled');
    });

    it('opens the customer portal for web subscribers only', async () => {
      expect((await asA(request(server()).post('/v1/billing/portal')).expect(404)).body.code).toBe(
        'no_web_subscription',
      );
      await sendPaddle(paddleEvent({ userId: USER_A, subId: 'sub_portal' })).expect(200);
      const res = await asA(request(server()).post('/v1/billing/portal')).expect(200);
      expect(res.body.url).toBe('https://customer-portal.paddle.com/x');
      expect(paddleCalls.at(-1)).toMatchObject({
        url: 'https://sandbox-api.paddle.com/customers/ctm_01/portal-sessions',
        body: { subscription_ids: ['sub_portal'] },
      });
    });
  });

  describe('web webhooks (Paddle)', () => {
    it('activates the plan from a verified webhook', async () => {
      expect((await plan()).id).toBe('free');
      const res = await sendPaddle(paddleEvent({ userId: USER_A, eventId: 'evt_act' })).expect(200);
      expect(res.body).toEqual({ status: 'processed' });
      expect(await plan()).toMatchObject({ id: 'starter', source: 'subscription' });
      const [row] = await sql`select status from public.webhook_events where event_id = 'evt_act'`;
      expect(row!.status).toBe('processed');
      expect((await plan(tokenB)).id).toBe('free');
    });

    it('rejects bad signatures and unknown providers without recording anything', async () => {
      const body = paddleEvent({ userId: USER_A });
      await sendPaddle(body, paddleHeaders(body, { secret: 'wrong' })).expect(401);
      await sendPaddle(body.replace(USER_A, USER_B), paddleHeaders(body)).expect(401);
      await sendPaddle(body, {} as ReturnType<typeof paddleHeaders>).expect(401);
      await request(server()).post('/v1/billing/webhooks/dodo').send(body).expect(404);
      expect((await sql`select count(*)::int as n from public.webhook_events`)[0]!.n).toBe(0);
      expect((await plan()).id).toBe('free');
    });

    it('processes each event once', async () => {
      const body = paddleEvent({ userId: USER_A, eventId: 'evt_dup' });
      await sendPaddle(body).expect(200);
      expect((await sendPaddle(body).expect(200)).body).toEqual({ status: 'duplicate' });
    });

    it('ignores events that arrive out of order', async () => {
      const now = Date.now();
      await sendPaddle(
        paddleEvent({
          userId: USER_A,
          status: 'canceled',
          occurredAt: new Date(now).toISOString(),
        }),
      ).expect(200);
      const late = await sendPaddle(
        paddleEvent({
          userId: USER_A,
          status: 'active',
          occurredAt: new Date(now - 60_000).toISOString(),
        }),
      ).expect(200);
      expect(late.body).toEqual({ status: 'ignored' });
      expect((await plan()).id).toBe('free');
    });

    it('keeps access after cancellation until the period ends, then removes it', async () => {
      const t = Date.now();
      await sendPaddle(
        paddleEvent({ userId: USER_A, occurredAt: new Date(t - 3000).toISOString() }),
      ).expect(200);
      await sendPaddle(
        paddleEvent({
          userId: USER_A,
          type: 'subscription.updated',
          scheduledCancel: true,
          occurredAt: new Date(t - 2000).toISOString(),
        }),
      ).expect(200);
      expect((await plan()).id).toBe('starter');
      const me = (await asA(request(server()).get('/v1/me')).expect(200)).body;
      expect(me.subscriptions[0]).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: true });
      await sendPaddle(
        paddleEvent({
          userId: USER_A,
          type: 'subscription.canceled',
          status: 'canceled',
          occurredAt: new Date(t - 1000).toISOString(),
        }),
      ).expect(200);
      expect((await plan()).id).toBe('free');
    });

    it('ignores events for unknown users and unknown prices', async () => {
      const r1 = await sendPaddle(
        paddleEvent({ userId: '00000000-0000-4000-8000-00000000dead' }),
      ).expect(200);
      expect(r1.body).toEqual({ status: 'ignored' });
      const r2 = await sendPaddle(paddleEvent({ userId: USER_A, priceId: 'pri_unknown' })).expect(
        200,
      );
      expect(r2.body).toEqual({ status: 'ignored' });
      expect((await plan()).id).toBe('free');
    });
  });

  describe('Google Play', () => {
    const purchase = (
      over: Partial<SubscriptionPurchaseV2> & { ref?: string } = {},
    ): SubscriptionPurchaseV2 => ({
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      externalAccountIdentifiers: { obfuscatedExternalAccountId: over.ref },
      lineItems: [
        {
          productId: 'weblume_starter',
          expiryTime: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          autoRenewingPlan: { autoRenewEnabled: true },
          offerDetails: { basePlanId: 'monthly' },
        },
      ],
      ...over,
    });
    const refFor = async (token: string) =>
      (
        await request(server())
          .get('/v1/billing/google-play/account-ref')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body.accountRef as string;
    const verify = (token: string, purchaseToken = 'play-token-abcdef-1') =>
      request(server())
        .post('/v1/billing/google-play/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ purchaseToken });

    it('gives each user a stable opaque account reference', async () => {
      const a1 = await refFor(tokenA);
      expect(a1).toMatch(/^[0-9a-f]{64}$/);
      expect(await refFor(tokenA)).toBe(a1);
      expect(await refFor(tokenB)).not.toBe(a1);
      expect(a1).not.toContain(USER_A.replace(/-/g, ''));
    });

    it('verifies a purchase with Google, grants the plan and acknowledges it', async () => {
      const ref = await refFor(tokenA);
      play.getSubscription.mockResolvedValue(purchase({ ref }));
      const res = await verify(tokenA).expect(200);
      expect(res.body).toEqual({
        planId: 'starter',
        status: 'active',
        duplicateSubscription: false,
      });
      expect(play.acknowledge).toHaveBeenCalledWith('weblume_starter', 'play-token-abcdef-1');
      expect(await plan()).toMatchObject({ id: 'starter', source: 'subscription' });
    });

    it('does not acknowledge twice', async () => {
      const ref = await refFor(tokenA);
      play.getSubscription.mockResolvedValue(
        purchase({ ref, acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }),
      );
      await verify(tokenA).expect(200);
      expect(play.acknowledge).not.toHaveBeenCalled();
    });

    it('refuses a purchase token bought under another account', async () => {
      const refB = await refFor(tokenB);
      await refFor(tokenA);
      play.getSubscription.mockResolvedValue(purchase({ ref: refB }));
      expect((await verify(tokenA).expect(403)).body.code).toBe('purchase_account_mismatch');
      play.getSubscription.mockResolvedValue(purchase({ ref: undefined }));
      expect((await verify(tokenA).expect(403)).body.code).toBe('purchase_account_mismatch');
      expect((await plan()).id).toBe('free');
      expect(play.acknowledge).not.toHaveBeenCalled();
    });

    it('rejects other products and unknown tokens', async () => {
      const ref = await refFor(tokenA);
      play.getSubscription.mockResolvedValue({
        ...purchase({ ref }),
        lineItems: [{ productId: 'other_app_sub' }],
      });
      expect((await verify(tokenA).expect(400)).body.code).toBe('invalid_purchase');
      play.getSubscription.mockRejectedValue(new ProviderError('nope', 404));
      expect((await verify(tokenA).expect(400)).body.code).toBe('invalid_purchase');
    });

    it('warns when the user is already subscribed on the web', async () => {
      await sendPaddle(paddleEvent({ userId: USER_A })).expect(200);
      const ref = await refFor(tokenA);
      play.getSubscription.mockResolvedValue(purchase({ ref }));
      expect((await verify(tokenA).expect(200)).body.duplicateSubscription).toBe(true);
    });

    describe('Real-time Developer Notifications', () => {
      let validToken: string;
      beforeAll(async () => {
        validToken = await signRtdn({ email: RTDN_SA, email_verified: true });
      });
      const push = (data: object, opts: { messageId?: string; token?: string | null } = {}) => {
        const bearer = opts.token === null ? undefined : (opts.token ?? validToken);
        const req = request(server()).post('/v1/billing/google-play/rtdn');
        if (bearer) req.set('Authorization', `Bearer ${bearer}`);
        return req.send({
          message: {
            data: Buffer.from(JSON.stringify(data)).toString('base64'),
            messageId: opts.messageId ?? `m-${Math.random()}`,
          },
          subscription: 'projects/p/subscriptions/s',
        });
      };
      const note = (type: number, token = 'play-token-abcdef-1', at = Date.now()) => ({
        version: '1.0',
        packageName: 'com.weblume.app',
        eventTimeMillis: String(at),
        subscriptionNotification: {
          version: '1.0',
          notificationType: type,
          purchaseToken: token,
          subscriptionId: 'weblume_starter',
        },
      });

      it('rejects pushes without a valid Google token', async () => {
        await push(note(2), { token: null }).expect(401);
        await push(note(2), {
          token: await signRtdn({ email: 'attacker@x.com', email_verified: true }),
        }).expect(401);
        expect(play.getSubscription).not.toHaveBeenCalled();
      });

      it('handles a first purchase the app never reported, using the stored account reference', async () => {
        const ref = await refFor(tokenA);
        play.getSubscription.mockResolvedValue(purchase({ ref }));
        expect((await push(note(4)).expect(200)).body).toEqual({ status: 'processed' });
        expect(await plan()).toMatchObject({ id: 'starter' });
        expect(play.acknowledge).toHaveBeenCalledTimes(1);
      });

      it('updates state on renewal/expiry and revokes refunded purchases', async () => {
        const ref = await refFor(tokenA);
        play.getSubscription.mockResolvedValue(
          purchase({ ref, acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' }),
        );
        await push(note(2, undefined, Date.now() - 2000)).expect(200); // renewed
        expect((await plan()).id).toBe('starter');
        await push(note(12, undefined, Date.now() - 1000)).expect(200); // revoked (refund)
        expect((await plan()).id).toBe('free');
        const me = (await asA(request(server()).get('/v1/me')).expect(200)).body;
        expect(me.subscriptions[0].status).toBe('refunded');
      });

      it('is idempotent per Pub/Sub message and ignores test notifications and other apps', async () => {
        const ref = await refFor(tokenA);
        play.getSubscription.mockResolvedValue(purchase({ ref }));
        await push(note(4), { messageId: 'm-dup' }).expect(200);
        expect((await push(note(4), { messageId: 'm-dup' }).expect(200)).body).toEqual({
          status: 'duplicate',
        });
        expect(
          (
            await push({
              version: '1.0',
              packageName: 'com.weblume.app',
              testNotification: { version: '1.0' },
            }).expect(200)
          ).body,
        ).toEqual({ status: 'ignored' });
        expect((await push({ ...note(4), packageName: 'com.other.app' }).expect(200)).body).toEqual(
          { status: 'ignored' },
        );
        expect(play.getSubscription).toHaveBeenCalledTimes(1);
      });

      it('moves access to the replacement token on resubscribe', async () => {
        const ref = await refFor(tokenA);
        play.getSubscription.mockResolvedValueOnce(purchase({ ref }));
        await verify(tokenA, 'old-token-123456').expect(200);
        play.getSubscription.mockResolvedValueOnce(
          purchase({ ref, linkedPurchaseToken: 'old-token-123456' }),
        );
        await push(note(4, 'new-token-654321')).expect(200);
        const rows =
          await sql`select provider_subscription_id, status from public.subscriptions where user_id = ${USER_A} order by provider_subscription_id`;
        expect(rows.map((r) => [r.provider_subscription_id, r.status])).toEqual([
          ['new-token-654321', 'active'],
          ['old-token-123456', 'expired'],
        ]);
      });
    });
  });
});
