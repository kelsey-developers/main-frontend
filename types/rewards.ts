/**
 * Reward and point system types for agents.
 * Backend can replace mock implementation with API calls using these types.
 *
 * Booking points formula: Points = 50 + (NumberOfNights × 25)
 */

export interface AgentPointsBalance {
  agentId: string;
  totalPoints: number;
  updatedAt: string; // ISO
}

export interface PointsTransaction {
  id: string;
  agentId: string;
  points: number; // positive = earned, negative = redeemed
  type: 'booking' | 'bonus' | 'redemption' | 'adjustment';
  description: string;
  createdAt: string; // ISO
  referenceId?: string; // e.g. booking id
  /** For redemptions: pending → approved → issued; or rejected (points refunded). Omit for non-redemption. */
  status?: 'pending' | 'approved' | 'issued' | 'rejected';
}
