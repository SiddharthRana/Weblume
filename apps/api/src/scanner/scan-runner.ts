import {
  CHECKS,
  type LighthouseByStrategy,
  type ScanFailureCode,
  type Severity,
  type SeverityCounts,
  type SourceStatus,
  type SourcesMap,
} from '@weblume/shared';
import { runHtmlChecks } from './checks/html-checks';
import { checkHttpRedirect, checkLinks, checkRobotsAndSitemap } from './checks/site-checks';
import type { CheckOutcome, RawFinding } from './checks/types';
import {
  GuardedFetchError,
  type GuardedHttpClient,
  type GuardedResponse,
} from './http/guarded-client';
import { DUPLICATE_OF_OWN_CHECK, isMetric, lighthouseSeverity } from './psi/lighthouse-copy';
import type { PsiOutcome, Strategy, TrimmedLighthouse } from './psi/psi.types';

export interface ScanRunnerDeps {
  client: GuardedHttpClient;
  /** Returns cached or fresh Lighthouse results; null when PSI is disabled. */
  runPsi: ((url: string, strategy: Strategy, signal: AbortSignal) => Promise<PsiOutcome>) | null;
  linkCheckEnabled: boolean;
  limits: { scanTimeoutMs: number; pageTimeoutMs: number; pageMaxBytes: number };
  /** Test seam: HTTP port for the http→https probe. */
  httpPort?: number;
}

/** A finding ready to store. Lighthouse findings keep the audit text they need for display in `details`. */
export interface StoredFinding {
  checkId: string;
  category: (typeof CHECKS)[keyof typeof CHECKS]['category'];
  severity: Severity;
  kind: 'measured' | 'detected' | 'recommendation';
  source: 'page_fetch' | 'psi_mobile' | 'psi_desktop' | 'link_check' | 'robots_sitemap';
  details: Record<string, unknown>;
}

export type ScanResult =
  | {
      status: 'completed' | 'partial';
      finalUrl: string;
      sources: SourcesMap;
      lighthouse: LighthouseByStrategy | null;
      findings: StoredFinding[];
      passedChecks: string[];
      severityCounts: SeverityCounts;
    }
  | {
      status: 'failed';
      failureCode: ScanFailureCode;
      finalUrl: string | null;
      details?: Record<string, unknown>;
    };

const HTML_TYPES = /^(text\/html|application\/xhtml\+xml)\b/i;

/**
 * Runs one single-page audit end to end. No database access: the caller persists the result.
 * Never invents data — a source that fails is reported as failed and contributes nothing.
 */
export async function runScan(
  normalizedUrl: string,
  deps: ScanRunnerDeps,
  outerSignal?: AbortSignal,
): Promise<ScanResult> {
  const deadline = AbortSignal.timeout(deps.limits.scanTimeoutMs);
  const controller = new AbortController();
  const signal = AbortSignal.any([
    deadline,
    controller.signal,
    ...(outerSignal ? [outerSignal] : []),
  ]);

  // PSI fetches the page from Google's side and takes the longest, so start it first.
  const psi: Partial<Record<Strategy, Promise<PsiOutcome>>> = {};
  if (deps.runPsi) {
    for (const s of ['mobile', 'desktop'] as const) {
      psi[s] = deps
        .runPsi(normalizedUrl, s, signal)
        .catch(() => ({ ok: false, reason: 'upstream_error' }) as const);
    }
  }

  let page: GuardedResponse;
  try {
    page = await deps.client.fetch(normalizedUrl, {
      timeoutMs: deps.limits.pageTimeoutMs,
      maxBytes: deps.limits.pageMaxBytes,
      signal,
    });
  } catch (e) {
    controller.abort();
    const code = e instanceof GuardedFetchError ? e.code : 'internal_error';
    return {
      status: 'failed',
      failureCode: deadline.aborted ? 'scan_timeout' : code,
      finalUrl: null,
    };
  }
  if (page.status >= 400) {
    controller.abort();
    return {
      status: 'failed',
      failureCode: 'http_error',
      finalUrl: page.url,
      details: { status: page.status },
    };
  }
  const contentType = page.headers['content-type'] ?? '';
  if (contentType && !HTML_TYPES.test(contentType)) {
    controller.abort();
    return {
      status: 'failed',
      failureCode: 'not_html',
      finalUrl: page.url,
      details: { contentType },
    };
  }

  const html = page.body?.toString('utf8') ?? '';
  const htmlOut = runHtmlChecks({
    finalUrl: page.url,
    chain: page.chain,
    headers: page.headers,
    html,
    bytes: page.body?.length ?? 0,
  });

  const sources: SourcesMap = { page_fetch: { status: 'ok' } };
  const isHttps = page.url.startsWith('https:');
  const origin = new URL(page.url).origin;

  const robotsP = checkRobotsAndSitemap(deps.client, page.url, signal);
  const httpRedirectP = isHttps
    ? checkHttpRedirect(deps.client, page.url, signal, deps.httpPort)
    : Promise.resolve(null);
  const linksP: Promise<CheckOutcome | null> = deps.linkCheckEnabled
    ? robotsP.then((r) => checkLinks(deps.client, htmlOut.links, r.robots, origin, signal))
    : Promise.resolve(null);

  const [robotsOut, httpRedirectOut, linksOut] = await Promise.all([
    robotsP,
    httpRedirectP,
    linksP,
  ]);
  sources.robots_sitemap = signal.aborted
    ? { status: 'failed', reason: 'timeout' }
    : { status: 'ok' };
  sources.link_check = !deps.linkCheckEnabled
    ? { status: 'skipped', reason: 'disabled' }
    : signal.aborted
      ? { status: 'failed', reason: 'timeout' }
      : { status: 'ok' };

  const own: { out: CheckOutcome; source: StoredFinding['source'] }[] = [
    { out: htmlOut, source: 'page_fetch' },
    { out: robotsOut.outcome, source: 'robots_sitemap' },
    ...(httpRedirectOut ? [{ out: httpRedirectOut, source: 'page_fetch' as const }] : []),
    ...(linksOut ? [{ out: linksOut, source: 'link_check' as const }] : []),
  ];
  const findings: StoredFinding[] = own.flatMap(({ out, source }) =>
    out.findings.map((f) => toStored(f, source)),
  );
  const passedChecks = [...new Set(own.flatMap(({ out }) => out.passed))];

  // ---- Lighthouse
  const lighthouse: LighthouseByStrategy = {};
  const lhResults: Partial<Record<Strategy, TrimmedLighthouse>> = {};
  for (const strategy of ['mobile', 'desktop'] as const) {
    const key = strategy === 'mobile' ? 'psi_mobile' : 'psi_desktop';
    const p = psi[strategy];
    if (!p) {
      sources[key] = { status: 'skipped', reason: 'disabled' };
      continue;
    }
    const outcome = await p;
    if (outcome.ok) {
      const { failingAudits: _omit, ...summary } = outcome.result;
      lighthouse[strategy] = summary;
      lhResults[strategy] = outcome.result;
      sources[key] = { status: 'ok' };
    } else {
      sources[key] =
        outcome.reason === 'not_configured'
          ? { status: 'skipped', reason: 'not_configured' }
          : ({ status: 'failed', reason: outcome.reason } satisfies SourceStatus);
    }
  }
  // Findings come from the mobile run (Google indexes mobile-first); desktop only if mobile failed.
  const lhStrategy: Strategy | null = lhResults.mobile
    ? 'mobile'
    : lhResults.desktop
      ? 'desktop'
      : null;
  if (lhStrategy) {
    for (const a of lhResults[lhStrategy]!.failingAudits) {
      if (DUPLICATE_OF_OWN_CHECK.has(a.id)) continue;
      findings.push({
        checkId: `lighthouse.${a.id}`,
        category: a.category,
        severity: lighthouseSeverity(a),
        kind: isMetric(a.id) ? 'measured' : 'detected',
        source: lhStrategy === 'mobile' ? 'psi_mobile' : 'psi_desktop',
        details: {
          title: a.title,
          description: a.description,
          displayValue: a.displayValue,
          score: a.score,
          weight: a.weight,
          lhCategory: a.lhCategory,
          strategy: lhStrategy,
        },
      });
    }
  }

  const anyFailed = Object.values(sources).some((s) => s?.status === 'failed');
  const severityCounts: SeverityCounts = {};
  for (const f of findings) severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;

  return {
    status: anyFailed ? 'partial' : 'completed',
    finalUrl: page.url,
    sources,
    lighthouse: Object.keys(lighthouse).length ? lighthouse : null,
    findings,
    passedChecks,
    severityCounts,
  };
}

function toStored(f: RawFinding, source: StoredFinding['source']): StoredFinding {
  const def = CHECKS[f.checkId];
  return {
    checkId: f.checkId,
    category: def.category,
    severity: def.severity,
    kind: def.kind,
    source,
    details: f.details,
  };
}
