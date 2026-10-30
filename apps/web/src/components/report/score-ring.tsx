import type { CSSProperties } from 'react';

/** Lighthouse-style score ring. Bands follow Lighthouse: 0–49 poor, 50–89 needs work, 90–100 good. */
export function ScoreRing({
  score,
  label,
  size = 96,
  index = 0,
}: {
  score: number;
  label: string;
  size?: number;
  /** Position in a row, used to stagger the fill animation. */
  index?: number;
}) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = clamped >= 90 ? 'good' : clamped >= 50 ? 'needs work' : 'poor';
  const color =
    clamped >= 90
      ? 'var(--wl-success)'
      : clamped >= 50
        ? 'var(--wl-severity-medium-fg)'
        : 'var(--wl-danger)';
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label}: ${clamped} out of 100, ${band}`}
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--wl-surface-muted)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          className="ring-animate"
          style={{ '--i': index } as CSSProperties}
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="57"
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="var(--wl-text)"
        >
          {clamped}
        </text>
      </svg>
      <figcaption className="text-center text-sm font-medium text-fg">
        {label}
        <span className="block text-xs font-normal text-fg-muted">
          {band[0]?.toUpperCase() + band.slice(1)}
        </span>
      </figcaption>
    </figure>
  );
}
