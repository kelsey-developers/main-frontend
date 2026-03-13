'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { getCommissionWallet, getBookingCommissions } from '@/services/commissionService';
import { getAgentPayouts } from '@/services/payoutService';
import { getReferralStats } from '@/services/referralTreeService';
import type { CommissionWallet, BookingCommission, CommissionStatus } from '@/types/commission';
import type { Payout, PayoutStatus } from '@/types/payout';
import type { ReferralStats } from '@/types/referralTree';

/** Shared card tokens — match admin overview and agents list */
const CARD = {
  base: 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding: 'p-6',
  header: 'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  label: 'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  value: 'text-3xl font-bold text-gray-900 tracking-tight',
  subtitle: 'text-xs font-medium text-gray-500',
  innerRow: 'p-4 rounded-2xl border border-gray-100',
} as const;

const AGENT_DIRECTORY: Record<string, { name: string; email: string; phone: string; referralCode: string; level: 1 | 2 | 3; status: 'active' | 'inactive'; joinedAt: string }> = {
  'agent-001': { name: 'Juan Dela Cruz', email: 'juan@example.com', phone: '+63 912 345 6789', referralCode: 'JUAN2025', level: 1, status: 'active', joinedAt: '2024-01-10' },
  'agent-002': { name: 'Maria Santos', email: 'maria@example.com', phone: '+63 917 234 5678', referralCode: 'MARIA2025', level: 2, status: 'active', joinedAt: '2024-03-05' },
  'agent-003': { name: 'Roberto Cruz', email: 'roberto@example.com', phone: '+63 920 345 6789', referralCode: 'ROBERTO2025', level: 2, status: 'active', joinedAt: '2024-03-22' },
  'agent-004': { name: 'Pedro Flores', email: 'pedro@example.com', phone: '+63 918 456 7890', referralCode: 'PEDRO2025', level: 2, status: 'active', joinedAt: '2024-04-18' },
  'agent-005': { name: 'Ana Reyes', email: 'ana@example.com', phone: '+63 915 567 8901', referralCode: 'ANA2025', level: 3, status: 'active', joinedAt: '2024-06-01' },
};

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  approved: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',
  available: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',
  paid: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border border-blue-200',
  paid: 'bg-green-100 text-green-800 border border-green-200',
  failed: 'bg-red-100 text-red-700 border border-red-200',
};

const LEVEL_STYLES: Record<number, string> = {
  1: 'bg-teal-100 text-teal-700 border border-teal-200',
  2: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  3: 'bg-purple-100 text-purple-700 border border-purple-200',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Stat card — same as admin overview: rounded-3xl, no icon */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${CARD.base} ${CARD.padding} hover:shadow-md transition-shadow`}>
      <p className={`${CARD.label} mb-2`}>{label}</p>
      <p className={CARD.value}>{value}</p>
      {sub != null && <p className={`${CARD.subtitle} mt-2 text-gray-400`}>{sub}</p>}
    </div>
  );
}

type Tab = 'overview' | 'commissions' | 'payouts' | 'network';

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agent = AGENT_DIRECTORY[id] ?? { name: 'Unknown Agent', email: '—', phone: '—', referralCode: '—', level: 1 as const, status: 'inactive' as const, joinedAt: '—' };

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<CommissionWallet | null>(null);
  const [commissions, setCommissions] = useState<BookingCommission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [networkStats, setNetworkStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [w, c, p, s] = await Promise.all([
        getCommissionWallet(id),
        getBookingCommissions(id),
        getAgentPayouts(id),
        getReferralStats(id),
      ]);
      setWallet(w);
      setCommissions(c);
      setPayouts(p);
      setNetworkStats(s);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'commissions', label: 'Commissions' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'network', label: 'Network' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header — same pattern as admin overview: title left, back + action right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{agent.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agent profile, commission wallet, payouts, and network.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end ml-auto">
          <Link
            href="/admin/agents"
            className="inline-flex items-center gap-2 px-5 py-3 border border-[#0B5858]/30 text-[#0B5858] bg-white text-sm font-bold rounded-2xl hover:bg-[#0B5858]/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Directory
          </Link>
          <Link
            href={`/${id.replace('agent-', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98]"
          >
            View Public Profile
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Agent profile card — CARD tokens, header strip */}
      <div className={CARD.base}>
        <div className={CARD.header}>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Profile</h2>
          <p className={`${CARD.subtitle} mt-1`}>Contact and referral info</p>
        </div>
        <div className={`${CARD.padding} flex flex-col sm:flex-row sm:items-center gap-6 flex-wrap`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0B5858]/10 flex items-center justify-center text-xl font-bold text-[#0B5858] shrink-0">
              {getInitials(agent.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-gray-900 tracking-tight">{agent.name}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLES[agent.level]}`}>
                  L{agent.level}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {agent.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span>{agent.email}</span>
                <span>{agent.phone}</span>
                <span><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700">{agent.referralCode}</code></span>
                <span>Joined {new Date(agent.joinedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet summary — StatCards, same as overview (no colored bg, no icons) */}
      {wallet && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <StatCard label="Available" value={`₱${wallet.available.toLocaleString()}`} sub="Ready to withdraw" />
          <StatCard label="Pending" value={`₱${wallet.pending.toLocaleString()}`} sub="Awaiting approval" />
          <StatCard label="Approved" value={`₱${wallet.approved.toLocaleString()}`} sub="Cleared for payout" />
          <StatCard label="Total Paid" value={`₱${wallet.paid.toLocaleString()}`} sub="Lifetime paid out" />
        </div>
      )}

      {/* Tabs card — header strip for tab row, then content */}
      <div className={CARD.base}>
        <div className={`${CARD.header} flex flex-wrap items-center gap-2`}>
          <div className="flex border-b border-transparent gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={CARD.padding}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <StatCard label="Total Commissions" value={commissions.length} sub="Recorded entries" />
                <StatCard label="Total Payouts" value={payouts.length} sub="Payout requests" />
                <StatCard label="Network Size" value={networkStats?.totalSubAgents ?? 0} sub="Sub-agents" />
                <StatCard label="Network Bookings" value={networkStats?.networkBookings ?? 0} sub="From network" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">Recent Commissions</h3>
                <div className="space-y-2">
                  {commissions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">No commissions recorded.</p>
                  ) : (
                    commissions.slice(0, 5).map((c) => (
                      <div key={c.id} className={`flex items-center justify-between ${CARD.innerRow} hover:border-[#0B5858]/20 hover:bg-gray-50/50 transition-all`}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{c.bookingRef}</p>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">{c.propertyName} · {c.guestName}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-bold text-[#0B5858]">₱{c.commissionAmount.toLocaleString()}</p>
                          <span className={`inline-flex mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Booking Ref', 'Property', 'Guest', 'Total', 'Commission', 'Level', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                        No commissions recorded.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-medium text-[#0B5858]">{c.bookingRef}</td>
                        <td className="px-5 py-4 text-gray-600 max-w-[140px] truncate">{c.propertyName}</td>
                        <td className="px-5 py-4 text-gray-600">{c.guestName}</td>
                        <td className="px-5 py-4 font-medium text-gray-900">₱{c.totalBookingAmount.toLocaleString()}</td>
                        <td className="px-5 py-4 font-bold text-[#0B5858]">₱{c.commissionAmount.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLES[c.referralLevel as 1 | 2 | 3] ?? 'bg-gray-100 text-gray-600'}`}>
                            L{c.referralLevel}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="space-y-3">
              {payouts.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No payout records.</p>
              ) : (
                payouts.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between ${CARD.innerRow} hover:border-[#0B5858]/20 hover:bg-gray-50/50 transition-all`}>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{p.id}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">
                        {p.method.replace('_', ' ').toUpperCase()} · {new Date(p.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {p.proofOfPaymentUrl && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">Proof uploaded</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-[#0B5858]">₱{p.amount.toLocaleString()}</p>
                      <span className={`inline-flex mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${PAYOUT_STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              {networkStats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    <StatCard label="Total Sub-Agents" value={networkStats.totalSubAgents} sub="In network" />
                    <StatCard label="Active" value={networkStats.activeSubAgents} sub="With activity" />
                    <StatCard label="Network Bookings" value={networkStats.networkBookings} sub="From sub-agents" />
                    <StatCard label="Network Commissions" value={`₱${networkStats.totalNetworkCommissions.toLocaleString()}`} sub="Total from network" />
                  </div>
                  <div className="rounded-2xl border border-[#0B5858]/20 bg-[#0B5858]/5 p-4">
                    <p className="text-sm font-medium text-[#0B5858]">
                      View the full referral tree on the agent&apos;s network page.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">No network data available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
