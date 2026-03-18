import { NextRequest, NextResponse } from 'next/server';

const MARKET_API_URL = process.env.MARKET_API_URL;
const API_URL = process.env.API_URL;
const BASE_URL = MARKET_API_URL || API_URL;

async function proxy(
  method: string,
  url: string,
  request: NextRequest,
  body?: unknown
) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'MARKET_API_URL or API_URL not configured' }, { status: 503 });
  }

  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const forwardedHeaders = ['x-user-id', 'x-user-email', 'x-user-role', 'x-user-roles', 'x-reporter-user-id'];
  forwardedHeaders.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  });

  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'MARKET_API_URL or API_URL not configured' }, { status: 503 });
  }

  const search = request.nextUrl.searchParams.toString();
  const url = `${BASE_URL.replace(/\/+$/, '')}/api/bookings${search ? `?${search}` : ''}`;
  return proxy('GET', url, request);
}

export async function POST(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'MARKET_API_URL or API_URL not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  return proxy('POST', `${BASE_URL.replace(/\/+$/, '')}/api/bookings`, request, body);
}
