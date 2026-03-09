import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

async function proxy(
  method: string,
  url: string,
  request: NextRequest,
  body?: unknown
) {
  if (!API_URL) {
    return NextResponse.json({ error: 'API URL not configured' }, { status: 503 });
  }

  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const url = `${API_URL}/api/bookings${search ? `?${search}` : ''}`;
  return proxy('GET', url, request);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return proxy('POST', `${API_URL}/api/bookings`, request, body);
}
