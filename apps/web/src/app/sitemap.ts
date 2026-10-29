import type { MetadataRoute } from 'next';
import { posts } from '@/lib/blog';
import { site } from '@/lib/site';

const staticRoutes = [
  '',
  '/features',
  '/how-it-works',
  '/sample-report',
  '/pricing',
  '/blog',
  '/contact',
  '/bot',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refunds',
  '/legal/account-deletion',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...staticRoutes.map((path) => ({ url: `${site.url}${path}` })),
    ...posts.map((p) => ({ url: `${site.url}/blog/${p.slug}`, lastModified: p.date })),
  ];
}
