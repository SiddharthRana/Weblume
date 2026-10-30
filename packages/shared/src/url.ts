/**
 * Syntactic URL validation + normalisation shared by web, API and (mirrored) mobile.
 * Network-level safety (DNS, IP ranges, redirects) is enforced separately by the API's guarded client.
 */
export const MAX_URL_LENGTH = 2048;

export type UrlErrorCode =
  | 'empty'
  | 'too_long'
  | 'invalid'
  | 'unsupported_scheme'
  | 'credentials_not_allowed'
  | 'port_not_allowed'
  | 'invalid_host';

export const URL_ERROR_MESSAGES: Record<UrlErrorCode, string> = {
  empty: 'Enter a website address, for example example.com.',
  too_long: `That address is too long (maximum ${MAX_URL_LENGTH} characters).`,
  invalid: 'That doesn’t look like a valid web address.',
  unsupported_scheme: 'Only http:// and https:// addresses can be scanned.',
  credentials_not_allowed: 'Addresses containing a username or password can’t be scanned.',
  port_not_allowed: 'Only standard web ports (80 and 443) can be scanned.',
  invalid_host: 'Enter a public website address with a domain name, like example.com.',
};

export type NormalizeResult =
  { ok: true; url: string; hostname: string } | { ok: false; code: UrlErrorCode; message: string };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const OTHER_SCHEME =
  /^(javascript|data|file|mailto|ftp|gopher|ws|wss|blob|about|tel|view-source|chrome|vbscript):/i;
// Hostnames that never resolve to public sites.
const RESERVED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home.arpa',
  '.test',
  '.invalid',
  '.example',
  '.onion',
];
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function fail(code: UrlErrorCode): NormalizeResult {
  return { ok: false, code, message: URL_ERROR_MESSAGES[code] };
}

export function normalizeUrl(input: string): NormalizeResult {
  const raw = input.trim();
  if (!raw) return fail('empty');
  if (raw.length > MAX_URL_LENGTH) return fail('too_long');
  if (/[\s<>"`\\^{}|]/.test(raw)) return fail('invalid');

  let candidate = raw;
  if (!HAS_SCHEME.test(raw)) {
    if (OTHER_SCHEME.test(raw)) return fail('unsupported_scheme');
    candidate = `https://${raw}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fail('invalid');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('unsupported_scheme');
  if (url.username || url.password) return fail('credentials_not_allowed');
  if (url.port && url.port !== '80' && url.port !== '443') return fail('port_not_allowed');

  // WHATWG URL already lowercases, converts IDNs to punycode and canonicalises IPv4 notations
  // (e.g. 0x7f.1 → 127.0.0.1). Strip a trailing root dot so "example.com." dedupes with "example.com".
  let hostname = url.hostname.replace(/\.$/, '');
  if (!hostname) return fail('invalid_host');
  const isIpLiteral = IPV4.test(hostname) || hostname.startsWith('[');
  if (!isIpLiteral) {
    if (!hostname.includes('.')) return fail('invalid_host');
    if (hostname === 'localhost' || RESERVED_SUFFIXES.some((s) => hostname.endsWith(s)))
      return fail('invalid_host');
    if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.split('.').some((l) => !l || l.length > 63)) {
      return fail('invalid_host');
    }
  }
  url.hostname = hostname;
  hostname = url.hostname;
  url.hash = '';
  if (url.toString().length > MAX_URL_LENGTH) return fail('too_long');

  return { ok: true, url: url.toString(), hostname };
}
