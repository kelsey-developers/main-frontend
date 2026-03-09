'use client';

import React, { useState } from 'react';
import { PAYMENT_METHOD_LABELS } from '@/types/lending';
import type { Loan, LoanPayment } from '@/types/lending';
import RecordPaymentModal from '../../components/RecordPaymentModal';

interface Props {
  loan: Loan;
  payments: LoanPayment[];
  onPaymentRecorded: (payment: LoanPayment) => void;
}

const METHOD_ICON: Record<string, string> = {
  cash: '💵',
  gcash: '📱',
  maya: '🟣',
  bank_transfer: '🏦',
  salary_deduction: '📋',
};

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function PaymentsTab({ loan, payments, onPaymentRecorded }: Props) {
  const [showModal, setShowModal] = useState(false);

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalPenalties = payments.reduce((s, p) => s + p.penaltyAmount, 0);

  return (
    <div className="space-y-4">

      {/* Header action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Total Collected</p>
            <p className="text-lg font-bold text-[#0B5858]">{fmt(totalCollected)}</p>
          </div>
          {totalPenalties > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Penalties</p>
              <p className="text-lg font-bold text-red-600">{fmt(totalPenalties)}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Empty state */}
      {payments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">No payments recorded yet</p>
          <p className="text-xs text-gray-400">Click "Record Payment" to log the first payment.</p>
        </div>
      )}

      {/* Payment cards (most recent first) */}
      {payments.length > 0 && (
        <div className="space-y-3">
          {[...payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).map((p, idx) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{METHOD_ICON[p.paymentMethod] ?? '💳'}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{fmt(p.amount)}</p>
                    <p className="text-xs text-gray-500">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-500">{fmtDateTime(p.paidAt)}</p>
                  {p.referenceNumber && (
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">{p.referenceNumber}</p>
                  )}
                </div>
              </div>

              {/* Principal / Interest split */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Principal</p>
                  <p className="text-xs font-bold text-gray-700">{fmt(p.principalPortion)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Interest</p>
                  <p className="text-xs font-bold text-gray-700">{fmt(p.interestPortion)}</p>
                </div>
                {p.penaltyAmount > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-0.5">Penalty</p>
                    <p className="text-xs font-bold text-red-600">{fmt(p.penaltyAmount)}</p>
                  </div>
                )}
              </div>

              {p.notes && (
                <p className="text-xs text-gray-500 mt-2 italic">{p.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RecordPaymentModal
          loan={loan}
          onClose={() => setShowModal(false)}
          onRecorded={(payment) => {
            setShowModal(false);
            onPaymentRecorded(payment);
          }}
        />
      )}
    </div>
  );
}
