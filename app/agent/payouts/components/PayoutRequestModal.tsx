'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { requestPayout } from '@/services/payoutService';
import type { Payout, PayoutMethod } from '@/types/payout';
import { PAYOUT_METHOD_LABELS } from '@/types/payout';

interface Props {
  available: number;
  agentId: string;
  onClose: () => void;
  onSubmit: (payout: Payout) => void;
}

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-all bg-white placeholder:text-gray-400 shadow-sm';
const labelClass = 'block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2';

export default function PayoutRequestModal({ available, agentId, onClose, onSubmit }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayoutMethod>('gcash');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const validate = () => {
    const amtNum = parseFloat(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) return 'Enter a valid amount.';
    if (amtNum > available) return `Amount cannot exceed available balance (₱${available.toLocaleString()}).`;
    if (!recipientName.trim()) return 'Recipient name is required.';
    if (method !== 'bank_transfer' && !recipientNumber.trim()) return 'Mobile number is required.';
    if (method === 'bank_transfer') {
      if (!bankName.trim()) return 'Bank name is required.';
      if (!accountNumber.trim()) return 'Account number is required.';
    }
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      const result = await requestPayout({
        agentId,
        amount: parseFloat(amount),
        method,
        recipientNumber: method !== 'bank_transfer' ? recipientNumber : undefined,
        recipientName,
        bankName: method === 'bank_transfer' ? bankName : undefined,
        accountNumber: method === 'bank_transfer' ? accountNumber : undefined,
      });
      onSubmit(result);
    } catch {
      setError('Failed to submit payout request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Request Payout</h2>
              <p className="text-xs font-medium text-gray-500 mt-1">
                Available:{' '}
                <span className="font-bold text-[#0B5858]">₱{available.toLocaleString()}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all cursor-pointer hover:shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className={labelClass}>Withdrawal Amount (₱)</label>
            <input
              type="number"
              min={0}
              max={available}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder={`Max: ₱${available.toLocaleString()}`}
            />
          </div>

          {/* Method */}
          <div>
            <label className={labelClass}>Payout Method</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-3 rounded-2xl text-sm font-bold border transition-all cursor-pointer ${
                    method === m
                      ? 'border-[#0B5858] bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  {PAYOUT_METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Name */}
          <div>
            <label className={labelClass}>Recipient Name</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className={inputClass}
              placeholder="Full name on account"
            />
          </div>

          {/* GCash / Maya */}
          {method !== 'bank_transfer' && (
            <div>
              <label className={labelClass}>{PAYOUT_METHOD_LABELS[method]} Number</label>
              <input
                type="text"
                value={recipientNumber}
                onChange={(e) => setRecipientNumber(e.target.value)}
                className={inputClass}
                placeholder="09XXXXXXXXX"
              />
            </div>
          )}

          {/* Bank Transfer */}
          {method === 'bank_transfer' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. BDO, BPI, UnionBank"
                />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={inputClass}
                  placeholder="Account number"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 text-sm font-bold text-gray-600 hover:bg-white rounded-2xl transition-all cursor-pointer hover:shadow-sm border border-transparent hover:border-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-3 bg-[#0B5858] text-white rounded-2xl text-sm font-bold hover:bg-[#094848] shadow-md shadow-[#0B5858]/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
