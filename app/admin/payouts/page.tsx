'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { getAllPayouts, updatePayoutStatus } from '@/services/payoutService';
import type { Payout, PayoutStatus } from '@/types/payout';
import { PAYOUT_METHOD_LABELS } from '@/types/payout';
import SingleDatePicker from '@/components/SingleDatePicker';

function fmt(n: number) { return `₱${n.toLocaleString()}`; }

/** Chip style — same as admin/commissions (backgroundColor, color, boxShadow) */
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const chipShadow = (r: number, g: number, b: number, a = 0.35) => `0 1px 0 rgba(${r},${g},${b},${a})`;

/** Payout status chips — same visual pattern as commissions status chips */
const PAYOUT_STATUS_CHIP_STYLES: Record<PayoutStatus, { label: string; chipStyle: ChipStyle }> = {
  pending:    { label: 'Pending',    chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
  processing: { label: 'Processing',  chipStyle: { backgroundColor: '#dbeafe', color: '#1e40af', boxShadow: chipShadow(59, 130, 246) } },
  paid:       { label: 'Paid',       chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  failed:     { label: 'Failed',      chipStyle: { backgroundColor: '#fee2e2', color: '#b91c1c', boxShadow: chipShadow(239, 68, 68) } },
};

type FilterStatus = 'all' | PayoutStatus;

/** Dropdown — same format as admin/commissions: rounded-2xl, shadow, click-outside close */
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
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
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
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
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

/** Export modal — same as admin/commissions: date range (requested), format CSV/PDF, Export Now */
function ExportModal({
  onClose,
  onExport,
}: {
  onClose: () => void;
  onExport: (format: 'csv' | 'pdf', startDate: string, endDate: string) => void;
}) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Export Payouts</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="relative z-[60]">
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
                <SingleDatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                <SingleDatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-2">Leave blank to export all available records.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Format</label>
            <div className="grid grid-cols-2 gap-3">
              {(['csv', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                    format === f ? 'border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {f === 'csv' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    )}
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-wider">{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => { onExport(format, startDate, endDate); onClose(); }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B5858] text-white text-sm font-bold hover:bg-[#094848] hover:shadow-lg hover:shadow-[#0B5858]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            Export Now
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

// ─── Action Modal ────────────────────────────────────────────────────────────
interface ActionModalProps {
  payout: Payout;
  action: 'paid' | 'failed';
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
            {action === 'paid' ? 'Mark as Paid' : 'Mark as Failed'}
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

/** Details modal — full payout info + proof of payment when paid; design-system hierarchy and styling */
function PayoutDetailsModal({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Payout details</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow" style={PAYOUT_STATUS_CHIP_STYLES[payout.status].chipStyle}>
              {PAYOUT_STATUS_CHIP_STYLES[payout.status].label}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer shrink-0" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Agent</span><span className="font-medium text-gray-900 text-right">{payout.agentName}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Payout ID</span><span className="font-mono text-xs text-gray-700 text-right truncate">{payout.id}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Amount</span><span className="font-bold text-[#0B5858]">{fmt(payout.amount)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Method</span><span className="font-medium text-gray-900">{PAYOUT_METHOD_LABELS[payout.method]}</span></div>
            {(payout.recipientNumber || payout.accountNumber) && (
              <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Recipient</span><span className="font-medium text-gray-900 text-right">{payout.recipientNumber || payout.accountNumber}{payout.recipientName ? ` (${payout.recipientName})` : ''}</span></div>
            )}
            {payout.bankName && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Bank</span><span className="font-medium text-gray-900">{payout.bankName}</span></div>}
            <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Requested</span><span className="font-medium text-gray-900">{new Date(payout.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
            {payout.processedAt && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Processed</span><span className="font-medium text-gray-900">{new Date(payout.processedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>}
            {payout.notes && <div className="flex justify-between gap-4 pt-1"><span className="text-gray-500 shrink-0">Notes</span><span className="font-medium text-gray-700 text-right text-sm">{payout.notes}</span></div>}
          </div>
          {payout.status === 'paid' && payout.proofOfPaymentUrl && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Proof of payment</p>
              <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                <img src={payout.proofOfPaymentUrl} alt="Proof of payment" className="w-full max-h-64 object-contain" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPayoutsPage() {
  const { isAdmin, roleLoading } = useMockAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ payout: Payout; action: 'paid' | 'failed' } | null>(null);
  const [detailsPayout, setDetailsPayout] = useState<Payout | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const load = useCallback(async () => {
    const data = await getAllPayouts();
    setPayouts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Reset to page 1 when filters or search change */
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const filtered = payouts.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search.trim() || p.agentName.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedPayouts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPayable = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const paidThisMonth = payouts.filter((p) => p.status === 'paid' && p.processedAt && new Date(p.processedAt).getMonth() === new Date().getMonth()).reduce((s, p) => s + p.amount, 0);
  const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const handleAction = async (id: string, status: PayoutStatus, proof?: string, notes?: string) => {
    const updated = await updatePayoutStatus(id, status, proof, notes);
    setPayouts((prev) => prev.map((p) => p.id === id ? { ...p, ...updated } : p));
    setModal(null);
  };

  /** Apply same filters as UI (status + search); optionally filter by requestedAt date range */
  const getFilteredForExport = useCallback((list: Payout[], startDate: string, endDate: string) => {
    let out = list.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || p.agentName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      out = out.filter((p) => {
        const d = new Date(p.requestedAt).getTime();
        return d >= s && d <= e;
      });
    }
    return out;
  }, [statusFilter, search]);

  const handleExport = (format: 'csv' | 'pdf', startDate: string, endDate: string) => {
    const toExport = getFilteredForExport(payouts, startDate, endDate);
    if (format === 'csv') {
      const rows = [
        ['ID', 'Agent', 'Amount', 'Method', 'Recipient', 'Status', 'Requested', 'Processed'],
        ...toExport.map((p) => [
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
      a.href = url;
      a.download = `payouts${startDate && endDate ? `-${startDate}-to-${endDate}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const doc = new jsPDF();
      const teal: [number, number, number] = [11, 88, 88];
      const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.setFillColor(...teal);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Payout Management', 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Admin — Payout records', 14, 21);
      doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : `Generated: ${today}`, 14, 27);
      doc.setTextColor(0, 0, 0);
      const totalAmount = toExport.reduce((sum, p) => sum + p.amount, 0);
      autoTable(doc, {
        startY: 38,
        head: [['Agent', 'Amount', 'Method', 'Recipient', 'Status', 'Requested']],
        body: toExport.map((p) => [
          p.agentName.length > 20 ? p.agentName.slice(0, 18) + '…' : p.agentName,
          fmt(p.amount),
          PAYOUT_METHOD_LABELS[p.method],
          (p.recipientNumber || p.accountNumber || '—').toString().slice(0, 14),
          p.status,
          p.requestedAt.slice(0, 10),
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 250] },
      });
      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 88, 88);
      doc.text(`Total: ${fmt(totalAmount)}`, 14, finalY);
      doc.save(`payouts${startDate && endDate ? `-${startDate}-to-${endDate}` : ''}.pdf`);
    }
  };

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
  ];

  if (roleLoading || loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
    </div>;
  }

  // if (!isAdmin) {
  //   return <div className="flex flex-col items-center justify-center min-h-screen gap-4">
  //     <p className="text-gray-500 text-sm" style={{ fontFamily: 'Poppins' }}>Admin access required.</p>
  //     <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-[#0B5858] text-white rounded-xl text-sm cursor-pointer" style={{ fontFamily: 'Poppins' }}>
  //       Back to Admin
  //     </button>
  //   </div>;
  // }

  return (
    <div className="space-y-6">
      {/* Page header — title only; export lives in filter row (same as admin/commissions) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payout Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and process agent payout requests.
          </p>
        </div>
      </div>

        {/* Summary Cards — same style as overview (rounded-3xl, no icon) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Total Payable', value: totalPayable, sub: 'Awaiting disbursement' },
            { label: 'Paid This Month', value: paidThisMonth, sub: 'Current month' },
            { label: 'Total Paid (All Time)', value: totalPaid, sub: 'All time disbursed' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt(s.value)}</p>
              {s.sub != null && <p className="text-xs font-medium text-gray-400 mt-2">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Search, status dropdown, export — same row and design as admin/commissions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search agent name or payout ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as FilterStatus)}
              options={STATUS_OPTIONS}
              className="min-w-[140px]"
            />
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Table — same layout and design as admin/commissions: rounded-3xl, header style, cell padding, status chips, pagination */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Agent', 'Amount', 'Method', 'Requested', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                      No payouts match your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedPayouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-900">{p.agentName}</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">{p.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#0B5858] whitespace-nowrap">{fmt(p.amount)}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        <p className="font-medium text-gray-900 whitespace-nowrap">{PAYOUT_METHOD_LABELS[p.method]}</p>
                        {(p.recipientNumber || p.accountNumber) && (
                          <p className="text-xs text-gray-500 mt-0.5">{p.recipientNumber || p.accountNumber}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                        {new Date(p.requestedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                          style={PAYOUT_STATUS_CHIP_STYLES[p.status].chipStyle}
                        >
                          {PAYOUT_STATUS_CHIP_STYLES[p.status].label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(p.status === 'paid' || p.status === 'failed') && (
                            <button
                              type="button"
                              onClick={() => setDetailsPayout(p)}
                              className="text-xs font-semibold text-[#0B5858] hover:text-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              View details
                            </button>
                          )}
                          {(p.status === 'pending' || p.status === 'processing') && (
                            <>
                              <button type="button"
                                onClick={() => setModal({ payout: p, action: 'paid' })}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-[#0B5858] text-white rounded-lg hover:bg-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Mark Paid
                              </button>
                              <button type="button"
                                onClick={() => setModal({ payout: p, action: 'failed' })}
                                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Fail
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination — same as admin/commissions: 10 per page, prev/next + page numbers */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
            <p className="text-xs font-medium text-gray-500">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> results
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 ${
                          isActive ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

      {modal != null && (
        <ActionModal
          payout={modal.payout}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
        />
      )}
      {detailsPayout != null && (
        <PayoutDetailsModal payout={detailsPayout} onClose={() => setDetailsPayout(null)} />
      )}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
