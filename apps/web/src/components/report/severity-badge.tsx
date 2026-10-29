import type { Severity } from '@weblume/shared';

const config: Record<Severity, { label: string; className: string; icon: string }> = {
  // Icon shapes differ per level so severity is never conveyed by colour alone.
  critical: {
    label: 'Critical',
    className: 'bg-sev-critical-bg text-sev-critical',
    icon: 'M8 1l7 13H1z M8 6v3.5 M8 11.5v.5',
  },
  high: {
    label: 'High',
    className: 'bg-sev-high-bg text-sev-high',
    icon: 'M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13 M8 4.5v4 M8 11v.5',
  },
  medium: {
    label: 'Medium',
    className: 'bg-sev-medium-bg text-sev-medium',
    icon: 'M8 1.5l6.5 6.5L8 14.5L1.5 8z M8 5v3.5 M8 11v.5',
  },
  low: {
    label: 'Low',
    className: 'bg-sev-low-bg text-sev-low',
    icon: 'M2 2h12v12H2z M8 5v4 M8 11v.5',
  },
  info: {
    label: 'Info',
    className: 'bg-sev-info-bg text-sev-info',
    icon: 'M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13 M8 7v4.5 M8 4.5v.5',
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = config[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.className}`}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d={c.icon}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {c.label}
    </span>
  );
}

export const severityLabel = (s: Severity) => config[s].label;
