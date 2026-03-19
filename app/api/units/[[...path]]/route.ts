import { NextRequest, NextResponse } from 'next/server';

// Units/listings go to Kelsey (API_URL) only — NEVER market API.
const API_URL = process.env.API_URL?.trim();

async function proxyUnits(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
  method: string,
  body?: unknown
) {
  if (!API_URL) {
    return NextResponse.json({ error: 'API_URL not configured for units' }, { status: 503 });
  }

  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/units/${path.join('/')}`.replace(/\/$/, '');
  const search = request.nextUrl.searchParams.toString();
  const url = `${API_URL.replace(/\/+$/, '')}${upstreamPath}${search ? `?${search}` : ''}`;

  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  ['x-user-id', 'x-user-email', 'x-user-role', 'x-user-roles'].forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  });

  const res = await fetch(url, {
    method,
    headers,
    cache: 'no-store',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store', 'x-units-upstream': 'kelsey' },
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyUnits(request, ctx, 'GET');
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const body = await request.json().catch(() => ({}));
  return proxyUnits(request, ctx, 'POST', body);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const body = await request.json().catch(() => ({}));
  return proxyUnits(request, ctx, 'PATCH', body);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const body = await request.json().catch(() => ({}));
  return proxyUnits(request, ctx, 'PUT', body);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyUnits(request, ctx, 'DELETE');
}

