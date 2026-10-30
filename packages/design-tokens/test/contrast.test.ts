import { describe, expect, it } from 'vitest';
import { tokens } from '../dist/index.js';

// WCAG 2.x relative luminance / contrast ratio.
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe.each(['light', 'dark'] as const)('%s theme contrast (WCAG AA)', (mode) => {
  const c = tokens.color[mode];

  it.each([
    ['text on background', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['textMuted on surface', c.textMuted, c.surface],
    ['textMuted on background', c.textMuted, c.background],
    ['textMuted on surfaceMuted', c.textMuted, c.surfaceMuted],
    ['onPrimary on primary', c.onPrimary, c.primary],
    ['onPrimary on primaryHover', c.onPrimary, c.primaryHover],
    ['onAccent on accent', c.onAccent, c.accent],
    ['primary (link) on surface', c.primary, c.surface],
    ['primary (link) on background', c.primary, c.background],
    ['success on surface', c.success, c.surface],
    ['danger on surface', c.danger, c.surface],
  ])('%s >= 4.5:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['gradientStart', c.gradientStart],
    ['gradientMid', c.gradientMid],
    ['gradientEnd', c.gradientEnd],
  ])('white button text on the brand gradient (%s) >= 4.5:1', (_label, stop) => {
    expect(contrast('#FFFFFF', stop)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('focus ring is visible against surface and background (>= 3:1)', () => {
    expect(contrast(c.focus, c.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrast(c.focus, c.background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it.each(Object.entries(tokens.severity[mode]))('severity %s badge text >= 4.5:1', (_s, pair) => {
    expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(pair.fg, c.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
