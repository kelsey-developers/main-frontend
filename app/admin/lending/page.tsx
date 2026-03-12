'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { getLoans, getLendingSummary } from '@/services/lendingService';
import { LOAN_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '@/types/lending';
import type { Loan, LoanStatus, LendingSummary } from '@/types/lending';
import CreateLoanModal from './components/CreateLoanModal';
import RecordPaymentModal from './components/RecordPaymentModal';
import SingleDatePicker from '@/components/SingleDatePicker';

/** Dropdown — same as admin/commissions: rounded-2xl, shadow, click-outside close */
function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Export modal — same as admin/commissions: date range, format CSV/PDF, Export Now */
function ExportModal({
  onClose,
  onExport,
}: {
  onClose: () => void;
  onExport: (format: 'csv' | 'pdf', startDate: string, endDate: string) => void;
}) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Export Loans</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="relative z-[60]">
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
                <SingleDatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                <SingleDatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-2">Leave blank to export all available records.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Format</label>
            <div className="grid grid-cols-2 gap-3">
              {(['csv', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                    format === f ? 'border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {f === 'csv' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    )}
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-wider">{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => { onExport(format, startDate, endDate); onClose(); }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B5858] text-white text-sm font-bold hover:bg-[#094848] hover:shadow-lg hover:shadow-[#0B5858]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            Export Now
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
}

const STATUS_ALL = 'all';
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: STATUS_ALL,    label: 'All Status' },
  { value: 'pending',     label: 'Pending' },
  { value: 'active',      label: 'Active' },
  { value: 'overdue',     label: 'Overdue' },
  { value: 'settled',     label: 'Settled' },
  { value: 'rejected',    label: 'Rejected' },
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

/** Status chip — same pattern as admin/cleaning: chip-shadow, dot, chipStyle object */
function StatusBadge({ status }: { status: LoanStatus }) {
  const cfg = LOAN_STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap" style={cfg.chipStyle}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Stat card — same as overview: rounded-3xl, no icon ─────── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub != null && <p className="text-xs font-medium text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function AdminLendingPage() {
  const { isAdmin, roleLoading } = useMockAuth();

  const [loans, setLoans]             = useState<Loan[]>([]);
  const [summary, setSummary]         = useState<LendingSummary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [recordTarget, setRecordTarget] = useState<Loan | null>(null);
  const [toast, setToast]             = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    Promise.all([getLoans(), getLendingSummary()]).then(([l, s]) => {
      setLoans(l);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = useMemo(() => {
    let r = [...loans];
    if (statusFilter !== STATUS_ALL) r = r.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((l) => l.borrowerName.toLowerCase().includes(q) || l.id.includes(q) || l.purpose.toLowerCase().includes(q));
    }
    return r;
  }, [loans, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filtered, currentPage, itemsPerPage]
  );

  const handleExport = (format: 'csv' | 'pdf', startDate: string, endDate: string) => {
    let list = [...filtered];
    if (startDate || endDate) {
      list = list.filter((l) => {
        const d = l.disbursedAt ?? l.createdAt;
        if (!d) return true;
        const date = new Date(d).toISOString().split('T')[0];
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
    }
    const headers = ['Loan ID', 'Borrower', 'Role', 'Principal', 'Rate', 'Term', 'Monthly', 'Outstanding', 'Status', 'Next Due'];
    const rows = list.map((l) => [
      l.id, l.borrowerName, l.borrowerRole,
      l.principalAmount, `${l.interestRate}%`, l.termMonths,
      l.monthlyPayment.toFixed(2), l.outstandingBalance.toFixed(2),
      l.status, l.nextPaymentDue ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lending-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast !== '' && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-[#0B5858] text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg border border-[#0B5858] animate-fade-in-up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Page header — same pattern as admin overview: title left, actions right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lending Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage loans, record payments, and track outstanding balances.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end ml-auto">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Loan
          </button>
        </div>
      </div>

        {/* Summary Cards — same style as overview (rounded-3xl, no icon) */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Active Loans" value={summary.totalLoansActive} sub="currently disbursed" />
            <StatCard label="Outstanding" value={fmtShort(summary.totalPrincipalOutstanding)} sub="total balance due" />
            <StatCard label="Collected This Month" value={fmtShort(summary.totalCollectedThisMonth)} sub="Mar 2026" />
            <StatCard
              label="Overdue"
              value={summary.totalLoansOverdue}
              sub={summary.totalLoansOverdue > 0 ? 'need attention' : 'all on track'}
            />
          </div>
        )}

        {/* Charts */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Monthly Collections</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={summary.monthlyCollections} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: unknown) => [fmt(v as number), 'Collected']}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'inherit' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#0B5858" strokeWidth={2.5} dot={{ r: 4, fill: '#0B5858' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Loans by Status</p>
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
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'inherit' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Search, status dropdown, export — same row and design as admin/commissions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search borrower, loan ID, or purpose…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={STATUS_OPTIONS}
              className="min-w-[140px]"
            />
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Loans table — same layout as admin/commissions: rounded-3xl, header style, pagination footer */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Borrower', 'Principal', 'Rate / Term', 'Monthly', 'Outstanding', 'Status', 'Next Due', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                      No loans match your filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-900">{loan.borrowerName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{loan.id} · {loan.borrowerRole}</p>
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">{fmt(loan.principalAmount)}</td>
                      <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">{loan.interestRate}%/mo · {loan.termMonths}mo</td>
                      <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">{fmt(loan.monthlyPayment)}</td>
                      <td className="px-5 py-4">
                        <span className={`font-bold whitespace-nowrap ${loan.outstandingBalance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {fmt(loan.outstandingBalance)}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={loan.status} /></td>
                      <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {loan.nextPaymentDue
                          ? new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <Link
                            href={`/admin/lending/${loan.id}`}
                            className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            View
                          </Link>
                          {(loan.status === 'active' || loan.status === 'overdue') && (
                            <button
                              type="button"
                              onClick={() => setRecordTarget(loan)}
                              className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Record
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
            <p className="text-xs font-medium text-gray-500">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> results
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3 && currentPage < totalPages - 1) {
                        pageNum = currentPage - 2 + i;
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    const isActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 ${
                          isActive ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

      {showCreate && (
        <CreateLoanModal
          onClose={() => setShowCreate(false)}
          onCreated={(loan) => {
            setLoans((prev) => [loan, ...prev]);
            setShowCreate(false);
            showToast('Loan created successfully');
          }}
        />
      )}

      {recordTarget && (
        <RecordPaymentModal
          loan={recordTarget}
          onClose={() => setRecordTarget(null)}
          onRecorded={(payment) => {
            setLoans((prev) => prev.map((l) => l.id === payment.loanId
              ? {
                  ...l,
                  outstandingBalance: Math.max(0, l.outstandingBalance - payment.principalPortion),
                  status: l.outstandingBalance - payment.principalPortion <= 0 ? 'settled'
                        : l.status === 'overdue' ? 'active'
                        : l.status,
                }
              : l
            ));
            setRecordTarget(null);
            showToast('Payment recorded successfully');
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
