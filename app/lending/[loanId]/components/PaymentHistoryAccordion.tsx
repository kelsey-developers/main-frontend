'use client';

import React from 'react';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_CHIP_STYLE } from '@/types/lending';
import type { LoanPayment } from '@/types/lending';

interface Props {
  payments: LoanPayment[];
}

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentHistoryAccordion({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M 17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No payments recorded yet.</p>
        <p className="text-xs text-gray-400 mt-1">Your payment history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{fmt(payment.amount)}</span>
                {payment.penaltyAmount > 0 && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">
                    +{fmt(payment.penaltyAmount)} penalty
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={PAYMENT_METHOD_CHIP_STYLE[payment.paymentMethod]}>
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                </span>
              </div>
              {payment.referenceNumber && (
                <p className="text-[11px] font-mono text-gray-400 mt-1">Ref: {payment.referenceNumber}</p>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 shrink-0">
              {new Date(payment.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Principal / Interest split */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Principal</p>
              <p className="text-xs font-bold text-gray-700">{fmt(payment.principalPortion)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Interest</p>
              <p className="text-xs font-bold text-gray-700">{fmt(payment.interestPortion)}</p>
            </div>
          </div>

          {payment.notes && (
            <p className="text-[11px] text-gray-400 mt-2 italic">{payment.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
