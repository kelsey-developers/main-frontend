'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { getLoans, getLendingSummary, recordPayment } from '@/services/lendingService';
import { LOAN_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '@/types/lending';
import type { Loan, LoanStatus, LendingSummary, LoanPayment } from '@/types/lending';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import CreateLoanModal from './components/CreateLoanModal';
import RecordPaymentModal from './components/RecordPaymentModal';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
}

const STATUS_ALL = 'all';
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: STATUS_ALL, label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'settled', label: 'Settled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'written_off', label: 'Written Off' },
];

const PIE_COLORS: Record<LoanStatus, string> = {
  active:      '#0B5858',
  overdue:     '#EF4444',
  pending:     '#FACC15',
  settled:     '#9CA3AF',
  written_off: '#6B7280',
  rejected:    '#FCA5A5',
};

function StatusBadge({ status }: { status: LoanStatus }) {
  const cfg = LOAN_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function AdminLendingPage() {
  const router = useRouter();
  const { isAdmin, roleLoading } = useMockAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [recordTarget, setRecordTarget] = useState<Loan | null>(null);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.replace('/');
  }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    Promise.all([getLoans(), getLendingSummary()]).then(([l, s]) => {
      setLoans(l);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  const toast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const filtered = useMemo(() => {
    let result = [...loans];
    if (statusFilter !== STATUS_ALL) result = result.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) => l.borrowerName.toLowerCase().includes(q) || l.id.includes(q) || l.purpose.toLowerCase().includes(q)
      );
    }
    return result;
  }, [loans, statusFilter, search]);

  const exportCSV = () => {
    const headers = ['Loan ID', 'Borrower', 'Role', 'Principal', 'Rate', 'Term', 'Monthly', 'Outstanding', 'Status', 'Next Due'];
    const rows = filtered.map((l) => [
      l.id, l.borrowerName, l.borrowerRole,
      l.principalAmount, `${l.interestRate}%`, l.termMonths,
      l.monthlyPayment.toFixed(2), l.outstandingBalance.toFixed(2),
      l.status, l.nextPaymentDue ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lending-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} flex items-center justify-center min-h-screen`}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50`} style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">

        {/* Toast */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0B5858] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg animate-fade-in-up">
            {successToast}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">Admin · Money Lending</p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lending Dashboard</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Loan
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Loans',       value: summary.totalLoansActive,             sub: 'currently disbursed',      color: 'text-[#0B5858]',  bg: 'bg-[#0B5858]/5' },
              { label: 'Outstanding',        value: fmtShort(summary.totalPrincipalOutstanding), sub: 'total balance due',  color: 'text-gray-900',   bg: 'bg-white' },
              { label: 'Collected This Month', value: fmtShort(summary.totalCollectedThisMonth), sub: 'Mar 2026',           color: 'text-[#0B5858]',  bg: 'bg-white' },
              { label: 'Overdue',            value: summary.totalLoansOverdue,             sub: 'need attention',           color: 'text-red-600',    bg: 'bg-red-50' },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-5 border border-gray-100 shadow-sm`}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                <p className={`text-2xl font-bold ${color} tracking-tight`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Line chart — collections */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Monthly Collections</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={summary.monthlyCollections} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: unknown) => [fmt(v as number), 'Collected']}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#0B5858" strokeWidth={2.5} dot={{ r: 4, fill: '#0B5858' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Donut chart — by status */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Loans by Status</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={summary.loansByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {summary.loansByStatus.map((entry) => (
                      <Cell key={entry.status} fill={PIE_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => LOAN_STATUS_CONFIG[value as LoanStatus]?.label ?? value}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v, name) => [v, LOAN_STATUS_CONFIG[name as LoanStatus]?.label ?? name]}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filter + Search + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
              placeholder="Search borrower or loan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ml-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Loans Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Borrower', 'Principal', 'Rate / Term', 'Monthly', 'Outstanding', 'Status', 'Next Due', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No loans found.</td>
                  </tr>
                ) : filtered.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{loan.borrowerName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{loan.id} · {loan.borrowerRole}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900">{fmt(loan.principalAmount)}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {loan.interestRate}%/mo · {loan.termMonths}mo
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-800">{fmt(loan.monthlyPayment)}</td>
                    <td className="px-5 py-4">
                      <span className={`font-bold ${loan.outstandingBalance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {fmt(loan.outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={loan.status} /></td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {loan.nextPaymentDue
                        ? new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/lending/${loan.id}`}
                          className="px-3 py-1.5 text-xs font-semibold text-[#0B5858] border border-[#0B5858]/30 rounded-lg hover:bg-[#0B5858]/5 transition-colors"
                        >
                          View
                        </Link>
                        {(loan.status === 'active' || loan.status === 'overdue') && (
                          <button
                            onClick={() => setRecordTarget(loan)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B5858] rounded-lg hover:bg-[#0d7a7a] transition-colors cursor-pointer"
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateLoanModal
          onClose={() => setShowCreate(false)}
          onCreated={(loan) => {
            setLoans((prev) => [loan, ...prev]);
            setShowCreate(false);
            toast('Loan created successfully');
          }}
        />
      )}

      {recordTarget && (
        <RecordPaymentModal
          loan={recordTarget}
          onClose={() => setRecordTarget(null)}
          onRecorded={(payment) => {
            setLoans((prev) => prev.map((l) => l.id === payment.loanId
              ? { ...l, outstandingBalance: Math.max(0, l.outstandingBalance - payment.principalPortion), status: l.outstandingBalance - payment.principalPortion <= 0 ? 'settled' : l.status === 'overdue' ? 'active' : l.status }
              : l
            ));
            setRecordTarget(null);
            toast('Payment recorded successfully');
          }}
        />
      )}
    </div>
  );
}
