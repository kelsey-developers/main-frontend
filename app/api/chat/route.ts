import { NextRequest, NextResponse } from 'next/server';

const AI_CHATBOT_URL = process.env.AI_CHATBOT_URL;

export async function POST(request: NextRequest) {
  if (!AI_CHATBOT_URL) {
    return NextResponse.json(
      { error: 'AI Chatbot API URL not configured' },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${AI_CHATBOT_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
