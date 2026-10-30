import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import {
  AUDIT_CATEGORIES,
  CATEGORY_LABELS,
  evidenceLines,
  KIND_LABELS,
  REPORT_LIMITATIONS,
  SEVERITIES,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  SOURCE_ORDER,
  describeSourceStatus,
  type FindingDto,
  type LighthouseResult,
  type ScanReportDto,
} from '@weblume/shared';
import { tokens } from '@weblume/design-tokens';

// Same relative location from src/reports and dist/reports.
const FONT_DIR = join(__dirname, '..', '..', 'assets', 'fonts');
const FONTS = {
  regular: join(FONT_DIR, 'Inter-Regular.ttf'),
  semibold: join(FONT_DIR, 'Inter-SemiBold.ttf'),
  bold: join(FONT_DIR, 'Inter-Bold.ttf'),
};

const C = tokens.color.light;
const SEV = tokens.severity.light;
const MARGIN = 48;

export interface PdfOptions {
  /** Public site URL, printed in the footer. */
  siteUrl: string;
  generatedAt?: Date;
}

const dateFmt = new Intl.DateTimeFormat('en', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Strip control characters that would otherwise render as boxes or break layout. */
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
}

function band(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Good', color: C.success };
  if (score >= 50) return { label: 'Needs work', color: SEV.medium.fg };
  return { label: 'Poor', color: C.danger };
}

/**
 * Renders a scan report as a branded A4 PDF with pdfkit (pure JS, no browser). Mirrors the web
 * report: scores, summary, priorities, findings by category, coverage and limitations.
 */
export function renderReportPdf(report: ScanReportDto, opts: PdfOptions): Promise<Buffer> {
  const generatedAt = opts.generatedAt ?? new Date();
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN + 16, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `Website report — ${report.normalizedUrl}`,
      Author: 'Weblume',
      Subject: 'Automated website audit',
      CreationDate: generatedAt,
    },
  });
  doc.registerFont('regular', FONTS.regular);
  doc.registerFont('semibold', FONTS.semibold);
  doc.registerFont('bold', FONTS.bold);

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - MARGIN * 2;
  const left = MARGIN;

  const ensureSpace = (h: number) => {
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };
  const heading = (text: string, size = 15) => {
    ensureSpace(size * 3);
    doc.moveDown(0.8).font('bold').fontSize(size).fillColor(C.text).text(text, left, doc.y);
    doc.moveDown(0.4);
  };
  const body = (text: string, color: string = C.textMuted, size = 10) =>
    doc.font('regular').fontSize(size).fillColor(color).text(clean(text), { width });

  const pill = (x: number, y: number, label: string, fg: string, bg: string) => {
    doc.font('semibold').fontSize(8);
    const w = doc.widthOfString(label) + 12;
    doc.roundedRect(x, y, w, 15, 7).fill(bg);
    doc.fillColor(fg).text(label, x + 6, y + 3.5, { lineBreak: false });
    return w;
  };

  // --- Header -----------------------------------------------------------------------------
  doc.font('bold').fontSize(18).fillColor(C.primary).text('Weblume', left, MARGIN);
  doc
    .font('semibold')
    .fontSize(9)
    .fillColor(C.textMuted)
    .text('WEBSITE REPORT', left, MARGIN + 6, { width, align: 'right', characterSpacing: 1 });
  doc
    .moveTo(left, MARGIN + 30)
    .lineTo(left + width, MARGIN + 30)
    .lineWidth(1)
    .strokeColor(C.border)
    .stroke();
  doc.y = MARGIN + 44;
  doc
    .font('bold')
    .fontSize(20)
    .fillColor(C.text)
    .text(clean(report.normalizedUrl), left, doc.y, { width });
  doc.moveDown(0.3);
  if (report.finalUrl && report.finalUrl !== report.normalizedUrl)
    body(`Final URL after redirects: ${report.finalUrl}`);
  body(`Scanned ${dateFmt.format(new Date(report.completedAt ?? report.createdAt))} UTC`);

  if (report.status === 'partial') {
    doc.moveDown(0.6);
    const text =
      'Some checks couldn’t be completed (see Audit coverage). Everything shown is real data from the checks that did run.';
    doc.font('regular').fontSize(10);
    const h = doc.heightOfString(text, { width: width - 20 }) + 16;
    const y = doc.y;
    doc.roundedRect(left, y, width, h, 6).fill(SEV.medium.bg);
    doc.fillColor(SEV.medium.fg).text(text, left + 10, y + 8, { width: width - 20 });
    doc.y = y + h;
  }

  // --- Lighthouse scores --------------------------------------------------------------------
  heading('Lighthouse scores');
  body('Measured by Google PageSpeed Insights. Lab measurements vary between runs.');
  const lh = report.lighthouse;
  const strategies = (['mobile', 'desktop'] as const).filter((s) => lh?.[s]);
  if (strategies.length === 0) {
    doc.moveDown(0.4);
    body(
      'Lighthouse scores aren’t available for this scan, so none are shown. Weblume’s own checks still ran; see Audit coverage for the reason.',
      C.text,
    );
  } else {
    for (const s of strategies) scoreRow(s, lh![s]!);
  }

  function scoreRow(strategy: 'mobile' | 'desktop', result: LighthouseResult) {
    doc.moveDown(0.6);
    ensureSpace(70);
    const y = doc.y;
    doc.roundedRect(left, y, width, 62, 6).lineWidth(1).strokeColor(C.border).stroke();
    doc
      .font('semibold')
      .fontSize(10)
      .fillColor(C.text)
      .text(strategy === 'mobile' ? 'Mobile' : 'Desktop', left + 12, y + 10);
    const entries = [
      ['Performance', result.scores.performance],
      ['Accessibility', result.scores.accessibility],
      ['SEO', result.scores.seo],
      ['Best practices', result.scores.bestPractices],
    ] as const;
    const colW = (width - 100) / 4;
    entries.forEach(([label, score], i) => {
      const x = left + 100 + i * colW;
      if (score === null) {
        doc
          .font('regular')
          .fontSize(9)
          .fillColor(C.textMuted)
          .text('Not measured', x, y + 14, { width: colW - 8 });
      } else {
        const b = band(score);
        doc
          .font('bold')
          .fontSize(20)
          .fillColor(b.color)
          .text(String(score), x, y + 8, { width: colW - 8 });
        doc
          .font('regular')
          .fontSize(8)
          .fillColor(C.textMuted)
          .text(`${b.label}`, x, y + 32, { width: colW - 8 });
      }
      doc
        .font('semibold')
        .fontSize(8)
        .fillColor(C.text)
        .text(label, x, y + 44, { width: colW - 8 });
    });
    doc.y = y + 62;
  }

  // --- Summary ------------------------------------------------------------------------------
  heading('Findings summary');
  {
    const y = doc.y;
    let x = left;
    for (const s of SEVERITIES) {
      const n = report.findings.filter((f) => f.severity === s).length;
      x += pill(x, y, `${SEVERITY_LABELS[s]}: ${n}`, SEV[s].fg, SEV[s].bg) + 8;
    }
    doc.y = y + 22;
    doc.x = left;
    if (report.passedChecks.length > 0)
      body(`${report.passedChecks.length} of Weblume’s own checks passed.`);
  }

  const top = report.findings.filter((f) => f.severity !== 'info').slice(0, 5);
  if (top.length > 0) {
    heading('Start here: top priorities');
    top.forEach((f, i) => {
      ensureSpace(22);
      const y = doc.y;
      doc
        .font('semibold')
        .fontSize(10)
        .fillColor(C.textMuted)
        .text(`${i + 1}.`, left, y + 2);
      const w = pill(
        left + 18,
        y,
        SEVERITY_LABELS[f.severity],
        SEV[f.severity].fg,
        SEV[f.severity].bg,
      );
      doc
        .font('regular')
        .fontSize(10)
        .fillColor(C.text)
        .text(clean(f.title), left + 26 + w, y + 2, { width: width - 26 - w });
      doc.y = Math.max(doc.y, y + 18) + 4;
    });
  }

  // --- Findings by category -----------------------------------------------------------------
  heading('All findings', 17);
  if (report.findings.length === 0) body('No issues were found by the checks that ran.', C.text);
  for (const category of AUDIT_CATEGORIES) {
    const list = report.findings.filter((f) => f.category === category);
    if (list.length === 0) continue;
    heading(`${CATEGORY_LABELS[category]} (${list.length})`, 13);
    for (const f of list) findingBlock(f);
  }

  /** Approximate height of a finding, so short ones aren't split across pages. */
  function findingHeight(f: FindingDto): number {
    const h = (text: string, font: string, size: number) =>
      doc.font(font).fontSize(size).heightOfString(clean(text), { width });
    let total = 40 + h(f.title, 'semibold', 11);
    if (f.whatItMeans) total += 16 + h(f.whatItMeans, 'regular', 9.5);
    if (f.whyItMatters) total += 16 + h(f.whyItMatters, 'regular', 9.5);
    for (const step of f.howToFix) total += h(step, 'regular', 9.5);
    if (f.howToFix.length) total += 16;
    const evidence = evidenceLines(f);
    for (const line of evidence) total += h(line, 'regular', 8.5);
    if (evidence.length) total += 16;
    if (f.learnMoreUrl) total += 16;
    return total;
  }

  function findingBlock(f: FindingDto) {
    const pageSpace = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    // Keep a finding on one page when it fits on one; otherwise just avoid starting at the bottom.
    ensureSpace(Math.min(Math.max(findingHeight(f), 90), pageSpace));
    doc.moveDown(0.5);
    const y = doc.y;
    const w = pill(left, y, SEVERITY_LABELS[f.severity], SEV[f.severity].fg, SEV[f.severity].bg);
    doc
      .font('regular')
      .fontSize(8)
      .fillColor(C.textMuted)
      .text(KIND_LABELS[f.kind], left + w + 8, y + 3.5, { lineBreak: false });
    doc.y = y + 20;
    doc
      .font('semibold')
      .fontSize(11)
      .fillColor(C.text)
      .text(clean(f.title), left, doc.y, { width });
    const section = (label: string, text: string) => {
      doc.moveDown(0.3);
      doc.font('semibold').fontSize(9).fillColor(C.text).text(label, { width });
      body(text, C.textMuted, 9.5);
    };
    if (f.whatItMeans) section('What it means', f.whatItMeans);
    if (f.whyItMatters) section('Why it matters', f.whyItMatters);
    if (f.howToFix.length) {
      doc.moveDown(0.3);
      doc.font('semibold').fontSize(9).fillColor(C.text).text('How to fix it', { width });
      f.howToFix.forEach((step, i) => body(`${i + 1}. ${step}`, C.textMuted, 9.5));
    }
    const evidence = evidenceLines(f);
    if (evidence.length) {
      doc.moveDown(0.3);
      doc.font('semibold').fontSize(9).fillColor(C.text).text('Evidence', { width });
      for (const line of evidence) body(line, C.textMuted, 8.5);
    }
    if (f.learnMoreUrl) {
      doc.moveDown(0.2);
      doc
        .font('regular')
        .fontSize(9)
        .fillColor(C.primary)
        .text(`Learn more: ${f.learnMoreUrl}`, { width, link: f.learnMoreUrl, underline: true });
    }
    doc.moveDown(0.4);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .lineWidth(0.5)
      .strokeColor(C.border)
      .stroke();
  }

  // --- Coverage & limitations ---------------------------------------------------------------
  heading('Audit coverage');
  for (const k of SOURCE_ORDER) {
    const s = report.sources[k];
    if (!s) continue;
    const mark = s.status === 'ok' ? '✓' : s.status === 'failed' ? '×' : '–';
    const color = s.status === 'ok' ? C.success : s.status === 'failed' ? C.danger : C.textMuted;
    ensureSpace(16);
    const y = doc.y;
    doc.font('bold').fontSize(10).fillColor(color).text(mark, left, y);
    doc
      .font('regular')
      .fontSize(10)
      .fillColor(C.text)
      .text(`${SOURCE_LABELS[k]} — ${describeSourceStatus(s)}`, left + 16, y, {
        width: width - 16,
      });
  }
  heading('Limitations');
  body(REPORT_LIMITATIONS);

  // --- Footer on every page -----------------------------------------------------------------
  const range = doc.bufferedPageRange();
  const site = opts.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - MARGIN + 8;
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow writing in the footer area without adding a page
    doc
      .font('regular')
      .fontSize(8)
      .fillColor(C.textMuted)
      .text(`Generated by Weblume (${site}) on ${dateFmt.format(generatedAt)} UTC`, left, y, {
        width,
        lineBreak: false,
      });
    doc.text(`Page ${i + 1} of ${range.count}`, left, y, {
      width,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = bottom;
  }

  doc.end();
  return done;
}
