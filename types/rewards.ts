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

/** Payment method for cash redemptions (e-wallet or bank transfer). */
export type CashPaymentMethod = 'gcash' | 'paymaya' | 'bank_transfer';

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
  /** Cash redemption only: how the agent receives the cash */
  paymentMethod?: CashPaymentMethod;
  /** Cash redemption only: recipient mobile/account number (e.g. GCash number) */
  recipientNumber?: string;
  /** Cash redemption only: recipient full name */
  recipientName?: string;
  /** Staycation redemption only: preferred date(s) — e.g. "Dec 25-26, 2025" or specific dates */
  preferredDates?: string;
}
