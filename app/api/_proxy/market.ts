import { NextRequest, NextResponse } from 'next/server';

function buildUpstreamUrl(baseUrl: string, upstreamPath: string, request: NextRequest): string {
  const search = request.nextUrl.searchParams.toString();
  return `${baseUrl}${upstreamPath}${search ? `?${search}` : ''}`;
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html');
}

function looksLikeNgrokErrorPage(text: string): boolean {
  const haystack = text.toLowerCase();
  return haystack.includes('ngrok') && (haystack.includes('err_ngrok_') || looksLikeHtml(text));
}

function isNgrokUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.ngrok-free.dev') || host.endsWith('.ngrok.io') || host.endsWith('.ngrok.app');
  } catch {
    return false;
  }
}

async function forwardToUpstream(
  request: NextRequest,
  upstreamUrl: string
): Promise<{ status: number; data: unknown; isHtml: boolean; rawText: string }> {
  const method = request.method.toUpperCase();

  const headers = new Headers();
  // Preserve auth/dev-auth headers if present.
  const passthroughHeaders = [
    'authorization',
    'content-type',
    'x-user-id',
    'x-user-email',
    'x-user-role',
    'x-user-roles',
  ];
  passthroughHeaders.forEach((key) => {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  });

  // If no Authorization header came from the client, fall back to the
  // accessToken cookie (set by the login flow) so protected routes work.
  if (!headers.has('authorization')) {
    const cookieToken = request.cookies.get('accessToken')?.value;
    if (cookieToken) headers.set('authorization', `Bearer ${cookieToken}`);
  }

  // If no x-user-role but we have a logged-in user, add role from user cookie
  // so backend auth guard can enforce inventory-only access.
  if (!headers.has('x-user-role') && !headers.has('x-user-roles')) {
    const userCookie = request.cookies.get('user')?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie) as { email?: string; roles?: string[] };
        const role = user.roles?.[0];
        if (role) headers.set('x-user-role', role);
        if (user.email) headers.set('x-user-email', user.email);
      } catch {
        // ignore malformed cookie
      }
    }
  }

  // Bypass ngrok browser warning/interstitial so API requests receive actual JSON payloads.
  if (isNgrokUrl(upstreamUrl) && !headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  // Ensure JSON content-type only when not set (multipart uploads need their boundary).
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

  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 500;

  function isRetryableNetworkError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const code =
      (err as NodeJS.ErrnoException).code ??
      (err.cause && typeof err.cause === 'object' && 'code' in err.cause
        ? (err.cause as { code: string }).code
        : undefined);
    const msg = err.message.toLowerCase();
    const causeMsg =
      err.cause instanceof Error ? err.cause.message.toLowerCase() : '';
    return (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      causeMsg.includes('socket disconnected') ||
      causeMsg.includes('connection')
    );
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(upstreamUrl, {
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
      });
      const text = await res.text();
      const isHtml = looksLikeHtml(text) || looksLikeNgrokErrorPage(text);
      let data: unknown = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
      return { status: res.status, data, isHtml, rawText: text };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableNetworkError(err)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[market proxy] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${upstreamUrl}:`,
            err instanceof Error ? err.message : err
          );
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function proxyMarketApi(
  request: NextRequest,
  upstreamPath: string
): Promise<NextResponse> {
  const marketBaseUrl = process.env.MARKET_API_URL;
  const fallbackBaseUrl = process.env.API_URL;

  if (!marketBaseUrl && !fallbackBaseUrl) {
    return NextResponse.json({ error: 'MARKET_API_URL not configured' }, { status: 503 });
  }

  if (marketBaseUrl) {
    const upstreamUrl = buildUpstreamUrl(marketBaseUrl, upstreamPath, request);
    const primary = await forwardToUpstream(request, upstreamUrl);

    // If ngrok/HTML page comes back (often status 200), treat it as a bad gateway and try fallback.
    if (!primary.isHtml) {
      return NextResponse.json(primary.data, { status: primary.status });
    }

    if (fallbackBaseUrl) {
      const fallbackUrl = buildUpstreamUrl(fallbackBaseUrl, upstreamPath, request);
      const fallback = await forwardToUpstream(request, fallbackUrl);
      if (!fallback.isHtml) {
        return NextResponse.json(fallback.data, { status: fallback.status });
      }
    }

    return NextResponse.json(
      {
        error: 'Market upstream is unreachable or returned HTML (ngrok/error page).',
        upstream: marketBaseUrl,
      },
      { status: 502 }
    );
  }

  // No market URL configured; use API_URL as a best-effort fallback.
  const upstreamUrl = buildUpstreamUrl(fallbackBaseUrl!, upstreamPath, request);
  const result = await forwardToUpstream(request, upstreamUrl);
  if (result.isHtml) {
    return NextResponse.json(
      { error: 'Upstream returned HTML (unexpected).', upstream: fallbackBaseUrl },
      { status: 502 }
    );
  }
  return NextResponse.json(result.data, { status: result.status });
}

