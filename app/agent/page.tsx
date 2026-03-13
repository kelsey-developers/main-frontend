'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBookings } from '@/lib/api/bookings';
import { getAgentBalance } from '@/lib/api/agents';
import type { MyBookingItem } from '@/lib/api/bookings';

const COMMISSION_RATE = 0.1;

function fmt(n: number) {
  return `₱${n.toLocaleString()}`;
}

function mapStatus(raw: string): 'pending' | 'approved' | 'available' | 'cancelled' {
  if (raw === 'penciled') return 'pending';
  if (raw === 'confirmed') return 'approved';
  if (raw === 'completed') return 'available';
  if (raw === 'cancelled') return 'cancelled';
  return 'pending';
}

function bookingToCommission(b: MyBookingItem) {
  const total = b.total_amount ?? 0;
  const commission = Math.round(total * COMMISSION_RATE);
  return {
    id: b.id,
    propertyName: b.listing?.title || 'Unit',
    guestName: [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ') || 'Guest',
    bookingRef: b.reference_code || `BKG-${b.id}`,
    commissionAmount: commission,
    status: mapStatus(b.raw_status || b.status || 'penciled'),
  };
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'Pending',   classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30' },
  approved:  { label: 'Approved',  classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20' },
  available: { label: 'Available', classes: 'bg-[#0B5858] text-white border border-[#0B5858]' },
  paid:      { label: 'Paid',      classes: 'bg-gray-50 text-gray-600 border border-gray-200' },
  cancelled: { label: 'Canceled',  classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string | number; sub?: string; trend?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {trend && <span className="text-[10px] font-bold text-[#0B5858] bg-[#0B5858]/10 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">{trend}</span>}
      </div>
      {sub && <p className="text-xs font-medium text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

export default function AgentOverviewPage() {
  const { userProfile, user } = useAuth();
  const [bookings, setBookings] = useState<MyBookingItem[]>([]);
  const [balance, setBalance] = useState<{ current_amount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = userProfile?.fullname || user?.email?.split('@')[0] || 'Agent';

  useEffect(() => {
    (async () => {
      try {
        const [b, bal] = await Promise.all([
          getMyBookings(),
          getAgentBalance().catch(() => ({ current_amount: 0 })),
        ]);
        setBookings(b);
        setBalance(bal);
      } catch {
        setBookings([]);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const commissions = useMemo(() => bookings.map(bookingToCommission), [bookings]);
  const pendingApprovalAmount = useMemo(
    () => commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0),
    [commissions]
  );
  const clearedFundsAmount = useMemo(
    () => bookings
      .filter((b) => (b.raw_status || b.status) === 'confirmed')
      .reduce((s, b) => s + Math.round((b.total_amount ?? 0) * COMMISSION_RATE), 0),
    [bookings]
  );
  const recent = useMemo(() => commissions.slice(0, 5), [commissions]);
  const chartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    const raw = (b: MyBookingItem) => (b.raw_status || b.status || '').toLowerCase();
    bookings
      .filter((b) => raw(b) === 'confirmed' || raw(b) === 'completed')
      .forEach((b) => {
        const d = new Date(b.check_in_date || Date.now());
        const m = d.toLocaleString('default', { month: 'short' });
        const total = b.total_amount ?? 0;
        byMonth[m] = (byMonth[m] || 0) + Math.round(total * COMMISSION_RATE);
      });
    const data = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
    return data.length > 0 ? data : [{ month: '—', amount: 0 }];
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  const currentAmount = balance?.current_amount ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {displayName}. Here is your dashboard summary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Wallet (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-[#0B5858] rounded-3xl p-7 shadow-md shadow-[#0B5858]/20 flex flex-col justify-between relative overflow-hidden h-full min-h-[240px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#FACC15]/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Available Balance</p>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </div>
              </div>
              <p className="text-5xl font-bold text-white tracking-tight">{fmt(currentAmount)}</p>
              <p className="text-sm font-medium text-white/60 mt-3">Ready to withdraw</p>
            </div>
            <Link
              href="/agent/payouts"
              className="mt-8 relative z-10 w-full inline-flex items-center justify-center gap-2 px-5 py-4 bg-[#FACC15] text-[#0B5858] text-sm font-bold rounded-2xl hover:bg-[#eab308] hover:shadow-lg transition-all active:scale-[0.98]"
            >
              Request Payout
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </Link>
          </div>
        </div>

        {/* Right Column: Earnings Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm p-7 relative flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Earnings Over Time</p>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Commission Trend</h3>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-[#0B5858]">{bookings.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Total bookings</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[200px] w-full mt-auto focus:outline-none focus-visible:outline-none">
            <ResponsiveContainer width="100%" height="100%" className="focus:outline-none focus-visible:outline-none">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} className="focus:outline-none focus-visible:outline-none">
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B5858" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0B5858" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₱${val / 1000}k`}
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [fmt(value as number), 'Earnings']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600, fontSize: '14px', color: '#111827' }}
                  itemStyle={{ color: '#0B5858' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#0B5858" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorEarnings)" 
                activeDot={{ r: 6, fill: '#FACC15', stroke: '#0B5858', strokeWidth: 2, style: { outline: 'none' } }}
                style={{ outline: 'none' }}
              />
            </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Pending Approval" value={fmt(pendingApprovalAmount)} sub="Awaiting admin clearance" />
        <StatCard label="Cleared Funds" value={fmt(clearedFundsAmount)} sub="Ready to become available" />
        <StatCard label="Total Bookings" value={bookings.length} sub="Via your referral link" />
        <StatCard label="Network Size" value={0} sub="Active sub-agents" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Commissions */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-7 py-6 border-b border-gray-50 bg-gray-50/30">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Commissions</h2>
              <p className="text-xs font-medium text-gray-500 mt-1">Your latest referral earnings</p>
            </div>
            <Link
              href="/agent/commissions"
              className="text-[11px] font-bold text-[#0B5858] hover:text-[#094848] transition-colors flex items-center gap-1.5 uppercase tracking-widest bg-[#0B5858]/5 px-4 py-2.5 rounded-xl hover:bg-[#0B5858]/10"
            >
              View All
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p className="text-sm font-bold text-gray-500">No recent commissions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-7 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Booking</th>
                    <th className="px-7 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                    <th className="px-7 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-7 py-4">
                        <p className="font-bold text-gray-900 group-hover:text-[#0B5858] transition-colors">{c.propertyName}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{c.guestName} · {c.bookingRef}</p>
                      </td>
                      <td className="px-7 py-4">
                        <p className="font-bold text-gray-900">{fmt(c.commissionAmount)}</p>
                        <div className="sm:hidden mt-2"><StatusBadge status={c.status} /></div>
                      </td>
                      <td className="px-7 py-4 hidden sm:table-cell">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions (Sidebar style) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                href: '/agent/profile',
                title: 'My Public Profile',
                desc: 'View your shareable page',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ),
                color: 'bg-[#FACC15]/20 text-[#0B5858]',
              },
              {
                href: '/agent/payouts',
                title: 'Request Payout',
                desc: 'Withdraw your earnings',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
              {
                href: '/listings',
                title: 'Promote Properties',
                desc: 'Find units to share',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                ),
                color: 'bg-[#FACC15]/20 text-[#0B5858]',
              },
              {
                href: '/agent/network',
                title: 'View Network',
                desc: 'Manage your sub-agents',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ),
                color: 'bg-[#0B5858]/10 text-[#0B5858]',
              },
            ].map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${action.color} group-hover:scale-105 transition-transform`}>
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
    </div>
  );
}
