import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../src/url.js';

const ok = (input: string) => {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`expected ok for ${input}, got ${r.code}`);
  return r.url;
};
const code = (input: string) => {
  const r = normalizeUrl(input);
  return r.ok ? 'ok' : r.code;
};

describe('normalizeUrl', () => {
  it.each([
    ['example.com', 'https://example.com/'],
    ['  Example.COM/Path?q=1#frag ', 'https://example.com/Path?q=1'],
    ['http://example.com', 'http://example.com/'],
    ['https://example.com:443/', 'https://example.com/'],
    ['http://example.com:80/a', 'http://example.com/a'],
    ['https://example.com./', 'https://example.com/'],
    ['https://münchen.de/', 'https://xn--mnchen-3ya.de/'],
    ['https://sub.example.co.in/a/b/', 'https://sub.example.co.in/a/b/'],
  ])('%s → %s', (input, expected) => {
    expect(ok(input)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['javascript:alert(1)', 'unsupported_scheme'],
    ['file:///etc/passwd', 'unsupported_scheme'],
    ['ftp://example.com/', 'unsupported_scheme'],
    ['gopher://example.com/', 'unsupported_scheme'],
    ['data:text/html,hi', 'unsupported_scheme'],
    ['http://user:pass@example.com/', 'credentials_not_allowed'],
    ['https://user@example.com/', 'credentials_not_allowed'],
    ['https://example.com:8080/', 'port_not_allowed'],
    ['https://example.com:22/', 'port_not_allowed'],
    ['localhost', 'invalid_host'],
    ['http://localhost:80/', 'invalid_host'],
    ['https://app.localhost/', 'invalid_host'],
    ['https://printer.local/', 'invalid_host'],
    ['https://db.internal/', 'invalid_host'],
    ['https://intranet/', 'invalid_host'],
    ['https://exa mple.com/', 'invalid'],
    ['https://example.com/<script>', 'invalid'],
    ['https://' + 'a'.repeat(2100) + '.com', 'too_long'],
  ])('%s is rejected with %s', (input, expected) => {
    expect(code(input)).toBe(expected);
  });

  it('canonicalises alternative IPv4 notations so the server can block them', () => {
    // Syntax-level normalisation only; the API's IP policy rejects these addresses.
    expect(ok('http://2130706433/')).toBe('http://127.0.0.1/');
    expect(ok('http://0x7f.1/')).toBe('http://127.0.0.1/');
    expect(ok('http://0177.0.0.1/')).toBe('http://127.0.0.1/');
    expect(ok('http://127.1/')).toBe('http://127.0.0.1/');
  });

  it('dedupes equivalent inputs', () => {
    expect(ok('EXAMPLE.com')).toBe(ok('https://example.com/'));
    expect(ok('https://example.com/#a')).toBe(ok('https://example.com/#b'));
  });
});
