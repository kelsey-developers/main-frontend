import { NextRequest, NextResponse } from 'next/server';

function buildUpstreamUrl(baseUrl: string, upstreamPath: string, request: NextRequest): string {
  const search = request.nextUrl.searchParams.toString();
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
  return `${trimmedBase}${normalizedPath}${search ? `?${search}` : ''}`;
}

async function forwardToUpstream(
  request: NextRequest,
  upstreamUrl: string
): Promise<{ status: number; data: unknown }> {
  const method = request.method.toUpperCase();
  const headers = new Headers();

  // Preserve Authorization if client sent it
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers.set('authorization', authHeader);
  } else {
    // Use accessToken cookie for payroll API (requires auth)
    const cookieToken = request.cookies.get('accessToken')?.value;
    if (cookieToken) {
      headers.set('authorization', `Bearer ${cookieToken}`);
    }
  }

  const passthrough = ['content-type'];
  passthrough.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  });

  if (method !== 'GET' && method !== 'HEAD' && !headers.get('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let body: string | ArrayBuffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      body = await request.arrayBuffer();
    } else {
      const raw = await request.text();
      body = raw || undefined;
    }
  }

  const res = await fetch(upstreamUrl, {
    method,
    headers,
    body,
  });

  const rawText = await res.text();
  let data: unknown = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }

  return { status: res.status, data };
}

/**
 * Proxy requests to the payroll backend (PAYROLL_API_URL).
 * Adds Bearer token from accessToken cookie when Authorization header is not present.
 */
export async function proxyPayrollApi(
  request: NextRequest,
  upstreamPath: string
): Promise<NextResponse> {
  const baseUrl = process.env.PAYROLL_API_URL?.replace(/\/+$/, '') || 'http://localhost:4000';

  const url = buildUpstreamUrl(baseUrl, upstreamPath, request);
  try {
    const { status, data } = await forwardToUpstream(request, url);
    return NextResponse.json(data, { status });
  } catch (err) {
    console.error('[payroll proxy] fetch failed', url, err);
    return NextResponse.json(
      {
        error: 'Payroll backend is unreachable. Ensure it is running and PAYROLL_API_URL is correct.',
      },
      { status: 503 }
    );
  }
}
