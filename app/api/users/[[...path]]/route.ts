import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Roles handled by the Auth Service (auth-service-backend)
const AUTH_SERVICE_ROLES = new Set(['Guest', 'Agent', 'Admin', 'Finance', 'Inventory', 'Housekeeping']);

// Roles stored in market-backend only (Auth Service doesn't have these)
const INTERNAL_ROLES = new Set(['Operations', 'Frontdesk']);

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? null;
}

/** Forward request to the Auth Service. */
async function proxyAuthService(request: NextRequest, upstreamPath: string, body?: string): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return NextResponse.json({ error: 'API_URL not configured' }, { status: 503 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });

  const search = request.nextUrl.searchParams.toString();
  const url = `${apiUrl}${upstreamPath}${search ? `?${search}` : ''}`;
  const method = request.method.toUpperCase();

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method !== 'GET' && body ? { body } : {}),
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }
  return NextResponse.json(data, { status: res.status });
}

/** Forward role update to the market-backend. */
async function patchInternalRole(email: string, name: string, role: string): Promise<NextResponse> {
  const marketApiUrl = process.env.MARKET_API_URL?.replace(/\/$/, '');
  if (!marketApiUrl) {
    return NextResponse.json({ error: 'MARKET_API_URL not configured' }, { status: 503 });
  }

  const res = await fetch(`${marketApiUrl}/api/user-roles`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, role }),
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }

  if (!res.ok) return NextResponse.json(data, { status: res.status });

  // Return a shape consistent with the Auth Service PATCH response so the frontend
  // update logic works the same way regardless of which service handled the role.
  return NextResponse.json({
    message: 'Internal role updated',
    email,
    role,
    roles: [role],
  }, { status: 200 });
}

/** Remove an internal role from market-backend when the user is moved to an Auth Service role. */
async function deleteInternalRole(email: string): Promise<void> {
  const marketApiUrl = process.env.MARKET_API_URL?.replace(/\/$/, '');
  if (!marketApiUrl) return;
  try {
    await fetch(`${marketApiUrl}/api/user-roles`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    // non-fatal — worst case the old internal record stays
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/users${path.length ? `/${path.join('/')}` : ''}`;
  return proxyAuthService(request, upstreamPath);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const upstreamPath = `/api/users${path.length ? `/${path.join('/')}` : ''}`;

  const bodyText = await request.text();
  let parsedBody: Record<string, unknown> = {};
  try { parsedBody = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* ignore */ }

  const role = typeof parsedBody.role === 'string' ? parsedBody.role : null;

  if (role && INTERNAL_ROLES.has(role)) {
    // Route to market-backend — Auth Service doesn't know this role
    const email = typeof parsedBody.email === 'string' ? parsedBody.email : null;
    const firstName = typeof parsedBody.firstName === 'string' ? parsedBody.firstName : '';
    const lastName  = typeof parsedBody.lastName  === 'string' ? parsedBody.lastName  : '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || (email ?? 'Unknown');

    if (!email) {
      return NextResponse.json({ error: 'email is required when assigning an internal role' }, { status: 400 });
    }

    return patchInternalRole(email, name, role);
  }

  if (role && AUTH_SERVICE_ROLES.has(role)) {
    // Moving back to an Auth Service role — clean up any existing internal role record
    const email = typeof parsedBody.email === 'string' ? parsedBody.email : null;
    if (email) await deleteInternalRole(email);
  }

  // Default: forward everything to the Auth Service
  return proxyAuthService(request, upstreamPath, bodyText);
}
