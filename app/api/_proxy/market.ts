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

