import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function proxyUsers(request: NextRequest, upstreamPath: string): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.toString();
  const url = `${apiUrl}${upstreamPath}${search ? `?${search}` : ''}`;

  const method = request.method.toUpperCase();
  const isGet = method === 'GET';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isGet ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(isGet ? {} : { body: await request.text() }),
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/users${path.length ? `/${path.join('/')}` : ''}`;
  return proxyUsers(request, upstreamPath);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/users${path.length ? `/${path.join('/')}` : ''}`;
  return proxyUsers(request, upstreamPath);
}
