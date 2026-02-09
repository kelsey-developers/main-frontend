/**
 * Rewards/points service.
 *
 * When NEXT_PUBLIC_API_URL is not set, uses frontend-only mock data for balance and
 * transaction history. When backend is connected (env set), all data comes from the API;
 * mock data is not used.
 *
 * Booking points formula: Points = 50 + (NumberOfNights × 25)
 */

import type { AgentPointsBalance, PointsTransaction } from '@/types/rewards';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Booking points formula: 50 base + 25 per night (exported for UI/calculations) */
export const BOOKING_POINTS_BASE = 50;
export const BOOKING_POINTS_PER_NIGHT = 25;

/**
 * Calculate points earned from a booking: 50 + (numberOfNights × 25).
 * @param numberOfNights - Number of nights in the booking
 * @returns Points earned for that booking
 */
export function calculateBookingPoints(numberOfNights: number): number {
  return BOOKING_POINTS_BASE + numberOfNights * BOOKING_POINTS_PER_NIGHT;
}

/**
 * Frontend-only mock balance.
 * Recent 5 items show 550 earned (4 short stays) and 1,000 redeemed; rest of 5,000 is from older activity.
 */
const MOCK_BALANCE: AgentPointsBalance = {
  agentId: 'mock-1',
  totalPoints: 5000,
  updatedAt: new Date().toISOString(),
};

/**
 * Mock transaction history: 20 items for Activity modal scroll (mix of bookings + redemptions).
 * Frontend-only; backend will supply real history later.
 */
const MOCK_TRANSACTIONS: PointsTransaction[] = [
  { id: 'tx-1', agentId: 'mock-1', points: calculateBookingPoints(3), type: 'booking', description: 'Points from booking #BK-1024', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-1024' },
  { id: 'tx-2', agentId: 'mock-1', points: calculateBookingPoints(2), type: 'booking', description: 'Points from booking #BK-0987', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0987' },
  { id: 'tx-3', agentId: 'mock-1', points: -1000, type: 'redemption', description: '₱500 Cash', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'issued' },
  { id: 'tx-4', agentId: 'mock-1', points: calculateBookingPoints(5), type: 'booking', description: 'Points from booking #BK-0912', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0912' },
  { id: 'tx-5', agentId: 'mock-1', points: calculateBookingPoints(4), type: 'booking', description: 'Points from booking #BK-0801', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0801' },
  { id: 'tx-6', agentId: 'mock-1', points: calculateBookingPoints(3), type: 'booking', description: 'Points from booking #BK-0777', createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0777' },
  { id: 'tx-7', agentId: 'mock-1', points: -1000, type: 'redemption', description: '₱500 Cash', createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
  { id: 'tx-8', agentId: 'mock-1', points: calculateBookingPoints(2), type: 'booking', description: 'Points from booking #BK-0701', createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0701' },
  { id: 'tx-9', agentId: 'mock-1', points: -1000, type: 'redemption', description: '₱500 Cash', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), status: 'rejected' },
  { id: 'tx-10', agentId: 'mock-1', points: calculateBookingPoints(4), type: 'booking', description: 'Points from booking #BK-0650', createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0650' },
  { id: 'tx-11', agentId: 'mock-1', points: calculateBookingPoints(2), type: 'booking', description: 'Points from booking #BK-0620', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0620' },
  { id: 'tx-12', agentId: 'mock-1', points: -2000, type: 'redemption', description: 'Tumbler', createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(), status: 'issued' },
  { id: 'tx-13', agentId: 'mock-1', points: calculateBookingPoints(5), type: 'booking', description: 'Points from booking #BK-0588', createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0588' },
  { id: 'tx-14', agentId: 'mock-1', points: calculateBookingPoints(3), type: 'booking', description: 'Points from booking #BK-0555', createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0555' },
  { id: 'tx-15', agentId: 'mock-1', points: -1000, type: 'redemption', description: '₱500 Cash', createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), status: 'approved' },
  { id: 'tx-16', agentId: 'mock-1', points: calculateBookingPoints(4), type: 'booking', description: 'Points from booking #BK-0510', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0510' },
  { id: 'tx-17', agentId: 'mock-1', points: calculateBookingPoints(2), type: 'booking', description: 'Points from booking #BK-0492', createdAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0492' },
  { id: 'tx-18', agentId: 'mock-1', points: calculateBookingPoints(3), type: 'booking', description: 'Points from booking #BK-0460', createdAt: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0460' },
  { id: 'tx-19', agentId: 'mock-1', points: -1000, type: 'redemption', description: 'Rice (5kg)', createdAt: new Date(Date.now() - 39 * 24 * 60 * 60 * 1000).toISOString(), status: 'issued' },
  { id: 'tx-20', agentId: 'mock-1', points: calculateBookingPoints(5), type: 'booking', description: 'Points from booking #BK-0401', createdAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(), referenceId: 'BK-0401' },
];

/**
 * Fetch agent points balance. Returns mock data only when NEXT_PUBLIC_API_URL is unset; otherwise calls backend.
 */
export async function getAgentPointsBalance(
  agentId: string
): Promise<AgentPointsBalance> {
  if (!API_BASE) {
    return { ...MOCK_BALANCE, agentId };
  }
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/points`);
  if (!res.ok) throw new Error('Failed to fetch points balance');
  return res.json();
}

/** Max items returned for Activity history (frontend mock and API cap) */
export const POINTS_HISTORY_MAX_LIMIT = 20;

/**
 * Fetch points transaction history. Returns mock data only when NEXT_PUBLIC_API_URL is unset; otherwise calls backend.
 * Limit is capped at POINTS_HISTORY_MAX_LIMIT. Backend should return transactions ordered by createdAt descending (newest first).
 */
export async function getPointsHistory(
  agentId: string,
  limit = POINTS_HISTORY_MAX_LIMIT
): Promise<PointsTransaction[]> {
  const cappedLimit = Math.min(limit, POINTS_HISTORY_MAX_LIMIT);
  if (!API_BASE) {
    const sorted = [...MOCK_TRANSACTIONS].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, cappedLimit);
  }
  const res = await fetch(
    `${API_BASE}/api/agents/${agentId}/points/history?limit=${cappedLimit}`
  );
  if (!res.ok) throw new Error('Failed to fetch points history');
  const data = await res.json();
  return data.transactions ?? [];
}
