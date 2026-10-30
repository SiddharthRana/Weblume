import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
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
