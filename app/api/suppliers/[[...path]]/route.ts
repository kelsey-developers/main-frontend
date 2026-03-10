import { NextRequest } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/suppliers/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/suppliers/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/suppliers/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

