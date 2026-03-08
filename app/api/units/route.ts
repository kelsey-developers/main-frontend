import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const city = searchParams.get('city');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const params = new URLSearchParams();
    if (featured) params.set('featured', featured);
    if (city) params.set('city', city);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);

    const qs = params.toString();
    const res = await fetch(`${API_URL}/api/units${qs ? `?${qs}` : ''}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Units API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}
