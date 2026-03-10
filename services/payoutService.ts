/**
 * Payout Service — Kelsey's Homestay Agent Hub
 *
 * When NEXT_PUBLIC_API_URL is not set, returns frontend-only mock data.
 * When set, calls backend API.
 */

import type { Payout, PayoutStatus, PayoutMethod } from '@/types/payout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const now = Date.now();
const d = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

const MOCK_PAYOUTS: Payout[] = [
  {
    id: 'pay-001', agentId: 'agent-001', agentName: 'Juan Dela Cruz',
    amount: 5000, method: 'gcash', recipientNumber: '09171234567',
    recipientName: 'Juan Dela Cruz', status: 'paid',
    proofOfPaymentUrl: '/mock-proof.png',
    requestedAt: d(30), processedAt: d(28),
  },
  {
    id: 'pay-002', agentId: 'agent-001', agentName: 'Juan Dela Cruz',
    amount: 3500, method: 'maya', recipientNumber: '09281234567',
    recipientName: 'Juan Dela Cruz', status: 'paid',
    proofOfPaymentUrl: '/mock-proof.png',
    requestedAt: d(20), processedAt: d(18),
  },
  {
    id: 'pay-003', agentId: 'agent-001', agentName: 'Juan Dela Cruz',
    amount: 2700, method: 'gcash', recipientNumber: '09171234567',
    recipientName: 'Juan Dela Cruz', status: 'processing',
    requestedAt: d(5),
  },
  {
    id: 'pay-004', agentId: 'agent-001', agentName: 'Juan Dela Cruz',
    amount: 840, method: 'bank_transfer',
    bankName: 'BDO', accountNumber: '1234567890',
    recipientName: 'Juan Dela Cruz', status: 'pending',
    requestedAt: d(1),
  },
  // Other agents for admin view
  {
    id: 'pay-005', agentId: 'agent-002', agentName: 'Maria Santos',
    amount: 4200, method: 'gcash', recipientNumber: '09191234567',
    recipientName: 'Maria Santos', status: 'paid',
    proofOfPaymentUrl: '/mock-proof.png',
    requestedAt: d(25), processedAt: d(23),
  },
  {
    id: 'pay-006', agentId: 'agent-003', agentName: 'Roberto Cruz',
    amount: 1800, method: 'maya', recipientNumber: '09251234567',
    recipientName: 'Roberto Cruz', status: 'pending',
    requestedAt: d(3),
  },
  {
    id: 'pay-007', agentId: 'agent-002', agentName: 'Maria Santos',
    amount: 3100, method: 'gcash', recipientNumber: '09191234567',
    recipientName: 'Maria Santos', status: 'processing',
    requestedAt: d(7),
  },
  {
    id: 'pay-008', agentId: 'agent-004', agentName: 'Pedro Flores',
    amount: 2200, method: 'bank_transfer',
    bankName: 'BPI', accountNumber: '9876543210',
    recipientName: 'Pedro Flores', status: 'failed',
    notes: 'Invalid account number. Please resubmit.',
    requestedAt: d(10), processedAt: d(9),
  },
  {
    id: 'pay-009', agentId: 'agent-001', agentName: 'Juan Dela Cruz',
    amount: 7200, method: 'gcash', recipientNumber: '09171234567',
    recipientName: 'Juan Dela Cruz', status: 'paid',
    proofOfPaymentUrl: '/mock-proof.png',
    requestedAt: d(60), processedAt: d(58),
  },
  {
    id: 'pay-010', agentId: 'agent-003', agentName: 'Roberto Cruz',
    amount: 950, method: 'maya', recipientNumber: '09251234567',
    recipientName: 'Roberto Cruz', status: 'paid',
    proofOfPaymentUrl: '/mock-proof.png',
    requestedAt: d(45), processedAt: d(44),
  },
];

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getAgentPayouts(agentId: string): Promise<Payout[]> {
  if (!API_BASE) {
    return MOCK_PAYOUTS.filter((p) => p.agentId === agentId)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/payouts`);
  if (!res.ok) throw new Error('Failed to fetch payouts');
  return res.json();
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
  if (!API_BASE) {
    const newPayout: Payout = {
      id: `pay-${Date.now()}`,
      agentName: 'Juan Dela Cruz',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      ...data,
    };
    return newPayout;
  }
  const res = await fetch(`${API_BASE}/api/agents/${data.agentId}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to request payout');
  return res.json();
}

/** Admin: get all payout requests */
export async function getAllPayouts(filters?: { status?: PayoutStatus; agentId?: string }): Promise<Payout[]> {
  if (!API_BASE) {
    let data = [...MOCK_PAYOUTS];
    if (filters?.status) data = data.filter((p) => p.status === filters.status);
    if (filters?.agentId) data = data.filter((p) => p.agentId === filters.agentId);
    return data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }
  const params = new URLSearchParams(filters as Record<string, string>);
  const res = await fetch(`${API_BASE}/api/admin/payouts?${params}`);
  if (!res.ok) throw new Error('Failed to fetch all payouts');
  return res.json();
}

/** Admin: update payout status (processing / paid / failed) */
export async function updatePayoutStatus(
  payoutId: string,
  status: PayoutStatus,
  proofUrl?: string,
  notes?: string
): Promise<Payout> {
  if (!API_BASE) {
    const payout = MOCK_PAYOUTS.find((p) => p.id === payoutId);
    if (!payout) throw new Error('Payout not found');
    return {
      ...payout,
      status,
      proofOfPaymentUrl: proofUrl ?? payout.proofOfPaymentUrl,
      notes: notes ?? payout.notes,
      processedAt: ['paid', 'failed'].includes(status) ? new Date().toISOString() : payout.processedAt,
    };
  }
  const res = await fetch(`${API_BASE}/api/admin/payouts/${payoutId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, proofOfPaymentUrl: proofUrl, notes }),
  });
  if (!res.ok) throw new Error('Failed to update payout');
  return res.json();
}
