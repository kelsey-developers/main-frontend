/**
 * Payout Service — fetches from payout_withdrawal table via auth backend.
 * /admin/payouts — all payouts; /agent/payouts — current agent's payouts.
 */

import type { Payout, PayoutStatus, PayoutMethod } from '@/types/payout';
import * as payoutsApi from '@/lib/api/payouts';

export async function getAgentPayouts(_agentId?: string): Promise<Payout[]> {
  return payoutsApi.getAgentPayouts();
}

export async function requestPayout(data: {
  agentId: string;
  amount: number;
  method: PayoutMethod;
  recipientNumber?: string;
  recipientName?: string;
  bankName?: string;
  accountNumber?: string;
}): Promise<Payout> {
  return payoutsApi.requestPayout({
    amount: data.amount,
    method: data.method,
    recipientNumber: data.recipientNumber,
    recipientName: data.recipientName,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
  });
}

/** Admin: get all payout requests from payout_withdrawal */
export async function getAllPayouts(filters?: { status?: PayoutStatus; agentId?: string }): Promise<Payout[]> {
  return payoutsApi.getAllPayouts(filters);
}

/** Admin: decline payout (refunds balance) */
export async function markPayoutDeclined(payoutId: string, notes?: string): Promise<Payout> {
  return payoutsApi.markPayoutDeclined(payoutId, notes);
}

/** Admin: mark payout as paid (with optional proof URL or proof file) */
export async function markPayoutPaid(
  payoutId: string,
  proofUrl?: string,
  notes?: string,
  proofFile?: File
): Promise<Payout> {
  return payoutsApi.markPayoutPaid(payoutId, {
    proofOfPaymentUrl: proofUrl,
    notes,
    proofFile,
  });
}
