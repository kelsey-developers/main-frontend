'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { getCommissionWallet, getBookingCommissions } from '@/services/commissionService';
import { getAgentPayouts } from '@/services/payoutService';
import { getReferralTree, getReferralStats } from '@/services/referralTreeService';
import type { CommissionWallet, BookingCommission, CommissionStatus } from '@/types/commission';
import type { Payout, PayoutStatus } from '@/types/payout';
import type { ReferralStats } from '@/types/referralTree';

const AGENT_DIRECTORY: Record<string, { name: string; email: string; phone: string; referralCode: string; level: 1 | 2 | 3; status: 'active' | 'inactive'; joinedAt: string }> = {
  'agent-001': { name: 'Juan Dela Cruz', email: 'juan@example.com', phone: '+63 912 345 6789', referralCode: 'JUAN2025', level: 1, status: 'active', joinedAt: '2024-01-10' },
  'agent-002': { name: 'Maria Santos', email: 'maria@example.com', phone: '+63 917 234 5678', referralCode: 'MARIA2025', level: 2, status: 'active', joinedAt: '2024-03-05' },
  'agent-003': { name: 'Roberto Cruz', email: 'roberto@example.com', phone: '+63 920 345 6789', referralCode: 'ROBERTO2025', level: 2, status: 'active', joinedAt: '2024-03-22' },
  'agent-004': { name: 'Pedro Flores', email: 'pedro@example.com', phone: '+63 918 456 7890', referralCode: 'PEDRO2025', level: 2, status: 'active', joinedAt: '2024-04-18' },
  'agent-005': { name: 'Ana Reyes', email: 'ana@example.com', phone: '+63 915 567 8901', referralCode: 'ANA2025', level: 3, status: 'active', joinedAt: '2024-06-01' },
};

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  available: 'bg-green-100 text-green-700',
  paid: 'bg-gray-100 text-gray-600',
};

const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

const LEVEL_STYLES: Record<number, string> = {
  1: 'bg-teal-100 text-teal-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-purple-100 text-purple-700',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
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
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
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
      {/* Back nav */}
      <Link
        href="/admin/agents"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B5858] transition-colors"
        style={{ fontFamily: 'Poppins' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Agent Directory
      </Link>

      {/* Agent Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-[#0B5858]/10 flex items-center justify-center text-2xl font-bold text-[#0B5858] flex-shrink-0">
            {getInitials(agent.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{agent.name}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_STYLES[agent.level]}`}>Level {agent.level}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                {agent.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
              <span>📧 {agent.email}</span>
              <span>📞 {agent.phone}</span>
              <span>🏷️ <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700">{agent.referralCode}</code></span>
              <span>📅 Joined {new Date(agent.joinedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          <Link
            href={`/${id.replace('agent-', '')}`}
            target="_blank"
            className="px-4 py-2 text-sm font-semibold text-[#0B5858] border border-[#0B5858]/30 rounded-xl hover:bg-[#0B5858]/5 transition-colors whitespace-nowrap"
            style={{ fontFamily: 'Poppins' }}
          >
            View Public Profile ↗
          </Link>
        </div>
      </div>

      {/* Wallet Summary */}
      {wallet && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Available', value: wallet.available, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending', value: wallet.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Approved', value: wallet.approved, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Paid', value: wallet.paid, color: 'text-gray-600', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'Poppins', fontWeight: 700 }}>₱{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'text-[#0B5858] border-b-2 border-[#0B5858] -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Commissions', value: commissions.length },
                  { label: 'Total Payouts', value: payouts.length },
                  { label: 'Network Size', value: networkStats?.totalSubAgents ?? 0 },
                  { label: 'Network Bookings', value: networkStats?.networkBookings ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Poppins' }}>Recent Commissions</h3>
                <div className="space-y-2">
                  {commissions.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>{c.bookingRef}</p>
                        <p className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>{c.propertyName} · {c.guestName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>₱{c.commissionAmount.toLocaleString()}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Booking Ref', 'Property', 'Guest', 'Total', 'Commission', 'Level', 'Status', 'Date'].map((h) => (
                      <th key={h} className="pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-[#0B5858]">{c.bookingRef}</td>
                      <td className="py-3 pr-4 text-gray-600 max-w-[120px] truncate">{c.propertyName}</td>
                      <td className="py-3 pr-4 text-gray-600">{c.guestName}</td>
                      <td className="py-3 pr-4 font-medium">₱{c.totalBookingAmount.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-bold text-[#0B5858]">₱{c.commissionAmount.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700`}>L{c.referralLevel}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {commissions.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No commissions recorded.</p>
              )}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="space-y-3">
              {payouts.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No payout records.</p>
              ) : (
                payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>{p.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                        {p.method.replace('_', ' ').toUpperCase()} · {new Date(p.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {p.proofOfPaymentUrl && (
                        <p className="text-xs text-green-600 mt-0.5" style={{ fontFamily: 'Poppins' }}>✓ Proof uploaded</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>₱{p.amount.toLocaleString()}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYOUT_STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && networkStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sub-Agents', value: networkStats.totalSubAgents },
                  { label: 'Active', value: networkStats.activeSubAgents },
                  { label: 'Network Bookings', value: networkStats.networkBookings },
                  { label: 'Network Commissions', value: `₱${networkStats.totalNetworkCommissions.toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
                    <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0B5858]/5 border border-[#0B5858]/10 rounded-xl p-4">
                <p className="text-sm text-[#0B5858] font-medium" style={{ fontFamily: 'Poppins' }}>
                  View the full referral tree on the agent's network page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
