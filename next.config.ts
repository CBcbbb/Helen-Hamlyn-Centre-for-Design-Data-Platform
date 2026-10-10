import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The network map moved from /explore to the home page.
  async redirects() {
    return [
      { source: '/explore', destination: '/', permanent: true },
      { source: '/explore/table', destination: '/table', permanent: true },
    ];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
