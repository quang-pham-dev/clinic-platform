import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@clinic-platform/api-client',
    '@clinic-platform/types',
    '@clinic-platform/ui',
  ],
};

export default nextConfig;
