import { NextRequest } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  return proxyMarketApi(request, upstreamPath);
}

