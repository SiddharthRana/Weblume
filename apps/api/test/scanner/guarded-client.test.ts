import type { LookupAddress } from 'node:dns';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GuardedHttpClient, type GuardedFetchError } from '../../src/scanner/http/guarded-client';
import { isPublicAddress } from '../../src/scanner/http/ip-policy';
import { html, redirect, startTestServer } from './test-server';

/**
 * The test server listens on 127.0.0.1, which the real policy blocks. These tests therefore use a
 * policy that allows exactly 127.0.0.1 (standing in for "a public server") while every other
 * non-public address stays blocked, plus a fake resolver for test hostnames.
 */
let port: number;
let close: () => Promise<void>;
const PUBLIC_STANDIN = '127.0.0.1';
const testPolicy = (ip: string) => ip === PUBLIC_STANDIN || isPublicAddress(ip);

const dnsTable: Record<string, string[]> = {
  'site.test': [PUBLIC_STANDIN],
  'private.test': ['10.0.0.5'],
  'metadata.test': ['169.254.169.254'],
  'mixed.test': [PUBLIC_STANDIN, '192.168.0.10'],
  'v6loop.test': ['::1'],
  'mapped.test': ['::ffff:127.0.0.2'],
};
const resolve = async (host: string): Promise<LookupAddress[]> => {
  const ips = dnsTable[host];
  if (!ips) throw Object.assign(new Error('not found'), { code: 'ENOTFOUND' });
  return ips.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
};

function makeClient(extra: Partial<ConstructorParameters<typeof GuardedHttpClient>[0]> = {}) {
  return new GuardedHttpClient({
    userAgent: 'WeblumeBot/test',
    resolve,
    isAllowedAddress: testPolicy,
    allowedPorts: [port, 80, 443],
    ...extra,
  });
}

const opts = { timeoutMs: 3_000, maxBytes: 64 * 1024 };

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return (e as GuardedFetchError).code ?? String(e);
  }
}

beforeAll(async () => {
  const srv = await startTestServer({
    '/': html('<html><title>ok</title></html>', { 'x-test': 'yes' }),
    '/ua': (req, res) =>
      res
        .writeHead(200, { 'content-type': 'text/plain' })
        .end(`${req.headers['user-agent']}|${req.headers.cookie ?? ''}`),
    '/r1': redirect('/r2', 301),
    '/r2': redirect('/', 302),
    '/loop': redirect('/loop'),
    '/to-private-ip': redirect('http://10.0.0.5/'),
    '/to-metadata': redirect('http://169.254.169.254/latest/meta-data/'),
    '/to-private-host': redirect(`http://private.test:${0}/`),
    '/to-loopback-v6': redirect('http://[::1]/'),
    '/to-file': redirect('file:///etc/passwd'),
    '/to-gopher': redirect('gopher://site.test/'),
    '/to-bad-port': redirect('http://site.test:6379/'),
    // 2130706434 = 127.0.0.2 (127.0.0.1 is the test's allowed stand-in).
    '/to-decimal-ip': redirect('http://2130706434/'),
    '/big': html('x'.repeat(200 * 1024)),
    '/big-chunked': (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      for (let i = 0; i < 100; i++) res.write('y'.repeat(1024));
      res.end();
    },
    '/slow-drip': (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      const t = setInterval(() => res.write('.'), 200);
      res.on('close', () => clearInterval(t));
    },
    '/hang': () => undefined,
  });
  port = srv.port;
  close = srv.close;
});

afterAll(async () => {
  await close();
});

describe('GuardedHttpClient', () => {
  it('fetches an allowed page and returns status, headers and body', async () => {
    const client = makeClient();
    const res = await client.fetch(`http://site.test:${port}/`, opts);
    expect(res.status).toBe(200);
    expect(res.headers['x-test']).toBe('yes');
    expect(res.body?.toString()).toContain('<title>ok</title>');
    await client.close();
  });

  it('identifies itself and sends no cookies', async () => {
    const client = makeClient();
    const res = await client.fetch(`http://site.test:${port}/ua`, opts);
    expect(res.body?.toString()).toBe('WeblumeBot/test|');
    await client.close();
  });

  it('follows redirects and records the chain', async () => {
    const client = makeClient();
    const res = await client.fetch(`http://site.test:${port}/r1`, opts);
    expect(res.status).toBe(200);
    expect(res.chain).toEqual([
      `http://site.test:${port}/r1`,
      `http://site.test:${port}/r2`,
      `http://site.test:${port}/`,
    ]);
    await client.close();
  });

  describe('blocks unsafe destinations', () => {
    const client = () => makeClient();

    it.each([
      ['loopback IPv4 literal', 'http://127.0.0.2/'],
      ['private IPv4 literal', 'http://10.1.2.3/'],
      ['metadata endpoint', 'http://169.254.169.254/latest/meta-data/'],
      ['IPv6 loopback literal', 'http://[::1]/'],
      ['IPv4-mapped IPv6 loopback', 'http://[::ffff:127.0.0.2]/'],
      ['unspecified address', 'http://0.0.0.0/'],
      ['CGNAT', 'http://100.64.1.1/'],
    ])('%s', async (_label, url) => {
      expect(await codeOf(client().fetch(url, opts))).toBe('blocked_destination');
    });

    it.each([
      ['file:', 'file:///etc/passwd'],
      ['gopher:', 'gopher://site.test/'],
      ['ftp:', 'ftp://site.test/'],
      ['data:', 'data:text/html,hi'],
      ['credentials in URL', `http://user:pass@site.test:${0}/`],
      ['non-standard port', 'http://site.test:6379/'],
    ])('non-HTTP or unsafe URL: %s', async (_label, url) => {
      expect(await codeOf(client().fetch(url, opts))).toBe('blocked_destination');
    });

    it('a hostname resolving to a private IP', async () => {
      expect(await codeOf(client().fetch('http://private.test/', opts))).toBe(
        'blocked_destination',
      );
    });

    it('a hostname resolving to the cloud metadata IP', async () => {
      expect(await codeOf(client().fetch('http://metadata.test/', opts))).toBe(
        'blocked_destination',
      );
    });

    it('a hostname resolving to IPv6 loopback or IPv4-mapped loopback', async () => {
      expect(await codeOf(client().fetch('http://v6loop.test/', opts))).toBe('blocked_destination');
      expect(await codeOf(client().fetch('http://mapped.test/', opts))).toBe('blocked_destination');
    });

    it('a hostname with mixed public and private answers (rebinding trick)', async () => {
      expect(await codeOf(client().fetch(`http://mixed.test:${port}/`, opts))).toBe(
        'blocked_destination',
      );
    });

    it('explicitly blocked hosts (e.g. our own API)', async () => {
      const c = makeClient({ blockedHosts: ['site.test'] });
      expect(await codeOf(c.fetch(`http://site.test:${port}/`, opts))).toBe('blocked_destination');
    });

    it('the default policy blocks the loopback test server itself', async () => {
      const strict = new GuardedHttpClient({ userAgent: 'x', resolve, allowedPorts: [port] });
      expect(await codeOf(strict.fetch(`http://site.test:${port}/`, opts))).toBe(
        'blocked_destination',
      );
      expect(await codeOf(strict.fetch(`http://127.0.0.1:${port}/`, opts))).toBe(
        'blocked_destination',
      );
      await strict.close();
    });
  });

  describe('re-validates every redirect hop', () => {
    it.each([
      ['private IP literal', '/to-private-ip'],
      ['metadata endpoint', '/to-metadata'],
      ['IPv6 loopback', '/to-loopback-v6'],
      ['file: scheme', '/to-file'],
      ['gopher: scheme', '/to-gopher'],
      ['non-standard port', '/to-bad-port'],
      ['decimal-encoded loopback IP', '/to-decimal-ip'],
    ])('redirect to %s is blocked', async (_label, path) => {
      const c = makeClient();
      expect(await codeOf(c.fetch(`http://site.test:${port}${path}`, opts))).toBe(
        'blocked_destination',
      );
      await c.close();
    });

    it('redirect to a hostname that resolves privately is blocked', async () => {
      const srv = await startTestServer({ '/': redirect('http://private.test/') });
      const c = makeClient({ allowedPorts: [srv.port, 80, 443] });
      expect(await codeOf(c.fetch(`http://site.test:${srv.port}/`, opts))).toBe(
        'blocked_destination',
      );
      await c.close();
      await srv.close();
    });
  });

  it('stops redirect loops', async () => {
    const c = makeClient();
    expect(await codeOf(c.fetch(`http://site.test:${port}/loop`, opts))).toBe('too_many_redirects');
    await c.close();
  });

  it('enforces the redirect limit', async () => {
    const c = makeClient();
    expect(await codeOf(c.fetch(`http://site.test:${port}/r1`, { ...opts, maxRedirects: 1 }))).toBe(
      'too_many_redirects',
    );
    await c.close();
  });

  it('rejects responses over the size limit (declared length)', async () => {
    const c = makeClient();
    expect(await codeOf(c.fetch(`http://site.test:${port}/big`, opts))).toBe('response_too_large');
    await c.close();
  });

  it('rejects responses over the size limit (chunked, no length)', async () => {
    const c = makeClient();
    expect(
      await codeOf(
        c.fetch(`http://site.test:${port}/big-chunked`, { ...opts, maxBytes: 10 * 1024 }),
      ),
    ).toBe('response_too_large');
    await c.close();
  });

  it('times out slow-drip bodies', async () => {
    const c = makeClient();
    expect(
      await codeOf(c.fetch(`http://site.test:${port}/slow-drip`, { ...opts, timeoutMs: 800 })),
    ).toBe('timeout');
    await c.close();
  });

  it('times out servers that never respond', async () => {
    const c = makeClient();
    expect(
      await codeOf(c.fetch(`http://site.test:${port}/hang`, { ...opts, timeoutMs: 500 })),
    ).toBe('timeout');
    await c.close();
  });

  it('reports DNS failures', async () => {
    const c = makeClient();
    expect(await codeOf(c.fetch('http://does-not-exist.test/', opts))).toBe('dns_failure');
    await c.close();
  });

  it('reports refused connections', async () => {
    const srv = await startTestServer({});
    const deadPort = srv.port;
    await srv.close();
    const c = makeClient({ allowedPorts: [deadPort] });
    expect(await codeOf(c.fetch(`http://site.test:${deadPort}/`, opts))).toBe('connection_failed');
    await c.close();
  });

  it('can skip reading the body for status checks', async () => {
    const c = makeClient();
    const res = await c.fetch(`http://site.test:${port}/big`, { ...opts, discardBody: true });
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
    await c.close();
  });
});
