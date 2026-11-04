import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

// Written to a file at build time (static export).
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (site.noindex) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    // Private app routes: reports, shared reports, comparisons, history, dashboard and account.
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/r/',
          '/scan/',
          '/compare',
          '/history',
          '/dashboard',
          '/account',
          '/auth/',
          '/checkout/',
        ],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
