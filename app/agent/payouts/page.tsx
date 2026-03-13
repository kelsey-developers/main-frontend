'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAgentPayouts } from '@/services/payoutService';
import { getAgentBalance } from '@/lib/api/agents';
import type { Payout, PayoutStatus } from '@/types/payout';
import { PAYOUT_METHOD_LABELS } from '@/types/payout';
import PayoutRequestModal from './components/PayoutRequestModal';

const AGENT_ID = 'agent-001';

function fmt(n: number) {
  return `₱${n.toLocaleString()}`;
}

const STATUS_CONFIG: Record<PayoutStatus, { label: string; classes: string; dot: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30', dot: 'bg-[#FACC15]' },
  paid:     { label: 'Paid',     classes: 'bg-[#0B5858] text-white border border-[#0B5858]', dot: 'bg-white' },
  declined: { label: 'Declined', classes: 'bg-white text-gray-500 border border-gray-200', dot: 'bg-gray-400' },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function MethodIcon({ method }: { method: string }) {
  if (method === 'bank_transfer') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Proof of Payment</h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 bg-gray-50/50 flex justify-center items-center">
          {url.toLowerCase().endsWith('.pdf') ? (
            <iframe src={url} className="w-full h-[60vh] rounded-xl border border-gray-200" title="Proof of Payment" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt="Proof of Payment" className="w-full h-auto max-h-[60vh] object-contain rounded-xl shadow-sm border border-gray-100 bg-white" />
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setTimeout(() => setIsOpen(false), 150);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value
                  ? 'bg-[#0B5858]/10 text-[#0B5858]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState<{ current_amount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    (async () => {
      try {
        const [p, bal] = await Promise.all([
          getAgentPayouts(AGENT_ID),
          getAgentBalance().catch(() => ({ current_amount: 0 })),
        ]);
        setPayouts(p);
        setBalance(bal);
      } catch {
        setPayouts([]);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return statusFilter === 'all'
      ? payouts
      : payouts.filter((p) => p.status === statusFilter);
  }, [payouts, statusFilter]);

  // Reset to first page whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedPayouts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handleRequested = async (payout: Payout) => {
    setPayouts((prev) => [payout, ...prev]);
    setModalOpen(false);
    try {
      const bal = await getAgentBalance();
      setBalance(bal);
    } catch {
      // Keep existing balance on refresh failure
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payouts</h1>
          <p className="text-sm text-gray-500 mt-1">Request and track your commission withdrawals.</p>
        </div>
      </div>

      {/* Wallet Summary — same balance as /agent overview */}
      {balance != null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B5858]" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Available</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt(balance.current_amount)}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">Ready to withdraw</p>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B5858]/50" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pending</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt(payouts.filter((x) => x.status === 'pending').reduce((s, x) => s + x.amount, 0))}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">Awaiting processing</p>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Total Paid</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt(payouts.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0))}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">Lifetime paid out</p>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-3 shrink-0 flex-wrap">
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as PayoutStatus | 'all')}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'declined', label: 'Declined' },
            ]}
            className="min-w-[140px] capitalize"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-3 bg-[#0B5858] text-white rounded-2xl text-sm font-bold hover:bg-[#094848] transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Request Payout
        </button>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Payout Details', 'Account / Method', 'Amount', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPayouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                    No payout requests found.
                  </td>
                </tr>
              ) : (
                paginatedPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900 whitespace-nowrap">
                        Requested {new Date(p.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {p.processedAt && (
                        <p className="text-xs font-medium text-gray-500 mt-0.5 whitespace-nowrap">
                          Processed {new Date(p.processedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {p.notes && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium">
                          {p.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                          <MethodIcon method={p.method} />
                        </div>
                        <p className="font-bold text-gray-900 whitespace-nowrap">
                          {PAYOUT_METHOD_LABELS[p.method]}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {(p.recipientNumber || p.accountNumber) && (
                          <>{p.method === 'bank_transfer' ? p.accountNumber : p.recipientNumber}</>
                        )}
                        {p.bankName && <span className="ml-1.5">&middot; {p.bankName}</span>}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0B5858] whitespace-nowrap">{fmt(p.amount)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.proofOfPaymentUrl && p.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => setProofUrl(p.proofOfPaymentUrl!)}
                          className="text-[#0B5858] text-xs font-bold hover:text-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          View Proof of Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
            <p className="text-xs font-medium text-gray-500">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                aria-label="Previous page"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3 && currentPage < totalPages - 1) {
                      pageNum = currentPage - 2 + i;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 ${
                        isActive 
                          ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                aria-label="Next page"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <PayoutRequestModal
          available={balance?.current_amount ?? 0}
          agentId={AGENT_ID}
          onClose={() => setModalOpen(false)}
          onSubmit={handleRequested}
        />
      )}

      {proofUrl && (
        <ProofModal url={proofUrl} onClose={() => setProofUrl(null)} />
      )}
    </div>
  );
}
