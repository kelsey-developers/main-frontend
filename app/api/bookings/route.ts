import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

function getApiUrlOrResponse() {
  if (!API_URL) {
    return NextResponse.json(
      { error: 'Backend API is not configured' },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  const configError = getApiUrlOrResponse();
  if (configError) return configError;

  try {
    const search = request.nextUrl.searchParams.toString();
    const upstream = `${API_URL}/api/bookings${search ? `?${search}` : ''}`;
    const response = await fetch(upstream, { cache: 'no-store' });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bookings API proxy GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const configError = getApiUrlOrResponse();
  if (configError) return configError;

  try {
    const body = await request.json();
    const token = request.cookies.get('accessToken')?.value;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bookings API proxy POST error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
