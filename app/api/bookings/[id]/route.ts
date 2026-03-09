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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const configError = getApiUrlOrResponse();
  if (configError) return configError;

  try {
    const { id } = await params;
    const token = request.cookies.get('accessToken')?.value;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/bookings/${id}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Bookings API proxy GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}
