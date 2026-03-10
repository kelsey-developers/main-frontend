/**
 * Payout types for Agent Point Management System.
 * Kelsey's Homestay — Integrated Information Management System
 */

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type PayoutMethod = 'gcash' | 'maya' | 'bank_transfer';

export interface Payout {
  id: string;
  agentId: string;
  agentName: string;
  amount: number;
  method: PayoutMethod;
  recipientNumber?: string; // GCash/Maya number
  recipientName?: string; // account name
  bankName?: string; // for bank_transfer
  accountNumber?: string; // for bank_transfer
  status: PayoutStatus;
  proofOfPaymentUrl?: string; // uploaded file URL after admin marks paid
  notes?: string; // admin or agent notes
  requestedAt: string; // ISO
  processedAt?: string; // ISO — when paid/failed
}

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
};
