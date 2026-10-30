import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Private app routes: scan reports, history, and (later) the dashboard and shared reports.
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/r/', '/scan/', '/history', '/dashboard', '/account', '/auth/', '/checkout/'],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
