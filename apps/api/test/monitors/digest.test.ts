import { describe, expect, it, vi } from 'vitest';
import { compareReports, type ScanReportDto } from '@weblume/shared';
import {
  renderChangeDigest,
  renderFailureNotice,
  shouldNotify,
  summarize,
  type DigestLinks,
} from '../../src/monitors/digest';
import { LogEmailSender, maskAddress, ResendEmailSender } from '../../src/email/email';
import { loadEnv } from '../../src/config/env';
import { own, sampleReport } from '../reports/fixtures';

const links: DigestLinks = {
  report: 'https://weblume.test/scan/b',
  compare: 'https://weblume.test/compare?base=a&target=b',
  manage: 'https://weblume.test/dashboard#monitoring',
  pause: 'https://weblume.test/monitoring/pause?token=t',
};

function pair(after: Partial<ScanReportDto>, before: Partial<ScanReportDto> = {}) {
  const a = sampleReport({ id: 'a', createdAt: '2026-10-01T00:00:00.000Z', ...before });
  const b = sampleReport({ id: 'b', createdAt: '2026-10-08T00:00:00.000Z', ...after });
  const r = compareReports(a, b);
  if (!r.ok) throw new Error(r.error);
  return r.comparison;
}

const mobile = (performance: number) => ({
  mobile: {
    scores: { performance, accessibility: 81, seo: 93, bestPractices: null },
    metrics: {},
    fetchedAt: '2026-10-08T00:00:00.000Z',
  },
});

describe('change digest', () => {
  it('reports new and fixed issues and big score changes, ignoring noise', () => {
    const base = sampleReport();
    const c = pair(
      {
        findings: [...base.findings.slice(1), own('seo.title.missing')],
        lighthouse: mobile(40),
      },
      {},
    );
    const s = summarize(c, 5);
    expect(s.newFindings.map((f) => f.checkId)).toEqual(['seo.title.missing']);
    expect(s.resolvedFindings.map((f) => f.checkId)).toEqual([base.findings[0]!.checkId]);
    expect(s.scoreChanges).toEqual([
      { strategy: 'mobile', score: 'performance', before: 54, after: 40, delta: -14 },
    ]);

    const small = summarize(pair({ lighthouse: mobile(51) }), 5);
    expect(small.scoreChanges).toEqual([]);
    expect(shouldNotify('any_change', small)).toBe(false);
  });

  it('follows the alert setting', () => {
    const onlyFixed = summarize(pair({ findings: sampleReport().findings.slice(1) }), 5);
    expect(shouldNotify('any_change', onlyFixed)).toBe(true);
    expect(shouldNotify('new_findings', onlyFixed)).toBe(false);
    expect(shouldNotify('score_drop', onlyFixed)).toBe(false);
    expect(shouldNotify('none', onlyFixed)).toBe(false);
    const drop = summarize(pair({ lighthouse: mobile(30) }), 5);
    expect(shouldNotify('score_drop', drop)).toBe(true);
    const rise = summarize(pair({ lighthouse: mobile(90) }), 5);
    expect(shouldNotify('score_drop', rise)).toBe(false);
    expect(shouldNotify('any_change', rise)).toBe(true);
  });

  it('renders a short plain-language email with report, compare and pause links', () => {
    const base = sampleReport();
    const s = summarize(
      pair({
        findings: [...base.findings.slice(1), own('seo.title.missing')],
        lighthouse: mobile(40),
      }),
      5,
    );
    const email = renderChangeDigest('https://bakery.example/', s, links);
    expect(email.subject).toBe('bakery.example: 1 new issue, 1 fixed, Performance down 14');
    expect(email.text).toContain('New issues');
    expect(email.text).toContain('Fixed since last time');
    expect(email.text).toContain('Performance (mobile) down 14: 54 to 40');
    expect(email.text).toContain(links.report);
    expect(email.text).toContain(links.compare);
    expect(email.text).toContain(links.pause);
    expect(email.html).toContain(`href="${links.pause}"`);
    for (const part of [email.subject, email.text, email.html]) expect(part).not.toMatch(/—/);
  });

  it('escapes HTML and caps long lists', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      own('seo.title.missing', {}, { id: `x${i}`, checkId: `x.${i}`, title: `<b>Issue ${i}</b>` }),
    );
    const email = renderChangeDigest(
      'https://bakery.example/',
      { newFindings: many, resolvedFindings: [], scoreChanges: [] },
      { ...links, compare: null },
    );
    expect(email.html).not.toContain('<b>Issue');
    expect(email.html).toContain('&lt;b&gt;Issue 0');
    expect(email.text).toContain('and 3 more');
    expect(email.text).not.toContain('side by side');
  });

  it('renders a failure notice', () => {
    const email = renderFailureNotice(
      'https://bakery.example/',
      'The website took too long.',
      links,
    );
    expect(email.subject).toBe("bakery.example: we couldn't scan your site");
    expect(email.text).toContain('The website took too long.');
    expect(email.text).not.toMatch(/—/);
  });
});

describe('email senders', () => {
  it('posts to the Resend API with the key and sender', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }));
    const sender = new ResendEmailSender('re_test', 'Weblume <a@mail.test>', fetchImpl);
    await sender.send({ to: 'u@x.test', subject: 'S', text: 'T', html: '<p>T</p>' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'Weblume <a@mail.test>',
      to: ['u@x.test'],
      subject: 'S',
    });
  });

  it('throws on a rejected message', async () => {
    const sender = new ResendEmailSender('k', 'f', async () => new Response('no', { status: 422 }));
    await expect(
      sender.send({ to: 'u@x.test', subject: 'S', text: 'T', html: 'T' }),
    ).rejects.toThrow(/HTTP 422/);
  });

  it('logs locally without a key and masks the address', async () => {
    expect(new LogEmailSender(true).delivers).toBe(false);
    expect(maskAddress('jane@example.com')).toBe('j***@example.com');
  });

  it('requires EMAIL_FROM with a Resend key, and a link secret in production', () => {
    const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db', SUPABASE_URL: 'http://x' };
    expect(() => loadEnv({ ...base, RESEND_API_KEY: 're_x' })).toThrow(/EMAIL_FROM/);
    expect(() =>
      loadEnv({ ...base, NODE_ENV: 'production', GUEST_HASH_SECRET: 'g'.repeat(32) }),
    ).toThrow(/MONITOR_LINK_SECRET/);
  });
});
