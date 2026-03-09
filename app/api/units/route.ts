import { NextRequest, NextResponse } from 'next/server';
import { mockListings } from '@/lib/mockData';

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

    // Local fallback for environments without a configured backend API.
    if (!API_URL) {
      let data = [...mockListings];

      if (featured === 'true') {
        data = data.filter((listing) => listing.is_featured);
      }

      if (city) {
        const normalizedCity = city.trim().toLowerCase();
        data = data.filter(
          (listing) => (listing.city ?? '').trim().toLowerCase() === normalizedCity
        );
      }

      const parsedOffset = Number.parseInt(offset ?? '0', 10);
      const safeOffset = Number.isFinite(parsedOffset)
        ? Math.max(0, parsedOffset)
        : 0;

      const parsedLimit = Number.parseInt(limit ?? '', 10);
      const hasValidLimit = Number.isFinite(parsedLimit) && parsedLimit > 0;

      data = hasValidLimit
        ? data.slice(safeOffset, safeOffset + parsedLimit)
        : data.slice(safeOffset);

      return NextResponse.json(data);
    }

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
