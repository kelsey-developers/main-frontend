/**
 * Payroll API base URL. Uses the Next.js proxy which forwards to PAYROLL_API_URL
 * and adds the auth token from the accessToken cookie.
 */
export const PAYROLL_API_BASE = '/api/payroll-proxy';

export function payrollFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, credentials: 'include' });
}
