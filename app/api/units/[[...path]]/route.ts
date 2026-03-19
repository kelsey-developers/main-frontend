import { NextRequest, NextResponse } from 'next/server';
import { proxyMarketApi } from '@/app/api/_proxy/market';

const API_URL = process.env.API_URL;

async function proxyManageUnitsToApi(request: NextRequest): Promise<NextResponse> {
  if (!API_URL) {
    return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });
  }

  const search = request.nextUrl.searchParams.toString();
  const url = `${API_URL.replace(/\/+$/, '')}/api/units/manage${search ? `?${search}` : ''}`;

  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const incomingId = request.headers.get('x-user-id');
  const incomingEmail = request.headers.get('x-user-email');
  const incomingRole = request.headers.get('x-user-role');
  const incomingRoles = request.headers.get('x-user-roles');
  if (incomingId) headers['x-user-id'] = incomingId;
  if (incomingEmail) headers['x-user-email'] = incomingEmail;
  if (incomingRole) headers['x-user-role'] = incomingRole;
  if (incomingRoles) headers['x-user-roles'] = incomingRoles;

  if (!headers['x-user-role'] && !headers['x-user-email']) {
    const userCookie = request.cookies.get('user')?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie) as { id?: string; email?: string; roles?: string[] };
        if (user.roles?.[0]) headers['x-user-role'] = user.roles[0];
        if (user.email) headers['x-user-email'] = user.email;
        if (user.id) headers['x-user-id'] = user.id;
      } catch {
        // ignore malformed cookie
      }
    }
  }

  const res = await fetch(url, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;

  if (path[0] === 'manage') {
    return proxyManageUnitsToApi(request);
  }

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

