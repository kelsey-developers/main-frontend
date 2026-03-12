import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    proxyClientMaxBodySize: '20mb',
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git'],
      };
    }
    return config;
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || '';
    return {
      // Route /market-api/* to our Next.js API routes (units, inventory, etc.) which proxy to MARKET_API_URL
      beforeFiles: [
        { source: '/market-api/:path*', destination: '/api/:path*' },
      ],
      // Only proxy unmatched /api/* to API_URL (after route handlers are checked)
      fallback: apiUrl ? [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }] : [],
    };
  },
};

export default nextConfig;
