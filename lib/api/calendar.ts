import { apiClient } from './client';

export type BlockedRangePayload = {
  start_date: string;
  end_date: string;
  reason: string;
  source?: string;
  guest_name?: string;
  scope: 'global' | 'unit';
  unit_ids?: string[];
};

export type PricingRulePayload = {
  unit_id?: string;
  unit_ids?: string[];
  start_date: string;
  end_date: string;
  name: string;
  adjustmentType?: 'increase' | 'decrease' | string;
  adjustmentMode?: 'percentage' | 'fixed';
  adjustmentPercent?: number;
  adjustmentAmount?: number;
  price?: number;
  percentage?: number;
};

export async function getBlockedRanges(listingId?: string, unitIds?: string[]): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (listingId) params.set('listingId', listingId);
  if (unitIds && unitIds.length > 0) params.set('unit_ids', unitIds.join(','));
  const qs = params.toString();
  if (!qs) return [];
  try {
    const data = await apiClient.get<unknown>(`/api/calendar/blocked-ranges?${qs}`);
    if (Array.isArray(data)) return data;
    const payload = data as { data?: unknown[]; ranges?: unknown[] };
    return payload?.data ?? payload?.ranges ?? [];
  } catch {
    return [];
  }
}

export async function createBlockedRange(payload: BlockedRangePayload): Promise<unknown> {
  return apiClient.post<unknown>('/api/calendar/blocked-ranges', payload);
}

export async function deleteBlockedRange(blockId: string): Promise<void> {
  await apiClient.delete(`/api/calendar/blocked-ranges/${encodeURIComponent(blockId)}`);
}

export async function getPricingRules(listingId?: string, unitIds?: string[]): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (listingId) params.set('listingId', listingId);
  if (unitIds && unitIds.length > 0) params.set('unit_ids', unitIds.join(','));
  const qs = params.toString();
  if (!qs) return [];
  try {
    const data = await apiClient.get<unknown>(`/api/calendar/pricing-rules?${qs}`);
    if (Array.isArray(data)) return data;
    const payload = data as { data?: unknown[]; rules?: unknown[] };
    return payload?.data ?? payload?.rules ?? [];
  } catch {
    return [];
  }
}

export async function createPricingRule(payload: PricingRulePayload): Promise<unknown> {
  return apiClient.post<unknown>('/api/calendar/pricing-rules', payload);
}

export async function deletePricingRule(ruleId: string): Promise<void> {
  await apiClient.delete(`/api/calendar/pricing-rules/${encodeURIComponent(ruleId)}`);
}
