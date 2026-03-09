'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { getAllPayouts, updatePayoutStatus } from '@/services/payoutService';
import type { Payout, PayoutStatus } from '@/types/payout';
import { PAYOUT_METHOD_LABELS } from '@/types/payout';

function fmt(n: number) { return `₱${n.toLocaleString()}`; }

const STATUS_STYLES: Record<PayoutStatus, string> = {
  pending:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border border-blue-200',
  paid:       'bg-green-100 text-green-800 border border-green-200',
  failed:     'bg-red-100 text-red-800 border border-red-200',
};

// ─── Action Modal ────────────────────────────────────────────────────────────
interface ActionModalProps {
  payout: Payout;
  action: 'processing' | 'paid' | 'failed';
  onClose: () => void;
  onConfirm: (id: string, status: PayoutStatus, proof?: string, notes?: string) => void;
}

function ActionModal({ payout, action, onClose, onConfirm }: ActionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState('');
  const [proofPreview, setProofPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(payout.id, action as PayoutStatus, proofPreview || undefined, notes || undefined);
    setSubmitting(false);
  };

  const modal = (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            {action === 'processing' ? 'Mark as Processing' : action === 'paid' ? 'Mark as Paid' : 'Mark as Failed'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
            <p><span className="font-medium">Agent:</span> {payout.agentName}</p>
            <p><span className="font-medium">Amount:</span> {fmt(payout.amount)}</p>
            <p><span className="font-medium">Method:</span> {PAYOUT_METHOD_LABELS[payout.method]}</p>
          </div>
          {action === 'paid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins' }}>
                Proof of Payment (optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0B5858]/10 file:text-[#0B5858] hover:file:bg-[#0B5858]/20 cursor-pointer"
                style={{ fontFamily: 'Poppins' }}
              />
              {proofPreview && proofPreview.startsWith('data:image') && (
                <img src={proofPreview} alt="proof" className="mt-2 rounded-lg max-h-32 object-contain border border-gray-200" />
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins' }}>
              Notes {action === 'failed' ? '(required — reason for failure)' : '(optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] bg-white resize-none"
              style={{ fontFamily: 'Poppins' }}
              placeholder={action === 'failed' ? 'Explain why payout failed...' : 'Optional note to agent...'}
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || (action === 'failed' && !notes.trim())}
            className={`px-6 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
              action === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B5858] hover:bg-[#094848]'
            }`}
            style={{ fontFamily: 'Poppins' }}>
            {submitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPayoutsPage() {
  const router = useRouter();
  const { isAdmin, roleLoading } = useMockAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ payout: Payout; action: 'processing' | 'paid' | 'failed' } | null>(null);

  const load = useCallback(async () => {
    const data = await getAllPayouts();
    setPayouts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payouts.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search.trim() || p.agentName.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search);
    return matchStatus && matchSearch;
  });

  const totalPayable = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const paidThisMonth = payouts.filter((p) => p.status === 'paid' && p.processedAt && new Date(p.processedAt).getMonth() === new Date().getMonth()).reduce((s, p) => s + p.amount, 0);
  const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const handleAction = async (id: string, status: PayoutStatus, proof?: string, notes?: string) => {
    const updated = await updatePayoutStatus(id, status, proof, notes);
    setPayouts((prev) => prev.map((p) => p.id === id ? { ...p, ...updated } : p));
    setModal(null);
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Agent', 'Amount', 'Method', 'Recipient', 'Status', 'Requested', 'Processed'],
      ...payouts.map((p) => [
        p.id, p.agentName, p.amount,
        PAYOUT_METHOD_LABELS[p.method],
        p.recipientNumber || p.accountNumber || '—',
        p.status,
        p.requestedAt.slice(0, 10),
        p.processedAt?.slice(0, 10) || '—',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payouts-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading || loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
    </div>;
  }

  if (!isAdmin) {
    return <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-500 text-sm" style={{ fontFamily: 'Poppins' }}>Admin access required.</p>
      <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-[#0B5858] text-white rounded-xl text-sm cursor-pointer" style={{ fontFamily: 'Poppins' }}>
        Back to Admin
      </button>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
              Payout Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5" style={{ fontFamily: 'Poppins' }}>
              Review and process agent payout requests.
            </p>
          </div>
          <div className="ml-auto">
            <button onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: 'Poppins' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Payable', value: totalPayable, color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Paid This Month', value: paidThisMonth, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Total Paid (All Time)', value: totalPaid, color: 'text-gray-700 bg-gray-50 border-gray-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-5 shadow-sm ${s.color}`}>
              <p className="text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search agent name or payout ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30"
              style={{ fontFamily: 'Poppins' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'processing', 'paid', 'failed'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-sm font-medium capitalize cursor-pointer transition-colors ${
                  statusFilter === s ? 'bg-[#0B5858] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#0B5858' }}>
                <tr>
                  {['Agent', 'Amount', 'Method', 'Requested', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-white font-semibold text-xs uppercase tracking-wider"
                      style={{ fontFamily: 'Poppins' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>No payouts found.</td></tr>
                ) : filtered.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>{p.agentName}</p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>{p.id}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap" style={{ fontFamily: 'Poppins' }}>{fmt(p.amount)}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap" style={{ fontFamily: 'Poppins' }}>
                      {PAYOUT_METHOD_LABELS[p.method]}
                      {(p.recipientNumber || p.accountNumber) && (
                        <p className="text-xs text-gray-400">{p.recipientNumber || p.accountNumber}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Poppins' }}>
                      {new Date(p.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[p.status]}`}
                        style={{ fontFamily: 'Poppins' }}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.status === 'pending' && (
                          <button type="button"
                            onClick={() => setModal({ payout: p, action: 'processing' })}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
                            style={{ fontFamily: 'Poppins' }}>
                            Processing
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'processing') && (
                          <>
                            <button type="button"
                              onClick={() => setModal({ payout: p, action: 'paid' })}
                              className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Poppins' }}>
                              Mark Paid
                            </button>
                            <button type="button"
                              onClick={() => setModal({ payout: p, action: 'failed' })}
                              className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                              style={{ fontFamily: 'Poppins' }}>
                              Fail
                            </button>
                          </>
                        )}
                        {p.proofOfPaymentUrl && p.status === 'paid' && (
                          <span className="text-xs text-green-600" style={{ fontFamily: 'Poppins' }}>✓ Proof</span>
                        )}
                        {p.status === 'paid' && !p.proofOfPaymentUrl && (
                          <span className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>Paid</span>
                        )}
                        {p.status === 'failed' && p.notes && (
                          <span className="text-xs text-red-400 truncate max-w-[120px]" title={p.notes}
                            style={{ fontFamily: 'Poppins' }}>{p.notes}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <ActionModal
          payout={modal.payout}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
        />
      )}
    </div>
  );
}
