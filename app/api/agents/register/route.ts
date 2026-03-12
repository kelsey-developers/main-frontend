import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
  }

  const body = await request.arrayBuffer();

  const headers: Record<string, string> = { 'Content-Type': contentType };
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;

  const res = await fetch(`${apiUrl}/api/agents/register`, {
    method: 'POST',
    headers,
    body,
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
