'use client';

import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import Link from 'next/link';
import { getBorrowerLoans } from '@/services/lendingService';
import { LOAN_STATUS_CONFIG } from '@/types/lending';
import type { Loan, LoanStatus } from '@/types/lending';
import LoanRequestModal from './components/LoanRequestModal';

// Mock logged-in borrower — swap with real auth
const BORROWER_ID = 'agent-001';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── Loan Card ─────────────────────────────────────────────── */
function LoanCard({ loan }: { loan: Loan }) {
  const cfg = LOAN_STATUS_CONFIG[loan.status];
  const totalPaid = loan.totalPayable - loan.outstandingBalance;
  const paidPct = loan.totalPayable > 0 ? Math.min(100, (totalPaid / loan.totalPayable) * 100) : 0;

  const barColor =
    loan.status === 'overdue' ? 'bg-red-500' :
    loan.status === 'settled' ? 'bg-emerald-500' :
    loan.status === 'pending' ? 'bg-amber-400' :
    'bg-[#0B5858]';

  const showProgress = ['active', 'overdue', 'settled'].includes(loan.status);

  return (
    <Link
      href={`/lending/${loan.id}`}
      className="group flex flex-col h-full w-full min-w-0 max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 active:scale-[0.99] hover:shadow-md hover:border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5858]/30 focus-visible:ring-offset-2 cursor-pointer"
      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
    >
      <div className="flex-1 flex flex-col p-5 sm:p-6">
        {/* 1. Header Group: Status & ID */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={cfg.chipStyle}>
            {cfg.label}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            {loan.id}
          </span>
        </div>

        {/* 2. Primary Group: Purpose */}
        <div className="min-h-[2.8rem] sm:min-h-[3.2rem] flex flex-col justify-start">
          <h2 className="text-base sm:text-[1.125rem] font-bold text-gray-900 leading-tight tracking-tight line-clamp-2">
            {loan.purpose}
          </h2>
        </div>

        {/* 3. Data Group: The Numbers */}
        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-4 gap-2">
          {[
            { label: 'Principal', value: fmt(loan.principalAmount) },
            { label: 'Rate',      value: `${loan.interestRate}%` },
            { label: 'Term',      value: `${loan.termMonths}m` },
            { label: 'Monthly',   value: fmt(loan.monthlyPayment) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">{label}</p>
              <p className="text-[13px] sm:text-sm font-bold text-gray-900 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* 4. Progress & Footer */}
        <div className="mt-auto pt-5">
          {showProgress && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-gray-500">{fmt(totalPaid)} paid</span>
                <span className="text-[11px] font-bold text-gray-900">{paidPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>
          )}

          {loan.nextPaymentDue && loan.status !== 'settled' && (
            <div className={`flex items-center gap-2 text-[11px] font-bold rounded-xl px-3 py-2.5 ${
              loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
            }`}>
              <svg className="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">
                Next: {new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {fmt(loan.monthlyPayment)}
              </span>
              {loan.status === 'overdue' && <span className="ml-auto text-[9px] tracking-widest">OVERDUE</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Tab Indicator Hook ────────────────────────────────────── */
type TabKey = 'active' | 'history';

/* ─── Page ──────────────────────────────────────────────────── */
export default function LendingPage() {
  const [loans, setLoans]           = useState<Loan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<TabKey>('active');
  const [showRequest, setShowRequest] = useState(false);

  /** Sliding tab indicator — refs on buttons so measurement works on first paint; min width fallback keeps line visible */
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 120 });

  const updateIndicator = useCallback(() => {
    const activeIndex = activeTab === 'active' ? 0 : 1;
    const btn = tabButtonRefs.current[activeIndex];
    if (!btn) return;
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    setIndicatorStyle({
      left,
      width: width > 0 ? width : 120,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateIndicator]);

  /** After load, run indicator update on next frame and again after a short delay so teal line is visible */
  useEffect(() => {
    if (loading) return;
    const t1 = requestAnimationFrame(() => updateIndicator());
    const t2 = setTimeout(updateIndicator, 50);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
    };
  }, [loading, updateIndicator]);

  useEffect(() => {
    getBorrowerLoans(BORROWER_ID).then((data) => {
      setLoans(data);
      setLoading(false);
    });
  }, []);

  const activeLoans  = loans.filter((l) => l.status === 'active' || l.status === 'overdue' || l.status === 'pending');
  const historyLoans = loans.filter((l) => l.status === 'settled' || l.status === 'written_off' || l.status === 'rejected');
  const displayed = activeTab === 'active' ? activeLoans : historyLoans;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>

      {/* Header — page title same as cleaning hub: text-2xl font-bold text-gray-900 tracking-tight */}
      <div style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Loans</h1>
      </div>

      {/* Tab bar — sliding indicator; Request a Loan on same row (same as cleaning hub) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div className="relative inline-flex gap-8 -mb-px pb-[1px] w-full max-w-md">
        {([
          { key: 'active', label: 'Active & Pending' },
          { key: 'history', label: 'History' },
        ] as { key: TabKey; label: string }[]).map(({ key, label }, index) => (
          <button
            key={key}
            ref={(el) => { tabButtonRefs.current[index] = el; }}
            type="button"
            onClick={() => setActiveTab(key)}
            className="px-0 pt-2.5 pb-2.5 text-left text-base sm:text-lg font-semibold transition-colors duration-200 cursor-pointer text-gray-500 hover:text-gray-900 whitespace-nowrap"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
            <span className={activeTab === key ? 'text-[#0B5858]' : ''}>
              {label}
            </span>
          </button>
        ))}
        {/* Grey baseline — gradient fade like cleaning hub */}
        <div
          className="pointer-events-none absolute -bottom-px left-0 h-px w-[95%] z-0"
          style={{
            background: 'linear-gradient(to right, rgba(209,213,219,1) 0%, rgba(209,213,219,0.7) 60%, rgba(209,213,219,0.25) 85%, transparent 100%)',
          }}
          aria-hidden
        />
        {/* Teal sliding indicator */}
        <div
          className="absolute -bottom-px left-0 h-1 bg-[#0B5858] transition-all duration-300 ease-out z-10"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          aria-hidden
        />
        </div>
        <div className="w-full sm:w-auto flex justify-end shrink-0">
          <button
            onClick={() => setShowRequest(true)}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0a4a4a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20 sm:pb-2.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="whitespace-nowrap">Request a Loan</span>
          </button>
        </div>
      </div>

      {/* Tab content — no card wrapper */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {activeTab === 'active' ? 'No active loans' : 'No loan history yet'}
          </h3>
          <p className="text-xs font-normal text-gray-500 mb-5 leading-snug">
            {activeTab === 'active' ? "You don't have any active or pending loans." : "Settled, rejected, or written-off loans will appear here."}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={() => setShowRequest(true)}
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0a4a4a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
            >
              Request a Loan
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap justify-start gap-4 sm:gap-6">
          {displayed.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
        </div>
      )}

      {showRequest && <LoanRequestModal borrowerId={BORROWER_ID} onClose={() => setShowRequest(false)} />}
    </div>
  );
}
