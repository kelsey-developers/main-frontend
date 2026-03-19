const BACKEND_ENDPOINT_PREFIXES = [
  '/api/inventory',
  '/api/products',
  '/api/suppliers',
  '/api/purchase-orders',
  '/api/goods-receipts',
  '/api/product-categories',
  '/api/charge-types',
  '/api/damage-incidents',
  '/api/units',
  '/api/user-roles',
  '/api/inventory-settings',
  '/api/approval-requests',
  '/api/market', // market-backend routes (finance dashboard, bookings, etc.)
  '/api/users',
  '/api/admin',
  '/api/agents',
  '/api/upload',
  '/api/calendar',
];

const DEV_AUTH_USER_ID = process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID || 'mock-1';
const DEV_AUTH_EMAIL = process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL || 'admin@example.com';
const DEV_AUTH_ROLE = process.env.NEXT_PUBLIC_DEV_AUTH_ROLE || 'admin';
const UNITS_API_SOURCE = (
  process.env.NEXT_PUBLIC_UNITS_API_SOURCE ||
  process.env.UNITS_API_SOURCE ||
  ''
).toLowerCase();

function shouldUseBackendFallback(endpoint: string): boolean {
  if (endpoint.startsWith('/api/units')) {
    return UNITS_API_SOURCE !== 'api';
  }
  return BACKEND_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function shouldAttachDevAuth(endpoint: string, method: string): boolean {
  if (method === 'GET' && endpoint.startsWith('/api/units/manage')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/bookings/my')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/bookings/all')) return true;
  if (method === 'PATCH' && endpoint.includes('/api/bookings/') && (endpoint.endsWith('/confirm') || endpoint.endsWith('/decline'))) return true;
  if (method === 'GET' && endpoint.startsWith('/api/agents/me/')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/agents/list')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/market/bookings/my')) return true;
  if (method === 'PATCH' && endpoint.startsWith('/api/units/')) return true;
  // Allow dev-auth for charge types while there's no real login flow.
  if (endpoint.startsWith('/api/charge-types') || endpoint.startsWith('/api/market/charge-types')) return true;
  if (method === 'DELETE' && endpoint.startsWith('/api/units/')) return true;
  if (method === 'PUT' && endpoint.startsWith('/api/units/')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/users')) return true;
  if (method === 'PATCH' && endpoint.startsWith('/api/users/') && !endpoint.endsWith('/')) return true;
  if (endpoint.startsWith('/api/agents/register/')) return true;
  if (endpoint.startsWith('/api/admin/agents/')) return true;
  if (endpoint.startsWith('/api/admin/viewagent')) return true;
  if (endpoint.startsWith('/api/admin/analytics')) return true;
  if (endpoint.startsWith('/api/agents/payouts')) return true;
  if (endpoint.startsWith('/api/admin/payouts')) return true;
  if (endpoint.startsWith('/api/upload')) return true;
  if (endpoint.startsWith('/api/calendar')) return true;
  // Holiday pricing overrides for charge types
  if (endpoint.startsWith('/api/charge-type-date-overrides') || endpoint.startsWith('/api/market/charge-type-date-overrides')) return true;
  return false;
}

function hasExistingAuthHeaders(headers: Record<string, string>): boolean {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );

  return Boolean(
    normalized.authorization ||
      normalized['x-user-id'] ||
      normalized['x-user-email'] ||
      normalized['x-user-role'] ||
      normalized['x-user-roles']
  );
}

/** Client: same-origin by default, with backend fallback for inventory stack. */
function getBaseUrl(endpoint: string): string {
  if (typeof window !== 'undefined') {
    // Keep browser requests same-origin.
    return '';
  }

  // Server-side fetches need absolute URLs. Route backend endpoints to API_URL first, then MARKET_API_URL fallback.
  if (shouldUseBackendFallback(endpoint)) {
    const apiUrl = process.env.API_URL || '';
    if (apiUrl) return apiUrl;
    const marketUrl = process.env.MARKET_API_URL || '';
    if (!marketUrl) throw new Error('API URL is not configured. Set API_URL.');
    return marketUrl;
  }

  const apiUrl = process.env.API_URL || '';
  if (!apiUrl) throw new Error('API URL is not configured. Set API_URL.');
  return apiUrl;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
  /** Override credentials policy when needed. */
  credentials?: RequestCredentials;
  /** Abort the request after this many ms (default 15000). */
  timeoutMs?: number;
};

function isLikelyNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return error.name === 'TypeError' || message.includes('failed to fetch') || message.includes('network');
}

function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    message.includes('aborted') ||
    message.includes('abort') ||
    message.includes('signal is aborted')
  );
}

function isHtmlErrorPage(text: string): boolean {
  const trimmed = text.trimStart();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.length > 50 && trimmed.includes('<html') && trimmed.includes('</body>'))
  );
}

function getUserFriendlyErrorMessage(status: number, rawText: string, payload?: Record<string, unknown>): string {
  const payloadError = typeof payload?.error === 'string' ? payload.error : '';
  if (status === 502) return 'The server is temporarily unavailable. Please try again in a few minutes.';
  if (status === 503 && /MARKET_API_URL|not configured/i.test(payloadError)) {
    return payloadError || 'MARKET_API_URL is not configured.';
  }
  if (status === 503) return 'The service is temporarily unavailable. Please try again later.';
  if (status === 504) return 'The request timed out. Please try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again later.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 401 || status === 403) return 'You don\'t have permission to perform this action.';
  if (isHtmlErrorPage(rawText)) return 'The server is temporarily unavailable. Please try again in a few minutes.';
  // Surface validation error details (422, 400)
  if (payload && (status === 422 || status === 400)) {
    const baseMsg = (payload.message ?? payload.error ?? payload.detail) as string | undefined;
    const extractDetails = (): string[] => {
      const out: string[] = [];
      const errs = payload!.errors ?? payload!.details ?? payload!.validation_errors ?? payload!.validation;
      if (errs && typeof errs === 'object') {
        if (Array.isArray(errs)) {
          errs.forEach((e) => {
            if (typeof e === 'string') out.push(e);
            else if (e && typeof e === 'object' && 'message' in e) out.push(String((e as { message: unknown }).message));
            else if (e && typeof e === 'object' && 'msg' in e) out.push(String((e as { msg: unknown }).msg));
          });
        } else {
          Object.entries(errs as Record<string, unknown>).forEach(([k, v]) => {
            const arr = Array.isArray(v) ? v : [v];
            arr.forEach((m) => out.push(`${k}: ${m}`));
          });
        }
      }
      return out;
    };
    const details = extractDetails();
    if (details.length > 0) return details.slice(0, 3).join('; ');
    if (typeof baseMsg === 'string' && baseMsg.trim()) return baseMsg;
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.warn('[apiClient] Validation error response:', payload);
    }
  }
  return 'Request failed. Please try again.';
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, credentials, timeoutMs, ...rest } = options;
  const baseUrl = getBaseUrl(endpoint);
  const requestMethod = String(rest.method ?? 'GET').toUpperCase();
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;

  const mergedHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(typeof headers === 'object' ? headers as Record<string, string> : {}),
  };
  if (!isFormDataBody) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production' &&
    shouldAttachDevAuth(endpoint, requestMethod) &&
    !hasExistingAuthHeaders(mergedHeaders)
  ) {
    mergedHeaders['x-user-id'] = DEV_AUTH_USER_ID;
    mergedHeaders['x-user-email'] = DEV_AUTH_EMAIL;
    mergedHeaders['x-user-role'] = DEV_AUTH_ROLE;
  }

  const requestInit: RequestInit = {
    ...rest,
    // Use same-origin by default so cross-origin API calls do not require CORS credential headers.
    credentials: credentials ?? (token ? 'omit' : 'same-origin'),
    headers: mergedHeaders,
    ...(body !== undefined
      ? { body: isFormDataBody ? (body as FormData) : JSON.stringify(body) }
      : {}),
  };

  // In browser, route market endpoints through /market-api/* so Next.js proxy (MARKET_API_URL) handles them
  // instead of the catch-all rewrite to API_URL.
  const runtimeEndpoint =
    typeof window !== 'undefined' && shouldUseBackendFallback(endpoint)
      ? `/market-api/${(endpoint.startsWith('/') ? endpoint : `/${endpoint}`)
          .replace(/^\/api\/?/, '')
          .replace(/^\/+/, '')}`
      : endpoint;

  const base = baseUrl.replace(/\/+$/, '');
  const path = runtimeEndpoint.startsWith('/') ? runtimeEndpoint : `/${runtimeEndpoint}`;
  const requestUrl = base ? `${base}${path}` : path;
  const canRetrySameOrigin =
    typeof window !== 'undefined' &&
    shouldUseBackendFallback(endpoint) &&
    baseUrl !== '';

  let res: Response;
  const controller = new AbortController();
  const timeout = typeof timeoutMs === 'number' ? timeoutMs : 30000;
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, Math.max(0, timeout));
  const requestInitWithSignal: RequestInit = { ...requestInit, signal: controller.signal };


  try {
    res = await fetch(requestUrl, requestInitWithSignal);
  } catch (error) {
    if (isAbortLikeError(error)) {
      const err = new Error(
        didTimeout
          ? `Request timed out after ${timeout}ms.`
          : 'Request was cancelled before completion.'
      ) as Error & { status?: number };
      err.name = 'AbortError';
      err.status = 408;
      throw err;
    }

    if (canRetrySameOrigin && isLikelyNetworkFetchError(error)) {
      res = await fetch(endpoint, requestInitWithSignal);
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }

  const raw = await res.text();

  let data: unknown = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!res.ok) {
    const payload = (typeof data === 'object' && data !== null) ? data as Record<string, unknown> : {};
    const rawMessage =
      (typeof payload.error === 'string' && payload.error.trim()) ||
      (typeof payload.message === 'string' && payload.message.trim()) ||
      raw;

    // Use friendly messages for gateway/infrastructure errors (502, 503, 504)
    const useFriendly =
      res.status === 502 || res.status === 503 || res.status === 504 ||
      isHtmlErrorPage(String(rawMessage));
    const message = useFriendly
      ? getUserFriendlyErrorMessage(res.status, raw, payload)
      : (typeof rawMessage === 'string' && rawMessage.length < 500
          ? rawMessage
          : getUserFriendlyErrorMessage(res.status, raw, payload));

    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && isHtmlErrorPage(raw)) {
      console.warn(`[apiClient] ${res.status} HTML error page received (${raw.length} chars). Backend may be down.`);
    }

    const err = new Error(message) as Error & { status?: number; overlapping?: boolean };
    err.status = res.status;
    err.overlapping = payload.overlapping === true;
    throw err;
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body, ...options }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body, ...options }),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body, ...options }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
