import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });
  }

  const body = await request.text();

  const res = await fetch(`${apiUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || undefined,
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  return NextResponse.json(data, { status: res.status });
}
