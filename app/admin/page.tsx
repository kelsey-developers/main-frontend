'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarView } from '../calendar/page';
import { getAgentAnalytics } from '@/services/agentDashboardService';
import type { AgentAnalytics } from '@/services/agentDashboardService';

/** Shared card styles for consistency across admin dashboard */
const CARD = {
  base: 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding: 'p-6',
  header: 'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  hover: 'hover:shadow-md hover:border-[#0B5858]/20 transition-all',
  label: 'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  value: 'text-3xl font-bold text-gray-900 tracking-tight',
  subtitle: 'text-xs font-medium text-gray-500',
  iconBox: 'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
  innerRow: 'p-4 rounded-2xl border border-gray-100',
} as const;

/** Stat card */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className={`${CARD.base} ${CARD.padding} hover:shadow-md transition-shadow relative`}>
      <p className={`${CARD.label} mb-2`}>{label}</p>
      <p className={CARD.value}>{value}</p>
      {sub != null && <p className={`${CARD.subtitle} mt-2 text-gray-400`}>{sub}</p>}
    </div>
  );
}

const AdminPage: React.FC = React.memo(() => {
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAgentAnalytics()
      .then((data) => {
        if (mounted) setAgentAnalytics(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage platform users, bookings, listings, inventory, and finance.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end ml-auto">
          <Link
            href="/manage-users"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Manage Users
          </Link>
          <Link
            href="/manage-units"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gray-600 text-white text-sm font-bold rounded-2xl hover:bg-gray-700 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Manage Listings
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      {agentAnalytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Agents" value={agentAnalytics.totalAgents} sub="Registered on platform" />
          <StatCard label="Active Agents" value={agentAnalytics.activeAgents} sub="With recent activity" />
          <StatCard
            label="Total Paid"
            value={`₱${agentAnalytics.totalCommissionsPaid.toLocaleString()}`}
            sub="Commissions disbursed"
          />
          <StatCard
            label="Pending"
            value={`₱${agentAnalytics.totalCommissionsPending.toLocaleString()}`}
            sub="Awaiting clearance"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agent Analytics */}
        <div className={`lg:col-span-2 ${CARD.base} flex flex-col`}>
          <div className={`${CARD.header} px-7 py-6`}>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Agent Analytics</h2>
            <p className={`${CARD.subtitle} mt-2`}>Top performing agents and commission overview</p>
          </div>

          <div className="p-7 pt-6">
            {agentAnalytics && agentAnalytics.topAgents.length > 0 ? (
              <div className="space-y-4">
                {agentAnalytics.topAgents.map((agent, idx) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center gap-5 p-5 rounded-2xl border border-gray-100 hover:border-[#0B5858]/20 hover:bg-gray-50/50 transition-all group"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-[#FACC15] text-[#0B5858]' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-400/80 text-orange-900' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#0B5858] transition-colors">{agent.agentName}</p>
                      <p className="text-xs font-medium text-gray-500 mt-1">
                        {agent.totalBookings} bookings · {agent.activeSubAgents} sub-agents · <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{agent.referralCode}</code>
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0B5858] flex-shrink-0">₱{agent.totalCommissions.toLocaleString()}</p>
                    <Link
                      href={`/admin/agents/${agent.agentId}`}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0B5858] bg-[#0B5858]/10 hover:bg-[#0B5858]/20 rounded-xl transition-colors whitespace-nowrap"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-500">No agent data yet</p>
                <p className={`${CARD.subtitle} mt-2 text-gray-400`}>Connect your backend (API_URL) to see agents and commissions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${CARD.base} flex flex-col`}>
          <div className={CARD.header}>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Quick Actions</h2>
            <p className={`${CARD.subtitle} mt-1`}>Shortcuts to main admin areas</p>
          </div>
          <div className={`${CARD.padding} flex flex-col gap-3`}>
            {[
              {
                href: '/admin/agents',
                title: 'All Agents',
                desc: 'View and manage agents',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
              {
                href: '/admin/commissions',
                title: 'Commission Ledger',
                desc: 'Review and approve commissions',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                ),
                color: 'bg-[#FACC15]/20 text-[#0B5858]',
              },
              {
                href: '/admin/payouts',
                title: 'Manage Payouts',
                desc: 'Process payout requests',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
              {
                href: '/admin/cleaning',
                title: 'Cleaning',
                desc: 'Jobs and schedule',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                ),
                color: 'bg-[#FACC15]/20 text-[#0B5858]',
              },
              {
                href: '/admin/lending',
                title: 'Lending',
                desc: 'Active loans and overdue',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
              {
                href: '/dtr',
                title: 'DTR',
                desc: 'Daily time records',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ),
                color: 'bg-[#FACC15]/20 text-[#0B5858]',
              },
              {
                href: '/payroll',
                title: 'Payroll',
                desc: 'Manage pay records',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
            ].map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className={`group flex items-center gap-4 ${CARD.innerRow} hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all`}
              >
                <div className={`${CARD.iconBox} ${action.color} group-hover:scale-105 transition-transform`}>
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#0B5858] transition-colors">{action.title}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{action.desc}</p>
                </div>
                <div className="ml-auto">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#0B5858] transition-colors group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className={`${CARD.base} flex flex-col`}>
        <div className={CARD.header}>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Upcoming Bookings Calendar</h2>
          <p className={`${CARD.subtitle} mt-1`}>View and manage all upcoming bookings</p>
        </div>
        <div className="p-0 overflow-hidden">
          <CalendarView embedded />
        </div>
      </div>
    </div>
  );
});

AdminPage.displayName = 'AdminPage';

export default AdminPage;