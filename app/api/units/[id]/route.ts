import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/mockData';
import { mockListings } from '@/lib/mockData';

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

    // If no API_URL is configured, use mock data
    if (!API_URL) {
      const unit = mockListings.find(u => u.id === id);
      if (!unit) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }
      return NextResponse.json(unit);
    }

    const res = await fetch(`${API_URL}/api/units/${id}`);

    if (!res.ok) {
      // Fall back to mock data on error
      console.warn('Backend API failed, using mock data');
      const unit = mockListings.find(u => u.id === id);
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
    const { id } = await params;
    const unit = mockListings.find(u => u.id === id);
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }
    return NextResponse.json(unit);
  }
}
