import { NextRequest } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

/**
 * Proxies requests to MARKET_API_URL for finance/inventory data (bookings, damage-incidents).
 * Used by finance dashboard and any client that needs market-backend data via apiClient.
 * Path is e.g. ["bookings", "my"] -> upstream /api/bookings/my
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}
