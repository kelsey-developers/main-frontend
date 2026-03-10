import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxying is handled via `app/api/**/route.ts` handlers (server-side),
  // so we don't need Next rewrites (which can shadow route handlers).
};

export default nextConfig;
