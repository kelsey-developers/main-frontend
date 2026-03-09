import type { BlockedRange, PricingRule } from '@/types/booking';
import { getBlockedRanges as getBlockedRangesApi, getPricingRules as getPricingRulesApi } from '@/lib/api/calendar';

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

export const CalendarService = {
  async getBlockedRanges(listingId: string): Promise<BlockedRange[]> {
    if (!listingId) return [];

    try {
      const payload = await getBlockedRangesApi(listingId);
      return (Array.isArray(payload) ? payload : [])
        .map(normalizeBlockedRange)
        .filter((range) => !!range.start_date && !!range.end_date);
    } catch {
      return [];
    }
  },

  async getPricingRules(listingId: string): Promise<PricingRule[]> {
    if (!listingId) return [];

    try {
      const payload = await getPricingRulesApi(listingId);
      return (Array.isArray(payload) ? payload : [])
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
