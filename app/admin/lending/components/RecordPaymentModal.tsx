'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { recordPayment } from '@/services/lendingService';
import { PAYMENT_METHOD_LABELS } from '@/types/lending';
import type { Loan, LoanPayment, LendingPaymentMethod } from '@/types/lending';

interface Props {
  loan: Loan;
  onClose: () => void;
  onRecorded: (payment: LoanPayment) => void;
}

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as LendingPaymentMethod[];

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RecordPaymentModal({ loan, onClose, onRecorded }: Props) {
  const [amount, setAmount] = useState(loan.monthlyPayment.toFixed(2));
  const [penalty, setPenalty] = useState('0');
  const [method, setMethod] = useState<LendingPaymentMethod>('gcash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const amountNum = parseFloat(amount) || 0;
  const penaltyNum = parseFloat(penalty) || 0;
  const totalPayment = amountNum + penaltyNum;

  // Compute principal / interest split (flat rate assumption)
  const interestPerPeriod = loan.principalAmount * (loan.interestRate / 100);
  const principalPortion = Math.max(0, amountNum - interestPerPeriod);
  const interestPortion = Math.min(amountNum, interestPerPeriod);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!amountNum || amountNum <= 0) err.amount = 'Enter a valid amount';
    if (amountNum > loan.outstandingBalance + interestPerPeriod * loan.termMonths) err.amount = 'Amount exceeds outstanding balance';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payment = await recordPayment(loan.id, {
        loanId: loan.id,
        amount: totalPayment,
        principalPortion,
        interestPortion,
        penaltyAmount: penaltyNum,
        paymentMethod: method,
        referenceNumber: reference || undefined,
        notes: notes || undefined,
        recordedById: 'admin-001',
        paidAt: new Date().toISOString(),
      });
      onRecorded(payment);
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-500 mt-0.5">{loan.borrowerName} · {loan.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Outstanding balance reference */}
          <div className="bg-[#0B5858]/5 rounded-xl px-4 py-3 flex items-center justify-between border border-[#0B5858]/10">
            <span className="text-sm font-medium text-gray-600">Outstanding Balance</span>
            <span className="text-sm font-bold text-[#0B5858]">{fmt(loan.outstandingBalance)}</span>
          </div>

          {/* Amount + Penalty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Amount Paid</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputClass} pl-8 ${errors.amount ? 'border-red-300' : ''}`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => { const n = { ...p }; delete n.amount; return n; }); }}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className={labelClass}>Penalty <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputClass} pl-8`}
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Split preview */}
          {amountNum > 0 && (
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 -mt-2 px-1">
              <span>Principal portion: <strong className="text-gray-700">{fmt(principalPortion)}</strong></span>
              <span>Interest portion: <strong className="text-gray-700">{fmt(interestPortion)}</strong></span>
            </div>
          )}

          {/* Method */}
          <div>
            <label className={labelClass}>Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${method === m ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0B5858]/30'}`}
                >
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className={labelClass}>Reference Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="GCash ref, bank ref, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="Any additional notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Total */}
          {totalPayment > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Total Collected</span>
              <span className="text-lg font-bold text-[#0B5858]">{fmt(totalPayment)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50">
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
