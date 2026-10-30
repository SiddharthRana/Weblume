import robotsParser from 'robots-parser';
import { GuardedFetchError, type GuardedHttpClient } from '../http/guarded-client';
import { type CheckOutcome, emptyOutcome, record } from './types';

export type Robots = ReturnType<typeof robotsParser>;

export const SITE_LIMITS = {
  robotsBytes: 512 * 1024,
  sitemapBytes: 1024 * 1024,
  fetchTimeoutMs: 5_000,
  maxLinks: 50,
  maxLinkConcurrency: 10,
  perHostConcurrency: 5,
  maxRobotsOrigins: 10,
  maxEvidence: 20,
};

const CRAWLER_UA = 'Googlebot';

export async function fetchRobots(
  client: GuardedHttpClient,
  origin: string,
  signal?: AbortSignal,
): Promise<Robots | null> {
  const url = `${origin}/robots.txt`;
  try {
    const res = await client.fetch(url, {
      timeoutMs: SITE_LIMITS.fetchTimeoutMs,
      maxBytes: SITE_LIMITS.robotsBytes,
      accept: 'text/plain,*/*;q=0.5',
      signal,
    });
    if (res.status !== 200 || !res.body) return null;
    return robotsParser(url, res.body.toString('utf8'));
  } catch {
    return null;
  }
}

/** robots.txt + sitemap checks for the page's origin. Returns the parsed robots for reuse by the link checker. */
export async function checkRobotsAndSitemap(
  client: GuardedHttpClient,
  pageUrl: string,
  signal?: AbortSignal,
): Promise<{ outcome: CheckOutcome; robots: Robots | null }> {
  const out = emptyOutcome();
  const origin = new URL(pageUrl).origin;
  const robots = await fetchRobots(client, origin, signal);

  record(out, 'seo.robots_txt.missing', robots === null);
  if (robots) {
    record(out, 'seo.robots_txt.blocks_page', robots.isAllowed(pageUrl, CRAWLER_UA) === false, {
      userAgent: CRAWLER_UA,
    });
  }

  const candidates = [...(robots?.getSitemaps() ?? []), `${origin}/sitemap.xml`];
  const sitemapUrl = candidates[0]!;
  const verdict = await probeSitemap(client, sitemapUrl, signal);
  if (verdict === 'missing') record(out, 'seo.sitemap.missing', true, { tried: sitemapUrl });
  else {
    out.passed.push('seo.sitemap.missing');
    record(out, 'seo.sitemap.invalid', verdict === 'invalid', { url: sitemapUrl });
  }
  return { outcome: out, robots };
}

async function probeSitemap(
  client: GuardedHttpClient,
  url: string,
  signal?: AbortSignal,
): Promise<'ok' | 'invalid' | 'missing'> {
  try {
    const res = await client.fetch(url, {
      timeoutMs: SITE_LIMITS.fetchTimeoutMs,
      maxBytes: SITE_LIMITS.sitemapBytes,
      accept: 'application/xml,text/xml,*/*;q=0.5',
      signal,
    });
    if (res.status === 404 || res.status === 410) return 'missing';
    if (res.status !== 200 || !res.body) return 'invalid';
    const type = res.headers['content-type'] ?? '';
    // Compressed sitemaps can't be inspected cheaply; their presence is what we check.
    if (/gzip/i.test(type) || url.endsWith('.gz')) return 'ok';
    const head = res.body.subarray(0, 4096).toString('utf8');
    return /<(urlset|sitemapindex)[\s>]/i.test(head) ? 'ok' : 'invalid';
  } catch (e) {
    // A sitemap too big to download is still a sitemap.
    if (e instanceof GuardedFetchError && e.code === 'response_too_large') return 'ok';
    return 'missing';
  }
}

/** Does http:// redirect to https://? Only meaningful when the page is served over HTTPS. */
export async function checkHttpRedirect(
  client: GuardedHttpClient,
  httpsUrl: string,
  signal?: AbortSignal,
  /** Override the HTTP port (tests only); production always uses 80. */
  httpPort?: number,
): Promise<CheckOutcome> {
  const out = emptyOutcome();
  const http = new URL(httpsUrl);
  http.protocol = 'http:';
  http.port = httpPort ? String(httpPort) : '';
  try {
    const res = await client.fetch(http.toString(), {
      timeoutMs: SITE_LIMITS.fetchTimeoutMs,
      maxBytes: 0,
      discardBody: true,
      followRedirects: false,
      signal,
    });
    const location = res.headers.location ?? '';
    const redirectsToHttps =
      res.status >= 300 &&
      res.status < 400 &&
      /^https:\/\//i.test(new URL(location, http).toString());
    record(out, 'tech.https.no_redirect', !redirectsToHttps, {
      url: http.toString(),
      status: res.status,
    });
  } catch {
    // Port 80 closed or unreachable: visitors can't land on an insecure copy, so nothing to report.
  }
  return out;
}

interface LinkResult {
  url: string;
  status?: number;
  error?: string;
}

/** Checks up to SITE_LIMITS.maxLinks links with bounded global and per-host concurrency, respecting robots.txt. */
export async function checkLinks(
  client: GuardedHttpClient,
  links: string[],
  pageRobots: Robots | null,
  pageOrigin: string,
  signal?: AbortSignal,
): Promise<CheckOutcome> {
  const out = emptyOutcome();
  const toCheck = links.slice(0, SITE_LIMITS.maxLinks);
  const notChecked = {
    limit: links.length - toCheck.length,
    robots: 0,
    blocked: 0,
    rate_limited: 0,
  };
  const broken: LinkResult[] = [];

  const robotsCache = new Map<string, Promise<Robots | null>>([
    [pageOrigin, Promise.resolve(pageRobots)],
  ]);
  const robotsFor = (origin: string): Promise<Robots | null> | 'skip' => {
    const cached = robotsCache.get(origin);
    if (cached) return cached;
    if (robotsCache.size > SITE_LIMITS.maxRobotsOrigins) return 'skip';
    const p = fetchRobots(client, origin, signal);
    robotsCache.set(origin, p);
    return p;
  };

  const hostActive = new Map<string, number>();
  const queue = [...toCheck];

  async function checkOne(url: string): Promise<void> {
    const origin = new URL(url).origin;
    const robotsP = robotsFor(origin);
    if (robotsP === 'skip') {
      notChecked.limit++;
      return;
    }
    const robots = await robotsP;
    if (robots && robots.isAllowed(url, 'WeblumeBot') === false) {
      notChecked.robots++;
      return;
    }
    const opts = {
      timeoutMs: SITE_LIMITS.fetchTimeoutMs,
      maxBytes: 0,
      discardBody: true,
      signal,
    } as const;
    try {
      let res = await client.fetch(url, { ...opts, method: 'HEAD' });
      // Many servers mishandle HEAD; confirm with GET before calling a link broken.
      if ([400, 403, 404, 405, 501].includes(res.status))
        res = await client.fetch(url, { ...opts, method: 'GET' });
      if (res.status === 429) notChecked.rate_limited++;
      else if (res.status >= 400) broken.push({ url, status: res.status });
    } catch (e) {
      const code = e instanceof GuardedFetchError ? e.code : 'connection_failed';
      if (code === 'blocked_destination' || code === 'invalid_url') notChecked.blocked++;
      else broken.push({ url, error: code });
    }
  }

  async function worker(): Promise<void> {
    while (queue.length > 0 && !signal?.aborted) {
      // Pick the next link whose host isn't at its concurrency cap.
      const idx = queue.findIndex(
        (u) => (hostActive.get(new URL(u).host) ?? 0) < SITE_LIMITS.perHostConcurrency,
      );
      if (idx === -1) {
        await new Promise((r) => setTimeout(r, 25));
        continue;
      }
      const url = queue.splice(idx, 1)[0]!;
      const host = new URL(url).host;
      hostActive.set(host, (hostActive.get(host) ?? 0) + 1);
      try {
        await checkOne(url);
      } finally {
        hostActive.set(host, (hostActive.get(host) ?? 1) - 1);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SITE_LIMITS.maxLinkConcurrency, toCheck.length) }, worker),
  );
  notChecked.limit += queue.length; // aborted before checking

  record(out, 'tech.links.broken', broken.length > 0, {
    count: broken.length,
    checked: toCheck.length - queue.length,
    broken: broken.slice(0, SITE_LIMITS.maxEvidence),
  });
  const skipped =
    notChecked.limit + notChecked.robots + notChecked.blocked + notChecked.rate_limited;
  if (skipped > 0)
    out.findings.push({
      checkId: 'tech.links.not_checked',
      details: { count: skipped, reasons: notChecked },
    });
  return out;
}
