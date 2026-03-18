import { NextRequest, NextResponse } from 'next/server';

const MARKET_API_URL = process.env.MARKET_API_URL;
const API_URL = process.env.API_URL;
const BASE_URL = MARKET_API_URL || API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'MARKET_API_URL or API_URL not configured' }, { status: 503 });
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

  const upstreamBase = BASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${upstreamBase}/api/bookings/${id}`, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
