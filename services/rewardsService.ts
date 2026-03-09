/**
 * Rewards/points service.
 *
 * Calls /api/rewards/me (proxied to rewards backend). Throws when fetch fails.
 *
 * Booking points formula: Points = 50 + (NumberOfNights × 25)
 */

import type { AgentPointsBalance, PointsTransaction } from '@/types/rewards';

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

/** API response shape from /api/rewards/me */
interface RewardsApiResponse {
  agentId: string;
  totalPoints: number;
  updatedAt: string;
  walletId?: number;
  recentActivity?: PointsTransaction[];
}

/** Map backend redemption_status to frontend status */
function mapRedemptionStatus(status: string | null): 'pending' | 'approved' | 'issued' | 'rejected' | undefined {
  if (!status) return undefined;
  if (status === 'requested') return 'pending';
  if (status === 'approved' || status === 'issued' || status === 'rejected') return status;
  return undefined;
}

/** Fetch rewards data from API (balance + recent activity). Returns null if API unavailable or error. */
async function fetchRewardsFromApi(): Promise<RewardsApiResponse | null> {
  try {
    const res = await fetch('/api/rewards/me', { credentials: 'include' });
    if (res.status === 503 || res.status === 401) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (data.recentActivity) {
      data.recentActivity = data.recentActivity.map((tx: PointsTransaction & { status?: string }) => ({
        ...tx,
        status: tx.status ? mapRedemptionStatus(tx.status) : undefined,
      }));
    }
    return data;
  } catch {
    return null;
  }
}

const MAINTENANCE_MESSAGE = 'Rewards is currently under maintenance.';

/**
 * Fetch rewards data (balance + recent activity) in a single request.
 * Throws with MAINTENANCE_MESSAGE when API fails.
 */
export async function getRewardsData(): Promise<{
  balance: AgentPointsBalance;
  transactions: PointsTransaction[];
}> {
  const data = await fetchRewardsFromApi();
  if (data) {
    return {
      balance: {
        agentId: data.agentId,
        totalPoints: data.totalPoints,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(data.updatedAt).toISOString(),
      },
      transactions: data.recentActivity ?? [],
    };
  }
  throw new Error(MAINTENANCE_MESSAGE);
}

/**
 * Fetch agent points balance. Throws when API fails.
 * @param _agentId - Ignored; rewards API uses Bearer token to identify user.
 */
export async function getAgentPointsBalance(
  _agentId?: string
): Promise<AgentPointsBalance> {
  const { balance } = await getRewardsData();
  return _agentId ? { ...balance, agentId: _agentId } : balance;
}

/** Max items returned for Activity history (frontend mock and API cap) */
export const POINTS_HISTORY_MAX_LIMIT = 20;

/**
 * Fetch points transaction history. Throws when API fails.
 * @param _agentId - Ignored; rewards API uses Bearer token to identify user.
 */
export async function getPointsHistory(
  _agentId?: string,
  limit = POINTS_HISTORY_MAX_LIMIT
): Promise<PointsTransaction[]> {
  const cappedLimit = Math.min(limit, POINTS_HISTORY_MAX_LIMIT);
  const { transactions } = await getRewardsData();
  return transactions.slice(0, cappedLimit);
}
