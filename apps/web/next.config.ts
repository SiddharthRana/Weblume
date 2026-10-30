import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import { buildCsp } from './csp';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: buildCsp() },
];

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  transpilePackages: ['@weblume/shared', '@weblume/design-tokens'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Shared reports: the token is in the path, so never send it to other sites.
      {
        source: '/r/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

// Plugins are given by name so the config stays serializable for Turbopack.
const withMDX = createMDX({ options: { remarkPlugins: [['remark-gfm', {}]] } });

export default withMDX(nextConfig);
