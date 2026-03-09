import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/mockData';

const API_URL = process.env.API_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Local fallback for environments without a configured backend API.
    if (!API_URL) {
      const unit = getListingById(id);
      if (!unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }

      return NextResponse.json(unit);
    }

    const res = await fetch(`${API_URL}/api/units/${id}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unit API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch unit' }, { status: 500 });
  }
}
