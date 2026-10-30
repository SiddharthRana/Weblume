import type { ReactNode } from 'react';

/** Re-mounts on every navigation, so each page fades in (skipped for reduced motion). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
