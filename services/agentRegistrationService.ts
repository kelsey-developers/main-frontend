/**
 * Agent Registration & Referral Tree service.
 * When NEXT_PUBLIC_API_URL is not set, uses frontend-only mock data.
 * When set, calls backend for config and agent list.
 */

import type {
  AgentRegistrationConfig,
  AgentWithStatus,
  CommissionLevels,
} from '@/app/admin/agent-registration/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const MOCK_CONFIG: AgentRegistrationConfig = {
  registrationFee: 500,
  registrationEnabled: true,
  referralMode: 'basic',
  maxReferralLevel: 1,
  commissions: { level1: 10 },
};

const MOCK_AGENTS: AgentWithStatus[] = [
  {
    id: '1',
    fullname: 'James Wilson',
    email: 'james.wilson@example.com',
    contact_number: '+63 934 567 8901',
    role: 'agent',
    status: 'active',
    created_at: '2025-02-05T09:15:00Z',
  },
  {
    id: '2',
    fullname: 'Robert Brown',
    email: 'robert.brown@example.com',
    contact_number: '+63 956 789 0123',
    role: 'agent',
    status: 'active',
    created_at: '2025-02-10T16:20:00Z',
  },
  {
    id: '3',
    fullname: 'Anna Martinez',
    email: 'anna.martinez@example.com',
    contact_number: '+63 978 901 2345',
    role: 'agent',
    status: 'inactive',
    created_at: '2025-01-20T11:00:00Z',
  },
];

/**
 * Fetch agent registration & referral configuration.
 */
export async function getAgentRegistrationConfig(): Promise<AgentRegistrationConfig> {
  if (!API_BASE) {
    return Promise.resolve({ ...MOCK_CONFIG });
  }
  const res = await fetch(`${API_BASE}/api/admin/agent-registration/config`);
  if (!res.ok) throw new Error('Failed to fetch agent registration config');
  return res.json();
}

/**
 * Save agent registration & referral configuration.
 */
export async function saveAgentRegistrationConfig(
  config: AgentRegistrationConfig
): Promise<AgentRegistrationConfig> {
  if (!API_BASE) {
    return Promise.resolve({ ...config });
  }
  const res = await fetch(`${API_BASE}/api/admin/agent-registration/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to save agent registration config');
  return res.json();
}

/**
 * Fetch agents list (with status) for admin management.
 */
export async function getAgentsWithStatus(): Promise<AgentWithStatus[]> {
  if (!API_BASE) {
    return Promise.resolve([...MOCK_AGENTS]);
  }
  const res = await fetch(`${API_BASE}/api/admin/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  const data = await res.json();
  return data.agents ?? [];
}

/**
 * Update an agent's active/inactive status.
 */
export async function updateAgentStatus(
  agentId: string,
  status: 'active' | 'inactive'
): Promise<AgentWithStatus> {
  if (!API_BASE) {
    const agent = MOCK_AGENTS.find((a) => a.id === agentId);
    if (!agent) throw new Error('Agent not found');
    return Promise.resolve({ ...agent, status });
  }
  const res = await fetch(`${API_BASE}/api/admin/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update agent status');
  return res.json();
}

/**
 * Build default commissions object from referral mode and max level.
 */
export function defaultCommissions(
  referralMode: 'basic' | 'extended',
  maxReferralLevel: number
): CommissionLevels {
  const commissions: CommissionLevels = { level1: 10 };
  if (referralMode === 'extended' && maxReferralLevel >= 2) {
    commissions.level2 = 5;
  }
  if (referralMode === 'extended' && maxReferralLevel >= 3) {
    commissions.level3 = 2;
  }
  return commissions;
}
