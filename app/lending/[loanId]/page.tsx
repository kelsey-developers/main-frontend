'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { getLoanById, getRepaymentSchedule, getPaymentHistory } from '@/services/lendingService';
import { LOAN_STATUS_CONFIG } from '@/types/lending';
import type { Loan, RepaymentSchedule, LoanPayment } from '@/types/lending';
import RepaymentScheduleTable from './components/RepaymentScheduleTable';
import PaymentHistoryAccordion from './components/PaymentHistoryAccordion';

interface Props {
  params: Promise<{ loanId: string }>;
}

type Tab = 'schedule' | 'payments';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanDetailPage({ params }: Props) {
  const { loanId } = use(params);
  const [loan, setLoan]         = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<RepaymentSchedule | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');

  /* sliding tab indicator */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const idx = activeTab === 'schedule' ? 0 : 1;
    const el  = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    Promise.all([
      getLoanById(loanId),
      getRepaymentSchedule(loanId),
      getPaymentHistory(loanId),
    ]).then(([l, s, p]) => {
      setLoan(l);
      setSchedule(s);
      setPayments(p);
      setLoading(false);
    });
  }, [loanId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm">Loan not found.</p>
        <Link href="/lending" className="mt-3 inline-block text-sm font-semibold text-[#0B5858] hover:underline">
          ← Back to My Loans
        </Link>
      </div>
    );
  }

  const cfg        = LOAN_STATUS_CONFIG[loan.status];
  const totalPaid  = loan.totalPayable - loan.outstandingBalance;
  const paidPct    = loan.totalPayable > 0 ? Math.min(100, (totalPaid / loan.totalPayable) * 100) : 0;
  const paidCount  = schedule?.schedules.filter((s) => s.status === 'paid').length ?? 0;
  const barColor   =
    loan.status === 'overdue'     ? 'bg-red-400' :
    loan.status === 'settled'     ? 'bg-gray-300' :
    loan.status === 'written_off' ? 'bg-gray-400' :
                                    'bg-[#0B5858]';

  return (
    <div className="py-8 space-y-5 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div>
        <Link
          href="/lending"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-[#0B5858] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Loans
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* 1. Identity Block */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="min-w-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap mb-3" style={cfg.chipStyle}>
                {cfg.label}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight tracking-tight">{loan.purpose}</h1>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none shrink-0 pt-2">{loan.id}</p>
          </div>

          {/* 2. Core Terms Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Principal Amount', value: fmt(loan.principalAmount) },
              { label: 'Interest Rate',    value: `${loan.interestRate}%/mo` },
              { label: 'Loan Term',        value: `${loan.termMonths} Months` },
              { label: 'Monthly Payment',  value: fmt(loan.monthlyPayment) },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-base font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* 3. Repayment Status Block */}
          <div className="bg-gray-50/50 rounded-2xl p-5 sm:p-6 border border-gray-50">
            <div className="flex items-end justify-between mb-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Repayment Progress</p>
                <p className="text-sm font-medium text-gray-600">
                  {paidCount} of {loan.termMonths} payments completed
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tighter">
                {paidPct.toFixed(0)}<span className="text-sm ml-0.5">%</span>
              </p>
            </div>

            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${paidPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <span>{fmt(totalPaid)} Paid</span>
              <span>{fmt(loan.outstandingBalance)} Remaining</span>
            </div>

            {/* Next Payment "Call to Action" */}
            {loan.nextPaymentDue && loan.status !== 'settled' && (
              <div className={`mt-6 flex items-center gap-3 rounded-xl px-4 py-3 border ${
                loan.status === 'overdue'
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : 'bg-white border-gray-100 text-[#0B5858] shadow-sm'
              }`}>
                <div className={`p-2 rounded-lg ${loan.status === 'overdue' ? 'bg-red-100' : 'bg-[#0B5858]/10'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Payment Due</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · {fmt(loan.monthlyPayment)}
                  </p>
                </div>
                {loan.status === 'overdue' && <span className="text-[10px] font-black tracking-tighter bg-red-600 text-white px-2 py-0.5 rounded">OVERDUE</span>}
              </div>
            )}
          </div>
        </div>

        {/* 4. Secondary/Audit Footer */}
        {loan.disbursedAt && (
          <div className="bg-white border-t border-gray-100 px-6 sm:px-8 py-5">
            <div className="grid grid-cols-3 gap-8">
              {[
                { label: 'Disbursed Amount', value: fmt(loan.disbursedAmount) },
                { label: 'Processing Fee',   value: fmt(loan.processingFee) },
                { label: 'Disbursement Date', value: new Date(loan.disbursedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
                  <span className="text-xs font-bold text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs and table — no card wrapper */}
      {(schedule && schedule.schedules.length > 0) || payments.length > 0 ? (
        <>
          {/* Tab nav — grey baseline matches /lending page (gradient fade) */}
          <div className="relative -mb-px pb-[1px]">
            <div className="flex">
              {([
                { key: 'schedule', label: 'Repayment Schedule' },
                { key: 'payments', label: 'Payment History' },
              ] as { key: Tab; label: string }[]).map(({ key, label }, i) => (
                <button
                  key={key}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`py-3.5 pr-6 text-sm font-semibold transition-colors cursor-pointer ${activeTab === key ? 'text-[#0B5858]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Grey baseline — same gradient as /lending page */}
            <div
              className="pointer-events-none absolute -bottom-px left-0 h-px w-[95%] z-0"
              style={{
                background: 'linear-gradient(to right, rgba(209,213,219,1) 0%, rgba(209,213,219,0.5) 40%, transparent 70%)',              }}
              aria-hidden
            />
            <div
              className="absolute -bottom-px left-0 h-1 bg-[#0B5858] transition-all duration-200 z-10"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>

          {/* Tab content */}
          <div className="pt-5">
            {activeTab === 'schedule' && schedule && schedule.schedules.length > 0 && (
              <RepaymentScheduleTable schedules={schedule.schedules} />
            )}
            {activeTab === 'payments' && (
              <PaymentHistoryAccordion payments={payments} />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
