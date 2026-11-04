import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import type { Env } from '../../src/config/env';
import { WebhookSignatureError } from '../../src/billing/billing.types';
import { GooglePlayClient } from '../../src/billing/google-play/play-client';
import {
  intervalFromBasePlan,
  mapPlaySubscription,
} from '../../src/billing/google-play/play-mapper';
import { decodeRtdn, verifyPubSubPush } from '../../src/billing/google-play/rtdn-verifier';
import { ProductCatalog } from '../../src/billing/product-catalog';
import { DodoProvider } from '../../src/billing/providers/dodo.provider';
import { PaddleProvider } from '../../src/billing/providers/paddle.provider';
import {
  verifyPaddleSignature,
  verifyStandardWebhook,
} from '../../src/billing/providers/signatures';
import {
  DODO_SECRET,
  dodoEvent,
  dodoHeaders,
  PADDLE_SECRET,
  paddleEvent,
  paddleHeaders,
} from './sign';

const catalog = new ProductCatalog({
  PADDLE_PRICE_STARTER_MONTHLY: 'pri_monthly',
  PADDLE_PRICE_STARTER_ANNUAL: 'pri_annual',
  DODO_PRODUCT_STARTER_MONTHLY: 'pdt_monthly',
  GOOGLE_PLAY_SUBSCRIPTION_ID: 'weblume_starter',
} as Env);
const paddle = new PaddleProvider(
  { apiKey: 'k', webhookSecret: PADDLE_SECRET, env: 'sandbox' },
  catalog,
);
const dodo = new DodoProvider({ apiKey: 'k', webhookSecret: DODO_SECRET, env: 'test' }, catalog);
const buf = (s: string) => Buffer.from(s);

describe('Paddle signature', () => {
  const body = paddleEvent({ userId: 'u1' });
  it('accepts a valid signature', () => {
    expect(() =>
      verifyPaddleSignature(paddleHeaders(body)['paddle-signature'], buf(body), PADDLE_SECRET),
    ).not.toThrow();
  });
  it('accepts any h1 during secret rotation', () => {
    const good = paddleHeaders(body)['paddle-signature'];
    const [ts, h1] = good.split(';');
    expect(() =>
      verifyPaddleSignature(`${ts};h1=${'0'.repeat(64)};${h1}`, buf(body), PADDLE_SECRET),
    ).not.toThrow();
  });
  it.each([
    ['missing header', undefined],
    ['malformed header', 'nonsense'],
    ['wrong secret', paddleHeaders(body, { secret: 'other' })['paddle-signature']],
    [
      'stale timestamp',
      paddleHeaders(body, { ts: Math.floor(Date.now() / 1000) - 3600 })['paddle-signature'],
    ],
  ])('rejects %s', (_l, h) => {
    expect(() => verifyPaddleSignature(h, buf(body), PADDLE_SECRET)).toThrow(WebhookSignatureError);
  });
  it('rejects a tampered body', () => {
    const h = paddleHeaders(body)['paddle-signature'];
    expect(() => verifyPaddleSignature(h, buf(body.replace('u1', 'u2')), PADDLE_SECRET)).toThrow(
      WebhookSignatureError,
    );
  });
});

describe('Standard Webhooks signature (Dodo)', () => {
  const body = dodoEvent({ userId: 'u1' });
  const h = dodoHeaders(body);
  const verify = (headers: Record<string, string>, b = body, secret = DODO_SECRET) =>
    verifyStandardWebhook(
      {
        id: headers['webhook-id'],
        timestamp: headers['webhook-timestamp'],
        signature: headers['webhook-signature'],
      },
      buf(b),
      secret,
    );
  it('accepts a valid signature, including among several', () => {
    expect(() => verify(h)).not.toThrow();
    expect(() =>
      verify({ ...h, 'webhook-signature': `v1,AAAA ${h['webhook-signature']}` }),
    ).not.toThrow();
  });
  it.each([
    ['tampered body', () => verify(h, body + ' ')],
    ['wrong secret', () => verify(h, body, `whsec_${Buffer.from('nope').toString('base64')}`)],
    ['changed id', () => verify({ ...h, 'webhook-id': 'msg_other' })],
    [
      'stale timestamp',
      () => verify(dodoHeaders(body, { ts: Math.floor(Date.now() / 1000) - 3600 })),
    ],
    ['missing headers', () => verify({})],
  ])('rejects %s', (_l, fn) => expect(fn).toThrow(WebhookSignatureError));
});

describe('Paddle event mapping', () => {
  const parse = (body: string) =>
    paddle.parseWebhook({ rawBody: buf(body), headers: paddleHeaders(body) });
  it('maps an active subscription with our user id and period', () => {
    const p = parse(paddleEvent({ userId: 'u1', subId: 'sub_9' }));
    expect(p.subscription).toMatchObject({
      provider: 'paddle',
      providerSubscriptionId: 'sub_9',
      userId: 'u1',
      planId: 'starter',
      interval: 'monthly',
      status: 'active',
      providerCustomerId: 'ctm_01',
    });
    expect(p.subscription!.currentPeriodEnd).toBeInstanceOf(Date);
  });
  it.each([
    ['active + scheduled cancel', { status: 'active', scheduledCancel: true }, 'canceled'],
    ['trialing', { status: 'trialing' }, 'trialing'],
    ['past_due', { status: 'past_due' }, 'grace_period'],
    ['paused', { status: 'paused' }, 'paused'],
    ['canceled (ended)', { status: 'canceled' }, 'expired'],
  ])('%s → %s', (_l, over, expected) => {
    expect(parse(paddleEvent({ userId: 'u1', ...over })).subscription!.status).toBe(expected);
  });
  it('maps the annual price to the annual interval', () => {
    expect(parse(paddleEvent({ userId: 'u1', priceId: 'pri_annual' })).subscription!.interval).toBe(
      'annual',
    );
  });
  it('ignores unknown prices and non-subscription events', () => {
    expect(parse(paddleEvent({ userId: 'u1', priceId: 'pri_other' })).ignoredReason).toBe(
      'unknown_price',
    );
    expect(parse(paddleEvent({ userId: 'u1', type: 'transaction.completed' })).ignoredReason).toBe(
      'unhandled_event',
    );
  });
});

describe('Dodo event mapping', () => {
  const parse = (body: string) =>
    dodo.parseWebhook({ rawBody: buf(body), headers: dodoHeaders(body, { id: 'msg_1' }) });
  it('uses the webhook id as the event id and maps metadata', () => {
    const p = parse(dodoEvent({ userId: 'u1' }));
    expect(p.eventId).toBe('msg_1');
    expect(p.subscription).toMatchObject({
      provider: 'dodo',
      userId: 'u1',
      status: 'active',
      interval: 'monthly',
      providerCustomerId: 'cus_1',
      customerEmail: 'a@x.dev',
    });
  });
  it('passes the payer email through when metadata is missing', () => {
    expect(parse(dodoEvent({})).subscription).toMatchObject({
      userId: null,
      customerEmail: 'a@x.dev',
    });
  });
  it.each([
    ['active + cancel at end', { cancelAtEnd: true }, 'canceled'],
    ['on_hold', { status: 'on_hold' }, 'on_hold'],
    ['cancelled', { status: 'cancelled' }, 'canceled'],
    ['past_due (renewal retrying)', { status: 'past_due' }, 'grace_period'],
    ['paused', { status: 'paused' }, 'paused'],
    ['failed', { status: 'failed' }, 'expired'],
    ['expired', { status: 'expired' }, 'expired'],
  ])('%s → %s', (_l, over, expected) => {
    expect(parse(dodoEvent({ userId: 'u1', ...over })).subscription!.status).toBe(expected);
  });
  it('ignores payment events and unknown products', () => {
    expect(parse(dodoEvent({ type: 'payment.succeeded' })).subscription).toBeNull();
    expect(parse(dodoEvent({ productId: 'pdt_x' })).ignoredReason).toBe('unknown_product');
  });
});

describe('Google Play mapping', () => {
  const expiry = '2026-12-01T00:00:00Z';
  const base = {
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: 'ref1' },
    lineItems: [
      {
        productId: 'weblume_starter',
        expiryTime: expiry,
        autoRenewingPlan: { autoRenewEnabled: true },
        offerDetails: { basePlanId: 'monthly' },
      },
    ],
  };
  const now = { eventAt: new Date() };
  it('maps state, expiry, derived period start, interval and account ref', () => {
    const m = mapPlaySubscription('tok', base, now);
    expect(m).toMatchObject({
      status: 'active',
      interval: 'monthly',
      accountRef: 'ref1',
      productId: 'weblume_starter',
      providerSubscriptionId: 'tok',
    });
    expect(m.currentPeriodEnd!.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(m.currentPeriodStart!.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
  it.each([
    [
      'auto-renew off',
      { lineItems: [{ ...base.lineItems[0], autoRenewingPlan: { autoRenewEnabled: false } }] },
      'canceled',
    ],
    ['grace period', { subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' }, 'grace_period'],
    ['on hold', { subscriptionState: 'SUBSCRIPTION_STATE_ON_HOLD' }, 'on_hold'],
    ['paused', { subscriptionState: 'SUBSCRIPTION_STATE_PAUSED' }, 'paused'],
    ['canceled', { subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' }, 'canceled'],
    ['expired', { subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED' }, 'expired'],
    ['pending', { subscriptionState: 'SUBSCRIPTION_STATE_PENDING' }, 'on_hold'],
  ])('%s → %s', (_l, over, expected) => {
    expect(mapPlaySubscription('tok', { ...base, ...over }, now).status).toBe(expected);
  });
  it('marks revocations as refunded', () => {
    expect(mapPlaySubscription('tok', base, { ...now, revoked: true }).status).toBe('refunded');
  });
  it('derives intervals from base plan ids', () => {
    expect(intervalFromBasePlan('annual')).toBe('annual');
    expect(intervalFromBasePlan('starter-yearly')).toBe('annual');
    expect(intervalFromBasePlan('monthly')).toBe('monthly');
    expect(intervalFromBasePlan('weird')).toBeNull();
  });
});

describe('GooglePlayClient', () => {
  it('gets an OAuth token with a signed JWT, caches it, reads and acknowledges', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const { exportPKCS8 } = await import('jose');
    const pem = await exportPKCS8(privateKey);
    const calls: { url: string; init?: RequestInit }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('oauth2'))
        return new Response(JSON.stringify({ access_token: 'at', expires_in: 3600 }));
      if (String(url).includes(':acknowledge')) return new Response('{}');
      return new Response(JSON.stringify({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' }));
    }) as unknown as typeof fetch;
    const client = new GooglePlayClient(
      'com.weblume.app',
      { client_email: 'svc@x.iam.gserviceaccount.com', private_key: pem },
      fake,
    );
    expect((await client.getSubscription('tok/1')).subscriptionState).toBe(
      'SUBSCRIPTION_STATE_ACTIVE',
    );
    await client.acknowledge('weblume_starter', 'tok/1');
    expect(calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1); // cached
    const tokenBody = new URLSearchParams(String(calls[0]!.init!.body));
    expect(tokenBody.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(calls[1]!.url).toBe(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.weblume.app/purchases/subscriptionsv2/tokens/tok%2F1',
    );
    expect(calls[2]!.url).toContain(
      '/purchases/subscriptions/weblume_starter/tokens/tok%2F1:acknowledge',
    );
    expect((calls[1]!.init!.headers as Record<string, string>).Authorization).toBe('Bearer at');
  });
});

describe('RTDN push verification', () => {
  async function setup() {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
    const sign = (claims: Record<string, unknown>, aud = 'https://api.test/rtdn') =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer('https://accounts.google.com')
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);
    return { keys: createLocalJWKSet({ keys: [jwk] }), sign };
  }
  const opts = {
    audience: 'https://api.test/rtdn',
    serviceAccount: 'push@proj.iam.gserviceaccount.com',
  };

  it('accepts a Google-signed token for our service account', async () => {
    const { keys, sign } = await setup();
    const token = await sign({ email: opts.serviceAccount, email_verified: true });
    expect(await verifyPubSubPush(`Bearer ${token}`, { ...opts, keys })).toBe(true);
  });
  it.each([
    ['other service account', { email: 'evil@x.com', email_verified: true }, undefined],
    [
      'unverified email',
      { email: 'push@proj.iam.gserviceaccount.com', email_verified: false },
      undefined,
    ],
    [
      'wrong audience',
      { email: 'push@proj.iam.gserviceaccount.com', email_verified: true },
      'https://other',
    ],
  ])('rejects %s', async (_l, claims, aud) => {
    const { keys, sign } = await setup();
    expect(await verifyPubSubPush(`Bearer ${await sign(claims, aud)}`, { ...opts, keys })).toBe(
      false,
    );
  });
  it('rejects missing tokens', async () => {
    const { keys } = await setup();
    expect(await verifyPubSubPush(undefined, { ...opts, keys })).toBe(false);
  });
  it('decodes Pub/Sub messages', () => {
    const data = Buffer.from(
      JSON.stringify({
        packageName: 'p',
        subscriptionNotification: { notificationType: 2, purchaseToken: 't' },
      }),
    ).toString('base64');
    expect(decodeRtdn({ message: { data, messageId: 'm1' } })).toMatchObject({
      messageId: 'm1',
      data: { packageName: 'p' },
    });
    expect(decodeRtdn({})).toBeNull();
    expect(decodeRtdn({ message: { data: '!!!', messageId: 'm' } })).toBeNull();
  });
});
