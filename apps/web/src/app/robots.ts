import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // App routes (dashboard, scans, shared reports) will be disallowed here as they're added.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/r/'] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
