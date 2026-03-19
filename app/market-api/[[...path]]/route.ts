import { NextRequest } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

function toUpstreamPath(path: string[]): string {
  // Backward compatibility: some clients call /market-api/market/*.
  // Normalize that to /api/* for market-backend.
  const normalizedPath = path[0]?.toLowerCase() === 'market' ? path.slice(1) : path;
  const joined = normalizedPath.join('/');
  return `/api/${joined}`.replace(/\/$/, '') || '/api';
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = toUpstreamPath(path);
  return proxyMarketApi(request, upstreamPath);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
