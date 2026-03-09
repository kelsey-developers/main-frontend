'use client';

import React, { useState } from 'react';
import { PAYMENT_METHOD_LABELS } from '@/types/lending';
import type { LoanPayment } from '@/types/lending';

interface Props {
  payments: LoanPayment[];
}

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentHistoryAccordion({ payments }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Payment History</span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0B5858]/10 text-[#0B5858] text-[10px] font-bold">
            {payments.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {payments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 px-5">
              {payments.map((payment) => (
                <div key={payment.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{fmt(payment.amount)}</span>
                      {payment.penaltyAmount > 0 && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                          +{fmt(payment.penaltyAmount)} penalty
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0B5858] bg-[#0B5858]/5 px-2 py-0.5 rounded-full border border-[#0B5858]/10">
                        {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
                      <span>{fmt(payment.principalPortion)} principal · {fmt(payment.interestPortion)} interest</span>
                      {payment.referenceNumber && (
                        <span className="font-mono text-gray-500">Ref: {payment.referenceNumber}</span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">{payment.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {new Date(payment.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
