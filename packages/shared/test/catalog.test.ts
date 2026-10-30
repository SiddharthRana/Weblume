import { describe, expect, it } from 'vitest';
import { AUDIT_CATEGORIES, CHECK_IDS, CHECKS, SEVERITIES } from '../src/index.js';

describe('check catalogue', () => {
  it('has unique, well-formed ids', () => {
    expect(new Set(CHECK_IDS).size).toBe(CHECK_IDS.length);
    for (const id of CHECK_IDS) expect(id).toMatch(/^(seo|tech|a11y)\.[a-z0-9_]+(\.[a-z0-9_]+)*$/);
  });

  it.each(CHECK_IDS)('%s has complete, plain-language copy', (id) => {
    const c = CHECKS[id];
    expect(AUDIT_CATEGORIES).toContain(c.category);
    expect(SEVERITIES).toContain(c.severity);
    expect(c.title.length).toBeGreaterThan(5);
    expect(c.title.length).toBeLessThanOrEqual(70);
    expect(c.whatItMeans.length).toBeGreaterThan(30);
    expect(c.whyItMatters.length).toBeGreaterThan(30);
    expect(c.howToFix.length).toBeGreaterThan(0);
    if (c.learnMoreUrl) expect(c.learnMoreUrl).toMatch(/^https:\/\//);
    // Never overclaim.
    expect(`${c.whatItMeans} ${c.whyItMatters}`).not.toMatch(/guarantee|100%|fully compliant/i);
  });
});
