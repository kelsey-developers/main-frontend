import type { NextConfig } from "next";

const apiUrl = process.env.API_URL || '';

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
