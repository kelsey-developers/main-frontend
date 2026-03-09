import type { NextConfig } from "next";

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
  },
};

export default nextConfig;
