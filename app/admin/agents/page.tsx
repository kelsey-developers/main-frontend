'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAgentAnalytics } from '@/services/agentDashboardService';
import type { TopAgent } from '@/services/agentDashboardService';

const FULL_MOCK_AGENTS: (TopAgent & { level: 1 | 2 | 3; status: 'active' | 'inactive'; email: string; joinedAt: string })[] = [
  { agentId: 'agent-001', agentName: 'Juan Dela Cruz', referralCode: 'JUAN2025', totalCommissions: 18940, totalBookings: 24, activeSubAgents: 5, level: 1, status: 'active', email: 'juan@example.com', joinedAt: '2024-01-10' },
  { agentId: 'agent-002', agentName: 'Maria Santos', referralCode: 'MARIA2025', totalCommissions: 5420, totalBookings: 11, activeSubAgents: 2, level: 2, status: 'active', email: 'maria@example.com', joinedAt: '2024-03-05' },
  { agentId: 'agent-003', agentName: 'Roberto Cruz', referralCode: 'ROBERTO2025', totalCommissions: 3870, totalBookings: 8, activeSubAgents: 1, level: 2, status: 'active', email: 'roberto@example.com', joinedAt: '2024-03-22' },
  { agentId: 'agent-004', agentName: 'Pedro Flores', referralCode: 'PEDRO2025', totalCommissions: 2180, totalBookings: 6, activeSubAgents: 1, level: 2, status: 'active', email: 'pedro@example.com', joinedAt: '2024-04-18' },
  { agentId: 'agent-005', agentName: 'Ana Reyes', referralCode: 'ANA2025', totalCommissions: 1240, totalBookings: 4, activeSubAgents: 0, level: 3, status: 'active', email: 'ana@example.com', joinedAt: '2024-06-01' },
  { agentId: 'agent-006', agentName: 'Luz Garcia', referralCode: 'LUZ2025', totalCommissions: 980, totalBookings: 3, activeSubAgents: 0, level: 3, status: 'active', email: 'luz@example.com', joinedAt: '2024-06-15' },
  { agentId: 'agent-007', agentName: 'Carlos Mendoza', referralCode: 'CARLOS2025', totalCommissions: 620, totalBookings: 2, activeSubAgents: 0, level: 3, status: 'inactive', email: 'carlos@example.com', joinedAt: '2024-07-02' },
  { agentId: 'agent-008', agentName: 'Grace Villanueva', referralCode: 'GRACE2025', totalCommissions: 750, totalBookings: 3, activeSubAgents: 0, level: 3, status: 'active', email: 'grace@example.com', joinedAt: '2024-07-20' },
];

const LEVEL_STYLES: Record<number, string> = {
  1: 'bg-teal-100 text-teal-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-purple-100 text-purple-700',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

type FilterStatus = 'all' | 'active' | 'inactive';
type FilterLevel = 'all' | '1' | '2' | '3';

export default function AdminAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, totalPaid: 0, totalPending: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');

  useEffect(() => {
    (async () => {
      const analytics = await getAgentAnalytics();
      setSummary({
        total: analytics.totalAgents,
        active: analytics.activeAgents,
        totalPaid: analytics.totalCommissionsPaid,
        totalPending: analytics.totalCommissionsPending,
      });
      setLoading(false);
    })();
  }, []);

  const filtered = FULL_MOCK_AGENTS.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.agentName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.referralCode.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchLevel = filterLevel === 'all' || String(a.level) === filterLevel;
    return matchSearch && matchStatus && matchLevel;
  });

  const exportCSV = () => {
    const header = ['Agent ID', 'Name', 'Email', 'Referral Code', 'Level', 'Status', 'Bookings', 'Commissions (₱)', 'Sub-Agents', 'Joined'];
    const rows = filtered.map((a) => [a.agentId, a.agentName, a.email, a.referralCode, `L${a.level}`, a.status, a.totalBookings, a.totalCommissions, a.activeSubAgents, a.joinedAt]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
            Agent Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
            All registered agents and their performance overview.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] text-white text-sm font-semibold rounded-xl hover:bg-[#0d7a7a] transition-colors cursor-pointer"
          style={{ fontFamily: 'Poppins' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: summary.total, icon: '👥' },
          { label: 'Active', value: summary.active, icon: '✅' },
          { label: 'Total Paid (₱)', value: `₱${summary.totalPaid.toLocaleString()}`, icon: '💰' },
          { label: 'Pending Commissions', value: `₱${summary.totalPending.toLocaleString()}`, icon: '⏳' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1" style={{ fontFamily: 'Poppins' }}>{s.icon} {s.label}</p>
            <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, referral code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>Status:</span>
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterStatus === s ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              {s}
            </button>
          ))}
          <span className="text-xs text-gray-400 mx-1">|</span>
          <span className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>Level:</span>
          {(['all', '1', '2', '3'] as FilterLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setFilterLevel(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filterLevel === l ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              {l === 'all' ? 'All' : `L${l}`}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Agent', 'Referral Code', 'Level', 'Status', 'Bookings', 'Commissions', 'Sub-Agents', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No agents match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0B5858]/10 flex items-center justify-center text-sm font-bold text-[#0B5858] flex-shrink-0">
                          {getInitials(agent.agentName)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{agent.agentName}</p>
                          <p className="text-xs text-gray-400">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{agent.referralCode}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_STYLES[agent.level]}`}>
                        Level {agent.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {agent.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{agent.totalBookings}</td>
                    <td className="px-4 py-3 font-bold text-[#0B5858]">₱{agent.totalCommissions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{agent.activeSubAgents}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(agent.joinedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/agents/${agent.agentId}`}
                        className="px-3 py-1.5 text-xs font-semibold text-[#0B5858] bg-[#0B5858]/8 hover:bg-[#0B5858]/15 rounded-lg transition-colors whitespace-nowrap"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
            Showing {filtered.length} of {FULL_MOCK_AGENTS.length} agents
          </div>
        )}
      </div>
    </div>
  );
}
