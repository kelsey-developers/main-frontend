import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/mockData';

const API_URL = process.env.API_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
      // Fall back to mock data on error
      console.warn('Backend API failed, using mock data');
      const unit = getListingById(id);
      if (!unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }
      return NextResponse.json(unit);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unit API proxy error, using mock data:', error);
    // Fall back to mock data
    const unit = getListingById(id);
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
    return NextResponse.json(unit);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!API_URL) {
    return NextResponse.json({ error: 'Backend API is not configured' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const token = request.cookies.get('accessToken')?.value;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/units/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Unit PATCH proxy error:', error);
    return NextResponse.json({ error: 'Failed to update unit' }, { status: 500 });
  }
}
