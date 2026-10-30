import { lookup as dnsLookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { Agent, request, type Dispatcher } from 'undici';
import { isIpLiteral, isPublicAddress, type AddressPolicy } from './ip-policy';

export type Resolver = (hostname: string) => Promise<LookupAddress[]>;

export type GuardedFetchErrorCode =
  | 'invalid_url'
  | 'blocked_destination'
  | 'dns_failure'
  | 'connection_failed'
  | 'tls_error'
  | 'timeout'
  | 'too_many_redirects'
  | 'response_too_large';

export class GuardedFetchError extends Error {
  constructor(
    readonly code: GuardedFetchErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'GuardedFetchError';
  }
}

export interface GuardedClientOptions {
  userAgent: string;
  /** DNS resolver; defaults to the system resolver (all addresses). */
  resolve?: Resolver;
  /** Which resolved IPs may be connected to. Defaults to public unicast only. */
  isAllowedAddress?: AddressPolicy;
  /** Allowed destination ports. Defaults to 80/443. */
  allowedPorts?: number[];
  /** Hostnames that must never be fetched (e.g. our own API). */
  blockedHosts?: string[];
  maxConnectionsPerOrigin?: number;
  /**
   * TESTS ONLY: send every request to this port instead of the URL's (validated) port, so
   * integration tests can serve "http://site.com/" from a local test server. Never set in production.
   */
  testPortOverride?: number;
}

export interface FetchOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs: number;
  /** Maximum body bytes to read; larger responses fail with response_too_large. */
  maxBytes: number;
  maxRedirects?: number;
  /** When false, a redirect response is returned as-is (status 3xx + location header). */
  followRedirects?: boolean;
  /** Skip reading the body (status-only checks). */
  discardBody?: boolean;
  accept?: string;
  signal?: AbortSignal;
}

export interface GuardedResponse {
  /** URL that produced the final (non-redirect) response. */
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer | null;
  /** Every URL requested, in order, including the final one. */
  chain: string[];
}

const BLOCKED_ERRNO = 'EWEBLUME_BLOCKED';
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * The only HTTP client allowed to contact user-influenced destinations.
 *
 * - Resolves DNS itself, rejects the host if ANY resolved address is non-public, and the socket
 *   connects to the address that was validated (lookup happens inside the connector), so DNS
 *   rebinding can't swap in a private IP between check and connect.
 * - Follows redirects manually, re-validating scheme/port/host/IP on every hop.
 * - Enforces an overall deadline and a streaming body-size cap.
 * - Sends no cookies or credentials.
 */
export class GuardedHttpClient {
  private readonly agent: Agent;
  private readonly resolve: Resolver;
  private readonly isAllowed: AddressPolicy;
  private readonly allowedPorts: Set<number>;
  private readonly blockedHosts: Set<string>;

  constructor(private readonly opts: GuardedClientOptions) {
    this.resolve = opts.resolve ?? ((host) => dnsLookup(host, { all: true, verbatim: true }));
    this.isAllowed = opts.isAllowedAddress ?? isPublicAddress;
    this.allowedPorts = new Set(opts.allowedPorts ?? [80, 443]);
    this.blockedHosts = new Set((opts.blockedHosts ?? []).map((h) => h.toLowerCase()));
    this.agent = new Agent({
      connections: opts.maxConnectionsPerOrigin ?? 5,
      keepAliveTimeout: 5_000,
      connect: {
        timeout: 10_000,
        // Node's net/tls connect() calls this; the socket connects to whatever we return.
        lookup: (hostname, options, callback) => {
          this.validatedLookup(hostname).then(
            (addresses) => {
              const wantAll =
                typeof options === 'object' &&
                options !== null &&
                (options as { all?: boolean }).all;
              if (wantAll) (callback as (e: null, a: LookupAddress[]) => void)(null, addresses);
              else callback(null, addresses[0]!.address, addresses[0]!.family);
            },
            (err: NodeJS.ErrnoException) => callback(err, '', 0),
          );
        },
      },
    });
  }

  async close(): Promise<void> {
    await this.agent.close();
  }

  private async validatedLookup(hostname: string): Promise<LookupAddress[]> {
    let addresses: LookupAddress[];
    try {
      addresses = await this.resolve(hostname);
    } catch (e) {
      const err = new Error(`DNS lookup failed for host`) as NodeJS.ErrnoException;
      err.code = (e as NodeJS.ErrnoException).code ?? 'ENOTFOUND';
      throw err;
    }
    if (addresses.length === 0) {
      const err = new Error('No addresses') as NodeJS.ErrnoException;
      err.code = 'ENOTFOUND';
      throw err;
    }
    // Reject if any address is disallowed: mixed answers are a classic rebinding trick.
    if (addresses.some((a) => !this.isAllowed(a.address))) {
      const err = new Error('Destination is not a public address') as NodeJS.ErrnoException;
      err.code = BLOCKED_ERRNO;
      throw err;
    }
    return addresses;
  }

  /** Validates a URL's syntax-level properties before any network activity. */
  assertAllowedUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new GuardedFetchError('invalid_url');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      throw new GuardedFetchError('blocked_destination', 'scheme');
    if (url.username || url.password)
      throw new GuardedFetchError('blocked_destination', 'credentials');
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    if (!this.allowedPorts.has(port)) throw new GuardedFetchError('blocked_destination', 'port');
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || this.blockedHosts.has(host))
      throw new GuardedFetchError('blocked_destination', 'host');
    // IP literals skip DNS (and therefore our lookup hook), so check them here.
    if (isIpLiteral(host) && !this.isAllowed(host))
      throw new GuardedFetchError('blocked_destination', 'ip');
    return url;
  }

  async fetch(rawUrl: string, options: FetchOptions): Promise<GuardedResponse> {
    const maxRedirects = options.maxRedirects ?? 5;
    const deadline = AbortSignal.timeout(options.timeoutMs);
    const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
    const chain: string[] = [];
    let current = this.assertAllowedUrl(rawUrl);
    let method = options.method ?? 'GET';

    for (let hop = 0; ; hop++) {
      chain.push(current.toString());
      let res: Dispatcher.ResponseData;
      const target = new URL(current);
      if (this.opts.testPortOverride) target.port = String(this.opts.testPortOverride);
      try {
        res = await request(target, {
          dispatcher: this.agent,
          method,
          signal,
          headers: {
            'user-agent': this.opts.userAgent,
            accept: options.accept ?? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
            'accept-language': 'en',
          },
          headersTimeout: options.timeoutMs,
          bodyTimeout: options.timeoutMs,
        });
      } catch (err) {
        throw toGuardedError(err, signal);
      }

      if (REDIRECT_STATUSES.has(res.statusCode) && options.followRedirects !== false) {
        discard(res.body);
        const location = headerValue(res.headers.location);
        if (!location) return this.finish(res, current, chain, options, signal);
        if (hop >= maxRedirects) throw new GuardedFetchError('too_many_redirects');
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          throw new GuardedFetchError('invalid_url', 'bad redirect location');
        }
        next.hash = '';
        current = this.assertAllowedUrl(next.toString());
        if (res.statusCode === 303) method = 'GET';
        continue;
      }
      return this.finish(res, current, chain, options, signal);
    }
  }

  private async finish(
    res: Dispatcher.ResponseData,
    url: URL,
    chain: string[],
    options: FetchOptions,
    signal: AbortSignal,
  ): Promise<GuardedResponse> {
    const headers = flattenHeaders(res.headers);
    if (options.discardBody || options.method === 'HEAD') {
      discard(res.body);
      return { url: url.toString(), status: res.statusCode, headers, body: null, chain };
    }
    const declared = Number(headers['content-length']);
    if (Number.isFinite(declared) && declared > options.maxBytes) {
      discard(res.body);
      throw new GuardedFetchError('response_too_large');
    }
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for await (const chunk of res.body) {
        total += (chunk as Buffer).length;
        if (total > options.maxBytes) {
          discard(res.body);
          throw new GuardedFetchError('response_too_large');
        }
        chunks.push(chunk as Buffer);
      }
    } catch (err) {
      if (err instanceof GuardedFetchError) throw err;
      throw toGuardedError(err, signal);
    }
    return {
      url: url.toString(),
      status: res.statusCode,
      headers,
      body: Buffer.concat(chunks),
      chain,
    };
  }
}

/** Drops a response body without reading it. undici emits an AbortError on destroy, so swallow it. */
function discard(body: Dispatcher.ResponseData['body']): void {
  body.on('error', () => undefined);
  body.destroy();
}

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function flattenHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h))
    if (v !== undefined) out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  return out;
}

function errorCodes(err: unknown): string[] {
  const codes: string[] = [];
  let e: unknown = err;
  for (let i = 0; e && i < 5; i++) {
    const anyErr = e as { code?: string; name?: string; cause?: unknown };
    if (anyErr.code) codes.push(anyErr.code);
    if (anyErr.name) codes.push(anyErr.name);
    e = anyErr.cause;
  }
  return codes;
}

export function toGuardedError(err: unknown, signal?: AbortSignal): GuardedFetchError {
  if (err instanceof GuardedFetchError) return err;
  const codes = errorCodes(err);
  const has = (pred: (c: string) => boolean) => codes.some(pred);
  if (has((c) => c === BLOCKED_ERRNO)) return new GuardedFetchError('blocked_destination', 'ip');
  if (has((c) => c === 'ENOTFOUND' || c === 'EAI_AGAIN' || c === 'ENODATA' || c === 'EAI_NONAME'))
    return new GuardedFetchError('dns_failure');
  if (signal?.aborted || has((c) => /TIMEOUT|TimeoutError|AbortError|ETIMEDOUT/i.test(c)))
    return new GuardedFetchError('timeout');
  if (has((c) => /^(ERR_TLS|ERR_SSL|CERT_|UNABLE_TO_|DEPTH_ZERO|SELF_SIGNED|ERR_OSSL)/.test(c)))
    return new GuardedFetchError('tls_error');
  return new GuardedFetchError('connection_failed');
}
