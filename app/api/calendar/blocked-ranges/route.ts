import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function GET(request: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { error: 'Backend API is not configured' },
      { status: 503 }
    );
  }

  try {
    const search = request.nextUrl.searchParams.toString();
    const upstream = `${API_URL}/api/calendar/blocked-ranges${search ? `?${search}` : ''}`;
    const response = await fetch(upstream, { cache: 'no-store' });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Calendar blocked ranges proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked ranges' },
      { status: 500 }
    );
  }
}
