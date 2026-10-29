import type { Severity } from '@weblume/shared';
import { SeverityBadge } from './severity-badge';

export interface FindingView {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  whatItMeans: string;
  whyItMatters: string;
  howToFix: string[];
  evidence?: string;
}

/** Expandable finding. Uses native <details> so it works without JavaScript and with keyboards/screen readers. */
export function FindingCard({ finding }: { finding: FindingView }) {
  return (
    <details className="group rounded-lg border border-border bg-surface open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SeverityBadge severity={finding.severity} />
          <span className="font-semibold text-fg">{finding.title}</span>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </summary>
      <div className="space-y-4 border-t border-border p-4 text-sm leading-relaxed">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {finding.category}
        </p>
        <section>
          <h4 className="font-semibold text-fg">What this means</h4>
          <p className="mt-1 text-fg-muted">{finding.whatItMeans}</p>
        </section>
        <section>
          <h4 className="font-semibold text-fg">Why it matters</h4>
          <p className="mt-1 text-fg-muted">{finding.whyItMatters}</p>
        </section>
        <section>
          <h4 className="font-semibold text-fg">How to fix it</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-fg-muted">
            {finding.howToFix.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        {finding.evidence && (
          <section>
            <h4 className="font-semibold text-fg">What we found</h4>
            <pre className="mt-1 overflow-x-auto rounded-md bg-surface-muted p-3 font-mono text-xs text-fg">
              {finding.evidence}
            </pre>
          </section>
        )}
      </div>
    </details>
  );
}
