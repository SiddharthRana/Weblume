import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  transpilePackages: ['@weblume/shared', '@weblume/design-tokens'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// Plugins are given by name so the config stays serializable for Turbopack.
const withMDX = createMDX({ options: { remarkPlugins: [['remark-gfm', {}]] } });

export default withMDX(nextConfig);
