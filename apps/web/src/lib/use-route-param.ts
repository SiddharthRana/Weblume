'use client';

import { usePathname } from 'next/navigation';
import { EXPORTED_PARAM } from './route-param';

/**
 * The real value of a report route's last segment. In the static export every `/scan/<id>` is served by
 * the page built for `/scan/_`, so its route param is the placeholder and the id comes from the address.
 */
export function useRouteParam(param: string): string {
  const pathname = usePathname();
  if (param !== EXPORTED_PARAM) return param;
  return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '');
}
