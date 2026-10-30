import type { PsiOutcome, PsiProvider, Strategy } from './psi.types';
import { mapPsiResponse } from './psi-mapper';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
export const PSI_TIMEOUT_MS = 60_000;

/** Google PageSpeed Insights v5. PSI fetches the page from Google's infrastructure, not ours. */
export class GooglePsiProvider implements PsiProvider {
  readonly configured = true;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async run(url: string, strategy: Strategy, signal?: AbortSignal): Promise<PsiOutcome> {
    const params = new URLSearchParams({ url, strategy, key: this.apiKey });
    for (const c of ['performance', 'accessibility', 'seo', 'best-practices'])
      params.append('category', c);
    const timeout = AbortSignal.timeout(PSI_TIMEOUT_MS);
    let res: Response;
    try {
      res = await this.fetchImpl(`${ENDPOINT}?${params}`, {
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
        headers: { accept: 'application/json' },
      });
    } catch {
      return {
        ok: false,
        reason: timeout.aborted || signal?.aborted ? 'timeout' : 'upstream_error',
      };
    }
    if (res.status === 429) return { ok: false, reason: 'quota_exceeded' };
    if (!res.ok) return { ok: false, reason: 'upstream_error' };
    try {
      return { ok: true, result: mapPsiResponse(await res.json()) };
    } catch {
      return { ok: false, reason: 'invalid_response' };
    }
  }
}

export class UnconfiguredPsiProvider implements PsiProvider {
  readonly configured = false;
  async run(): Promise<PsiOutcome> {
    return { ok: false, reason: 'not_configured' };
  }
}
