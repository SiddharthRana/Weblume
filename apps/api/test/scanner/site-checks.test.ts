import type { LookupAddress } from 'node:dns';
import robotsParser from 'robots-parser';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkHttpRedirect,
  checkLinks,
  checkRobotsAndSitemap,
  fetchRobots,
} from '../../src/scanner/checks/site-checks';
import { GuardedHttpClient } from '../../src/scanner/http/guarded-client';
import { isPublicAddress } from '../../src/scanner/http/ip-policy';
import { html, redirect, startTestServer, type Handler } from './test-server';

const resolve = async (host: string): Promise<LookupAddress[]> => {
  const table: Record<string, string> = {
    'site.test': '127.0.0.1',
    'other.test': '127.0.0.1',
    'private.test': '10.0.0.1',
  };
  if (!table[host]) throw Object.assign(new Error('nx'), { code: 'ENOTFOUND' });
  return [{ address: table[host]!, family: 4 }];
};

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((c) => c()));
});

async function setup(routes: Record<string, Handler>) {
  const srv = await startTestServer(routes);
  const client = new GuardedHttpClient({
    userAgent: 'WeblumeBot/test',
    resolve,
    isAllowedAddress: (ip) => ip === '127.0.0.1' || isPublicAddress(ip),
    allowedPorts: [srv.port, 80, 443],
  });
  cleanups.push(srv.close, () => client.close());
  return { client, base: `http://site.test:${srv.port}`, port: srv.port };
}

const text =
  (body: string, type = 'text/plain'): Handler =>
  (_q, r) =>
    r.writeHead(200, { 'content-type': type }).end(body);

describe('robots.txt and sitemap', () => {
  it('passes when robots.txt allows the page and lists a valid sitemap', async () => {
    const { client, base } = await setup({
      '/robots.txt': (q, r) =>
        r
          .writeHead(200, { 'content-type': 'text/plain' })
          .end(`User-agent: *\nDisallow: /admin\nSitemap: http://${q.headers.host}/sm.xml`),
      '/sm.xml': text(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        'application/xml',
      ),
    });
    const out = await checkRobotsAndSitemap(client, `${base}/`);
    expect(out.robots).not.toBeNull();
    expect(out.outcome.findings).toEqual([]);
    expect(out.outcome.passed).toEqual(
      expect.arrayContaining([
        'seo.robots_txt.missing',
        'seo.robots_txt.blocks_page',
        'seo.sitemap.missing',
        'seo.sitemap.invalid',
      ]),
    );
  });

  it('finds /sitemap.xml when robots.txt is absent', async () => {
    const { client, base } = await setup({
      '/sitemap.xml': text(
        '<sitemapindex><sitemap><loc>x</loc></sitemap></sitemapindex>',
        'application/xml',
      ),
    });
    const out = await checkRobotsAndSitemap(client, `${base}/`);
    expect(out.outcome.findings.map((f) => f.checkId)).toEqual(['seo.robots_txt.missing']);
    expect(out.outcome.passed).toEqual(
      expect.arrayContaining(['seo.sitemap.missing', 'seo.sitemap.invalid']),
    );
  });

  it('flags robots.txt blocking the page, and a missing sitemap', async () => {
    const { client, base } = await setup({ '/robots.txt': text('User-agent: *\nDisallow: /') });
    const ids = (await checkRobotsAndSitemap(client, `${base}/`)).outcome.findings.map(
      (f) => f.checkId,
    );
    expect(ids).toEqual(
      expect.arrayContaining(['seo.robots_txt.blocks_page', 'seo.sitemap.missing']),
    );
  });

  it('flags an invalid sitemap', async () => {
    const { client, base } = await setup({ '/sitemap.xml': html('<html>not a sitemap</html>') });
    const ids = (await checkRobotsAndSitemap(client, `${base}/`)).outcome.findings.map(
      (f) => f.checkId,
    );
    expect(ids).toContain('seo.sitemap.invalid');
  });

  it('treats an HTML 200 for robots.txt as present but unparseable rules as allowing', async () => {
    const { client, base } = await setup({ '/robots.txt': html('<html>soft 404</html>') });
    const robots = await fetchRobots(client, base);
    expect(robots?.isAllowed(`${base}/`, 'Googlebot')).toBe(true);
  });
});

describe('HTTP → HTTPS redirect', () => {
  it('passes when http redirects to https', async () => {
    const { client, port } = await setup({ '/page': redirect('https://site.test/page', 301) });
    const out = await checkHttpRedirect(client, 'https://site.test/page', undefined, port);
    expect(out.findings).toEqual([]);
    expect(out.passed).toEqual(['tech.https.no_redirect']);
  });

  it('fails when the http version serves the page', async () => {
    const { client, port } = await setup({ '/page': html('insecure copy') });
    const out = await checkHttpRedirect(client, 'https://site.test/page', undefined, port);
    expect(out.findings.map((f) => f.checkId)).toEqual(['tech.https.no_redirect']);
  });

  it('fails when http redirects to another http URL', async () => {
    const { client, port } = await setup({ '/page': redirect('http://site.test/elsewhere') });
    const out = await checkHttpRedirect(client, 'https://site.test/page', undefined, port);
    expect(out.findings.map((f) => f.checkId)).toEqual(['tech.https.no_redirect']);
  });

  it('reports nothing when port 80 is closed', async () => {
    const srv = await startTestServer({});
    const dead = srv.port;
    await srv.close();
    const { client } = await setup({});
    const c = new GuardedHttpClient({
      userAgent: 'x',
      resolve,
      isAllowedAddress: () => true,
      allowedPorts: [dead],
    });
    cleanups.push(() => c.close());
    void client;
    const out = await checkHttpRedirect(c, 'https://site.test/page', undefined, dead);
    expect(out).toEqual({ findings: [], passed: [] });
  });
});

describe('checkLinks', () => {
  it('reports broken links and passes working ones, respecting robots.txt', async () => {
    const { client, base } = await setup({
      '/ok': html('ok'),
      '/gone': (_q, r) => r.writeHead(404).end(),
      '/err': (_q, r) => r.writeHead(500).end(),
      '/head-hater': (q, r) =>
        q.method === 'HEAD' ? r.writeHead(405).end() : r.writeHead(200).end('fine'),
      '/limited': (_q, r) => r.writeHead(429).end(),
      '/secret': html('never fetched'),
      '/moved': redirect('/ok'),
    });
    const pageRobotsBlockingSecret = robotsParser(
      `${base}/robots.txt`,
      'User-agent: *\nDisallow: /secret',
    );
    const links = ['/ok', '/gone', '/err', '/head-hater', '/limited', '/secret', '/moved'].map(
      (p) => base + p,
    );
    links.push('http://private.test/x', 'http://nowhere.test/');
    const out = await checkLinks(client, links, pageRobotsBlockingSecret, new URL(base).origin);
    const broken = out.findings.find((f) => f.checkId === 'tech.links.broken')!.details as {
      broken: { url: string; status?: number; error?: string }[];
    };
    expect(broken.broken).toEqual(
      expect.arrayContaining([
        { url: `${base}/gone`, status: 404 },
        { url: `${base}/err`, status: 500 },
        { url: 'http://nowhere.test/', error: 'dns_failure' },
      ]),
    );
    expect(broken.broken).toHaveLength(3);
    const notChecked = out.findings.find((f) => f.checkId === 'tech.links.not_checked')!.details;
    expect(notChecked).toMatchObject({
      reasons: { robots: 1, blocked: 1, rate_limited: 1, limit: 0 },
    });
  });

  it('checks at most 50 links', async () => {
    const { client, base } = await setup({});
    const links = Array.from({ length: 60 }, (_, i) => `${base}/p${i}`);
    const out = await checkLinks(client, links, null, new URL(base).origin);
    expect(out.findings.find((f) => f.checkId === 'tech.links.broken')?.details).toMatchObject({
      count: 50,
      checked: 50,
    });
    expect(out.findings.find((f) => f.checkId === 'tech.links.not_checked')?.details).toMatchObject(
      { reasons: { limit: 10 } },
    );
  });

  it('passes when there are no links', async () => {
    const { client, base } = await setup({});
    const out = await checkLinks(client, [], null, new URL(base).origin);
    expect(out.findings).toEqual([]);
    expect(out.passed).toEqual(['tech.links.broken']);
  });
});
