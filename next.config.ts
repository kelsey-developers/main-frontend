import type { NextConfig } from "next";

const apiUrl = process.env.API_URL || '';

const nextConfig: NextConfig = {
  // Add this line to satisfy the Turbopack build requirement
  turbopack: {}, 
  
  webpack: (config, { dev }) => {
    if (dev) {
      // Ignore heavy directories to prevent watcher memory leaks
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git'],
      };
    }
    return config;
  },
  async rewrites() {
    if (!apiUrl) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
