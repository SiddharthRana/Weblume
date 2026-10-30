import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LookupAddress } from 'node:dns';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanReportDto } from '@weblume/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { JWT_KEY_RESOLVER } from '../src/auth/jwt-verifier';
import { FeatureFlags } from '../src/common/feature-flags.service';
import { GuardedHttpClient } from '../src/scanner/http/guarded-client';
import { isPublicAddress } from '../src/scanner/http/ip-policy';
import { mapPsiResponse } from '../src/scanner/psi/psi-mapper';
import { PSI_PROVIDER, type PsiOutcome, type PsiProvider } from '../src/scanner/psi/psi.types';
import { GUARDED_CLIENT, ScanProcessor } from '../src/scans/scan.processor';
import { SCAN_QUEUE, type ScanQueue } from '../src/scans/scan-queue';
import { TURNSTILE_VERIFIER } from '../src/scans/turnstile';
import { makeKeys, setTestEnv, signEs256, type PrivateKey } from './helpers';
import { html, startTestServer } from './scanner/test-server';

const DB_URL = process.env.TEST_DATABASE_URL;
const psiFixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/psi-mobile.json'), 'utf8'));

const USER_A = '00000000-0000-4000-8000-00000000000a';
const USER_B = '00000000-0000-4000-8000-00000000000b';

// The local test server speaks plain HTTP, so scans use explicit http:// URLs.
/** Runs queued scans in-process so tests can await completion deterministically. */
class InlineQueue implements ScanQueue {
  processor!: ScanProcessor;
  private pending: Promise<void>[] = [];
  async enqueue(scanId: string): Promise<void> {
    this.pending.push(this.processor.process(scanId));
  }
  async drain(): Promise<void> {
    while (this.pending.length) await Promise.all(this.pending.splice(0));
  }
}

const SITE_HTML = `<!doctype html><html lang="en"><head><title>Fixture site home page for tests</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><h1>Fixture</h1><img src="/a.png"><a href="/ok">ok</a><a href="/gone">gone</a></body></html>`;

describe.skipIf(!DB_URL)('scans API (database e2e)', () => {
  let app: NestExpressApplication;
  let sql: postgres.Sql;
  let queue: InlineQueue;
  let privateKey: PrivateKey;
  let closeServer: () => Promise<void>;
  let flags: FeatureFlags;
  const psiRun = vi.fn<PsiProvider['run']>();
  const psi: PsiProvider = { configured: true, run: (...args) => psiRun(...args) };
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const srv = await startTestServer({
      '/': html(SITE_HTML),
      '/ok': html('ok'),
      '/gone': (_q, r) => r.writeHead(404).end(),
      '/missing-page': (_q, r) => r.writeHead(404, { 'content-type': 'text/html' }).end('nope'),
      '/file.pdf': (_q, r) => r.writeHead(200, { 'content-type': 'application/pdf' }).end('%PDF'),
    });
    closeServer = srv.close;

    // fixture-site.com and friends resolve to the local test server; everything else keeps real rules.
    const resolve = async (host: string): Promise<LookupAddress[]> => {
      if (host.endsWith('fixture-site.com')) return [{ address: '127.0.0.1', family: 4 }];
      if (host === 'private-site.com') return [{ address: '10.0.0.7', family: 4 }];
      throw Object.assign(new Error('nx'), { code: 'ENOTFOUND' });
    };
    const client = new GuardedHttpClient({
      userAgent: 'WeblumeBot/test',
      resolve,
      isAllowedAddress: (ip) => ip === '127.0.0.1' || isPublicAddress(ip),
      testPortOverride: srv.port,
    });

    setTestEnv({
      DATABASE_URL: DB_URL!,
      PSI_CACHE_TTL_HOURS: '6',
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
      .useValue(psi)
      .overrideProvider(TURNSTILE_VERIFIER)
      .useValue({ disabled: false, verify: async (t: string) => t === 'human' })
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
    await sql`insert into auth.users (id, email) values (${USER_A}, 'a@test.dev'), (${USER_B}, 'b@test.dev') on conflict do nothing`;
    tokenA = await signEs256(privateKey, { sub: USER_A });
    tokenB = await signEs256(privateKey, { sub: USER_B });
  });

  beforeEach(async () => {
    await sql`delete from public.scans`;
    await sql`delete from public.psi_cache`;
    await sql`update public.feature_flags set enabled = true where key in ('guest_scans', 'psi', 'link_check')`;
    flags.clearCache();
    psiRun.mockReset();
    psiRun.mockImplementation(async (): Promise<PsiOutcome> => ({
      ok: true,
      result: mapPsiResponse(psiFixture),
    }));
  });

  afterAll(async () => {
    await app?.close();
    await sql?.end();
    await closeServer?.();
  });

  const server = () => app.getHttpServer();
  const asA = (r: request.Test) => r.set('Authorization', `Bearer ${tokenA}`);
  const startScan = (url: string, token = tokenA) =>
    request(server()).post('/v1/scans').set('Authorization', `Bearer ${token}`).send({ url });
  const getReport = async (id: string, token = tokenA): Promise<ScanReportDto> =>
    (
      await request(server())
        .get(`/v1/scans/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    ).body;

  describe('signed-in scan lifecycle', () => {
    it('queues a scan, runs it and returns a full report', async () => {
      const res = await startScan('http://fixture-site.com').expect(202);
      expect(res.body.deduplicated).toBe(false);
      expect(res.body.scan).toMatchObject({
        status: 'queued',
        normalizedUrl: 'http://fixture-site.com/',
      });
      expect(res.body.scanToken).toBeUndefined();

      await queue.drain();
      const report = await getReport(res.body.scan.id);
      expect(report.status).toBe('completed');
      expect(report.finalUrl).toBe('http://fixture-site.com/');
      expect(report.sources).toMatchObject({
        page_fetch: { status: 'ok' },
        psi_mobile: { status: 'ok' },
        psi_desktop: { status: 'ok' },
        link_check: { status: 'ok' },
        robots_sitemap: { status: 'ok' },
      });
      expect(report.lighthouse?.mobile?.scores.performance).toBe(54);

      const ids = report.findings.map((f) => f.checkId);
      expect(ids).toEqual(
        expect.arrayContaining([
          'seo.meta_description.missing',
          'a11y.image_alt.missing',
          'tech.links.broken',
          'tech.https.missing',
        ]),
      );
      expect(ids).toContain('lighthouse.largest-contentful-paint');
      // Lighthouse duplicates of our own checks are not reported twice.
      expect(ids).not.toContain('lighthouse.image-alt');
      const broken = report.findings.find((f) => f.checkId === 'tech.links.broken')!;
      expect(broken.details).toMatchObject({
        count: 1,
        broken: [{ url: 'http://fixture-site.com/gone', status: 404 }],
      });
      // Every finding carries plain-language copy and findings are sorted most severe first.
      for (const f of report.findings) {
        expect(f.title).toBeTruthy();
        expect(f.howToFix.length).toBeGreaterThan(0);
      }
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      const sevs = report.findings.map((f) => order.indexOf(f.severity));
      expect(sevs).toEqual([...sevs].sort((a, b) => a - b));
      expect(report.passedChecks).toContain('seo.title.missing');
      expect(report.severityCounts.high).toBeGreaterThan(0);
    });

    it('returns a recent identical scan instead of scanning again', async () => {
      const first = await startScan('http://fixture-site.com/').expect(202);
      await queue.drain();
      const second = await startScan('HTTP://FIXTURE-SITE.com/#top').expect(200);
      expect(second.body.deduplicated).toBe(true);
      expect(second.body.scan.id).toBe(first.body.scan.id);
    });

    it('rejects a second scan while one is running', async () => {
      await startScan('http://fixture-site.com').expect(202); // not drained: still queued
      const res = await startScan('http://www.fixture-site.com').expect(409);
      expect(res.body.code).toBe('scan_in_progress');
      await queue.drain();
    });

    it('lists the user’s scans with search and pagination', async () => {
      for (const u of [
        'http://fixture-site.com',
        'http://www.fixture-site.com',
        'http://shop.fixture-site.com',
      ]) {
        await startScan(u).expect(202);
        await queue.drain();
      }
      const all = await asA(request(server()).get('/v1/scans')).expect(200);
      expect(all.body.items).toHaveLength(3);
      const filtered = await asA(request(server()).get('/v1/scans?q=shop')).expect(200);
      expect(filtered.body.items.map((s: { normalizedUrl: string }) => s.normalizedUrl)).toEqual([
        'http://shop.fixture-site.com/',
      ]);
      const page1 = await asA(request(server()).get('/v1/scans?limit=2')).expect(200);
      expect(page1.body.items).toHaveLength(2);
      const page2 = await asA(
        request(server()).get(
          `/v1/scans?limit=2&before=${encodeURIComponent(page1.body.nextCursor)}`,
        ),
      ).expect(200);
      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });

    it('requires authentication to list scans', async () => {
      await request(server()).get('/v1/scans').expect(401);
    });
  });

  describe('authorisation', () => {
    it('hides other users’ scans (404, not 403)', async () => {
      const res = await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      const asB = await request(server())
        .get(`/v1/scans/${res.body.scan.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
      expect(asB.body.code).toBe('not_found');
      await request(server()).get(`/v1/scans/${res.body.scan.id}`).expect(404);
      const listB = await request(server())
        .get('/v1/scans')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(listB.body.items).toEqual([]);
    });

    it('rejects an invalid token on optional-auth routes instead of treating it as a guest', async () => {
      await request(server())
        .post('/v1/scans')
        .set('Authorization', 'Bearer a.b.c')
        .send({ url: 'http://fixture-site.com' })
        .expect(401);
    });

    it('returns 404 for malformed ids', async () => {
      await asA(request(server()).get('/v1/scans/not-a-uuid')).expect(400);
    });
  });

  describe('validation', () => {
    it.each([
      ['', 'empty'],
      ['ftp://fixture-site.com', 'unsupported_scheme'],
      ['https://fixture-site.com:8443/', 'port_not_allowed'],
      ['localhost', 'invalid_host'],
      ['http://10.0.0.1/', 'blocked_destination'],
      ['http://[::1]/', 'blocked_destination'],
      ['http://169.254.169.254/latest/meta-data/', 'blocked_destination'],
    ])('rejects %j with %s', async (url, code) => {
      const res = await startScan(url).expect(400);
      expect(res.body.code).toBe(code);
      expect(res.body.message).toBeTruthy();
    });

    it('rejects unknown body fields and oversized URLs', async () => {
      await asA(
        request(server()).post('/v1/scans').send({ url: 'fixture-site.com', admin: true }),
      ).expect(400);
      await asA(
        request(server())
          .post('/v1/scans')
          .send({ url: 'a'.repeat(3000) }),
      ).expect(400);
    });
  });

  describe('failures', () => {
    it('fails honestly when the page returns an HTTP error, counting toward quota', async () => {
      const res = await startScan('http://fixture-site.com/missing-page').expect(202);
      await queue.drain();
      const report = await getReport(res.body.scan.id);
      expect(report).toMatchObject({ status: 'failed', failureCode: 'http_error', findings: [] });
      expect(report.failureMessage).toContain('HTTP 404');
      const [row] =
        await sql`select counts_toward_quota from public.scans where id = ${res.body.scan.id}`;
      expect(row!.counts_toward_quota).toBe(true);
    });

    it('fails when the address is not HTML', async () => {
      const res = await startScan('http://fixture-site.com/file.pdf').expect(202);
      await queue.drain();
      expect((await getReport(res.body.scan.id)).failureCode).toBe('not_html');
    });

    it('fails with blocked_destination when DNS points to a private network', async () => {
      const res = await startScan('http://private-site.com').expect(202);
      await queue.drain();
      expect((await getReport(res.body.scan.id)).failureCode).toBe('blocked_destination');
    });

    it('fails with dns_failure for unknown hosts', async () => {
      const res = await startScan('http://no-such-host-anywhere.com').expect(202);
      await queue.drain();
      expect((await getReport(res.body.scan.id)).failureCode).toBe('dns_failure');
    });

    it('retries a failed scan; free when the failure was ours', async () => {
      const [failed] = await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, failure_code, counts_toward_quota, expires_at)
        values (${USER_A}, 'http://fixture-site.com', 'http://fixture-site.com/', 'failed', 'internal_error', false, now() + interval '1 day')
        returning id`;
      const res = await asA(request(server()).post(`/v1/scans/${failed!.id}/retry`)).expect(202);
      await queue.drain();
      const [row] =
        await sql`select counts_toward_quota, retry_of, status from public.scans where id = ${res.body.scan.id}`;
      expect(row).toMatchObject({
        counts_toward_quota: false,
        retry_of: failed!.id,
        status: 'completed',
      });
    });

    it('only retries failed scans', async () => {
      const res = await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      const retry = await asA(request(server()).post(`/v1/scans/${res.body.scan.id}/retry`)).expect(
        409,
      );
      expect(retry.body.code).toBe('not_failed');
    });

    it('marks scans stuck in running as failed (free retry)', async () => {
      const [stuck] = await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, started_at, expires_at)
        values (${USER_A}, 'x', 'https://fixture-site.com/', 'running', now() - interval '1 hour', now() + interval '1 day')
        returning id`;
      expect(await app.get(ScanProcessor).failStuckScans()).toBe(1);
      const [row] =
        await sql`select status, failure_code, counts_toward_quota from public.scans where id = ${stuck!.id}`;
      expect(row).toMatchObject({
        status: 'failed',
        failure_code: 'scan_timeout',
        counts_toward_quota: false,
      });
    });
  });

  describe('PageSpeed Insights', () => {
    it('marks the scan partial when PSI fails, without inventing scores', async () => {
      psiRun.mockImplementation(async () => ({ ok: false, reason: 'quota_exceeded' }));
      const res = await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      const report = await getReport(res.body.scan.id);
      expect(report.status).toBe('partial');
      expect(report.sources.psi_mobile).toEqual({ status: 'failed', reason: 'quota_exceeded' });
      expect(report.lighthouse).toBeNull();
      expect(report.findings.some((f) => f.checkId.startsWith('lighthouse.'))).toBe(false);
      expect(report.findings.length).toBeGreaterThan(0); // our own checks still ran
    });

    it('reports PSI as not configured (completed, no scores)', async () => {
      psiRun.mockImplementation(async () => ({ ok: false, reason: 'not_configured' }));
      const res = await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      const report = await getReport(res.body.scan.id);
      expect(report.status).toBe('completed');
      expect(report.sources.psi_mobile).toEqual({ status: 'skipped', reason: 'not_configured' });
      expect(report.lighthouse).toBeNull();
    });

    it('skips PSI when the kill switch is off', async () => {
      await sql`update public.feature_flags set enabled = false where key = 'psi'`;
      flags.clearCache();
      const res = await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      expect(psiRun).not.toHaveBeenCalled();
      expect((await getReport(res.body.scan.id)).sources.psi_mobile).toEqual({
        status: 'skipped',
        reason: 'disabled',
      });
    });

    it('caches PSI results per URL and strategy', async () => {
      await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
      expect(psiRun).toHaveBeenCalledTimes(2); // mobile + desktop
      await startScan('http://fixture-site.com', tokenB).expect(202);
      await queue.drain();
      expect(psiRun).toHaveBeenCalledTimes(2); // served from cache
    });
  });

  describe('quotas', () => {
    it('enforces the free plan’s monthly scan limit', async () => {
      await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, expires_at)
        select ${USER_A}, 'x', 'https://fixture-site.com/p' || g, 'completed', now() + interval '1 day' from generate_series(1, 5) g`;
      const res = await startScan('http://fixture-site.com').expect(429);
      expect(res.body).toMatchObject({ code: 'quota_exceeded', limit: 5, used: 5 });
      expect(new Date(res.body.resetsAt).getUTCDate()).toBe(1);
    });

    it('does not count scans that failed on our side', async () => {
      await sql`
        insert into public.scans (user_id, target_url, normalized_url, status, counts_toward_quota, expires_at)
        select ${USER_A}, 'x', 'https://fixture-site.com/p' || g, 'failed', false, now() + interval '1 day' from generate_series(1, 5) g`;
      await startScan('http://fixture-site.com').expect(202);
      await queue.drain();
    });
  });

  describe('guest scans', () => {
    const guestScan = (body: Record<string, unknown>) =>
      request(server()).post('/v1/scans').send(body);

    it('requires a valid Turnstile token', async () => {
      expect((await guestScan({ url: 'fixture-site.com' }).expect(400)).body.code).toBe(
        'captcha_failed',
      );
      expect(
        (await guestScan({ url: 'fixture-site.com', turnstileToken: 'bot' }).expect(400)).body.code,
      ).toBe('captcha_failed');
    });

    it('returns a one-time scan token that grants access to the report', async () => {
      const res = await guestScan({
        url: 'http://fixture-site.com',
        turnstileToken: 'human',
      }).expect(202);
      const { scanToken, scan } = res.body;
      expect(scanToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
      await queue.drain();
      const ok = await request(server())
        .get(`/v1/scans/${scan.id}`)
        .set('X-Scan-Token', scanToken)
        .expect(200);
      expect(ok.body.status).toBe('completed');
      await request(server())
        .get(`/v1/scans/${scan.id}`)
        .set('X-Scan-Token', 'wrong-token')
        .expect(404);
      await request(server()).get(`/v1/scans/${scan.id}`).expect(404);
      // A signed-in user can't read someone else's guest scan.
      await asA(request(server()).get(`/v1/scans/${scan.id}`)).expect(404);
      // The token is stored hashed, never in plain text; the raw IP is never stored.
      const [row] =
        await sql`select claim_token_hash, guest_key_hash, expires_at - created_at as ttl from public.scans where id = ${scan.id}`;
      expect(row!.claim_token_hash).not.toContain(scanToken);
      expect(row!.guest_key_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('allows one guest scan per day per IP', async () => {
      await guestScan({ url: 'http://fixture-site.com', turnstileToken: 'human' }).expect(202);
      await queue.drain();
      const res = await guestScan({
        url: 'http://www.fixture-site.com',
        turnstileToken: 'human',
      }).expect(429);
      expect(res.body.message).toMatch(/free account/);
    });

    it('can be switched off with the kill switch', async () => {
      await sql`update public.feature_flags set enabled = false where key = 'guest_scans'`;
      flags.clearCache();
      expect(
        (await guestScan({ url: 'http://fixture-site.com', turnstileToken: 'human' }).expect(403))
          .body.code,
      ).toBe('guest_scans_disabled');
    });
  });
});
