import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Proxies proof file upload to auth backend /api/upload/proof.
 * Preserves multipart/form-data for file upload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env.MARKET_API_URL || process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: 'API_URL or MARKET_API_URL not configured' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const xUserId = request.headers.get('x-user-id');
  const xUserEmail = request.headers.get('x-user-email');
  const xUserRole = request.headers.get('x-user-role');
  if (xUserId) headers['x-user-id'] = xUserId;
  if (xUserEmail) headers['x-user-email'] = xUserEmail;
  if (xUserRole) headers['x-user-role'] = xUserRole;

  if (!token && !xUserId) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const formData = await request.formData();

  const base = apiUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/api/upload/proof`, {
    method: 'POST',
    headers,
    body: formData,
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
