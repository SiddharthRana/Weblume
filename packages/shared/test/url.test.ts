import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../src/url.js';

// Shared with apps/mobile/test/url_validation_test.dart so both validators agree.
const cases = JSON.parse(readFileSync(join(import.meta.dirname, 'url-cases.json'), 'utf8')) as {
  valid: [string, string][];
  invalid: [string, string][];
};

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
  it.each(cases.valid)('%s → %s', (input, expected) => {
    expect(ok(input)).toBe(expected);
  });

  it.each(cases.invalid)('%s is rejected with %s', (input, expected) => {
    expect(code(input)).toBe(expected);
  });

  it('rejects over-long addresses', () => {
    expect(code('https://' + 'a'.repeat(2100) + '.com')).toBe('too_long');
  });

  it('dedupes equivalent inputs', () => {
    expect(ok('EXAMPLE.com')).toBe(ok('https://example.com/'));
    expect(ok('https://example.com/#a')).toBe(ok('https://example.com/#b'));
  });
});
