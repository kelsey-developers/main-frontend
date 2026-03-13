import { apiClient } from './client';
import { uploadProofFile } from './upload';
import type { Payout, PayoutStatus, PayoutMethod } from '@/types/payout';

export async function getAgentPayouts(): Promise<Payout[]> {
  return apiClient.get<Payout[]>('/api/agents/payouts');
}

export async function requestPayout(body: {
  amount: number;
  method: PayoutMethod;
  recipientNumber?: string;
  recipientName?: string;
  bankName?: string;
  accountNumber?: string;
}): Promise<Payout> {
  return apiClient.post<Payout>('/api/agents/payouts', body);
}

export async function getAllPayouts(filters?: { status?: PayoutStatus; agentId?: string }): Promise<Payout[]> {
  const params = new URLSearchParams(filters as Record<string, string>);
  const q = params.toString();
  return apiClient.get<Payout[]>(`/api/admin/payouts${q ? `?${q}` : ''}`);
}

export async function markPayoutDeclined(payoutId: string, notes?: string): Promise<Payout> {
  return apiClient.patch<Payout>(`/api/admin/payouts/${payoutId}/decline`, { notes });
}

export async function markPayoutPaid(
  payoutId: string,
  options?: { proofOfPaymentUrl?: string; notes?: string; proofFile?: File }
): Promise<Payout> {
  let proofOfPaymentUrl = options?.proofOfPaymentUrl;
  if (options?.proofFile) {
    proofOfPaymentUrl = await uploadProofFile(options.proofFile);
  }
  return apiClient.patch<Payout>(`/api/admin/payouts/${payoutId}`, {
    proofOfPaymentUrl,
    notes: options?.notes,
  });
}
