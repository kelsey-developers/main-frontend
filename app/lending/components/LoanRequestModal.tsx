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

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';

export default function LoanRequestModal({ borrowerId, onClose }: Props) {
  const [amount, setAmount]       = useState('');
  const [purpose, setPurpose]     = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
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

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixed; body scrolls on small viewports */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Request a Loan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {submitted ? (
          <div className="px-4 sm:px-5 py-8 sm:py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[#0B5858]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Request Submitted!</h3>
            <p className="text-sm text-gray-500 mb-1">Your loan request is now <strong>pending admin review</strong>.</p>
            <p className="text-sm text-gray-400 mb-6">You'll be notified once a decision is made. This usually takes 1–2 business days.</p>
            <button
              onClick={onClose}
              type="button"
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0a4a4a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-5 py-4 sm:py-5 space-y-4">

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Requested Amount</label>
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
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Preferred Term</label>
              <div className="flex gap-2">
                {TERM_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTermMonths(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${termMonths === t ? 'bg-[#0B5858] text-white border-[#0B5858] shadow-sm shadow-[#0B5858]/20' : 'bg-white text-gray-500 border-gray-200 hover:border-[#0B5858]/30'}`}
                  >
                    {t}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Purpose</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none ${errors.purpose ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''}`}
                placeholder="Briefly describe why you need this loan…"
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  setErrors((prev) => { const n = { ...prev }; delete n.purpose; return n; });
                }}
              />
              {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
            </div>

            {/* EMI Preview */}
            {amountNum >= 1000 && (
              <div className="bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl p-4 border border-[#0B5858]/10">
                <p className="text-[10px] font-bold text-[#0B5858] uppercase tracking-widest mb-3">Estimated Payment · 2%/mo flat</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Monthly',   value: fmt(monthlyPayment) },
                    { label: 'Interest',  value: fmt(totalInterest) },
                    { label: 'Total Due', value: fmt(totalPayable) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">* Actual rates set by admin upon approval.</p>
              </div>
            )}

            <p className="text-xs text-gray-400 leading-relaxed">
              Your request will be reviewed by an administrator. You'll be notified once a decision is made.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0a4a4a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
