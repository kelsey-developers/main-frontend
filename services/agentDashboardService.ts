/**
 * Agent Dashboard Service — Kelsey's Homestay Agent Hub
 *
 * Provides summary stats, top-agent leaderboards, and analytics.
 * When NEXT_PUBLIC_API_URL is not set, returns frontend-only mock data.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface TopAgent {
  agentId: string;
  agentName: string;
  avatarUrl?: string;
  referralCode: string;
  totalCommissions: number;
  totalBookings: number;
  activeSubAgents: number;
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalCommissionsPaid: number;
  totalCommissionsPending: number;
  topAgents: TopAgent[];
  monthlyCommissionData: { month: string; amount: number }[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ANALYTICS: AgentAnalytics = {
  totalAgents: 8,
  activeAgents: 7,
  totalCommissionsPaid: 38450,
  totalCommissionsPending: 5640,
  topAgents: [
    {
      agentId: 'agent-001', agentName: 'Juan Dela Cruz',
      referralCode: 'JUAN2025', totalCommissions: 18940, totalBookings: 24, activeSubAgents: 5,
    },
    {
      agentId: 'agent-002', agentName: 'Maria Santos',
      referralCode: 'MARIA2025', totalCommissions: 5420, totalBookings: 11, activeSubAgents: 2,
    },
    {
      agentId: 'agent-003', agentName: 'Roberto Cruz',
      referralCode: 'ROBERTO2025', totalCommissions: 3870, totalBookings: 8, activeSubAgents: 1,
    },
    {
      agentId: 'agent-004', agentName: 'Pedro Flores',
      referralCode: 'PEDRO2025', totalCommissions: 2180, totalBookings: 6, activeSubAgents: 1,
    },
    {
      agentId: 'agent-005', agentName: 'Ana Reyes',
      referralCode: 'ANA2025', totalCommissions: 1240, totalBookings: 4, activeSubAgents: 0,
    },
  ],
  monthlyCommissionData: [
    { month: 'Sep', amount: 3200 },
    { month: 'Oct', amount: 5800 },
    { month: 'Nov', amount: 4100 },
    { month: 'Dec', amount: 7900 },
    { month: 'Jan', amount: 5200 },
    { month: 'Feb', amount: 6450 },
    { month: 'Mar', amount: 5800 },
  ],
};

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getAgentAnalytics(): Promise<AgentAnalytics> {
  if (!API_BASE) return { ...MOCK_ANALYTICS };
  const res = await fetch(`${API_BASE}/api/admin/agents/analytics`);
  if (!res.ok) throw new Error('Failed to fetch agent analytics');
  return res.json();
}

export interface AgentOverviewStats {
  wallet: { available: number; pending: number; approved: number; paid: number };
  recentBookingsCount: number;
  networkSize: number;
  thisMonthCommissions: number;
  monthlyEarnings: { month: string; amount: number }[];
}

const MOCK_OVERVIEW: AgentOverviewStats = {
  wallet: { available: 3690, pending: 824, approved: 1360, paid: 10770 },
  recentBookingsCount: 12,
  networkSize: 7,
  thisMonthCommissions: 4530,
  monthlyEarnings: [
    { month: 'Oct', amount: 2100 },
    { month: 'Nov', amount: 1800 },
    { month: 'Dec', amount: 3500 },
    { month: 'Jan', amount: 2900 },
    { month: 'Feb', amount: 4100 },
    { month: 'Mar', amount: 4530 },
  ],
};

export async function getAgentOverviewStats(agentId: string): Promise<AgentOverviewStats> {
  if (!API_BASE) return { ...MOCK_OVERVIEW };
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/overview`);
  if (!res.ok) throw new Error('Failed to fetch agent overview');
  return res.json();
}
