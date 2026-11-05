'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { site, visibleWhileComingSoon } from '@/lib/site';
import { ComingSoon } from './coming-soon';

/** Before launch, replaces every page except pricing, contact and legal with the coming-soon screen. */
export function ComingSoonGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!site.comingSoon || visibleWhileComingSoon(pathname)) return children;
  return <ComingSoon />;
}
