import { NextRequest } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

/**
 * Proxies requests to MARKET_API_URL for finance/inventory data.
 * Path /api/market/bookings/my -> upstream /api/bookings/my (market-backend has no /market/ prefix).
 */
function toUpstreamPath(path: string[]): string {
  const normalized = path[0]?.toLowerCase() === 'market' ? path.slice(1) : path;
  const joined = normalized.join('/');
  return `/api/${joined}`.replace(/\/$/, '') || '/api';
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, toUpstreamPath(path));
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, toUpstreamPath(path));
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, toUpstreamPath(path));
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, toUpstreamPath(path));
}
