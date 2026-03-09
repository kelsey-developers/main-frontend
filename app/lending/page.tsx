'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBorrowerLoans } from '@/services/lendingService';
import { LOAN_STATUS_CONFIG } from '@/types/lending';
import type { Loan } from '@/types/lending';
import LoanRequestModal from './components/LoanRequestModal';

// Mock logged-in borrower — swap with real auth
const BORROWER_ID = 'agent-001';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LoanCard({ loan }: { loan: Loan }) {
  const cfg = LOAN_STATUS_CONFIG[loan.status];
  const totalPaid = loan.totalPayable - loan.outstandingBalance;
  const paidPct = loan.totalPayable > 0 ? Math.min(100, (totalPaid / loan.totalPayable) * 100) : 0;

  return (
    <Link
      href={`/lending/${loan.id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0B5858]/20 transition-all p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Loan ID · {loan.id}</p>
          <p className="text-base font-bold text-gray-900">{loan.purpose.length > 45 ? loan.purpose.slice(0, 45) + '…' : loan.purpose}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ml-3 ${cfg.classes}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* 4-col stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Principal', value: fmt(loan.principalAmount) },
          { label: 'Rate', value: `${loan.interestRate}%/mo` },
          { label: 'Term', value: `${loan.termMonths} mos` },
          { label: 'Monthly', value: fmt(loan.monthlyPayment) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {(loan.status === 'active' || loan.status === 'overdue' || loan.status === 'settled') && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-gray-500">{fmt(totalPaid)} paid</span>
            <span className="text-[11px] font-medium text-gray-500">{paidPct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${loan.status === 'settled' ? 'bg-gray-400' : loan.status === 'overdue' ? 'bg-red-400' : 'bg-[#0B5858]'}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Next payment */}
      {loan.nextPaymentDue && loan.status !== 'settled' && (
        <div className={`mt-3 flex items-center gap-2 text-xs font-medium rounded-xl px-3 py-2 ${loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-[#0B5858]/5 text-[#0B5858]'}`}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Next due: {new Date(loan.nextPaymentDue).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} · {fmt(loan.monthlyPayment)}
          {loan.status === 'overdue' && <span className="ml-auto font-bold">OVERDUE</span>}
        </div>
      )}
    </Link>
  );
}

export default function LendingPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    getBorrowerLoans(BORROWER_ID).then((data) => {
      setLoans(data);
      setLoading(false);
    });
  }, []);

  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
  const pastLoans = loans.filter((l) => l.status === 'settled' || l.status === 'written_off' || l.status === 'rejected');
  const pendingLoans = loans.filter((l) => l.status === 'pending');

  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstandingBalance, 0);
  const nextDue = activeLoans
    .filter((l) => l.nextPaymentDue)
    .sort((a, b) => new Date(a.nextPaymentDue!).getTime() - new Date(b.nextPaymentDue!).getTime())[0];
  const hasOverdue = activeLoans.some((l) => l.status === 'overdue');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Loans</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelsey's Homestay · Money Lending</p>
      </div>

      {/* Outstanding Balance Card */}
      {activeLoans.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B5858] to-[#073A3A] p-6 text-white shadow-lg shadow-[#0B5858]/20">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 bg-[#FACC15]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Outstanding Balance</p>
            <p className="text-3xl font-bold tracking-tight">{fmt(totalOutstanding)}</p>
            {nextDue && (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${hasOverdue ? 'bg-red-500/20 text-red-200' : 'bg-white/10 text-white/80'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Next due: {new Date(nextDue.nextPaymentDue!).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} · {fmt(nextDue.monthlyPayment)}
                {hasOverdue && <span className="ml-1 font-bold">⚠ OVERDUE</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active / Overdue Loans */}
      {activeLoans.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Active Loans</p>
          <div className="space-y-3">
            {activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
          </div>
        </section>
      )}

      {/* Pending Loans */}
      {pendingLoans.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pending Review</p>
          <div className="space-y-3">
            {pendingLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
          </div>
        </section>
      )}

      {/* Past Loans */}
      {pastLoans.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Past Loans</p>
          <div className="space-y-3">
            {pastLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {loans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">No loans yet</h3>
          <p className="text-sm text-gray-400 mb-6">You don't have any active or past loans.</p>
        </div>
      )}

      {/* Request a Loan */}
      {activeLoans.length === 0 && (
        <button
          onClick={() => setShowRequest(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
        >
          Request a Loan
        </button>
      )}

      {showRequest && <LoanRequestModal borrowerId={BORROWER_ID} onClose={() => setShowRequest(false)} />}
    </div>
  );
}
