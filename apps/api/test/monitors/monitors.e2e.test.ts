import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app';
import { JWT_KEY_RESOLVER } from '../../src/auth/jwt-verifier';
import { FeatureFlags } from '../../src/common/feature-flags.service';
import { EMAIL_SENDER, type EmailMessage, type EmailSender } from '../../src/email/email';
import { MonitorsService } from '../../src/monitors/monitors.service';
import { PSI_PROVIDER } from '../../src/scanner/psi/psi.types';
import { SCAN_QUEUE } from '../../src/scans/scan-queue';
import { ScanHooks } from '../../src/scans/scan-hooks';
import { makeKeys, setTestEnv, signEs256 } from '../helpers';

const DB_URL = process.env.TEST_DATABASE_URL;
const USER_A = '00000000-0000-4000-8000-0000000000e1';
const USER_B = '00000000-0000-4000-8000-0000000000e2';
const DAY = 86_400_000;

class FakeEmail implements EmailSender {
  readonly delivers = true;
  sent: EmailMessage[] = [];
  async send(m: EmailMessage): Promise<void> {
    this.sent.push(m);
  }
}

describe.skipIf(!DB_URL)('monitoring (database e2e)', () => {
  let app: NestExpressApplication;
  let sql: postgres.Sql;
  let flags: FeatureFlags;
  let monitors: MonitorsService;
  let hooks: ScanHooks;
  let tokenA: string;
  let tokenB: string;
  const enqueued: string[] = [];
  const email = new FakeEmail();

  beforeAll(async () => {
    setTestEnv({
      DATABASE_URL: DB_URL!,
      WORKER_ENABLED: 'false',
      PUBLIC_SITE_URL: 'https://weblume.test',
      MONITOR_LINK_SECRET: 'monitor-link-secret-for-tests-0123456789',
      SCAN_CREATE_RATE_LIMIT_PER_MINUTE: '1000',
    });
    const keys = await makeKeys();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JWT_KEY_RESOLVER)
      .useValue(keys.jwks)
      .overrideProvider(SCAN_QUEUE)
      .useValue({ enqueue: async (id: string) => void enqueued.push(id) })
      .overrideProvider(PSI_PROVIDER)
      .useValue({ configured: false, run: async () => ({ ok: false, reason: 'not_configured' }) })
      .overrideProvider(EMAIL_SENDER)
      .useValue(email)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureApp(app);
    await app.init();
    flags = app.get(FeatureFlags);
    monitors = app.get(MonitorsService);
    hooks = app.get(ScanHooks);
    sql = postgres(DB_URL!, { onnotice: () => undefined });
    tokenA = await signEs256(keys.privateKey, { sub: USER_A, email: 'mon-a@test.dev' });
    tokenB = await signEs256(keys.privateKey, { sub: USER_B, email: 'mon-b@test.dev' });
  });

  beforeEach(async () => {
    await sql`delete from public.scheduled_scans`;
    await sql`delete from public.scans`;
    await sql`delete from public.subscriptions where user_id in (${USER_A}, ${USER_B})`;
    await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
    await sql`insert into auth.users (id, email) values (${USER_A}, 'mon-a@test.dev'), (${USER_B}, 'mon-b@test.dev')`;
    await sql`update public.feature_flags set enabled = true`;
    flags.clearCache();
    enqueued.length = 0;
    email.sent = [];
  });

  afterAll(async () => {
    // Other suites count pending account deletions; leave none behind.
    if (sql) {
      await sql`delete from public.scheduled_scans`;
      await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
    }
    await app?.close();
    await sql?.end();
  });

  const server = () => app.getHttpServer();
  const as = (token: string) => ({
    get: (p: string) => request(server()).get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string) => request(server()).post(p).set('Authorization', `Bearer ${token}`),
    patch: (p: string) => request(server()).patch(p).set('Authorization', `Bearer ${token}`),
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
      findings?: [string, string, string][];
      performance?: number;
      scheduledScanId?: string;
      failureCode?: string;
    } = {},
  ): Promise<string> {
    const createdAt = opts.createdAt ?? new Date();
    const url = opts.url ?? 'https://example.com/';
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
    const sources = { page_fetch: { status: 'ok' }, psi_mobile: { status: 'ok' } };
    const [row] = await sql<{ id: string }[]>`
      insert into public.scans (user_id, target_url, normalized_url, final_url, status, sources, lighthouse,
        expires_at, created_at, completed_at, scheduled_scan_id, failure_code, failure_message)
      values (${userId}, ${url}, ${url}, ${url}, ${opts.status ?? 'completed'}, ${sql.json(sources)},
        ${lighthouse ? sql.json(lighthouse) : null}, ${new Date(Date.now() + 300 * DAY)}, ${createdAt},
        ${createdAt}, ${opts.scheduledScanId ?? null}, ${opts.failureCode ?? null},
        ${opts.failureCode ? 'The website took too long to respond.' : null})
      returning id`;
    for (const [checkId, category, severity] of opts.findings ?? []) {
      await sql`insert into public.findings (scan_id, check_id, category, severity, kind, source)
        values (${row!.id}, ${checkId}, ${category}, ${severity}, 'detected', 'page_fetch')`;
    }
    return row!.id;
  }

  describe('managing monitored sites', () => {
    it('lets a Free account monitor one site weekly', async () => {
      const res = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      expect(res.body).toMatchObject({
        normalizedUrl: 'https://example.com/',
        frequency: 'weekly',
        alert: 'any_change',
        enabled: true,
        lastScan: null,
      });
      // No earlier scan: the first run is due straight away.
      expect(Date.parse(res.body.nextRunAt)).toBeLessThanOrEqual(Date.now());

      const list = await A().get('/v1/monitors').expect(200);
      expect(list.body).toMatchObject({ limit: 1, fastestFrequency: 'weekly' });
      expect(list.body.items).toHaveLength(1);
      // Owners only.
      expect((await B().get('/v1/monitors').expect(200)).body.items).toEqual([]);
      await B().patch(`/v1/monitors/${res.body.id}`).send({ enabled: false }).expect(404);
      await B().del(`/v1/monitors/${res.body.id}`).expect(404);
    });

    it('gates daily runs and the number of sites by plan', async () => {
      const daily = await A().post('/v1/monitors').send({ url: 'example.com', frequency: 'daily' });
      expect(daily.status).toBe(403);
      expect(daily.body).toMatchObject({ code: 'upgrade_required', feature: 'monitorFrequency' });

      await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      const second = await A().post('/v1/monitors').send({ url: 'example.org' }).expect(403);
      expect(second.body).toMatchObject({ code: 'monitor_limit_reached', limit: 1 });

      await makeStarter(USER_A);
      await A().post('/v1/monitors').send({ url: 'example.org', frequency: 'daily' }).expect(201);
      const dupe = await A().post('/v1/monitors').send({ url: 'https://example.org' }).expect(409);
      expect(dupe.body.code).toBe('already_monitored');
      for (const u of ['a.example.com', 'b.example.com', 'c.example.com'])
        await A().post('/v1/monitors').send({ url: u }).expect(201);
      const sixth = await A().post('/v1/monitors').send({ url: 'd.example.com' }).expect(403);
      expect(sixth.body).toMatchObject({ code: 'monitor_limit_reached', limit: 5 });
    });

    it('validates input and rejects private addresses', async () => {
      await A().post('/v1/monitors').send({ url: 'example.com', frequency: 'hourly' }).expect(400);
      await A().post('/v1/monitors').send({ url: 'not a url' }).expect(400);
      const res = await A().post('/v1/monitors').send({ url: 'http://localhost:3000' }).expect(400);
      expect(res.body.code).toBeTruthy();
    });

    it('schedules from the latest scan of the address', async () => {
      const scanId = await addScan(USER_A, { createdAt: new Date(Date.now() - 2 * DAY) });
      const res = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      expect(res.body.lastScan.id).toBe(scanId);
      const expected = Date.now() - 2 * DAY + 7 * DAY;
      expect(Math.abs(Date.parse(res.body.nextRunAt) - expected)).toBeLessThan(60_000);
    });

    it('pauses, resumes, changes settings and deletes', async () => {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      const paused = await A().patch(`/v1/monitors/${m.id}`).send({ enabled: false }).expect(200);
      expect(paused.body.enabled).toBe(false);
      await A().patch(`/v1/monitors/${m.id}`).send({ frequency: 'daily' }).expect(403);
      const changed = await A()
        .patch(`/v1/monitors/${m.id}`)
        .send({ enabled: true, alert: 'new_findings', frequency: 'monthly' })
        .expect(200);
      expect(changed.body).toMatchObject({
        enabled: true,
        alert: 'new_findings',
        frequency: 'monthly',
      });
      await A().del(`/v1/monitors/${m.id}`).expect(204);
      expect((await A().get('/v1/monitors').expect(200)).body.items).toEqual([]);
    });

    it('is not available to guests', async () => {
      await request(server()).get('/v1/monitors').expect(401);
      await request(server()).post('/v1/monitors').send({ url: 'example.com' }).expect(401);
    });
  });

  describe('scheduler', () => {
    it('queues due monitors once, outside the scan quota, and keeps the time of day', async () => {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      const due = new Date(Date.now() - 60_000);
      await sql`update public.scheduled_scans set next_run_at = ${due} where id = ${m.id}`;

      const first = await monitors.tick();
      expect(first).toEqual({ started: 1, skipped: 0 });
      expect(enqueued).toHaveLength(1);
      const [scan] = await sql`select * from public.scans where id = ${enqueued[0]!}`;
      expect(scan).toMatchObject({
        user_id: USER_A,
        normalized_url: 'https://example.com/',
        scheduled_scan_id: m.id,
        counts_toward_quota: false,
        status: 'queued',
      });
      const [row] = await sql`select * from public.scheduled_scans where id = ${m.id}`;
      expect(row!.last_scan_id).toBe(enqueued[0]);
      expect((row!.next_run_at as Date).getTime()).toBe(due.getTime() + 7 * DAY);

      // Not due any more: a second tick does nothing.
      expect(await monitors.tick()).toEqual({ started: 0, skipped: 0 });
      // Quota is untouched.
      const me = await A().get('/v1/me').expect(200);
      expect(me.body.usage.used).toBe(0);
    });

    it('does not block a scan started by hand while a scheduled one runs', async () => {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      await sql`update public.scheduled_scans set next_run_at = now() - interval '1 minute' where id = ${m.id}`;
      await monitors.tick();
      await A().post('/v1/scans').send({ url: 'example.org' }).expect(202);
    });

    it('skips a run while the previous one is still going', async () => {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      await addScan(USER_A, { status: 'running', scheduledScanId: m.id });
      await sql`update public.scheduled_scans set next_run_at = now() - interval '1 minute' where id = ${m.id}`;
      expect(await monitors.tick()).toEqual({ started: 0, skipped: 1 });
      const [row] = await sql`select * from public.scheduled_scans where id = ${m.id}`;
      expect(row).toMatchObject({ enabled: true, last_skip_reason: 'previous_run_active' });
    });

    it('after a downgrade, keeps the oldest site within the limit at the plan frequency', async () => {
      await makeStarter(USER_A);
      const ids: string[] = [];
      for (const u of ['a.example.com', 'b.example.com']) {
        const res = await A().post('/v1/monitors').send({ url: u, frequency: 'daily' }).expect(201);
        ids.push(res.body.id);
      }
      await sql`delete from public.subscriptions where user_id = ${USER_A}`;
      await sql`update public.scheduled_scans set next_run_at = now() - interval '1 minute'`;
      expect(await monitors.tick()).toEqual({ started: 1, skipped: 1 });
      const rows =
        await sql`select id, enabled, frequency, last_skip_reason from public.scheduled_scans order by created_at`;
      expect(rows[0]).toMatchObject({ id: ids[0], enabled: true, frequency: 'weekly' });
      expect(rows[1]).toMatchObject({ id: ids[1], enabled: false, last_skip_reason: 'plan_limit' });
      // Resuming the paused one is refused while the other is running.
      const resume = await A().patch(`/v1/monitors/${ids[1]}`).send({ enabled: true }).expect(403);
      expect(resume.body.code).toBe('monitor_limit_reached');
    });

    it('pauses monitors of deleted accounts', async () => {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      await sql`update public.profiles set deletion_requested_at = now() where id = ${USER_A}`;
      await sql`update public.scheduled_scans set next_run_at = now() - interval '1 minute' where id = ${m.id}`;
      expect(await monitors.tick()).toEqual({ started: 0, skipped: 1 });
      const [row] =
        await sql`select enabled, last_skip_reason from public.scheduled_scans where id = ${m.id}`;
      expect(row).toMatchObject({ enabled: false, last_skip_reason: 'account_deleted' });
    });
  });

  describe('digests', () => {
    async function monitorWithRun(
      opts: Parameters<typeof addScan>[1],
      prev?: Parameters<typeof addScan>[1],
    ) {
      const { body: m } = await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      if (prev) await addScan(USER_A, { createdAt: new Date(Date.now() - 7 * DAY), ...prev });
      const scanId = await addScan(USER_A, { scheduledScanId: m.id, ...opts });
      return { monitorId: m.id as string, scanId };
    }

    it('emails the owner what changed, with a working pause link', async () => {
      const { monitorId, scanId } = await monitorWithRun(
        {
          performance: 60,
          findings: [['seo.meta_description.missing', 'seo', 'medium']],
        },
        { performance: 80, findings: [['seo.title.missing', 'seo', 'high']] },
      );
      await hooks.runFinished(scanId);
      expect(email.sent).toHaveLength(1);
      const msg = email.sent[0]!;
      expect(msg.to).toBe('mon-a@test.dev');
      expect(msg.subject).toBe('example.com: 1 new issue, 1 fixed, Performance down 20');
      expect(msg.text).toContain(`https://weblume.test/scan/${scanId}`);
      // Free plan: no comparison link.
      expect(msg.text).not.toContain('/compare?');
      expect(msg.subject + msg.text).not.toMatch(/—/);
      const pauseUrl = /https:\/\/weblume\.test\/monitoring\/pause\?token=(\S+)/.exec(msg.text)!;
      expect(msg.headers?.['List-Unsubscribe']).toBe(`<${pauseUrl[0]}>`);
      const [row] =
        await sql`select last_digest_at from public.scheduled_scans where id = ${monitorId}`;
      expect(row!.last_digest_at).toBeInstanceOf(Date);

      const token = decodeURIComponent(pauseUrl[1]!);
      const paused = await request(server()).post('/v1/monitors/pause').send({ token }).expect(200);
      expect(paused.body).toEqual({ targetUrl: 'https://example.com/', alreadyPaused: false });
      const again = await request(server()).post('/v1/monitors/pause').send({ token }).expect(200);
      expect(again.body.alreadyPaused).toBe(true);
      await request(server())
        .post('/v1/monitors/pause')
        .send({ token: token.slice(0, -2) + 'xx' })
        .expect(404);
    });

    it('includes a comparison link on Starter', async () => {
      await makeStarter(USER_A);
      const { scanId } = await monitorWithRun(
        { findings: [['seo.title.missing', 'seo', 'high']] },
        { findings: [] },
      );
      await hooks.runFinished(scanId);
      expect(email.sent[0]!.text).toContain(`/compare?base=`);
    });

    it('stays quiet when nothing changed, for the baseline, and when alerts are off', async () => {
      const same: [string, string, string][] = [['seo.title.missing', 'seo', 'high']];
      const r1 = await monitorWithRun(
        { findings: same, performance: 80 },
        { findings: same, performance: 78 },
      );
      await hooks.runFinished(r1.scanId);
      expect(email.sent).toHaveLength(0);

      await sql`delete from public.scheduled_scans`;
      await sql`delete from public.scans`;
      const r2 = await monitorWithRun({ findings: same });
      await hooks.runFinished(r2.scanId);
      expect(email.sent).toHaveLength(0);

      await sql`delete from public.scheduled_scans`;
      await sql`delete from public.scans`;
      const r3 = await monitorWithRun({ findings: same }, { findings: [] });
      await A().patch(`/v1/monitors/${r3.monitorId}`).send({ alert: 'none' }).expect(200);
      await hooks.runFinished(r3.scanId);
      expect(email.sent).toHaveLength(0);
    });

    it('tells the owner once when their site cannot be reached', async () => {
      const { monitorId, scanId } = await monitorWithRun({
        status: 'failed',
        failureCode: 'timeout',
      });
      await hooks.runFinished(scanId);
      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]!.subject).toBe("example.com: we couldn't scan your site");
      const next = await addScan(USER_A, {
        status: 'failed',
        failureCode: 'timeout',
        scheduledScanId: monitorId,
        createdAt: new Date(Date.now() + 1000),
      });
      await hooks.runFinished(next);
      expect(email.sent).toHaveLength(1);
    });

    it('ignores scans started by hand', async () => {
      await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
      await addScan(USER_A, { createdAt: new Date(Date.now() - DAY), findings: [] });
      const manual = await addScan(USER_A, { findings: [['seo.title.missing', 'seo', 'high']] });
      await hooks.runFinished(manual);
      expect(email.sent).toHaveLength(0);
    });
  });

  it('removes monitors with the account and includes them in the export', async () => {
    await A().post('/v1/monitors').send({ url: 'example.com' }).expect(201);
    const exp = await A().get('/v1/me/export').expect(200);
    expect(exp.body.monitors).toEqual([
      expect.objectContaining({ normalizedUrl: 'https://example.com/', frequency: 'weekly' }),
    ]);
    await A().del('/v1/me').send({ confirm: 'DELETE' }).expect(200);
    const rows = await sql`select id from public.scheduled_scans where user_id = ${USER_A}`;
    expect(rows).toHaveLength(0);
  });
});
