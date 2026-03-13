/**
 * Commission types for Agent Point Management System.
 * Kelsey's Homestay — Integrated Information Management System
 *
 * Commission computation:
 *   commissionAmount = (baseAmount + extraCharges) × (commissionRate / 100)
 */

export type CommissionStatus = 'pending' | 'approved' | 'available' | 'paid' | 'cancelled';

export interface BookingCommission {
  id: string;
  bookingId: string;
  bookingRef: string; // e.g. "BK-1024"
  agentId: string;
  referralCode: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  numberOfNights: number;
  numberOfGuests: number;
  baseAmount: number; // room rate × nights
  extraCharges: number; // extra heads, cleaning fee, add-ons
  totalBookingAmount: number; // baseAmount + extraCharges
  commissionRate: number; // % applied (e.g. 10 for 10%)
  commissionAmount: number; // computed: totalBookingAmount × (commissionRate / 100)
  /**
   * Absolute level in the network tree:
   *   1 = the viewing agent themselves (direct booking via own code)
   *   2 = a direct sub-agent's booking  → earns L1 referral commission (5%)
   *   3 = a sub-sub-agent's booking     → earns L2 referral commission (2%)
   * Display as: 1→"Direct", 2→"L1 Referral", 3→"L2 Referral"
   */
  referralLevel: 1 | 2 | 3;
  /** The agent whose referral code was used for the booking (undefined for own direct bookings) */
  referralAgentId?: string;
  referralAgentName?: string;
  status: CommissionStatus;
  createdAt: string; // ISO
  approvedAt?: string; // ISO — when admin approved
  paidAt?: string; // ISO — when payment was released
}

export interface CommissionWallet {
  agentId: string;
  pending: number; // bookings not yet admin-approved
  approved: number; // admin approved, awaiting payment
  available: number; // approved and cleared, ready to withdraw
  paid: number; // lifetime total paid out
  updatedAt: string; // ISO
}

export interface CommissionSummary {
  totalThisMonth: number;
  totalAllTime: number;
  pendingCount: number;
  approvedCount: number;
}
