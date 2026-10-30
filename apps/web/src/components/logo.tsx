import { useId } from 'react';

/** Geometric placeholder mark: a page frame with a rising "light" arc. Original artwork, no third-party assets. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = `wl-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--wl-gradient-start)" />
          <stop offset="55%" stopColor="var(--wl-gradient-mid)" />
          <stop offset="100%" stopColor="var(--wl-gradient-end)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#${id})`} />
      <path
        d="M8 22a8 8 0 0 1 16 0"
        fill="none"
        stroke="var(--wl-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="22" r="2.5" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
      <LogoMark />
      Weblume
    </span>
  );
}
