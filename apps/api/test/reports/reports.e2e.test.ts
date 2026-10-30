import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app';
import { JWT_KEY_RESOLVER } from '../../src/auth/jwt-verifier';
import { FeatureFlags } from '../../src/common/feature-flags.service';
import { PSI_PROVIDER } from '../../src/scanner/psi/psi.types';
import { SCAN_QUEUE } from '../../src/scans/scan-queue';
import { MAX_ACTIVE_SHARES_PER_SCAN } from '../../src/reports/reports.service';
import { makeKeys, setTestEnv, signEs256 } from '../helpers';

const DB_URL = process.env.TEST_DATABASE_URL;
const USER_A = '00000000-0000-4000-8000-0000000000d1';
const USER_B = '00000000-0000-4000-8000-0000000000d2';
const DAY = 86_400_000;
const METRICS_TOKEN = 'metrics-token-0123456789abcdef';

describe.skipIf(!DB_URL)('reports: comparison, share links, PDF (database e2e)', () => {
  let app: NestExpressApplication;
  let sql: postgres.Sql;
  let flags: FeatureFlags;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    setTestEnv({
      DATABASE_URL: DB_URL!,
      WORKER_ENABLED: 'false',
      PUBLIC_SITE_URL: 'https://weblume.test',
      METRICS_TOKEN: METRICS_TOKEN,
    });
    const keys = await makeKeys();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_KEY_RESOLVER)
      .useValue(keys.jwks)
      .overrideProvider(SCAN_QUEUE)
      .useValue({ enqueue: async () => undefined })
      .overrideProvider(PSI_PROVIDER)
      .useValue({ configured: false, run: async () => ({ ok: false, reason: 'not_configured' }) })
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
    tokenA = await signEs256(keys.privateKey, { sub: USER_A, email: 'rep-a@test.dev' });
    tokenB = await signEs256(keys.privateKey, { sub: USER_B, email: 'rep-b@test.dev' });
  });

  beforeEach(async () => {
    await sql`delete from public.scans`;
    await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
    await sql`insert into auth.users (id, email) values (${USER_A}, 'rep-a@test.dev'), (${USER_B}, 'rep-b@test.dev')`;
    await sql`update public.feature_flags set enabled = true`;
    flags.clearCache();
  });

  afterAll(async () => {
    await app?.close();
    await sql?.end();
  });

  const server = () => app.getHttpServer();
  const as = (token: string) => ({
    get: (p: string) => request(server()).get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string) => request(server()).post(p).set('Authorization', `Bearer ${token}`),
    del: (p: string) => request(server()).delete(p).set('Authorization', `Bearer ${token}`),
  });
  const A = () => as(tokenA);
  const B = () => as(tokenB);

  async function makeStarter(userId: string) {
    await sql`
      insert into public.subscriptions (user_id, provider, provider_subscription_id, product_id, plan_id, status,
        current_period_start, current_period_end, last_event_at)
      values (${userId}, 'paddle', ${'sub_' + Math.random()}, 'pri_m', 'starter', 'active',
        now() - interval '1 day', now() + interval '29 days', now())`;
  }

  async function addScan(
    userId: string,
    opts: {
      url?: string;
      status?: string;
      createdAt?: Date;
      expiresAt?: Date;
      findings?: [string, string, string, string][];
      performance?: number;
    } = {},
  ): Promise<string> {
    const createdAt = opts.createdAt ?? new Date();
    const lighthouse =
      opts.performance === undefined
        ? null
        : {
            mobile: {
              scores: {
                performance: opts.performance,
                accessibility: 90,
                seo: 90,
                bestPractices: 90,
              },
              metrics: {},
              fetchedAt: createdAt.toISOString(),
            },
          };
    const sources = {
      page_fetch: { status: 'ok' },
      psi_mobile: { status: 'ok' },
      link_check: { status: 'ok' },
      robots_sitemap: { status: 'ok' },
    };
    const [row] = await sql<{ id: string }[]>`
      insert into public.scans (user_id, target_url, normalized_url, final_url, status, sources, lighthouse,
        expires_at, created_at, completed_at)
      values (${userId}, 'example.com', ${opts.url ?? 'https://example.com/'}, ${opts.url ?? 'https://example.com/'},
        ${opts.status ?? 'completed'}, ${sql.json(sources)}, ${lighthouse ? sql.json(lighthouse) : null},
        ${opts.expiresAt ?? new Date(Date.now() + 300 * DAY)}, ${createdAt}, ${createdAt})
      returning id`;
    for (const [checkId, category, severity, source] of opts.findings ?? []) {
      await sql`insert into public.findings (scan_id, check_id, category, severity, kind, source)
        values (${row!.id}, ${checkId}, ${category}, ${severity}, 'detected', ${source})`;
    }
    return row!.id;
  }

  describe('comparison', () => {
    it('requires the Starter plan', async () => {
      const a = await addScan(USER_A);
      const b = await addScan(USER_A);
      const res = await A().get(`/v1/compare?base=${a}&target=${b}`).expect(403);
      expect(res.body).toMatchObject({ code: 'upgrade_required', feature: 'comparison' });
    });

    it('compares two scans of the same URL, oldest first', async () => {
      await makeStarter(USER_A);
      const older = await addScan(USER_A, {
        createdAt: new Date(Date.now() - 10 * DAY),
        performance: 40,
        findings: [
          ['seo.title.missing', 'seo', 'high', 'page_fetch'],
          ['seo.meta_description.missing', 'seo', 'medium', 'page_fetch'],
        ],
      });
      const newer = await addScan(USER_A, {
        performance: 75,
        findings: [
          ['seo.meta_description.missing', 'seo', 'medium', 'page_fetch'],
          ['tech.hsts.missing', 'technical', 'low', 'page_fetch'],
        ],
      });
      const res = await A().get(`/v1/compare?base=${newer}&target=${older}`).expect(200);
      expect(res.body.base.id).toBe(older);
      expect(res.body.target.id).toBe(newer);
      expect(res.body.newFindings.map((f: { checkId: string }) => f.checkId)).toEqual([
        'tech.hsts.missing',
      ]);
      expect(res.body.resolvedFindings.map((f: { checkId: string }) => f.checkId)).toEqual([
        'seo.title.missing',
      ]);
      expect(res.body.unchangedFindings).toHaveLength(1);
      expect(res.body.unchangedFindings[0].finding.title).toBeTruthy(); // copy is composed
      expect(res.body.scores.mobile.performance).toEqual({ before: 40, after: 75, delta: 35 });
    });

    it('refuses different URLs, unfinished scans, the same scan and other users’ scans', async () => {
      await makeStarter(USER_A);
      const a = await addScan(USER_A);
      const other = await addScan(USER_A, { url: 'https://other.example/' });
      const running = await addScan(USER_A, { status: 'running' });
      const bScan = await addScan(USER_B);
      expect((await A().get(`/v1/compare?base=${a}&target=${other}`).expect(400)).body.code).toBe(
        'different_urls',
      );
      expect((await A().get(`/v1/compare?base=${a}&target=${running}`).expect(409)).body.code).toBe(
        'report_not_ready',
      );
      expect((await A().get(`/v1/compare?base=${a}&target=${a}`).expect(400)).body.code).toBe(
        'same_scan',
      );
      await A().get(`/v1/compare?base=${a}&target=${bScan}`).expect(404);
      await A().get(`/v1/compare?base=${a}&target=not-a-uuid`).expect(400);
    });
  });

  describe('PDF export', () => {
    it('requires the Starter plan and ownership', async () => {
      const id = await addScan(USER_A);
      expect((await A().get(`/v1/scans/${id}/report.pdf`).expect(403)).body.code).toBe(
        'upgrade_required',
      );
      await makeStarter(USER_B);
      await B().get(`/v1/scans/${id}/report.pdf`).expect(404);
      await request(server()).get(`/v1/scans/${id}/report.pdf`).expect(401);
    });

    it('returns a PDF attachment for a finished scan', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A, {
        performance: 61,
        findings: [['seo.title.missing', 'seo', 'high', 'page_fetch']],
      });
      const res = await A()
        .get(`/v1/scans/${id}/report.pdf`)
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="weblume-example\.com-\d{4}-\d{2}-\d{2}\.pdf"$/,
      );
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('refuses scans without a report', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A, { status: 'failed' });
      expect((await A().get(`/v1/scans/${id}/report.pdf`).expect(409)).body.code).toBe(
        'report_not_ready',
      );
    });
  });

  describe('share links', () => {
    it('requires the Starter plan', async () => {
      const id = await addScan(USER_A);
      expect((await A().post(`/v1/scans/${id}/shares`).send({}).expect(403)).body.feature).toBe(
        'shareLinks',
      );
    });

    it('creates a 128-bit link, stores only its hash and serves a read-only report', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A, {
        findings: [['seo.title.missing', 'seo', 'high', 'page_fetch']],
      });
      const created = await A().post(`/v1/scans/${id}/shares`).send({}).expect(201);
      const { token, url, share } = created.body;
      expect(Buffer.from(token, 'base64url')).toHaveLength(16);
      expect(url).toBe(`https://weblume.test/r/${token}`);
      expect(share.active).toBe(true);
      const days = (Date.parse(share.expiresAt) - Date.now()) / DAY;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);

      const [stored] = await sql`select token_hash from public.share_links where id = ${share.id}`;
      expect(stored!.token_hash).not.toContain(token);
      expect(stored!.token_hash).toMatch(/^[0-9a-f]{64}$/);

      const view = await request(server()).get(`/v1/shared/${token}`).expect(200);
      expect(view.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(view.headers['cache-control']).toBe('private, no-store');
      expect(view.body.report.normalizedUrl).toBe('https://example.com/');
      expect(view.body.report.findings[0].checkId).toBe('seo.title.missing');
      expect(JSON.stringify(view.body)).not.toContain('rep-a@test.dev');
      expect(JSON.stringify(view.body)).not.toContain(USER_A);

      // The owner's list shows the link without its token.
      const list = await A().get(`/v1/scans/${id}/shares`).expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(JSON.stringify(list.body)).not.toContain(token);
    });

    it('revokes links; only the owner can, and revoked links stop working', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A);
      const { token, share } = (await A().post(`/v1/scans/${id}/shares`).send({}).expect(201)).body;
      await B().del(`/v1/shares/${share.id}`).expect(404);
      await request(server()).get(`/v1/shared/${token}`).expect(200);
      const revoked = await A().del(`/v1/shares/${share.id}`).expect(200);
      expect(revoked.body.active).toBe(false);
      await A().del(`/v1/shares/${share.id}`).expect(200); // idempotent
      const gone = await request(server()).get(`/v1/shared/${token}`).expect(404);
      expect(gone.body.code).toBe('not_found');
    });

    it('expires links, and never past the report’s own retention', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A, { expiresAt: new Date(Date.now() + 5 * DAY) });
      const { token, share } = (
        await A().post(`/v1/scans/${id}/shares`).send({ expiresInDays: 90 }).expect(201)
      ).body;
      expect(Date.parse(share.expiresAt)).toBeLessThanOrEqual(Date.now() + 5 * DAY);
      await sql`update public.share_links set expires_at = now() - interval '1 second' where id = ${share.id}`;
      await request(server()).get(`/v1/shared/${token}`).expect(404);
    });

    it('stops serving when the scan expires or is deleted', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A);
      const { token } = (await A().post(`/v1/scans/${id}/shares`).send({}).expect(201)).body;
      await sql`update public.scans set expires_at = now() - interval '1 second' where id = ${id}`;
      await request(server()).get(`/v1/shared/${token}`).expect(404);
      await sql`delete from public.scans where id = ${id}`;
      expect(await sql`select 1 from public.share_links`).toHaveLength(0);
    });

    it('keeps working after the owner downgrades, until it expires', async () => {
      await makeStarter(USER_A);
      const id = await addScan(USER_A);
      const { token } = (await A().post(`/v1/scans/${id}/shares`).send({}).expect(201)).body;
      await sql`delete from public.subscriptions where user_id = ${USER_A}`;
      await request(server()).get(`/v1/shared/${token}`).expect(200);
      await A().post(`/v1/scans/${id}/shares`).send({}).expect(403);
    });

    it('validates input, ownership and limits', async () => {
      await makeStarter(USER_A);
      await makeStarter(USER_B);
      const id = await addScan(USER_A);
      await A().post(`/v1/scans/${id}/shares`).send({ expiresInDays: 0 }).expect(400);
      await A().post(`/v1/scans/${id}/shares`).send({ expiresInDays: 366 }).expect(400);
      await B().post(`/v1/scans/${id}/shares`).send({}).expect(404);
      await B().get(`/v1/scans/${id}/shares`).expect(404);
      const queued = await addScan(USER_A, { status: 'queued' });
      expect((await A().post(`/v1/scans/${queued}/shares`).send({}).expect(409)).body.code).toBe(
        'report_not_ready',
      );
      // Seed directly: creating this many through the API would hit its rate limit.
      for (let i = 0; i < MAX_ACTIVE_SHARES_PER_SCAN; i++)
        await sql`insert into public.share_links (scan_id, created_by, token_hash, expires_at)
          values (${id}, ${USER_A}, ${'h' + i}, now() + interval '1 day')`;
      // Revoked links don't count towards the limit.
      await sql`insert into public.share_links (scan_id, created_by, token_hash, revoked_at)
        values (${id}, ${USER_A}, 'revoked', now())`;
      expect((await A().post(`/v1/scans/${id}/shares`).send({}).expect(409)).body.code).toBe(
        'too_many_share_links',
      );
    });

    it('answers unknown and malformed tokens with the same 404', async () => {
      const a = await request(server()).get('/v1/shared/AAAAAAAAAAAAAAAAAAAAAA').expect(404);
      const b = await request(server()).get('/v1/shared/%27%20or%201%3D1').expect(404);
      expect(a.body).toEqual(b.body);
    });
  });

  describe('metrics endpoint', () => {
    it('requires the metrics token and reports database-wide scan numbers', async () => {
      await addScan(USER_A, { status: 'queued' });
      await addScan(USER_A, { status: 'queued' });
      await addScan(USER_A, { status: 'completed' });
      const failed = await addScan(USER_A, { status: 'failed' });
      await sql`update public.scans set failure_code = 'dns_failure' where id = ${failed}`;
      await request(server()).get('/metrics').expect(401);
      await request(server()).get('/metrics').set('Authorization', 'Bearer wrong').expect(401);
      const res = await request(server())
        .get('/metrics')
        .set('Authorization', `Bearer ${METRICS_TOKEN}`)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/^text\/plain/);
      expect(res.text).toContain('weblume_scan_queue_depth 2');
      expect(res.text).toContain('weblume_scans_last_24h{status="completed"} 1');
      expect(res.text).toContain('weblume_scan_failures_last_24h{reason="dns_failure"} 1');
      expect(res.text).toContain('# TYPE weblume_scan_queue_depth gauge');
      expect(res.text).not.toContain('example.com');
    });
  });
});
