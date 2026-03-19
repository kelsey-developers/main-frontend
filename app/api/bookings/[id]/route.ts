import { NextRequest, NextResponse } from 'next/server';

// Intentionally pinned to API_URL. Do not fall back to MARKET_API_URL for bookings.
const BOOKING_API_URL = process.env.API_URL?.trim();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!BOOKING_API_URL) {
    return NextResponse.json({ error: 'API_URL not configured for bookings' }, { status: 503 });
  }

  const { id } = await params;
  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const forwardedHeaders = ['x-user-id', 'x-user-email', 'x-user-role', 'x-user-roles'];
  forwardedHeaders.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  });

  const upstreamBase = BOOKING_API_URL.replace(/\/+$/, '');
  const res = await fetch(`${upstreamBase}/api/bookings/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: res.status,
    headers: {
      'Cache-Control': 'no-store',
      'x-bookings-upstream': BOOKING_API_URL,
    },
  });
}
