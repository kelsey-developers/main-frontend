import { NextRequest, NextResponse } from 'next/server';

function buildUpstreamUrl(baseUrl: string, pathSegments: string[], request: NextRequest): string {
  const search = request.nextUrl.searchParams.toString();
  const upstreamPath = `/api/${pathSegments.join('/')}`.replace(/\/$/, '');
  return `${baseUrl}${upstreamPath}${search ? `?${search}` : ''}`;
}

async function forward(request: NextRequest, upstreamUrl: string): Promise<NextResponse> {
  const method = request.method.toUpperCase();

  const headers = new Headers();
  // Preserve auth/dev-auth headers if present.
  const passthroughHeaders = [
    'authorization',
    'x-user-id',
    'x-user-email',
    'x-user-role',
    'x-user-roles',
    'cookie',
  ];
  passthroughHeaders.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  });

  if (method !== 'GET' && method !== 'HEAD') {
    if (!headers.get('content-type')) headers.set('content-type', 'application/json');
  }

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await request.text();
    body = raw || undefined;
  }

  const res = await fetch(upstreamUrl, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
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

async function proxyMainApi(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });
  }

  const { path = [] } = await ctx.params;
  const upstreamUrl = buildUpstreamUrl(baseUrl, path, request);
  return forward(request, upstreamUrl);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyMainApi(request, ctx);
}
export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyMainApi(request, ctx);
}
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyMainApi(request, ctx);
}
export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyMainApi(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxyMainApi(request, ctx);
}

