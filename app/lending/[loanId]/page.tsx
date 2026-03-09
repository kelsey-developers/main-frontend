'use client';

import React, { useEffect, useState } from 'react';
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

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanDetailPage({ params }: Props) {
  const { loanId } = use(params);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<RepaymentSchedule | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loan not found.</p>
        <Link href="/lending" className="mt-4 inline-block text-sm font-semibold text-[#0B5858] hover:underline">← Back to My Loans</Link>
      </div>
    );
  }

  const cfg = LOAN_STATUS_CONFIG[loan.status];
  const totalPaid = loan.totalPayable - loan.outstandingBalance;
  const paidPct = loan.totalPayable > 0 ? Math.min(100, (totalPaid / loan.totalPayable) * 100) : 0;
  const paidCount = schedule?.schedules.filter((s) => s.status === 'paid').length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Back */}
      <Link href="/lending" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        My Loans
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">{loan.id}</p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight max-w-xs">{loan.purpose}</h1>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ml-3 ${cfg.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* 4-col stats */}
        <div className="grid grid-cols-4 gap-4 py-4 border-t border-b border-gray-100 mb-4">
          {[
            { label: 'Principal', value: fmt(loan.principalAmount) },
            { label: 'Rate', value: `${loan.interestRate}%/mo` },
            { label: 'Term', value: `${loan.termMonths} months` },
            { label: 'Monthly', value: fmt(loan.monthlyPayment) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>{paidCount} of {loan.termMonths} payments made</span>
            <span>{paidPct.toFixed(0)}% paid</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${loan.status === 'settled' ? 'bg-gray-400' : loan.status === 'overdue' ? 'bg-red-400' : 'bg-[#0B5858]'}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{fmt(totalPaid)} paid</span>
            <span>{fmt(loan.outstandingBalance)} remaining</span>
          </div>
        </div>

        {/* Next payment due */}
        {loan.nextPaymentDue && loan.status !== 'settled' && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-[#0B5858]/5 text-[#0B5858]'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Next payment due: {new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · {fmt(loan.monthlyPayment)}
          </div>
        )}

        {/* Disbursed info */}
        {loan.disbursedAt && (
          <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div>
              <span className="block text-[10px] font-medium text-gray-400 mb-0.5">Disbursed</span>
              <span className="font-semibold text-gray-700">{fmt(loan.disbursedAmount)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-gray-400 mb-0.5">Processing Fee</span>
              <span className="font-semibold text-gray-700">{fmt(loan.processingFee)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-gray-400 mb-0.5">Disbursed On</span>
              <span className="font-semibold text-gray-700">{new Date(loan.disbursedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </div>

      {/* Repayment Schedule */}
      {schedule && schedule.schedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Repayment Schedule</p>
          <RepaymentScheduleTable schedules={schedule.schedules} />
        </div>
      )}

      {/* Payment History */}
      <PaymentHistoryAccordion payments={payments} />
    </div>
  );
}
