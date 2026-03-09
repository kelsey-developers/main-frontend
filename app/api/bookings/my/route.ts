import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function GET(request: NextRequest) {
  if (!API_URL) {
    return NextResponse.json({ error: 'API URL not configured' }, { status: 503 });
  }

  const token = request.cookies.get('accessToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/bookings/my`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
