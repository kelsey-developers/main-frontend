import { NextRequest, NextResponse } from 'next/server';

// Intentionally pinned to API_URL. Do not fall back to MARKET_API_URL for bookings.
const BOOKING_API_URL = process.env.API_URL?.trim();

async function proxy(
  method: string,
  baseUrl: string,
  url: string,
  request: NextRequest,
  body?: unknown
) {
  if (!baseUrl) {
    return NextResponse.json({ error: 'API_URL not configured for bookings' }, { status: 503 });
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
    cache: 'no-store',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: res.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  if (!BOOKING_API_URL) {
    return NextResponse.json({ error: 'API_URL not configured for bookings' }, { status: 503 });
  }

  const search = request.nextUrl.searchParams.toString();
  const url = `${BOOKING_API_URL.replace(/\/+$/, '')}/api/bookings${search ? `?${search}` : ''}`;
  const response = await proxy('GET', BOOKING_API_URL, url, request);
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: response.status,
    headers: {
      'Cache-Control': 'no-store',
      'x-bookings-upstream': BOOKING_API_URL,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!BOOKING_API_URL) {
    return NextResponse.json({ error: 'API_URL not configured for bookings' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  return proxy('POST', BOOKING_API_URL, `${BOOKING_API_URL.replace(/\/+$/, '')}/api/bookings`, request, body);
}
