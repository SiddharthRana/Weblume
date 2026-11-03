import { CHECKS, type CheckId } from '@weblume/shared';
import { describe, expect, it } from 'vitest';
import type { FindingRow } from '../../src/database/schema';
import { codeFixFor } from '../../src/scanner/code-fixes';
import { composeFindings } from '../../src/scanner/report-composer';

const PAGE = 'https://www.bakery.example/menu#today';
const code = (fix: ReturnType<typeof codeFixFor>) => fix?.snippets.map((s) => s.code).join('\n');

function row(checkId: string, details: Record<string, unknown> = {}): FindingRow {
  const c = CHECKS[checkId as CheckId];
  return {
    id: `${checkId}-1`,
    scanId: '00000000-0000-4000-8000-000000000001',
    checkId,
    category: c?.category ?? 'performance',
    severity: c?.severity ?? 'medium',
    kind: c?.kind ?? 'issue',
    source: c ? 'page_fetch' : 'psi',
    details,
    createdAt: new Date(),
  };
}

describe('code fixes', () => {
  it('points a missing canonical at the scanned page, without the fragment', () => {
    expect(code(codeFixFor('seo.canonical.missing', {}, PAGE))).toBe(
      '<link rel="canonical" href="https://www.bakery.example/menu">',
    );
  });

  it('upgrades the exact insecure resources it found', () => {
    const fix = codeFixFor(
      'tech.mixed_content',
      { examples: ['http://cdn.example/a.js', 'http://cdn.example/b.css'] },
      PAGE,
    );
    expect(code(fix)).toContain('http://cdn.example/a.js\n→ https://cdn.example/a.js');
    expect(code(fix)).toContain('upgrade-insecure-requests');
  });

  it('escapes page text placed inside attributes', () => {
    const fix = codeFixFor(
      'seo.meta_description.length',
      { description: 'Say "hi" <b>now</b> & more', length: 26 },
      PAGE,
    );
    expect(code(fix)).toContain('content="Say &quot;hi&quot; &lt;b&gt;now&lt;/b&gt; &amp; more"');
  });

  it('shortens an over-long title at a word boundary', () => {
    const title =
      'Fresh sourdough bread, croissants and celebration cakes delivered daily across Pune';
    const fix = codeFixFor('seo.title.length', { title, length: [...title].length }, PAGE);
    const suggested = /<title>(.*)<\/title>$/.exec(fix!.snippets[1]!.code)![1]!;
    expect([...suggested].length).toBeLessThanOrEqual(60);
    expect(title.startsWith(suggested)).toBe(true);
    expect(suggested.endsWith(' ')).toBe(false);
  });

  it('uses the site’s own robots.txt and sitemap addresses', () => {
    expect(code(codeFixFor('seo.robots_txt.missing', {}, PAGE))).toContain(
      'Sitemap: https://www.bakery.example/sitemap.xml',
    );
    expect(codeFixFor('seo.sitemap.missing', {}, PAGE)?.snippets[0]?.code).toContain(
      '<loc>https://www.bakery.example/menu</loc>',
    );
  });

  it('has no fix for findings that need judgement rather than code', () => {
    expect(codeFixFor('tech.links.broken', { examples: [] }, PAGE)).toBeNull();
    expect(codeFixFor('tech.page_size.large', { bytes: 9e6 }, PAGE)).toBeNull();
    expect(codeFixFor('lighthouse.largest-contentful-paint', {}, PAGE)).toBeNull();
  });

  it('builds a fix for every catalogue check it claims to cover without throwing', () => {
    for (const id of Object.keys(CHECKS)) {
      const fix = codeFixFor(id, {}, PAGE);
      if (fix) expect(fix.snippets.length).toBeGreaterThan(0);
    }
  });
});

describe('composeFindings and the code-fix gate', () => {
  const rows = [row('seo.canonical.missing'), row('tech.links.broken', { examples: [] })];

  it('reports availability but leaves the code out when the plan lacks it', () => {
    const findings = composeFindings(rows, { pageUrl: PAGE, includeCodeFixes: false });
    const canonical = findings.find((f) => f.checkId === 'seo.canonical.missing');
    const broken = findings.find((f) => f.checkId === 'tech.links.broken');
    expect(canonical).toMatchObject({ codeFixAvailable: true });
    expect(canonical).not.toHaveProperty('codeFix');
    expect(broken).toMatchObject({ codeFixAvailable: false });
  });

  it('includes the code when the plan has it', () => {
    const findings = composeFindings(rows, { pageUrl: PAGE, includeCodeFixes: true });
    const canonical = findings.find((f) => f.checkId === 'seo.canonical.missing');
    expect(canonical?.codeFix?.snippets[0]?.code).toContain('rel="canonical"');
  });
});
