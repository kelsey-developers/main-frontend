'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CalendarView } from '../calendar/page';
import { getAgentAnalytics } from '@/services/agentDashboardService';
import type { AgentAnalytics } from '@/services/agentDashboardService';

/** Time range for bookings charts */
type ChartRange = 'weekly' | 'monthly' | 'quarterly';

/** Generate mock bookings/revenue series for the selected range (replace with API when available) */
function buildChartData(range: ChartRange): { name: string; bookings: number; revenue: number }[] {
  const now = new Date();
  const data: { name: string; bookings: number; revenue: number }[] = [];
  let count: number;
  let fmt: (d: Date) => string;
  if (range === 'weekly') {
    count = 7;
    fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        name: fmt(d),
        bookings: Math.floor(Math.random() * 8) + 2,
        revenue: Math.floor(Math.random() * 40000) + 10000,
      });
    }
  } else if (range === 'monthly') {
    count = 6;
    fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        name: fmt(d),
        bookings: Math.floor(Math.random() * 25) + 10,
        revenue: Math.floor(Math.random() * 150000) + 50000,
      });
    }
  } else {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const y = now.getFullYear();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 3; i >= 0; i--) {
      let q = currentQ - i;
      let year = y;
      if (q < 1) {
        q += 4;
        year -= 1;
      }
      data.push({
        name: `${quarters[q - 1]} ${year}`,
        bookings: Math.floor(Math.random() * 60) + 30,
        revenue: Math.floor(Math.random() * 400000) + 150000,
      });
    }
  }
  return data;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  fontSize: '12px',
} as const;

/** Period options for Bookings & Revenue charts — same custom dropdown design as agents/commissions */
const CHART_PERIOD_OPTIONS: { label: string; value: ChartRange }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
];

/** Custom period dropdown: rounded-2xl button + dropdown panel matching admin design system */
function ChartPeriodDropdown({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (v: ChartRange) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = CHART_PERIOD_OPTIONS.find((o) => o.value === value) ?? CHART_PERIOD_OPTIONS[1];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 pl-4 pr-3 py-2.5 min-w-[120px] bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full right-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {CHART_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setTimeout(() => setIsOpen(false), 150);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [chartRange, setChartRange] = useState<ChartRange>('monthly');

  const chartData = useMemo(() => buildChartData(chartRange), [chartRange]);

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

        {/* Bookings & Revenue charts */}
        <div className={`${CARD.base} flex flex-col`}>
          <div className={`${CARD.header} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Bookings & Revenue</h2>
              <p className={`${CARD.subtitle} mt-1`}>Trends by time period</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Period</span>
              <ChartPeriodDropdown value={chartRange} onChange={setChartRange} />
            </div>
          </div>
          <div className="p-6 pt-4 flex flex-col gap-6">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Poppins' }}>Bookings over time</h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0B5858" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0B5858" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} width={32} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: unknown): [React.ReactNode, string] => [Number(value ?? 0), 'Bookings']} />
                    <Area type="monotone" dataKey="bookings" stroke="#0B5858" strokeWidth={2} fill="url(#bookingsGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Poppins' }}>Revenue (₱)</h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={chartRange === 'weekly' ? 24 : 32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} width={48} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: unknown): [React.ReactNode, string] => [`₱${Number(value ?? 0).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#0B5858" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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