'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getViewAgent } from '@/lib/api/agents';
import type { ViewAgentResponse } from '@/lib/api/agents';
import type { PayoutStatus } from '@/types/payout';

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

const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  paid: 'bg-green-100 text-green-800 border border-green-200',
  declined: 'bg-gray-100 text-gray-500 border border-gray-200',
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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ViewAgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getViewAgent(id);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
        <p className="text-sm text-gray-500 mt-3">Loading agent...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-600 font-medium">{error || 'Agent not found'}</p>
        <Link href="/admin/agents" className="mt-4 text-[#0B5858] font-bold hover:underline">
          Back to Directory
        </Link>
      </div>
    );
  }

  const { agent, wallet, totalCommissions, commissions, payouts, network } = data;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'commissions', label: 'Commissions' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'network', label: 'Network' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{agent.fullname}</h1>
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
            href={`/agent/${agent.username}`}
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

      {/* Agent profile card */}
      <div className={CARD.base}>
        <div className={CARD.header}>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Profile</h2>
          <p className={`${CARD.subtitle} mt-1`}>Contact and referral info</p>
        </div>
        <div className={`${CARD.padding} flex flex-col sm:flex-row sm:items-center gap-6 flex-wrap`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0B5858]/10 flex items-center justify-center text-xl font-bold text-[#0B5858] shrink-0">
              {getInitials(agent.fullname)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-gray-900 tracking-tight">{agent.fullname}</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {agent.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span>{agent.email}</span>
                {agent.phone && <span>{agent.phone}</span>}
                <span><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700">{agent.username}</code></span>
                {agent.joinedAt && (
                  <span>Joined {new Date(agent.joinedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <StatCard label="Available" value={`₱${wallet.available.toLocaleString()}`} sub="Ready to withdraw" />
        <StatCard label="Pending" value={`₱${wallet.pending.toLocaleString()}`} sub="Penciled bookings" />
        <StatCard label="Approved" value={`₱${wallet.approved.toLocaleString()}`} sub="Confirmed bookings" />
        <StatCard label="Total Paid" value={`₱${wallet.totalPaid.toLocaleString()}`} sub="Lifetime paid out" />
      </div>

      {/* Tabs card */}
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
                <StatCard label="Total Commissions" value={totalCommissions} sub="Penciled, confirmed, completed" />
                <StatCard label="Total Payouts" value={payouts.length} sub="Payout requests" />
                <StatCard label="Network Size" value={network.totalSubAgents} sub="Sub-agents" />
                <StatCard label="Network Bookings" value={network.networkBookings} sub="From sub-agents" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">Recent Commissions</h3>
                <div className="space-y-2">
                  {commissions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">No commissions recorded.</p>
                  ) : (
                    commissions.slice(0, 5).map((c, idx) => (
                      <div key={idx} className={`flex items-center justify-between ${CARD.innerRow} hover:border-[#0B5858]/20 hover:bg-gray-50/50 transition-all`}>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{c.bookingRef}</p>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">{c.property} · {c.guest}</p>
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
                    {['Booking Ref', 'Property', 'Guest', 'Check-in', 'Check-out', 'Nights', 'Total', 'Commission', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                        No commissions recorded.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-medium text-[#0B5858]">{c.bookingRef}</td>
                        <td className="px-5 py-4 text-gray-600 max-w-[140px] truncate">{c.property}</td>
                        <td className="px-5 py-4 text-gray-600">{c.guest}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{c.checkIn ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{c.checkOut ?? '—'}</td>
                        <td className="px-5 py-4 text-gray-600">{c.nights}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">₱{c.totalAmount.toLocaleString()}</td>
                        <td className="px-5 py-4 font-bold text-[#0B5858] whitespace-nowrap">₱{c.commission.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
                            c.status === 'penciled' ? 'bg-amber-100 text-amber-800' :
                            c.status === 'confirmed' ? 'bg-[#0B5858]/10 text-[#0B5858]' :
                            c.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {c.status}
                          </span>
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
                      <span className={`inline-flex mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${PAYOUT_STATUS_COLORS[p.status as PayoutStatus] ?? 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <StatCard label="Total Sub-Agents" value={network.totalSubAgents} sub="In network" />
                <StatCard label="Active" value={network.activeSubAgents} sub="With activity" />
                <StatCard label="Network Bookings" value={network.networkBookings} sub="From sub-agents" />
              </div>
              <div className="rounded-2xl border border-[#0B5858]/20 bg-[#0B5858]/5 p-4">
                <p className="text-sm font-medium text-[#0B5858]">
                  View the full referral tree on the agent&apos;s network page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
