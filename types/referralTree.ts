/**
 * Referral tree types for Agent Point Management System.
 * Kelsey's Homestay — Integrated Information Management System
 *
 * Tree structure: Agent (L1) → Sub-Agent (L2) → Sub-Sub-Agent (L3)
 * Commission flows up: a booking by L3 earns commission for L3, L2, and L1.
 */

export interface ReferralNode {
  agentId: string;
  agentName: string;
  email: string;
  avatarUrl?: string;
  referralCode: string;
  level: 0 | 1 | 2 | 3;
  status: 'active' | 'inactive';
  joinedAt: string; // ISO
  totalCommissionsEarned: number; // ₱ lifetime
  totalBookings: number;
  children: ReferralNode[]; // next-level sub-agents
}

export interface ReferralStats {
  totalSubAgents: number;
  activeSubAgents: number;
  totalNetworkCommissions: number; // sum across all levels
  networkBookings: number;
}

export interface PendingRegistration {
  id: string;
  fullname: string;
  email: string;
  contactNumber: string;
  recruitedById?: string; // parent agent id
  recruitedByName?: string;
  registrationFeeStatus: 'unpaid' | 'paid';
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string; // ISO
  notes?: string;
  /** URL to proof of payment (e.g. receipt image or document) */
  proofOfPaymentUrl?: string;
}
