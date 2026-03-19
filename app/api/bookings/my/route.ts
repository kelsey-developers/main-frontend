import { NextRequest, NextResponse } from 'next/server';

const MARKET_API_URL = process.env.MARKET_API_URL;
const API_URL = process.env.API_URL;
const BASE_URL = API_URL || MARKET_API_URL;

export async function GET(request: NextRequest) {
  if (!BASE_URL) {
    return NextResponse.json({ error: 'MARKET_API_URL or API_URL not configured' }, { status: 503 });
  }

  const token = request.cookies.get('accessToken')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Forward auth headers from client so backend can scope by role (admin = all, finance = agent's bookings)
  const incomingId = request.headers.get('x-user-id');
  const incomingEmail = request.headers.get('x-user-email');
  const incomingRole = request.headers.get('x-user-role');
  const incomingRoles = request.headers.get('x-user-roles');
  if (incomingId) headers['x-user-id'] = incomingId;
  if (incomingEmail) headers['x-user-email'] = incomingEmail;
  if (incomingRole) headers['x-user-role'] = incomingRole;
  if (incomingRoles) headers['x-user-roles'] = incomingRoles;

  if (!headers['x-user-role'] && !headers['x-user-email']) {
    const userCookie = request.cookies.get('user')?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie) as { id?: string; email?: string; roles?: string[] };
        if (user.roles?.[0]) headers['x-user-role'] = user.roles[0];
        if (user.email) headers['x-user-email'] = user.email;
        if (user.id) headers['x-user-id'] = user.id;
      } catch {
        // ignore
      }
    }
  }

  const search = request.nextUrl.searchParams.toString();
  const res = await fetch(`${BASE_URL.replace(/\/+$/, '')}/api/bookings/my${search ? `?${search}` : ''}`, {
    method: 'GET',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
