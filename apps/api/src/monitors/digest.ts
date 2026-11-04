import {
  SEVERITY_LABELS,
  type FindingDto,
  type LighthouseScores,
  type MonitorAlert,
  type ReportComparison,
  type ScanFailureCode,
  type ScoreDeltas,
} from '@weblume/shared';

/** Score changes smaller than this are normal run-to-run Lighthouse noise and aren't reported. */
export const DEFAULT_SCORE_THRESHOLD = 5;
const MAX_LISTED = 5;

export const SCORE_LABELS: Record<keyof LighthouseScores, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  seo: 'SEO',
  bestPractices: 'Best practices',
};

export interface ScoreChange {
  strategy: 'mobile' | 'desktop';
  score: keyof LighthouseScores;
  before: number;
  after: number;
  delta: number;
}

export interface DigestSummary {
  newFindings: FindingDto[];
  resolvedFindings: FindingDto[];
  /** Score changes at or above the threshold, biggest first. */
  scoreChanges: ScoreChange[];
}

export function summarize(comparison: ReportComparison, threshold: number): DigestSummary {
  const scoreChanges: ScoreChange[] = [];
  for (const strategy of ['mobile', 'desktop'] as const) {
    const deltas: ScoreDeltas | undefined = comparison.scores[strategy];
    if (!deltas) continue;
    for (const [score, d] of Object.entries(deltas) as [
      keyof LighthouseScores,
      ScoreDeltas[keyof LighthouseScores],
    ][]) {
      if (d.delta === null || d.before === null || d.after === null) continue;
      if (Math.abs(d.delta) >= threshold)
        scoreChanges.push({ strategy, score, before: d.before, after: d.after, delta: d.delta });
    }
  }
  scoreChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    newFindings: comparison.newFindings,
    resolvedFindings: comparison.resolvedFindings,
    scoreChanges,
  };
}

/** Whether the monitor's alert setting asks for an email about these changes. */
export function shouldNotify(alert: MonitorAlert, s: DigestSummary): boolean {
  switch (alert) {
    case 'none':
      return false;
    case 'new_findings':
      return s.newFindings.length > 0;
    case 'score_drop':
      return s.scoreChanges.some((c) => c.delta < 0);
    case 'any_change':
      return s.newFindings.length > 0 || s.resolvedFindings.length > 0 || s.scoreChanges.length > 0;
  }
}

export interface DigestLinks {
  report: string;
  compare: string | null;
  manage: string;
  pause: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function subjectFor(site: string, s: DigestSummary): string {
  const parts: string[] = [];
  if (s.newFindings.length) parts.push(plural(s.newFindings.length, 'new issue'));
  if (s.resolvedFindings.length) parts.push(`${s.resolvedFindings.length} fixed`);
  const drop = s.scoreChanges.find((c) => c.delta < 0);
  const rise = s.scoreChanges.find((c) => c.delta > 0);
  if (drop) parts.push(`${SCORE_LABELS[drop.score]} down ${-drop.delta}`);
  else if (rise) parts.push(`${SCORE_LABELS[rise.score]} up ${rise.delta}`);
  return `${site}: ${parts.join(', ') || 'no changes'}`;
}

function scoreLine(c: ScoreChange): string {
  const dir = c.delta < 0 ? 'down' : 'up';
  return `${SCORE_LABELS[c.score]} (${c.strategy}) ${dir} ${Math.abs(c.delta)}: ${c.before} to ${c.after}`;
}

function findingLine(f: FindingDto): string {
  return `${f.title} (${SEVERITY_LABELS[f.severity]})`;
}

function listWithMore<T>(items: T[], line: (t: T) => string): string[] {
  const out = items.slice(0, MAX_LISTED).map(line);
  if (items.length > MAX_LISTED) out.push(`and ${items.length - MAX_LISTED} more`);
  return out;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

interface Section {
  heading: string;
  lines: string[];
}

function render(
  subject: string,
  intro: string,
  sections: Section[],
  links: DigestLinks,
  cta: string,
): RenderedEmail {
  const footer = [
    `You get this email because you're monitoring this site with Weblume.`,
    `Change what we email you about: ${links.manage}`,
    `Pause monitoring for this site: ${links.pause}`,
  ];
  const text = [
    intro,
    '',
    ...sections.flatMap((s) => [s.heading, ...s.lines.map((l) => `- ${l}`), '']),
    `${cta}: ${links.report}`,
    ...(links.compare ? [`See every change side by side: ${links.compare}`] : []),
    '',
    ...footer,
  ].join('\n');

  const p = 'margin:0 0 12px;font-size:15px;line-height:1.5;color:#1f2937';
  const html = [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px">`,
    `<p style="${p}">${esc(intro)}</p>`,
    ...sections.map(
      (s) =>
        `<p style="${p};font-weight:600;margin-bottom:4px">${esc(s.heading)}</p>` +
        `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.5;color:#1f2937">${s.lines
          .map((l) => `<li>${esc(l)}</li>`)
          .join('')}</ul>`,
    ),
    `<p style="${p}"><a href="${esc(links.report)}" style="color:#4f46e5;font-weight:600">${esc(cta)}</a></p>`,
    ...(links.compare
      ? [
          `<p style="${p}"><a href="${esc(links.compare)}" style="color:#4f46e5">See every change side by side</a></p>`,
        ]
      : []),
    `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280">${esc(footer[0]!)}<br>`,
    `<a href="${esc(links.manage)}" style="color:#6b7280">Change what we email you about</a> · `,
    `<a href="${esc(links.pause)}" style="color:#6b7280">Pause monitoring for this site</a></p>`,
    `</div>`,
  ].join('');
  return { subject, text, html };
}

/** The change digest for a scheduled scan, in plain language. */
export function renderChangeDigest(
  siteUrl: string,
  summary: DigestSummary,
  links: DigestLinks,
): RenderedEmail {
  const site = host(siteUrl);
  const sections: Section[] = [];
  if (summary.newFindings.length)
    sections.push({
      heading: 'New issues',
      lines: listWithMore(summary.newFindings, findingLine),
    });
  if (summary.resolvedFindings.length)
    sections.push({
      heading: 'Fixed since last time',
      lines: listWithMore(summary.resolvedFindings, (f) => f.title),
    });
  if (summary.scoreChanges.length)
    sections.push({
      heading: 'Score changes',
      lines: listWithMore(summary.scoreChanges, scoreLine),
    });
  const intro = summary.newFindings.length
    ? `We re-scanned ${site} and found something new to look at.`
    : `We re-scanned ${site}. Here's what changed since the last scan.`;
  return render(subjectFor(site, summary), intro, sections, links, 'Open the full report');
}

/** Sent when a scheduled scan couldn't reach the site (a problem on the site's side). */
export function renderFailureNotice(
  siteUrl: string,
  failureMessage: string,
  links: DigestLinks,
): RenderedEmail {
  const site = host(siteUrl);
  return render(
    `${site}: we couldn't scan your site`,
    `Our scheduled scan of ${site} didn't finish. ${failureMessage}`,
    [],
    links,
    'See the details',
  );
}

/** Failure codes worth telling the owner about: their site may be down or blocking us. */
export const NOTIFY_FAILURES: ReadonlySet<string> = new Set<ScanFailureCode>([
  'dns_failure',
  'connection_failed',
  'tls_error',
  'timeout',
  'http_error',
]);
