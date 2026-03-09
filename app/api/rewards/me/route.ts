import { NextRequest, NextResponse } from 'next/server';

const REWARDS_API_URL = process.env.REWARDS_API_URL;

export async function GET(request: NextRequest) {
  if (!REWARDS_API_URL) {
    return NextResponse.json(
      { error: 'Rewards API URL not configured' },
      { status: 503 }
    );
  }

  const token = request.cookies.get('accessToken')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Authorization token required' },
      { status: 401 }
    );
  }

  const res = await fetch(`${REWARDS_API_URL}/api/rewards/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
