import type { BlockedRange, PricingRule } from '@/types/booking';

function toDateOnly(value: string): Date | null {
  if (!value) return null;
  const datePart = value.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function normalizeBlockedRange(raw: any): BlockedRange {
  const start = String(raw?.start_date ?? raw?.startDate ?? '');
  const end = String(raw?.end_date ?? raw?.endDate ?? '');

  return {
    start_date: start,
    end_date: end,
    listing_id: raw?.listing_id ? String(raw.listing_id) : undefined,
    reason: raw?.reason ? String(raw.reason) : undefined,
    created_at: raw?.created_at ? String(raw.created_at) : undefined,
  };
}

function normalizePricingRule(raw: any): PricingRule {
  return {
    start_date: String(raw?.start_date ?? raw?.startDate ?? ''),
    end_date: String(raw?.end_date ?? raw?.endDate ?? ''),
    price: Number(raw?.price ?? 0),
    listing_id: raw?.listing_id ? String(raw.listing_id) : undefined,
    created_at: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
  };
}

function extractArrayPayload<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.ranges)) return payload.ranges;
  if (Array.isArray(payload?.rules)) return payload.rules;
  return [];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data as T;
}

export const CalendarService = {
  async getBlockedRanges(listingId: string): Promise<BlockedRange[]> {
    if (!listingId) return [];

    try {
      const payload = await fetchJson<any>(
        `/api/calendar/blocked-ranges?listingId=${encodeURIComponent(listingId)}`
      );

      return extractArrayPayload<any>(payload)
        .map(normalizeBlockedRange)
        .filter((range) => !!range.start_date && !!range.end_date);
    } catch {
      return [];
    }
  },

  async getPricingRules(listingId: string): Promise<PricingRule[]> {
    if (!listingId) return [];

    try {
      const payload = await fetchJson<any>(
        `/api/calendar/pricing-rules?listingId=${encodeURIComponent(listingId)}`
      );

      return extractArrayPayload<any>(payload)
        .map(normalizePricingRule)
        .filter((rule) => !!rule.start_date && !!rule.end_date);
    } catch {
      return [];
    }
  },

  async isDateRangeBlocked(
    listingId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<boolean> {
    if (!listingId || !checkInDate || !checkOutDate) return false;

    const requestStart = toDateOnly(checkInDate);
    const requestEndExclusive = toDateOnly(checkOutDate);

    if (!requestStart || !requestEndExclusive) return false;
    if (requestEndExclusive.getTime() <= requestStart.getTime()) return false;

    const requestEnd = new Date(requestEndExclusive);
    requestEnd.setDate(requestEnd.getDate() - 1);

    const [listingRanges, globalRanges] = await Promise.all([
      this.getBlockedRanges(listingId),
      this.getBlockedRanges('global'),
    ]);

    const allRanges = [...listingRanges, ...globalRanges];

    return allRanges.some((range) => {
      const blockedStart = toDateOnly(range.start_date);
      const blockedEnd = toDateOnly(range.end_date);
      if (!blockedStart || !blockedEnd) return false;

      return blockedStart.getTime() <= requestEnd.getTime() && blockedEnd.getTime() >= requestStart.getTime();
    });
  },
};
