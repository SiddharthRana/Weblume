import type { CSSProperties } from 'react';
import { LogoMark } from './logo';

/**
 * Loading states. Every one announces itself to screen readers once (role="status") and is still for
 * visitors who ask for reduced motion (the animations live in globals.css under no-preference).
 */

/** Full-page loader: the logo inside a spinning brand ring, with a short message. */
export function PageLoader({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-5 py-24">
      <div aria-hidden="true" className="relative grid size-20 place-items-center">
        <span className="loader-ring absolute inset-0 rounded-full" />
        <span className="absolute inset-[5px] rounded-full bg-bg" />
        <LogoMark size={36} className="loader-breathe relative" />
      </div>
      <p className="text-sm font-medium text-fg-muted">
        {label}
        <span aria-hidden="true" className="loader-dots" />
      </p>
    </div>
  );
}

/** Small spinner with text, for sections and buttons. */
export function InlineLoader({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-sm text-fg-muted ${className}`}
    >
      <Spinner />
      {label}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`loader-spin inline-block size-4 shrink-0 rounded-full border-2 border-primary/25 border-t-primary ${className}`}
    />
  );
}

/** A shimmering placeholder block. */
export function Skeleton({
  className = '',
  index = 0,
  style,
}: {
  className?: string;
  index?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`scan-shimmer block rounded-md bg-surface-muted ${className}`}
      style={{ ['--i' as string]: index, ...style }}
    />
  );
}

/** Placeholder rows shaped like a list of scans or sites. */
export function ListSkeleton({ rows = 3, label }: { rows?: number; label?: string }) {
  return (
    <div role={label ? 'status' : undefined} className="space-y-3">
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" index={i} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" index={i} />
            <Skeleton className="h-3 w-1/4" index={i + 1} />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" index={i + 2} />
        </div>
      ))}
    </div>
  );
}

/** Dashboard placeholder: plan and usage card, then recent scans. */
export function DashboardSkeleton() {
  return (
    <div role="status" className="space-y-8">
      <span className="sr-only">Loading your dashboard</span>
      <div className="grid gap-6 card p-6 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-56" index={1} />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-28" index={1} />
            <Skeleton className="h-3.5 w-16" index={2} />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" index={2} />
          <Skeleton className="h-3 w-40" index={3} />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-36" index={3} />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}

/** Account placeholder: a few settings cards with fields and a button. */
export function AccountSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading your account</span>
      {[0, 1, 2].map((card) => (
        <div key={card} className="card space-y-4 p-6">
          <Skeleton className="h-5 w-40" index={card} />
          <Skeleton className="h-3.5 w-3/4" index={card + 1} />
          <Skeleton className="h-3.5 w-1/2" index={card + 2} />
          <Skeleton className="h-10 w-36 rounded-lg" index={card + 3} />
        </div>
      ))}
    </div>
  );
}
