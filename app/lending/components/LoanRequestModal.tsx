'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { requestLoan } from '@/services/lendingService';
import { computeEMI } from '@/types/lending';

interface Props {
  borrowerId: string;
  onClose: () => void;
}

const TERM_OPTIONS = [3, 6, 12, 24];

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LoanRequestModal({ borrowerId, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  // Preview at 2%/month flat (default rate shown to borrower)
  const { monthlyPayment, totalPayable, totalInterest } = amountNum > 0
    ? computeEMI(amountNum, 2, termMonths)
    : { monthlyPayment: 0, totalPayable: 0, totalInterest: 0 };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!amountNum || amountNum < 1000) err.amount = 'Minimum loan amount is ₱1,000';
    if (amountNum > 100000) err.amount = 'Maximum loan amount is ₱100,000';
    if (!purpose.trim() || purpose.trim().length < 10) err.purpose = 'Please describe your purpose (at least 10 characters)';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await requestLoan({ borrowerId, requestedAmount: amountNum, purpose, termMonths });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request a Loan</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#0B5858]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Request Submitted!</h3>
            <p className="text-sm text-gray-500 mb-1">Your loan request is now <strong>pending admin review</strong>.</p>
            <p className="text-sm text-gray-400 mb-6">You'll be notified once a decision is made. This usually takes 1–2 business days.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                <input
                  type="text"
                  className={`${inputClass} pl-8 ${errors.amount ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''}`}
                  placeholder="10,000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrors((prev) => { const n = { ...prev }; delete n.amount; return n; });
                  }}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            {/* Term */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Term</label>
              <div className="flex gap-2">
                {TERM_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTermMonths(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${termMonths === t ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0B5858]/30'}`}
                  >
                    {t}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none ${errors.purpose ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''}`}
                placeholder="Briefly describe why you need this loan..."
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  setErrors((prev) => { const n = { ...prev }; delete n.purpose; return n; });
                }}
              />
              {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
            </div>

            {/* Preview */}
            {amountNum >= 1000 && (
              <div className="bg-[#0B5858]/5 rounded-xl p-4 space-y-2 border border-[#0B5858]/10">
                <p className="text-[10px] font-bold text-[#0B5858] uppercase tracking-widest mb-2">Estimated Payment (at 2%/mo flat)</p>
                {[
                  { label: 'Monthly Payment', value: fmt(monthlyPayment) },
                  { label: 'Total Interest', value: fmt(totalInterest) },
                  { label: 'Total Payable', value: fmt(totalPayable) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="font-bold text-gray-900">{value}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 mt-1">* Actual rates are set by the administrator upon approval.</p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 leading-relaxed">
              Your request will be reviewed by an administrator. You will be notified once a decision is made.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
