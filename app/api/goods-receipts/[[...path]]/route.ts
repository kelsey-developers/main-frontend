import { NextRequest } from 'next/server';
import { proxyMarketApi, proxyMarketApiBinary } from '@/app/api/_proxy/market';

function buildUpstreamPath(path: string[]): string {
  return `/api/goods-receipts/${path.join('/')}`.replace(/\/$/, '');
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = buildUpstreamPath(path);
  if (path.length >= 2 && path[path.length - 1] === 'content') {
    return proxyMarketApiBinary(request, upstreamPath);
  }
  return proxyMarketApi(request, upstreamPath);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, buildUpstreamPath(path));
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  return proxyMarketApi(request, buildUpstreamPath(path));
}
