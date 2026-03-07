/**
 * Types for Agent Registration & Referral Tree admin module.
 * Kelsey's Homestay – Integrated Information Management System
 */

export type ReferralMode = 'basic' | 'extended';

export type AgentStatus = 'active' | 'inactive';

export interface CommissionLevels {
  level1: number;
  level2?: number;
  level3?: number;
}

export interface AgentRegistrationConfig {
  registrationFee: number;
  registrationEnabled: boolean;
  referralMode: ReferralMode;
  maxReferralLevel: number;
  commissions: CommissionLevels;
}

export interface AgentWithStatus {
  id: string;
  fullname: string;
  email: string;
  contact_number?: string;
  role: string;
  status: AgentStatus;
  created_at?: string;
  profile_photo?: string;
}
