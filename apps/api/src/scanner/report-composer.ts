import { getCheck, type FindingDto, type ReportSource, compareSeverity } from '@weblume/shared';
import type { FindingRow } from '../database/schema';
import { lighthouseCopy } from './psi/lighthouse-copy';
import type { LighthouseAudit } from './psi/psi.types';

/** Turns stored findings into display-ready DTOs with plain-language copy, most severe first. */
export function composeFindings(rows: FindingRow[]): FindingDto[] {
  return rows
    .map((r): FindingDto | null => {
      const base = {
        id: r.id,
        checkId: r.checkId,
        category: r.category,
        severity: r.severity,
        kind: r.kind,
        source: r.source as ReportSource,
      };
      if (r.checkId.startsWith('lighthouse.')) {
        const d = r.details as Partial<LighthouseAudit> & { strategy?: string };
        const copy = lighthouseCopy({
          id: r.checkId.slice('lighthouse.'.length),
          title: d.title ?? r.checkId,
          description: d.description ?? '',
          score: d.score ?? 0,
          displayValue: d.displayValue,
          category: r.category,
          lhCategory: d.lhCategory ?? 'best-practices',
          weight: d.weight ?? 0,
        });
        const details: Record<string, unknown> = { strategy: d.strategy };
        if (d.displayValue) details.measured = d.displayValue;
        return { ...base, ...copy, details };
      }
      const def = getCheck(r.checkId);
      if (!def) return null; // A check removed from the catalogue: hide rather than show without copy.
      return {
        ...base,
        title: def.title,
        whatItMeans: def.whatItMeans,
        whyItMatters: def.whyItMatters,
        howToFix: def.howToFix,
        learnMoreUrl: def.learnMoreUrl,
        details: r.details,
      };
    })
    .filter((f): f is FindingDto => f !== null)
    .sort(
      (a, b) => compareSeverity(a.severity, b.severity) || a.category.localeCompare(b.category),
    );
}
