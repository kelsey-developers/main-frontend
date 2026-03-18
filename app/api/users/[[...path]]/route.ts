import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Roles managed by the payroll backend — never forwarded to the Auth Service
const PAYROLL_ROLES = new Set(['Employee']);

const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, proxy-revalidate';

function withNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', NO_STORE_CACHE_CONTROL);
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

function readString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function titleize(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function formatEmailLocalPart(email: string): string {
  const local = readString(email).split('@')[0] ?? '';
  const asWords = local.replace(/[._-]+/g, ' ').trim();
  return asWords ? titleize(asWords) : '';
}

function normalizeUserRecord(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;

  const obj = input as Record<string, unknown>;
  const firstName = readString(obj.firstName ?? obj.first_name);
  const lastName = readString(obj.lastName ?? obj.last_name);
  const email = readString(obj.email);
  const fullnameRaw = readString(obj.fullname ?? obj.fullName ?? obj.name);

  const fromParts = titleize([firstName, lastName].filter(Boolean).join(' '));
  const normalizedFullname =
    fromParts ||
    (fullnameRaw && !looksLikeEmail(fullnameRaw) ? fullnameRaw : '') ||
    (looksLikeEmail(email) ? formatEmailLocalPart(email) : '') ||
    fullnameRaw ||
    email;

  return {
    ...obj,
    firstName: firstName || obj.firstName,
    lastName: lastName || obj.lastName,
    fullname: normalizedFullname,
  };
}

function normalizeUsersPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map((item) => normalizeUserRecord(item));
  if (!payload || typeof payload !== 'object') return payload;

  const obj = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...obj };

  if (Array.isArray(obj.users)) {
    normalized.users = obj.users.map((item) => normalizeUserRecord(item));
  }

  if (obj.user && typeof obj.user === 'object') {
    normalized.user = normalizeUserRecord(obj.user);
  }

  return normalized;
}

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value ?? null;
}

/** Forward request to the Auth Service. */
async function proxyAuthService(request: NextRequest, upstreamPath: string, body?: string): Promise<NextResponse> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return withNoStore(NextResponse.json({ error: 'API_URL not configured' }, { status: 503 }));

  const token = await getToken();
  if (!token) return withNoStore(NextResponse.json({ error: 'Authorization token required' }, { status: 401 }));

  const search = request.nextUrl.searchParams.toString();
  const url = `${apiUrl}${upstreamPath}${search ? `?${search}` : ''}`;
  const method = request.method.toUpperCase();

  const res = await fetch(url, {
    method,
    cache: 'no-store',
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
  const normalized = method === 'GET' ? normalizeUsersPayload(data) : data;
  return withNoStore(NextResponse.json(normalized, { status: res.status }));
}

/** Assign Employee role via the payroll backend (no auth service call). */
async function patchPayrollRole(email: string, name: string, role: string): Promise<NextResponse> {
  const payrollApiUrl = process.env.PAYROLL_API_URL?.replace(/\/$/, '');
  if (!payrollApiUrl) {
    return withNoStore(NextResponse.json({ error: 'PAYROLL_API_URL not configured' }, { status: 503 }));
  }

  const res = await fetch(`${payrollApiUrl}/api/employees/roles`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, role }),
  });

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }

  if (!res.ok) return withNoStore(NextResponse.json(data, { status: res.status }));

  return withNoStore(NextResponse.json({
    message: 'Payroll role updated',
    email,
    role,
    roles: [role],
  }, { status: 200 }));
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

  if (role && PAYROLL_ROLES.has(role)) {
    const email = typeof parsedBody.email === 'string' ? parsedBody.email : null;
    const firstName = typeof parsedBody.firstName === 'string' ? parsedBody.firstName : '';
    const lastName  = typeof parsedBody.lastName  === 'string' ? parsedBody.lastName  : '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || (email ?? 'Unknown');

    if (!email) {
      return withNoStore(NextResponse.json({ error: 'email is required when assigning a payroll role' }, { status: 400 }));
    }

    return patchPayrollRole(email, name, role);
  }

  // Default: forward everything to the Auth Service
  return proxyAuthService(request, upstreamPath, bodyText);
}
