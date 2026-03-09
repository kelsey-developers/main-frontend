import type { NextConfig } from "next";

const apiUrl = process.env.API_URL || '';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { dev }) => {
    if (dev) {
      // Ignore heavy directories to prevent watcher memory leaks
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git'],
      };
    }
    return config;
  }, // <--- FIXED: Added the closing brace and the comma
  async rewrites() {
    if (!apiUrl) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
