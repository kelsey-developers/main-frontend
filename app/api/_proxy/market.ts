import { NextRequest, NextResponse } from 'next/server';

function buildUpstreamUrl(baseUrl: string, upstreamPath: string, request: NextRequest): string {
  const search = request.nextUrl.searchParams.toString();
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
  return `${trimmedBase}${normalizedPath}${search ? `?${search}` : ''}`;
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

type ForwardOptions = {
  stripRoleHeaders?: boolean;
};

type ProxyMarketApiOptions = {
  baseCandidates?: string[];
};

type AuthUserInfo = {
  email?: string;
  roles: string[];
};

function parseBearerToken(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.trim().split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

function dedupeRoles(roles: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const role of roles) {
    const trimmed = role.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  return unique;
}

function splitRolesHeader(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

function pickPrimaryRole(roles: string[]): string | null {
  if (!roles || roles.length === 0) return null;
  const normalized = roles.map((r) => r.trim()).filter(Boolean);
  if (normalized.length === 0) return null;

  // Highest privilege first. Prevent forwarding a restricted role as primary
  // when the user actually also has admin/finance/etc.
  const priority = [
    'admin',
    'finance',
    'inventory',
    'operations',
    'housekeeping',
    'frontdesk',
    'agent',
    'cleaner',
    'employee',
    'user',
    'guest',
  ];
  const byLower = new Map(normalized.map((r) => [r.toLowerCase(), r]));
  for (const p of priority) {
    const found = byLower.get(p);
    if (found) return found;
  }
  return normalized[0] ?? null;
}

function readUserCookie(request: NextRequest): AuthUserInfo {
  const userCookie = request.cookies.get('user')?.value;
  if (!userCookie) return { roles: [] };

  try {
    const user = JSON.parse(userCookie) as { email?: unknown; roles?: unknown };
    const email =
      typeof user.email === 'string' && user.email.trim().length > 0
        ? user.email.trim()
        : undefined;
    const roles = Array.isArray(user.roles)
      ? user.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      : [];
    return { email, roles: dedupeRoles(roles) };
  } catch {
    return { roles: [] };
  }
}

async function getUserInfoFromAccessToken(accessToken: string): Promise<AuthUserInfo | null> {
  const apiUrl = process.env.API_URL?.replace(/\/+$/, '');
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/api/auth/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { email?: unknown; roles?: unknown };
    const email =
      typeof payload.email === 'string' && payload.email.trim().length > 0
        ? payload.email.trim()
        : undefined;
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      : [];

    return { email, roles: dedupeRoles(roles) };
  } catch {
    return null;
  }
}

async function buildForwardHeaders(
  request: NextRequest,
  method: string,
  options: ForwardOptions = {}
): Promise<Headers> {
  const headers = new Headers();

  // Keep passthrough support for non-authenticated local dev calls.
  const passthroughHeaders = [
    'authorization',
    'content-type',
    'x-user-id',
    'x-user-email',
    'x-user-role',
    'x-user-roles',
    /** Auth app user id for create flows where the backend supports an alternate header */
    'x-reporter-user-id',
  ];

  passthroughHeaders.forEach((key) => {
    if (options.stripRoleHeaders && (key === 'x-user-role' || key === 'x-user-roles')) {
      return;
    }
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  });

  const passthroughEmail = headers.get('x-user-email');
  const passthroughRoles = dedupeRoles([
    ...splitRolesHeader(headers.get('x-user-role')),
    ...splitRolesHeader(headers.get('x-user-roles')),
  ]);

  const tokenFromHeader = parseBearerToken(headers.get('authorization'));
  const tokenFromCookie = request.cookies.get('accessToken')?.value?.trim() || null;
  const accessToken = tokenFromHeader || tokenFromCookie;

  if (accessToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const cookieIdentity = readUserCookie(request);

  if (accessToken) {
    // Token exists: do not trust caller-supplied identity headers.
    headers.delete('x-user-id');
    headers.delete('x-user-email');
    headers.delete('x-user-role');
    headers.delete('x-user-roles');

    const verifiedIdentity = await getUserInfoFromAccessToken(accessToken);
    const resolvedEmail =
      verifiedIdentity?.email ??
      cookieIdentity.email ??
      (process.env.NODE_ENV !== 'production' ? passthroughEmail ?? undefined : undefined);
    const resolvedRoles = dedupeRoles([
      ...(verifiedIdentity?.roles ?? []),
      ...cookieIdentity.roles,
    ]);
    const effectiveRoles =
      process.env.NODE_ENV !== 'production' && passthroughRoles.length > 0
        ? dedupeRoles([...passthroughRoles, ...resolvedRoles])
        : resolvedRoles;

    if (!verifiedIdentity && process.env.NODE_ENV !== 'production') {
      console.warn('[market proxy] /api/auth/userinfo lookup failed; falling back to user cookie identity.');
    }

    if (resolvedEmail) {
      headers.set('x-user-email', resolvedEmail);
    }

    if (!options.stripRoleHeaders && effectiveRoles.length > 0) {
      headers.set('x-user-role', pickPrimaryRole(effectiveRoles) ?? effectiveRoles[0]);
      headers.set('x-user-roles', effectiveRoles.join(','));
    }
  } else {
    // No token: preserve dev header behavior, with cookie fallback when headers are missing.
    if (!headers.has('x-user-email') && cookieIdentity.email) {
      headers.set('x-user-email', cookieIdentity.email);
    }

    if (
      !options.stripRoleHeaders &&
      !headers.has('x-user-role') &&
      !headers.has('x-user-roles') &&
      cookieIdentity.roles.length > 0
    ) {
      headers.set('x-user-role', pickPrimaryRole(cookieIdentity.roles) ?? cookieIdentity.roles[0]);
      headers.set('x-user-roles', cookieIdentity.roles.join(','));
    }
  }

  // Ensure JSON content-type only when not set (multipart uploads need their boundary).
  if (method !== 'GET' && method !== 'HEAD' && !headers.get('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return headers;
}

type ForwardBody = string | ArrayBuffer | undefined;

async function forwardToUpstream(
  request: NextRequest,
  upstreamUrl: string,
  options: ForwardOptions & { preReadBody?: ForwardBody } = {}
): Promise<{ status: number; data: unknown; isHtml: boolean; rawText: string }> {
  const method = request.method.toUpperCase();

  const headers = await buildForwardHeaders(request, method, options);

  // Bypass ngrok browser warning/interstitial so API requests receive actual JSON payloads.
  if (isNgrokUrl(upstreamUrl) && !headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  // Use pre-read body when retrying (body can only be read once per request)
  let body: ForwardBody = options.preReadBody;
  if (body === undefined && method !== 'GET' && method !== 'HEAD') {
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

  const REQUEST_TIMEOUT_MS = 15000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(upstreamUrl, {
        method,
        headers,
        signal: controller.signal,
        ...(body !== undefined ? { body } : {}),
      });
      clearTimeout(timeout);
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
      if (process.env.NODE_ENV !== 'production' && res.status >= 400) {
        console.warn(
          `[market proxy] ${res.status} from ${upstreamUrl}:`,
          typeof data === 'object' && data !== null && 'message' in data
            ? (data as { message?: unknown }).message
            : text?.slice(0, 200)
        );
      }
      return { status: res.status, data, isHtml, rawText: text };
    } catch (err) {
      clearTimeout(timeout);
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

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const code = (err as NodeJS.ErrnoException).code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  );
}

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getMarketBaseCandidates(): string[] {
  // In dev: try MARKET_API_LOCAL_URL and localhost first (for local market-backend), then MARKET_API_URL (tunnel).
  // In prod: use MARKET_API_URL only.
  const devLocal =
    process.env.NODE_ENV !== 'production'
      ? [
          trimToUndefined(process.env.MARKET_API_LOCAL_URL),
          'http://localhost:4000',
        ]
      : [];

  const explicit = [
    trimToUndefined(process.env.MARKET_API_URL),
    trimToUndefined(process.env.MARKET_API_FALLBACK_URL),
  ].filter((value): value is string => Boolean(value));

  // Dev: local first so local market-backend works; then tunnel for remote.
  const candidates =
    process.env.NODE_ENV !== 'production'
      ? [...devLocal, ...explicit]
      : [...explicit];
  const filtered = candidates.filter((value): value is string => Boolean(value));
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const candidate of filtered) {
    const normalized = candidate.replace(/\/+$/, '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function shouldTryNextCandidate(status: number): boolean {
  // Try next candidate only for likely route/method mismatches.
  return status === 404 || status === 405 || status === 501;
}

/**
 * Forward GET to upstream and return raw bytes (for attachment/image content).
 * Uses arrayBuffer() so images are not corrupted. HTML error pages (530/404) are
 * rejected so we don't return JSON to <img src> — client gets 502 text/plain instead.
 */
export async function proxyMarketApiBinary(
  request: NextRequest,
  upstreamPath: string
): Promise<NextResponse> {
  const primaryBaseUrl = process.env.API_URL;
  const fallbackBaseUrl = process.env.MARKET_API_URL;

  if (!primaryBaseUrl && !fallbackBaseUrl) {
    return new NextResponse('API_URL and MARKET_API_URL are not configured', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  function upstreamUrlForLog(url: string): string {
    try {
      return new URL(url).origin + new URL(url).pathname;
    } catch {
      return url;
    }
  }

  type BinaryResult =
    | { ok: true; status: number; buffer: ArrayBuffer; contentType: string }
    | { ok: false; status?: number };

  async function fetchBinary(baseUrl: string): Promise<BinaryResult> {
    const url = buildUpstreamUrl(baseUrl, upstreamPath, request);
    const headers = await buildForwardHeaders(request, 'GET', {
      stripRoleHeaders: shouldStripRoleHeadersForPath(upstreamPath),
    });
    if (isNgrokUrl(url) && !headers.has('ngrok-skip-browser-warning')) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      clearTimeout(timeout);

      const buffer = await res.arrayBuffer();
      const ct = res.headers.get('content-type') || '';

      // Error pages are often HTML even with 200/404/502
      if (!res.ok || ct.includes('text/html') || looksLikeNgrokErrorPage(new TextDecoder().decode(buffer.slice(0, 512)))) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[market proxy binary] ${res.status} non-OK or HTML from ${upstreamUrlForLog(url)}`);
        }
        return { ok: false, status: res.status };
      }
      const snippet = new TextDecoder().decode(buffer.slice(0, Math.min(256, buffer.byteLength)));
      if (looksLikeHtml(snippet)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[market proxy binary] body looks like HTML from ${upstreamUrlForLog(url)}`);
        }
        return { ok: false, status: res.status };
      }

      return {
        ok: true,
        status: res.status,
        buffer,
        contentType: ct || 'application/octet-stream',
      };
    } catch (err) {
      clearTimeout(timeout);
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[market proxy binary] fetch failed ${upstreamUrlForLog(buildUpstreamUrl(baseUrl, upstreamPath, request))}`, err);
      }
      return { ok: false };
    }
  }

  const bases = [primaryBaseUrl, fallbackBaseUrl].filter(Boolean) as string[];
  let lastUpstreamStatus: number | undefined;
  for (const base of bases) {
    const result = await fetchBinary(base);
    if (result.ok) {
      return new NextResponse(result.buffer, {
        status: result.status,
        headers: {
          'Content-Type': result.contentType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
    lastUpstreamStatus = result.status;
  }

  // Pass through 404 so client can handle "not found" (e.g. img onError) instead of 502
  if (lastUpstreamStatus === 404) {
    return new NextResponse('Attachment not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new NextResponse('Attachment unavailable (upstream error or route missing).', {
    status: 502,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function shouldStripRoleHeadersForPath(path: string): boolean {
  // Allow inventory users to fully access damage incidents by not sending restricted role headers.
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('/api/damage-incidents');
}

export async function proxyMarketApi(
  request: NextRequest,
  upstreamPath: string,
  options: ProxyMarketApiOptions = {}
): Promise<NextResponse> {
  const primaryBaseUrl = process.env.API_URL;
  const fallbackBaseUrl = process.env.MARKET_API_URL;

  if (!primaryBaseUrl && !fallbackBaseUrl) {
    return NextResponse.json({ error: 'API_URL and MARKET_API_URL are not configured' }, { status: 503 });
  }

  // Read body once — request body can only be consumed once; reuse for retries.
  let preReadBody: ForwardBody = undefined;
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('multipart/form-data')) {
        preReadBody = await request.arrayBuffer();
      } else {
        const raw = await request.text();
        preReadBody = raw || undefined;
      }
    } catch {
      preReadBody = undefined;
    }
  }

  const tryForward = async (baseUrl: string) => {
    const url = buildUpstreamUrl(baseUrl, upstreamPath, request);
    return forwardToUpstream(request, url, {
      stripRoleHeaders: shouldStripRoleHeadersForPath(upstreamPath),
      preReadBody,
    });
  };

  try {
    // If we have a primary base URL, try it first
    if (primaryBaseUrl) {
      try {
        const primary = await tryForward(primaryBaseUrl);
        if (!primary.isHtml) {
          return NextResponse.json(primary.data, { status: primary.status });
        }
        // Primary returned HTML error page; try fallback if available
        if (fallbackBaseUrl) {
          try {
            const fallback = await tryForward(fallbackBaseUrl);
            if (!fallback.isHtml) {
              return NextResponse.json(fallback.data, { status: fallback.status });
            }
          } catch {
            // Fall through to error response below
          }
        }
        return NextResponse.json(
          {
            error: 'Primary upstream is unreachable or returned HTML.',
            upstream: primaryBaseUrl,
          },
          { status: 502 }
        );
      } catch (err) {
        if (fallbackBaseUrl && isNetworkError(err)) {
          try {
            const fallback = await tryForward(fallbackBaseUrl);
            if (!fallback.isHtml) {
              return NextResponse.json(fallback.data, { status: fallback.status });
            }
          } catch {
            // Fall through to error response below
          }
        }
        throw err;
      }
    }

    // No API_URL configured; use MARKET_API_URL as a best-effort fallback
    if (fallbackBaseUrl) {
      const result = await tryForward(fallbackBaseUrl);
      if (result.isHtml) {
        return NextResponse.json(
          { error: 'Upstream returned HTML (unexpected).', upstream: fallbackBaseUrl },
          { status: 502 }
        );
      }
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json(
      {
        error: 'No API_URL or MARKET_API_URL configured.',
      },
      { status: 503 }
    );
  } catch (err) {
    if (isNetworkError(err)) {
      return NextResponse.json(
        {
          error: 'Upstream backend is unreachable. Ensure API_URL is correct.',
          upstream: primaryBaseUrl || fallbackBaseUrl,
        },
        { status: 503 }
      );
    }
    throw err;
  }
}

