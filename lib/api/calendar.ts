import { apiClient } from './client';

export async function getBlockedRanges(listingId: string): Promise<unknown[]> {
  if (!listingId) return [];
  try {
    const data = await apiClient.get<unknown>(`/api/calendar/blocked-ranges?listingId=${encodeURIComponent(listingId)}`);
    if (Array.isArray(data)) return data;
    const payload = data as { data?: unknown[]; ranges?: unknown[] };
    return payload?.data ?? payload?.ranges ?? [];
  } catch {
    return [];
  }
}

export async function getPricingRules(listingId: string): Promise<unknown[]> {
  if (!listingId) return [];
  try {
    const data = await apiClient.get<unknown>(`/api/calendar/pricing-rules?listingId=${encodeURIComponent(listingId)}`);
    if (Array.isArray(data)) return data;
    const payload = data as { data?: unknown[]; rules?: unknown[] };
    return payload?.data ?? payload?.rules ?? [];
  } catch {
    return [];
  }
}
