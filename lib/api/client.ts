/** Client: same-origin /api (rewrites proxy to backend). Server: API_URL. */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.API_URL || '';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
  /** Include cookies (for auth). Use when calling from client. */
  credentials?: RequestCredentials;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, credentials, ...rest } = options;
  const baseUrl = getBaseUrl();

  if (!baseUrl && typeof window === 'undefined') {
    throw new Error('API URL is not configured. Set API_URL.');
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...rest,
    credentials: credentials ?? (token ? 'omit' : 'include'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(typeof headers === 'object' ? headers : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'An unexpected error occurred') as Error & { status?: number; overlapping?: boolean };
    err.status = res.status;
    err.overlapping = (data as { overlapping?: boolean }).overlapping === true;
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
