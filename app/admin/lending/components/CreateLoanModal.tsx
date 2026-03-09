'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createLoan } from '@/services/lendingService';
import { computeEMI } from '@/types/lending';
import type { Loan, InterestType, BorrowerRole } from '@/types/lending';

interface Props {
  onClose: () => void;
  onCreated: (loan: Loan) => void;
}

const BORROWER_OPTIONS = [
  { id: 'agent-001', name: 'Juan Dela Cruz', role: 'agent' as BorrowerRole },
  { id: 'agent-002', name: 'Maria Santos', role: 'agent' as BorrowerRole },
  { id: 'agent-003', name: 'Roberto Cruz', role: 'agent' as BorrowerRole },
  { id: 'agent-004', name: 'Pedro Flores', role: 'agent' as BorrowerRole },
  { id: 'agent-005', name: 'Ana Reyes', role: 'agent' as BorrowerRole },
  { id: 'user-001', name: 'Grace Villanueva', role: 'user' as BorrowerRole },
  { id: 'user-002', name: 'Carlos Tan', role: 'user' as BorrowerRole },
  { id: 'user-003', name: 'Luz Marasigan', role: 'user' as BorrowerRole },
];

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CreateLoanModal({ onClose, onCreated }: Props) {
  const [borrowerId, setBorrowerId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('2');
  const [interestType, setInterestType] = useState<InterestType>('flat');
  const [term, setTerm] = useState('12');
  const [fee, setFee] = useState('500');
  const [purpose, setPurpose] = useState('');
  const [collateral, setCollateral] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const principalNum = parseFloat(principal.replace(/,/g, '')) || 0;
  const rateNum = parseFloat(rate) || 0;
  const termNum = parseInt(term) || 0;
  const feeNum = parseFloat(fee) || 0;
  const disbursed = Math.max(0, principalNum - feeNum);

  const { monthlyPayment, totalPayable, totalInterest } = principalNum > 0 && rateNum > 0 && termNum > 0
    ? computeEMI(principalNum, rateNum, termNum)
    : { monthlyPayment: 0, totalPayable: 0, totalInterest: 0 };

  const validate = useCallback(() => {
    const err: Record<string, string> = {};
    if (!borrowerId) err.borrowerId = 'Select a borrower';
    if (!principalNum || principalNum < 100) err.principal = 'Enter a valid principal amount';
    if (!rateNum || rateNum <= 0 || rateNum > 100) err.rate = 'Enter a valid rate (0–100%)';
    if (!termNum || termNum < 1 || termNum > 60) err.term = 'Term must be between 1 and 60 months';
    if (!purpose.trim()) err.purpose = 'Purpose is required';
    setErrors(err);
    return Object.keys(err).length === 0;
  }, [borrowerId, principalNum, rateNum, termNum, purpose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const borrower = BORROWER_OPTIONS.find((b) => b.id === borrowerId)!;
    try {
      const loan = await createLoan({
        borrowerId,
        borrowerName: borrower.name,
        borrowerRole: borrower.role,
        principalAmount: principalNum,
        interestRate: rateNum,
        interestType,
        termMonths: termNum,
        disbursedAmount: disbursed,
        processingFee: feeNum,
        status: 'active',
        purpose,
        collateral: collateral || undefined,
        approvedById: 'admin-001',
        approvedAt: new Date().toISOString(),
        disbursedAt: new Date().toISOString(),
        nextPaymentDue: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d.toISOString().split('T')[0];
        })(),
      });
      onCreated(loan);
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
        className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Loan</h2>
            <p className="text-xs text-gray-500 mt-0.5">EMI is computed automatically as you fill in the fields</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Borrower */}
          <div>
            <label className={labelClass}>Borrower</label>
            <select
              className={`${inputClass} ${errors.borrowerId ? 'border-red-300' : ''}`}
              value={borrowerId}
              onChange={(e) => { setBorrowerId(e.target.value); setErrors((p) => { const n = { ...p }; delete n.borrowerId; return n; }); }}
            >
              <option value="">Select borrower…</option>
              {BORROWER_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.role})</option>
              ))}
            </select>
            {errors.borrowerId && <p className="text-xs text-red-500 mt-1">{errors.borrowerId}</p>}
          </div>

          {/* Principal + Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Principal Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                <input
                  type="text"
                  className={`${inputClass} pl-8 ${errors.principal ? 'border-red-300' : ''}`}
                  placeholder="20,000"
                  value={principal}
                  onChange={(e) => { setPrincipal(e.target.value); setErrors((p) => { const n = { ...p }; delete n.principal; return n; }); }}
                />
              </div>
              {errors.principal && <p className="text-xs text-red-500 mt-1">{errors.principal}</p>}
            </div>
            <div>
              <label className={labelClass}>Processing Fee</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                <input
                  type="number"
                  className={`${inputClass} pl-8`}
                  placeholder="500"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </div>
              {disbursed > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">Disbursed: <strong className="text-gray-700">{fmt(disbursed)}</strong></p>
              )}
            </div>
          </div>

          {/* Rate + Interest Type + Term */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Rate (%/mo)</label>
              <input
                type="number"
                step="0.5"
                className={`${inputClass} ${errors.rate ? 'border-red-300' : ''}`}
                placeholder="2"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setErrors((p) => { const n = { ...p }; delete n.rate; return n; }); }}
              />
              {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
            </div>
            <div>
              <label className={labelClass}>Interest Type</label>
              <div className="flex gap-1 h-[42px]">
                {(['flat', 'diminishing'] as InterestType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInterestType(t)}
                    className={`flex-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer capitalize ${interestType === t ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0B5858]/30'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Term (months)</label>
              <input
                type="number"
                className={`${inputClass} ${errors.term ? 'border-red-300' : ''}`}
                placeholder="12"
                value={term}
                onChange={(e) => { setTerm(e.target.value); setErrors((p) => { const n = { ...p }; delete n.term; return n; }); }}
              />
              {errors.term && <p className="text-xs text-red-500 mt-1">{errors.term}</p>}
            </div>
          </div>

          {/* Live EMI Preview */}
          {monthlyPayment > 0 && (
            <div className="bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl p-4 border border-[#0B5858]/10">
              <p className="text-[10px] font-bold text-[#0B5858] uppercase tracking-widest mb-3">EMI Preview (Flat Rate)</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Monthly Payment', value: fmt(monthlyPayment) },
                  { label: 'Total Interest', value: fmt(totalInterest) },
                  { label: 'Total Payable', value: fmt(totalPayable) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purpose */}
          <div>
            <label className={labelClass}>Purpose</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none ${errors.purpose ? 'border-red-300' : ''}`}
              placeholder="State the reason for this loan…"
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setErrors((p) => { const n = { ...p }; delete n.purpose; return n; }); }}
            />
            {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
          </div>

          {/* Collateral */}
          <div>
            <label className={labelClass}>Collateral <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Motorcycle OR 14k gold necklace"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
