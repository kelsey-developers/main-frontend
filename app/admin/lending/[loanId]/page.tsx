'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import {
  getLoanById,
  getRepaymentSchedule,
  getPaymentHistory,
  approveLoan,
  rejectLoan,
  markOverdue,
  writeOffLoan,
} from '@/services/lendingService';
import { LOAN_STATUS_CONFIG } from '@/types/lending';
import type { Loan, RepaymentSchedule, LoanPayment } from '@/types/lending';
import ScheduleTab from './components/ScheduleTab';
import PaymentsTab from './components/PaymentsTab';

interface Props {
  params: Promise<{ loanId: string }>;
}

type Tab = 'schedule' | 'payments';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtShort(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE_BADGE: Record<string, { classes: string; label: string }> = {
  agent:   { classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20', label: 'Agent' },
  user:    { classes: 'bg-blue-50 text-blue-700 border border-blue-200',             label: 'User' },
  cleaner: { classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200',       label: 'Cleaner' },
};

export default function AdminLoanDetailPage({ params }: Props) {
  const { loanId } = use(params);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<RepaymentSchedule | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action: 'approve' | 'reject' | 'overdue' | 'writeoff') => {
    if (!loan) return;
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await approveLoan(loan.id);
        setLoan((l) => l ? { ...l, status: 'active' } : l);
        showToast('success', 'Loan approved successfully.');
      } else if (action === 'reject') {
        await rejectLoan(loan.id, 'Admin decision');
        setLoan((l) => l ? { ...l, status: 'rejected' } : l);
        showToast('success', 'Loan rejected.');
      } else if (action === 'overdue') {
        await markOverdue(loan.id);
        setLoan((l) => l ? { ...l, status: 'overdue' } : l);
        showToast('success', 'Loan marked as overdue.');
      } else if (action === 'writeoff') {
        await writeOffLoan(loan.id, 'Admin decision');
        setLoan((l) => l ? { ...l, status: 'written_off' } : l);
        showToast('success', 'Loan written off.');
      }
    } catch {
      showToast('error', 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentRecorded = (payment: LoanPayment) => {
    setPayments((prev) => [payment, ...prev]);
    setLoan((l) => l ? { ...l, outstandingBalance: Math.max(0, l.outstandingBalance - payment.principalPortion) } : l);
    showToast('success', `Payment of ${fmt(payment.amount)} recorded.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loan not found.</p>
        <Link href="/admin/lending" className="mt-4 inline-block text-sm font-semibold text-[#0B5858] hover:underline">← Back to Lending</Link>
      </div>
    );
  }

  const cfg = LOAN_STATUS_CONFIG[loan.status];
  const roleBadge = ROLE_BADGE[loan.borrowerRole] ?? ROLE_BADGE.user;
  const totalPaid = loan.totalPayable - loan.outstandingBalance;
  const paidPct = loan.totalPayable > 0 ? Math.min(100, (totalPaid / loan.totalPayable) * 100) : 0;
  const paidCount = schedule?.schedules.filter((s) => s.status === 'paid').length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in-up ${toast.type === 'success' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-red-600 text-white border-red-600'}`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <Link
        href="/admin/lending"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Lending Dashboard
      </Link>

      {/* Loan Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

        {/* Top row: borrower + status */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{loan.borrowerName}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.classes}`}>
                {roleBadge.label}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400">{loan.id}</p>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">{loan.purpose}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.classes}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {loan.collateral && (
              <p className="text-xs text-gray-400 italic">Collateral: {loan.collateral}</p>
            )}
          </div>
        </div>

        {/* 4-col key stats */}
        <div className="grid grid-cols-4 gap-4 py-4 border-t border-b border-gray-100 mb-4">
          {[
            { label: 'Principal', value: fmt(loan.principalAmount) },
            { label: 'Rate', value: `${loan.interestRate}%/mo (${loan.interestType})` },
            { label: 'Term', value: `${loan.termMonths} months` },
            { label: 'Monthly', value: fmt(loan.monthlyPayment) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
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

        {/* Next payment / Next due */}
        {loan.nextPaymentDue && loan.status !== 'settled' && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-[#0B5858]/5 text-[#0B5858]'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Next payment due: {fmtDate(loan.nextPaymentDue)} · {fmt(loan.monthlyPayment)}
            {loan.status === 'overdue' && <span className="ml-auto font-bold">⚠ OVERDUE</span>}
          </div>
        )}

        {/* Disbursement info */}
        {loan.disbursedAt && (
          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Disbursed Amount</p>
              <p className="text-sm font-bold text-gray-900">{fmt(loan.disbursedAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Processing Fee</p>
              <p className="text-sm font-bold text-gray-900">{fmt(loan.processingFee)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Disbursed On</p>
              <p className="text-sm font-bold text-gray-900">{fmtShort(loan.disbursedAt)}</p>
            </div>
          </div>
        )}
        {loan.approvedAt && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approved {fmtShort(loan.approvedAt)} by Admin
          </div>
        )}
      </div>

      {/* Admin Action Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Admin Actions</p>
        <div className="flex flex-wrap gap-2">
          {loan.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                ✓ Approve Loan
              </button>
              <button
                type="button"
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </>
          )}
          {loan.status === 'active' && (
            <button
              type="button"
              onClick={() => handleAction('overdue')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-bold text-[#0B5858] bg-[#FACC15]/10 hover:bg-[#FACC15]/20 border border-[#FACC15]/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              Mark as Overdue
            </button>
          )}
          {(loan.status === 'active' || loan.status === 'overdue') && (
            <button
              type="button"
              onClick={() => handleAction('writeoff')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Write Off
            </button>
          )}
          {(loan.status === 'settled' || loan.status === 'rejected' || loan.status === 'written_off') && (
            <p className="text-sm text-gray-400 py-2">No actions available for this loan.</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-gray-100">
          {([
            { key: 'schedule', label: 'Repayment Schedule', count: schedule?.schedules.length ?? 0 },
            { key: 'payments', label: 'Payment History', count: payments.length },
          ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${activeTab === key ? 'border-[#0B5858] text-[#0B5858] bg-[#0B5858]/3' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              {label}
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${activeTab === key ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'schedule' && schedule && (
            <ScheduleTab
              loan={loan}
              schedules={schedule.schedules}
              onPaymentRecorded={handlePaymentRecorded}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsTab
              loan={loan}
              payments={payments}
              onPaymentRecorded={handlePaymentRecorded}
            />
          )}
        </div>
      </div>
    </div>
  );
}
