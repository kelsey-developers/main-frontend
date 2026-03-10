const BACKEND_ENDPOINT_PREFIXES = [
  '/api/inventory',
  '/api/products',
  '/api/suppliers',
  '/api/purchase-orders',
  '/api/product-categories',
  '/api/units',
  '/api/bookings',
];

const DEV_AUTH_USER_ID = process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID || 'mock-1';
const DEV_AUTH_EMAIL = process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL || 'admin@example.com';
const DEV_AUTH_ROLE = process.env.NEXT_PUBLIC_DEV_AUTH_ROLE || 'admin';

function shouldUseBackendFallback(endpoint: string): boolean {
  return BACKEND_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function shouldAttachDevAuth(endpoint: string, method: string): boolean {
  if (method === 'GET' && endpoint.startsWith('/api/units/manage')) return true;
  if (method === 'GET' && endpoint.startsWith('/api/bookings/my')) return true;
  if (method === 'PATCH' && endpoint.startsWith('/api/units/')) return true;
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

/** Client: same-origin by default, with backend fallback for inventory stack. Server: API_URL or localhost fallback. */
function getBaseUrl(endpoint: string): string {
  const configuredServerUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';

  if (typeof window !== 'undefined') {
    if (shouldUseBackendFallback(endpoint)) {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    }

    return '';
  }

  return configuredServerUrl || 'http://localhost:4000';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
  /** Override credentials policy when needed. */
  credentials?: RequestCredentials;
};

function isLikelyNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return error.name === 'TypeError' || message.includes('failed to fetch') || message.includes('network');
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, credentials, ...rest } = options;
  const baseUrl = getBaseUrl(endpoint);
  const requestMethod = String(rest.method ?? 'GET').toUpperCase();

  if (!baseUrl && typeof window === 'undefined') {
    throw new Error('API URL is not configured. Set API_URL.');
  }

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(typeof headers === 'object' ? headers as Record<string, string> : {}),
  };

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
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const requestUrl = `${baseUrl}${endpoint}`;
  const canRetrySameOrigin =
    typeof window !== 'undefined' &&
    shouldUseBackendFallback(endpoint) &&
    baseUrl !== '';

  let res: Response;

  try {
    res = await fetch(requestUrl, requestInit);
  } catch (error) {
    if (canRetrySameOrigin && isLikelyNetworkFetchError(error)) {
      res = await fetch(endpoint, requestInit);
    } else {
      throw error;
    }
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
    const message =
      (typeof payload.error === 'string' && payload.error.trim()) ||
      (typeof payload.message === 'string' && payload.message.trim()) ||
      `Request failed with status ${res.status}`;

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
};
