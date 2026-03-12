import { apiClient } from './client';

export interface AgentBalance {
  current_amount: number;
  updatedAt: string;
}

export interface BalanceHistoryEntry {
  id: string;
  type: 'add' | 'remove';
  amount: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export async function getAgentBalance(): Promise<AgentBalance> {
  return apiClient.get<AgentBalance>('/api/agents/me/balance');
}

export async function getAgentBalanceHistory(): Promise<BalanceHistoryEntry[]> {
  const data = await apiClient.get<unknown>('/api/agents/me/balance-history');
  return Array.isArray(data) ? (data as BalanceHistoryEntry[]) : [];
}

export interface ReferralNode {
  agentId: string;
  agentName: string;
  email: string;
  referralCode: string;
  level: number;
  status: 'active' | 'inactive';
  joinedAt: string;
  totalCommissionsEarned: number;
  totalBookings: number;
  children: ReferralNode[];
}

export interface AgentNetworkStats {
  totalSubAgents: number;
  activeSubAgents: number;
  networkBookings: number;
  totalNetworkCommissions: number;
}

export interface AgentNetworkResponse {
  tree: ReferralNode;
  stats: AgentNetworkStats;
}

export async function getAgentNetwork(): Promise<AgentNetworkResponse> {
  return apiClient.get<AgentNetworkResponse>('/api/agents/me/network');
}

export interface AgentForAssign {
  id: string;
  fullname: string;
  email: string;
  username: string;
}

export async function listAgents(search?: string): Promise<AgentForAssign[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await apiClient.get<unknown>(`/api/agents/list${qs}`);
  return Array.isArray(data) ? (data as AgentForAssign[]) : [];
}
