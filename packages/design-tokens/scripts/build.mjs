// Generates platform outputs from tokens.json:
//   dist/tokens.css   CSS custom properties (light + dark) for the web app
//   dist/index.js/.d.ts  typed token object for TypeScript consumers
//   apps/mobile/lib/theme/tokens.g.dart  Dart constants for Flutter (committed)
//
// `--check` regenerates in memory and fails if the committed Dart file is stale.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const dartPath = join(root, '../../apps/mobile/lib/theme/tokens.g.dart');
const checkOnly = process.argv.includes('--check');

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const HEADER = 'GENERATED FILE — do not edit. Source: packages/design-tokens/tokens.json';

function cssVars(mode) {
  const lines = [];
  for (const [k, v] of Object.entries(tokens.color[mode])) lines.push(`--wl-${kebab(k)}: ${v};`);
  for (const [sev, pair] of Object.entries(tokens.severity[mode])) {
    lines.push(`--wl-severity-${sev}-fg: ${pair.fg};`, `--wl-severity-${sev}-bg: ${pair.bg};`);
  }
  return lines;
}

function buildCss() {
  const shared = [];
  for (const [k, v] of Object.entries(tokens.font.size))
    shared.push(`--wl-font-size-${k}: ${v / 16}rem;`);
  for (const [k, v] of Object.entries(tokens.space)) shared.push(`--wl-space-${k}: ${v / 16}rem;`);
  for (const [k, v] of Object.entries(tokens.radius)) shared.push(`--wl-radius-${k}: ${v}px;`);
  shared.push(
    `--wl-font-sans: '${tokens.font.family.sans}', ui-sans-serif, system-ui, sans-serif;`,
  );
  shared.push(`--wl-font-mono: '${tokens.font.family.mono}', ui-monospace, monospace;`);
  const indent = (arr, n = 2) => arr.map((l) => ' '.repeat(n) + l).join('\n');
  return `/* ${HEADER} */
:root {
${indent([...shared, ...cssVars('light')])}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${indent(cssVars('dark'), 4)}
    color-scheme: dark;
  }
}

:root[data-theme='dark'] {
${indent(cssVars('dark'))}
  color-scheme: dark;
}
`;
}

function buildJs() {
  const body = JSON.stringify(
    {
      color: tokens.color,
      severity: tokens.severity,
      font: tokens.font,
      space: tokens.space,
      radius: tokens.radius,
    },
    null,
    2,
  );
  const js = `// ${HEADER}\nexport const tokens = ${body};\nexport default tokens;\n`;
  const dts = `// ${HEADER}
export type ColorMode = 'light' | 'dark';
export type Severity = ${Object.keys(tokens.severity.light)
    .map((s) => `'${s}'`)
    .join(' | ')};
export type ColorTokens = { ${Object.keys(tokens.color.light)
    .map((k) => `${k}: string`)
    .join('; ')} };
export declare const tokens: {
  color: Record<ColorMode, ColorTokens>;
  severity: Record<ColorMode, Record<Severity, { fg: string; bg: string }>>;
  font: {
    family: { sans: string; mono: string };
    size: Record<${Object.keys(tokens.font.size)
      .map((s) => `'${s}'`)
      .join(' | ')}, number>;
    weight: Record<${Object.keys(tokens.font.weight)
      .map((s) => `'${s}'`)
      .join(' | ')}, number>;
    lineHeight: Record<${Object.keys(tokens.font.lineHeight)
      .map((s) => `'${s}'`)
      .join(' | ')}, number>;
  };
  space: Record<${Object.keys(tokens.space)
    .map((s) => `'${s}'`)
    .join(' | ')}, number>;
  radius: Record<${Object.keys(tokens.radius)
    .map((s) => `'${s}'`)
    .join(' | ')}, number>;
};
export default tokens;
`;
  return { js, dts };
}

function dartColor(hex) {
  return `Color(0xFF${hex.replace('#', '').toUpperCase()})`;
}

function dartIdent(k) {
  // Dart identifiers can't start with a digit: space "2" -> s2, size "2xl" -> x2l is ugly, so prefix.
  return /^[0-9]/.test(k) ? `s${k}` : k;
}

function buildDart() {
  const colorClass = (mode) => {
    const name = mode === 'light' ? 'WlColorsLight' : 'WlColorsDark';
    const fields = Object.entries(tokens.color[mode])
      .map(([k, v]) => `  static const ${k} = ${dartColor(v)};`)
      .join('\n');
    const sev = Object.entries(tokens.severity[mode])
      .map(
        ([s, p]) =>
          `  static const severity${s[0].toUpperCase()}${s.slice(1)}Fg = ${dartColor(p.fg)};\n` +
          `  static const severity${s[0].toUpperCase()}${s.slice(1)}Bg = ${dartColor(p.bg)};`,
      )
      .join('\n');
    return `abstract final class ${name} {\n${fields}\n${sev}\n}`;
  };
  const numClass = (name, obj) =>
    `abstract final class ${name} {\n${Object.entries(obj)
      .map(([k, v]) => `  static const double ${dartIdent(k)} = ${Number(v).toFixed(1)};`)
      .join('\n')}\n}`;
  return `// ${HEADER}
// ignore_for_file: constant_identifier_names
import 'package:flutter/painting.dart';

${colorClass('light')}

${colorClass('dark')}

${numClass('WlFontSize', tokens.font.size)}

${numClass('WlSpace', tokens.space)}

${numClass('WlRadius', tokens.radius)}

abstract final class WlFont {
  static const sans = '${tokens.font.family.sans}';
  static const mono = '${tokens.font.family.mono}';
}
`;
}

const dart = buildDart();
if (checkOnly) {
  const current = existsSync(dartPath) ? readFileSync(dartPath, 'utf8') : '';
  if (current !== dart) {
    console.error(
      'apps/mobile/lib/theme/tokens.g.dart is stale. Run `pnpm tokens` and commit the result.',
    );
    process.exit(1);
  }
  console.log('Design tokens: generated Dart file is up to date.');
} else {
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist/tokens.css'), buildCss());
  const { js, dts } = buildJs();
  writeFileSync(join(root, 'dist/index.js'), js);
  writeFileSync(join(root, 'dist/index.d.ts'), dts);
  mkdirSync(dirname(dartPath), { recursive: true });
  writeFileSync(dartPath, dart);
  console.log(
    'Design tokens built: dist/tokens.css, dist/index.js, apps/mobile/lib/theme/tokens.g.dart',
  );
}
