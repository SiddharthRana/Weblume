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
  type CodeSnippet,
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
/** Height of the gradient cover band on page 1. */
const COVER_H = 176;
/** Space kept at the top of later pages for the running header. */
const RUNNING_HEADER = 30;
const CODE_BG = '#11131A';
const CODE_FG = '#E6E8F0';

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
 * Courier (a built-in PDF font) covers Latin-1 only. Code that fits is set in it; anything else
 * (e.g. a page title in Cyrillic) falls back to Inter so it never renders as boxes.
 */
function codeFont(text: string): { font: string; text: string } {
  const ascii = text.replace(/→/g, '->');
  return /^[\t\n\x20-\x7E\xA0-\xFF]*$/.test(ascii)
    ? { font: 'Courier', text: ascii }
    : { font: 'regular', text };
}

/**
 * Renders a scan report as a branded A4 PDF with pdfkit (pure JS, no browser). Mirrors the web
 * report: scores, summary, priorities, findings by category (with code fixes when the plan includes
 * them), coverage and limitations.
 */
export function renderReportPdf(report: ScanReportDto, opts: PdfOptions): Promise<Buffer> {
  const generatedAt = opts.generatedAt ?? new Date();
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN + RUNNING_HEADER, bottom: MARGIN + 16, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `Website report: ${report.normalizedUrl}`,
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

  const pageW = doc.page.width;
  const width = pageW - MARGIN * 2;
  const left = MARGIN;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
  const topLimit = () => doc.page.margins.top;

  const ensureSpace = (h: number) => {
    if (doc.y + h > bottomLimit()) doc.addPage();
  };
  const textHeight = (text: string, font: string, size: number, w: number, gap = 0) =>
    doc.font(font).fontSize(size).heightOfString(text, { width: w, lineGap: gap });

  /** Section heading, kept on the same page as the first `keepWith` points of what follows. */
  const heading = (text: string, size = 15, keepWith = 0) => {
    ensureSpace(size * 4 + keepWith);
    doc.moveDown(1).font('bold').fontSize(size).fillColor(C.text).text(text, left, doc.y);
    doc.moveDown(0.45);
  };
  const body = (text: string, color: string = C.textMuted, size = 10) =>
    doc.font('regular').fontSize(size).fillColor(color).text(clean(text), left, doc.y, { width });

  const pill = (x: number, y: number, label: string, fg: string, bg: string) => {
    doc.font('semibold').fontSize(8);
    const w = doc.widthOfString(label) + 14;
    doc.roundedRect(x, y, w, 16, 8).fill(bg);
    doc.fillColor(fg).text(label, x + 7, y + 4, { lineBreak: false });
    return w;
  };

  const gradient = (x0: number, y0: number, x1: number, y1: number) => {
    const g = doc.linearGradient(x0, y0, x1, y1);
    g.stop(0, C.gradientStart).stop(0.55, C.gradientMid).stop(1, C.gradientEnd);
    return g;
  };

  /** The Weblume mark: a rounded square with a rising arc, as on the website. */
  const logoMark = (x: number, y: number, size: number, onGradient: boolean) => {
    const s = size / 32;
    if (onGradient) {
      doc
        .roundedRect(x, y, size, size, 8 * s)
        .fillOpacity(0.18)
        .fill('#FFFFFF');
      doc.fillOpacity(1);
    } else {
      doc.roundedRect(x, y, size, size, 8 * s).fill(gradient(x, y, x + size, y + size));
    }
    doc
      .path(`M ${x + 8 * s} ${y + 22 * s} A ${8 * s} ${8 * s} 0 0 1 ${x + 24 * s} ${y + 22 * s}`)
      .lineWidth(3 * s)
      .lineCap('round')
      .stroke(C.accent);
    doc.circle(x + 16 * s, y + 22 * s, 2.5 * s).fill('#FFFFFF');
    doc.lineCap('butt');
  };

  /** Small uppercase label used for section titles inside cards. */
  const eyebrow = (text: string, x: number, y: number, color: string = C.textMuted) =>
    doc
      .font('semibold')
      .fontSize(7.5)
      .fillColor(color)
      .text(text.toUpperCase(), x, y, { characterSpacing: 0.8, lineBreak: false });

  // --- Cover band -------------------------------------------------------------------------------
  doc.rect(0, 0, pageW, COVER_H).fill(gradient(0, 0, pageW, COVER_H));
  // Soft glow in the corner for depth.
  doc
    .circle(pageW - 40, 10, 140)
    .fillOpacity(0.12)
    .fill('#FFFFFF');
  doc.fillOpacity(1);
  logoMark(left, 36, 26, true);
  doc
    .font('bold')
    .fontSize(16)
    .fillColor('#FFFFFF')
    .text('Weblume', left + 34, 40);
  doc
    .font('semibold')
    .fontSize(8)
    .fillColor('#FFFFFF')
    .fillOpacity(0.8)
    .text('WEBSITE REPORT', left, 44, { width, align: 'right', characterSpacing: 1.2 });
  doc.fillOpacity(1);
  doc
    .font('bold')
    .fontSize(22)
    .fillColor('#FFFFFF')
    .text(clean(report.normalizedUrl), left, 86, { width, height: 56, ellipsis: true });
  const meta = [
    `Scanned ${dateFmt.format(new Date(report.completedAt ?? report.createdAt))} UTC`,
    ...(report.finalUrl && report.finalUrl !== report.normalizedUrl
      ? [`Final URL after redirects: ${clean(report.finalUrl)}`]
      : []),
  ];
  doc
    .font('regular')
    .fontSize(9.5)
    .fillColor('#FFFFFF')
    .fillOpacity(0.85)
    .text(meta.join('   ·   '), left, COVER_H - 34, { width, lineBreak: false, ellipsis: true });
  doc.fillOpacity(1);
  doc.y = COVER_H + 24;

  if (report.status === 'partial') {
    const text =
      'Some checks couldn’t be completed (see Audit coverage). Everything shown is real data from the checks that did run.';
    const h = textHeight(text, 'regular', 9.5, width - 28) + 18;
    const y = doc.y;
    doc.roundedRect(left, y, width, h, 8).fill(SEV.medium.bg);
    doc.rect(left, y, 3, h).fill(SEV.medium.fg);
    doc
      .font('regular')
      .fontSize(9.5)
      .fillColor(SEV.medium.fg)
      .text(text, left + 16, y + 9, { width: width - 28 });
    doc.y = y + h + 4;
  }

  // --- At a glance: severity tiles -------------------------------------------------------------
  heading('Findings summary');
  {
    const gap = 8;
    const tileW = (width - gap * (SEVERITIES.length - 1)) / SEVERITIES.length;
    const y = doc.y;
    SEVERITIES.forEach((s, i) => {
      const x = left + i * (tileW + gap);
      const n = report.findings.filter((f) => f.severity === s).length;
      doc.roundedRect(x, y, tileW, 54, 8).fill(SEV[s].bg);
      doc
        .font('bold')
        .fontSize(20)
        .fillColor(SEV[s].fg)
        .text(String(n), x + 12, y + 9, { lineBreak: false });
      // Kept as "Label: n" in the text layer for search and screen readers.
      doc
        .font('semibold')
        .fontSize(8)
        .fillColor(SEV[s].fg)
        .text(`${SEVERITY_LABELS[s]}: ${n}`, x + 12, y + 35, { width: tileW - 16 });
    });
    doc.y = y + 54 + 8;
    if (report.passedChecks.length > 0)
      body(`${report.passedChecks.length} of Weblume’s own checks passed.`, C.textMuted, 9.5);
  }

  // --- Lighthouse scores ------------------------------------------------------------------------
  heading('Lighthouse scores');
  body(
    'Measured by Google PageSpeed Insights. Lab measurements vary between runs.',
    C.textMuted,
    9.5,
  );
  const lh = report.lighthouse;
  const strategies = (['mobile', 'desktop'] as const).filter((s) => lh?.[s]);
  if (strategies.length === 0) {
    doc.moveDown(0.5);
    const text =
      'Lighthouse scores aren’t available for this scan, so none are shown. Weblume’s own checks still ran; see Audit coverage for the reason.';
    const h = textHeight(text, 'regular', 9.5, width - 28) + 20;
    const y = doc.y;
    doc.roundedRect(left, y, width, h, 8).fill(C.surfaceMuted);
    doc
      .font('regular')
      .fontSize(9.5)
      .fillColor(C.text)
      .text(text, left + 14, y + 10, { width: width - 28 });
    doc.y = y + h;
  } else {
    for (const s of strategies) scoreRow(s, lh![s]!);
  }

  function ring(cx: number, cy: number, r: number, score: number, color: string) {
    doc.circle(cx, cy, r).lineWidth(5).stroke(C.surfaceMuted);
    if (score > 0) {
      const start = -Math.PI / 2;
      const end = start + (Math.min(score, 100) / 100) * Math.PI * 2;
      const sx = cx + r * Math.cos(start);
      const sy = cy + r * Math.sin(start);
      if (score >= 100) {
        doc.circle(cx, cy, r).lineWidth(5).stroke(color);
      } else {
        const ex = cx + r * Math.cos(end);
        const ey = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        doc
          .path(`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`)
          .lineWidth(5)
          .lineCap('round')
          .stroke(color);
        doc.lineCap('butt');
      }
    }
  }

  function scoreRow(strategy: 'mobile' | 'desktop', result: LighthouseResult) {
    doc.moveDown(0.6);
    const cardH = 108;
    ensureSpace(cardH + 8);
    const y = doc.y;
    doc.roundedRect(left, y, width, cardH, 10).lineWidth(1).stroke(C.border);
    eyebrow(strategy === 'mobile' ? 'Mobile' : 'Desktop', left + 14, y + 12);
    const entries = [
      ['Performance', result.scores.performance],
      ['Accessibility', result.scores.accessibility],
      ['SEO', result.scores.seo],
      ['Best practices', result.scores.bestPractices],
    ] as const;
    const colW = width / 4;
    entries.forEach(([label, score], i) => {
      const cx = left + colW * i + colW / 2;
      const cy = y + 52;
      if (score === null) {
        doc.circle(cx, cy, 20).lineWidth(5).stroke(C.surfaceMuted);
        doc
          .font('regular')
          .fontSize(7.5)
          .fillColor(C.textMuted)
          .text('Not measured', cx - 30, cy - 4, { width: 60, align: 'center' });
      } else {
        const b = band(score);
        ring(cx, cy, 20, score, b.color);
        doc
          .font('bold')
          .fontSize(13)
          .fillColor(b.color)
          .text(String(score), cx - 20, cy - 7.5, { width: 40, align: 'center' });
      }
      doc
        .font('semibold')
        .fontSize(8.5)
        .fillColor(C.text)
        .text(label, left + colW * i, y + 80, { width: colW, align: 'center' });
      if (score !== null)
        doc
          .font('regular')
          .fontSize(7.5)
          .fillColor(C.textMuted)
          .text(band(score).label, left + colW * i, y + 92, { width: colW, align: 'center' });
    });
    doc.y = y + cardH;
  }

  // --- Top priorities ---------------------------------------------------------------------------
  const top = report.findings.filter((f) => f.severity !== 'info').slice(0, 5);
  if (top.length > 0) {
    const rowH = (f: FindingDto) =>
      Math.max(textHeight(clean(f.title), 'regular', 10, width - 130) + 16, 32);
    const total = top.reduce((sum, f) => sum + rowH(f), 0);
    heading('Start here: top priorities', 15, Math.min(total, 300));
    ensureSpace(Math.min(total + 8, 300));
    let y = doc.y;
    const cardTop = y;
    const fits = y + total <= bottomLimit();
    if (fits) doc.roundedRect(left, y, width, total, 10).lineWidth(1).stroke(C.border);
    top.forEach((f, i) => {
      const h = rowH(f);
      if (!fits && y + h > bottomLimit()) {
        doc.addPage();
        y = doc.y;
      }
      if (i > 0 && (fits || y !== cardTop))
        doc
          .moveTo(left + 14, y)
          .lineTo(left + width - 14, y)
          .lineWidth(0.5)
          .stroke(C.border);
      doc.circle(left + 24, y + h / 2, 9).fill(gradient(left + 15, y, left + 33, y + h));
      doc
        .font('bold')
        .fontSize(8.5)
        .fillColor('#FFFFFF')
        .text(`${i + 1}.`, left + 15, y + h / 2 - 5, { width: 18, align: 'center' });
      doc
        .font('regular')
        .fontSize(10)
        .fillColor(C.text)
        .text(clean(f.title), left + 44, y + 8, { width: width - 130 });
      doc.font('semibold').fontSize(8);
      const pw = doc.widthOfString(SEVERITY_LABELS[f.severity]) + 14;
      pill(
        left + width - 14 - pw,
        y + h / 2 - 8,
        SEVERITY_LABELS[f.severity],
        SEV[f.severity].fg,
        SEV[f.severity].bg,
      );
      y += h;
    });
    doc.y = y;
  }

  // --- Findings by category ---------------------------------------------------------------------
  heading('All findings', 18);
  if (report.findings.length === 0) body('No issues were found by the checks that ran.', C.text);
  for (const category of AUDIT_CATEGORIES) {
    const list = report.findings.filter((f) => f.category === category);
    if (list.length === 0) continue;
    // Keep the category title with its first finding.
    const first = layoutFinding(list[0]!, left, 0, false, false).height;
    ensureSpace(40 + Math.min(first, bottomLimit() - topLimit() - 40));
    doc.moveDown(0.8);
    const y = doc.y;
    doc.rect(left, y + 2, 3, 13).fill(gradient(left, y, left + 3, y + 16));
    doc
      .font('bold')
      .fontSize(13)
      .fillColor(C.text)
      .text(`${CATEGORY_LABELS[category]} (${list.length})`, left + 12, y);
    doc.moveDown(0.5);
    for (const f of list) findingCard(f);
  }

  /**
   * Lays out one finding card. With draw=false it only measures, so a card that fits on a page is
   * never split; a card taller than a page is drawn without its frame and flows across pages.
   */
  function layoutFinding(f: FindingDto, x0: number, y0: number, draw: boolean, flow: boolean) {
    const pad = 16;
    const inner = width - pad * 2 - 3;
    const x = x0 + pad + 3;
    let y = y0 + pad;
    const room = (h: number) => {
      if (draw && flow && y + h > bottomLimit()) {
        doc.addPage();
        y = topLimit();
      }
    };
    const text = (
      t: string,
      font: string,
      size: number,
      color: string,
      opts: { gap?: number; w?: number; dx?: number; link?: string } = {},
    ) => {
      const w = opts.w ?? inner;
      const h = textHeight(t, font, size, w, opts.gap ?? 1.5);
      room(h);
      if (draw)
        doc
          .font(font)
          .fontSize(size)
          .fillColor(color)
          .text(t, x + (opts.dx ?? 0), y, {
            width: w,
            lineGap: opts.gap ?? 1.5,
            ...(opts.link ? { link: opts.link, underline: true } : {}),
          });
      y += h;
    };

    // Severity pill, kind and title.
    room(40);
    if (draw) {
      const w = pill(x, y, SEVERITY_LABELS[f.severity], SEV[f.severity].fg, SEV[f.severity].bg);
      doc
        .font('regular')
        .fontSize(8)
        .fillColor(C.textMuted)
        .text(KIND_LABELS[f.kind], x + w + 8, y + 4, { lineBreak: false });
    }
    y += 24;
    text(clean(f.title), 'semibold', 12, C.text, { gap: 1 });

    const section = (label: string) => {
      y += 10;
      room(12);
      if (draw) eyebrow(label, x, y);
      y += 13;
    };
    if (f.whatItMeans) {
      section('What it means');
      text(clean(f.whatItMeans), 'regular', 9.5, C.textMuted);
    }
    if (f.whyItMatters) {
      section('Why it matters');
      text(clean(f.whyItMatters), 'regular', 9.5, C.textMuted);
    }
    if (f.howToFix.length) {
      section('How to fix it');
      f.howToFix.forEach((step, i) => {
        const h = textHeight(clean(step), 'regular', 9.5, inner - 16, 1.5);
        room(h);
        if (draw)
          doc
            .font('semibold')
            .fontSize(9.5)
            .fillColor(C.primary)
            .text(`${i + 1}.`, x, y, { lineBreak: false });
        text(clean(step), 'regular', 9.5, C.text, { w: inner - 16, dx: 16 });
        y += 3;
      });
    }

    const evidence = evidenceLines(f);
    if (evidence.length) {
      section('Evidence');
      const lines = evidence.map(clean).join('\n');
      const h = textHeight(lines, 'regular', 8.5, inner - 20, 2) + 14;
      room(h);
      if (draw) {
        doc.roundedRect(x, y, inner, h, 6).fill(C.surfaceMuted);
        doc
          .font('regular')
          .fontSize(8.5)
          .fillColor(C.text)
          .text(lines, x + 10, y + 7, { width: inner - 20, lineGap: 2 });
      }
      y += h;
    }

    if (f.codeFix?.snippets.length) {
      section('Code fix');
      for (const s of f.codeFix.snippets) codeBlock(s);
      if (f.codeFix.note) {
        y += 2;
        text(clean(f.codeFix.note), 'regular', 8.5, C.textMuted);
      }
    }

    function codeBlock(s: CodeSnippet) {
      const { font, text: code } = codeFont(clean(s.code));
      const labelH = textHeight(clean(s.label), 'semibold', 7.5, inner - 20);
      const codeH = textHeight(code, font, 8, inner - 20, 2.5);
      const h = labelH + codeH + 26;
      room(h);
      if (draw) {
        doc.roundedRect(x, y, inner, h, 6).fill(CODE_BG);
        doc
          .font('semibold')
          .fontSize(7.5)
          .fillColor('#9AA0B4')
          .text(clean(s.label), x + 10, y + 8, { width: inner - 20 });
        doc
          .font(font)
          .fontSize(8)
          .fillColor(CODE_FG)
          .text(code, x + 10, y + 16 + labelH, { width: inner - 20, lineGap: 2.5 });
      }
      y += h + 6;
    }

    if (f.learnMoreUrl) {
      y += 8;
      text(`Learn more: ${f.learnMoreUrl}`, 'regular', 8.5, C.primary, { link: f.learnMoreUrl });
    }
    return { height: y + pad - y0, end: y + pad };
  }

  function findingCard(f: FindingDto) {
    const { height } = layoutFinding(f, left, 0, false, false);
    const pageSpace = bottomLimit() - topLimit();
    if (height <= pageSpace) {
      ensureSpace(height + 10);
      const y = doc.y;
      doc.roundedRect(left, y, width, height, 10).lineWidth(1).stroke(C.border);
      doc.save();
      doc.roundedRect(left, y, width, height, 10).clip();
      doc.rect(left, y, 3, height).fill(SEV[f.severity].fg);
      doc.restore();
      layoutFinding(f, left, y, true, false);
      doc.y = y + height + 10;
    } else {
      // Too tall for one page: no frame, a severity rule on top, and let the content flow.
      ensureSpace(120);
      const y = doc.y;
      doc.rect(left, y, width, 3).fill(SEV[f.severity].fg);
      doc.y = layoutFinding(f, left - 3, y, true, true).end + 10;
      doc.x = left;
    }
  }

  // --- Coverage & limitations -------------------------------------------------------------------
  heading('Audit coverage');
  {
    const rows = SOURCE_ORDER.filter((k) => report.sources[k]);
    const rowH = 26;
    ensureSpace(rows.length * rowH + 8);
    const y0 = doc.y;
    doc
      .roundedRect(left, y0, width, rows.length * rowH, 10)
      .lineWidth(1)
      .stroke(C.border);
    rows.forEach((k, i) => {
      const s = report.sources[k]!;
      const y = y0 + i * rowH;
      if (i > 0)
        doc
          .moveTo(left + 14, y)
          .lineTo(left + width - 14, y)
          .lineWidth(0.5)
          .stroke(C.border);
      const color = s.status === 'ok' ? C.success : s.status === 'failed' ? C.danger : C.textMuted;
      const mark = s.status === 'ok' ? '✓' : s.status === 'failed' ? '×' : '–';
      doc
        .circle(left + 22, y + rowH / 2, 7)
        .fillOpacity(0.12)
        .fill(color);
      doc.fillOpacity(1);
      doc
        .font('bold')
        .fontSize(8.5)
        .fillColor(color)
        .text(mark, left + 15, y + rowH / 2 - 5.5, { width: 14, align: 'center' });
      doc
        .font('regular')
        .fontSize(9.5)
        .fillColor(C.text)
        .text(`${SOURCE_LABELS[k]}: ${describeSourceStatus(s)}`, left + 38, y + 8, {
          width: width - 52,
          lineBreak: false,
          ellipsis: true,
        });
    });
    doc.y = y0 + rows.length * rowH;
  }
  heading('Limitations');
  {
    const h = textHeight(REPORT_LIMITATIONS, 'regular', 9.5, width - 28, 1.5) + 20;
    ensureSpace(h);
    const y = doc.y;
    doc.roundedRect(left, y, width, h, 8).fill(C.surfaceMuted);
    doc
      .font('regular')
      .fontSize(9.5)
      .fillColor(C.textMuted)
      .text(REPORT_LIMITATIONS, left + 14, y + 10, { width: width - 28, lineGap: 1.5 });
    doc.y = y + h;
  }

  // --- Running header and footer on every page --------------------------------------------------
  const range = doc.bufferedPageRange();
  const site = opts.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow writing in the margins without adding a page
    if (i > range.start) {
      logoMark(left, MARGIN - 4, 14, false);
      doc
        .font('bold')
        .fontSize(9)
        .fillColor(C.text)
        .text('Weblume', left + 20, MARGIN - 1, { lineBreak: false });
      doc
        .font('regular')
        .fontSize(8)
        .fillColor(C.textMuted)
        .text(clean(report.normalizedUrl), left + 90, MARGIN, {
          width: width - 90,
          align: 'right',
          lineBreak: false,
          ellipsis: true,
        });
      doc
        .moveTo(left, MARGIN + 18)
        .lineTo(left + width, MARGIN + 18)
        .lineWidth(0.5)
        .stroke(C.border);
    }
    const y = doc.page.height - MARGIN + 8;
    doc
      .moveTo(left, y - 10)
      .lineTo(left + width, y - 10)
      .lineWidth(0.5)
      .stroke(C.border);
    doc
      .font('regular')
      .fontSize(7.5)
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
