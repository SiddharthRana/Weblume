/** Geometric placeholder mark: a page frame with a rising "light" arc. Original artwork, no third-party assets. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--wl-primary)" />
      <path
        d="M8 22a8 8 0 0 1 16 0"
        fill="none"
        stroke="var(--wl-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="22" r="2.5" fill="var(--wl-on-primary)" />
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
