'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAllBookings } from '@/lib/api/bookings';
import SingleDatePicker from '@/components/SingleDatePicker';

/** Commission status from booking_status: penciled->pending, confirmed->approved, completed->available */
type CommissionStatus = 'pending' | 'approved' | 'available';

function mapBookingStatusToCommission(rawStatus: string): CommissionStatus {
  const map: Record<string, CommissionStatus> = {
    penciled: 'pending',
    confirmed: 'approved',
    completed: 'available',
  };
  return map[rawStatus] || 'pending';
}

interface CommissionRow {
  id: string;
  bookingRef: string;
  agentName: string;
  propertyName: string;
  guestName: string;
  totalBookingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  referralLevel: 1;
  status: CommissionStatus;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  numberOfNights: number;
}

/** Chip style — same as agents/booking-requests (backgroundColor, color, boxShadow) */
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const chipShadow = (r: number, g: number, b: number, a = 0.35) => `0 1px 0 rgba(${r},${g},${b},${a})`;

/** Level chips — L1 grey, L2 teal, L3 yellow (match agents table) */
const LEVEL_CHIP_STYLES: Record<number, { label: string; chipStyle: ChipStyle }> = {
  1: { label: 'L1', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  2: { label: 'L2', chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  3: { label: 'L3', chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
};

/** Commission status chips — same visual pattern as agents Status chips */
const STATUS_CHIP_STYLES: Record<CommissionStatus, { label: string; chipStyle: ChipStyle }> = {
  pending:   { label: 'Pending',   chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
  approved:  { label: 'Approved',  chipStyle: { backgroundColor: '#dbeafe', color: '#1e40af', boxShadow: chipShadow(59, 130, 246) } },
  available: { label: 'Available', chipStyle: { backgroundColor: '#d1fae5', color: '#065f46', boxShadow: chipShadow(5, 150, 105) } },
};

type FilterStatus = 'all' | CommissionStatus;

/** Dropdown — same format as agents directory: rounded-2xl, shadow, click-outside close */
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

/** Export modal — same as agent/commissions: date range, format CSV/PDF, Export Now */
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
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Export Commissions</h3>
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

interface BreakdownModalProps {
  commission: CommissionRow;
  onClose: () => void;
}

function BreakdownModal({ commission, onClose }: BreakdownModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" style={{ fontFamily: 'Poppins' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Commission Breakdown</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-500">Booking Ref</span><span className="font-medium">{commission.bookingRef}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Property</span><span className="font-medium">{commission.propertyName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Guest</span><span className="font-medium">{commission.guestName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Agent</span><span className="font-medium text-[#0B5858]">{commission.agentName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Nights</span><span className="font-medium">{commission.numberOfNights}</span></div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Computation</p>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-2"><span>Total Booking</span><span>₱{commission.totalBookingAmount.toLocaleString()}</span></div>
          <div className="flex justify-between text-gray-500"><span>Commission Rate</span><span>{commission.commissionRate}%</span></div>
          <div className="flex justify-between font-bold text-[#0B5858] text-base border-t border-gray-200 pt-2">
            <span>Commission Earned</span><span>₱{commission.commissionAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow" style={STATUS_CHIP_STYLES[commission.status].chipStyle}>
            {STATUS_CHIP_STYLES[commission.status].label}
          </span>
          <span className="text-xs text-gray-400">{new Date(commission.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

/** Map booking from api/bookings/all to CommissionRow */
function bookingToCommission(b: Record<string, unknown>): CommissionRow {
  const rawStatus = (b.raw_status as string) || 'penciled';
  const totalAmount = Number((b.payment as Record<string, unknown>)?.deposit_amount ?? b.total_amount) || 0;
  const commissionAmount = Math.round(totalAmount * 0.1);
  const agent = b.agent as Record<string, unknown> | null;
  const agentName = agent
    ? [agent.first_name, agent.last_name].filter(Boolean).join(' ').trim() || '—'
    : '—';
  const client = (b.client || {}) as Record<string, unknown>;
  const guestName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || '—';
  const listing = (b.listing || {}) as Record<string, unknown>;

  return {
    id: String(b.id),
    bookingRef: (b.reference_code as string) || `BKG-${b.id}`,
    agentName,
    propertyName: String(listing.title || '—'),
    guestName,
    totalBookingAmount: totalAmount,
    commissionRate: 10,
    commissionAmount,
    referralLevel: 1,
    status: mapBookingStatusToCommission(rawStatus),
    createdAt: String(b.created_at || ''),
    checkIn: String(b.check_in_date || ''),
    checkOut: String(b.check_out_date || ''),
    numberOfNights: Number(b.nights) || 0,
  };
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [breakdownTarget, setBreakdownTarget] = useState<CommissionRow | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllBookings({ limit: 500 })
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data || [])
          .filter((b) => (b.raw_status as string) !== 'cancelled')
          .map(bookingToCommission)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCommissions(rows);
      })
      .catch(() => {
        if (!cancelled) setCommissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setCurrentPage(1), [filterStatus, search]);

  const filtered = commissions.filter((c) => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || c.bookingRef.toLowerCase().includes(q) || c.agentName.toLowerCase().includes(q) || c.propertyName.toLowerCase().includes(q) || c.guestName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCommissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0);
  const totalApproved = commissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionAmount, 0);
  const totalAvailable = commissions.filter((c) => c.status === 'available').reduce((s, c) => s + c.commissionAmount, 0);

  /** Export with optional date range (check-in); same modal pattern as agent/commissions */
  const handleExport = (format: 'csv' | 'pdf', startDate: string, endDate: string) => {
    let dataToExport = [...commissions];
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      dataToExport = dataToExport.filter((c) => {
        const d = new Date(c.checkIn).getTime();
        return d >= s && d <= e;
      });
    }
    const applyFilters = (list: CommissionRow[]) =>
      list.filter((c) => {
        const matchStatus = filterStatus === 'all' || c.status === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q || c.bookingRef.toLowerCase().includes(q) || c.agentName.toLowerCase().includes(q) || c.propertyName.toLowerCase().includes(q) || c.guestName.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      });
    const toExport = applyFilters(dataToExport);

    if (format === 'csv') {
      const header = ['ID', 'Booking Ref', 'Agent', 'Property', 'Guest', 'Check-in', 'Check-out', 'Nights', 'Total (₱)', 'Rate (%)', 'Commission (₱)', 'Level', 'Status', 'Date'];
      const rows = toExport.map((c) => [
        c.id, c.bookingRef, c.agentName, c.propertyName, c.guestName,
        c.checkIn, c.checkOut, c.numberOfNights,
        c.totalBookingAmount, c.commissionRate, c.commissionAmount,
        `L${c.referralLevel}`, c.status, c.createdAt,
      ]);
      const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commissions${startDate ? `-${startDate}-to-${endDate}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
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
      doc.text('Commission Ledger', 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Admin — Commission records', 14, 21);
      doc.text(startDate && endDate ? `Period: ${startDate} to ${endDate}` : `Generated: ${today}`, 14, 27);
      doc.setTextColor(0, 0, 0);
      const totalCommission = toExport.reduce((sum, c) => sum + c.commissionAmount, 0);
      autoTable(doc, {
        startY: 38,
        head: [['Booking Ref', 'Agent', 'Property', 'Guest', 'Check-in', 'Commission', 'Level', 'Status']],
        body: toExport.map((c) => [
          c.bookingRef,
          c.agentName,
          c.propertyName.length > 18 ? c.propertyName.slice(0, 16) + '…' : c.propertyName,
          c.guestName,
          c.checkIn.slice(0, 10),
          `₱${c.commissionAmount.toLocaleString()}`,
          `L${c.referralLevel}`,
          c.status,
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 250] },
      });
      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 88, 88);
      doc.text(`Total: ₱${totalCommission.toLocaleString()}`, 14, finalY);
      doc.save(`commissions${startDate ? `-${startDate}-to-${endDate}` : ''}.pdf`);
    }
  };

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'available', label: 'Available' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — title only; export lives in filter row (same as Agent Directory) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
            Commission Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
            Agent commissions from bookings (10% of total). Status reflects booking status.
          </p>
        </div>
      </div>

      {/* Summary Cards — same style as overview (rounded-3xl, no icon) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {[
          { label: 'Pending', value: `₱${totalPending.toLocaleString()}`, count: commissions.filter((c) => c.status === 'pending').length },
          { label: 'Approved', value: `₱${totalApproved.toLocaleString()}`, count: commissions.filter((c) => c.status === 'approved').length },
          { label: 'Available', value: `₱${totalAvailable.toLocaleString()}`, count: commissions.filter((c) => c.status === 'available').length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-2">{s.count} record{s.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Search, status dropdown, export — same row and design as Agent Directory */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ref, agent, property, guest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <CustomDropdown
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as FilterStatus)}
            options={STATUS_OPTIONS}
            className="min-w-[140px]"
          />
          <button
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

      {/* Table — same layout and design as agents table: rounded-3xl, header style, cell padding, footer */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Booking Ref', 'Agent', 'Property', 'Guest', 'Booking Total', 'Rate', 'Commission', 'Level', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                    No commissions match your filters.
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setBreakdownTarget(c)}
                        className="font-bold text-[#0B5858] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {c.bookingRef}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{c.agentName}</td>
                    <td className="px-5 py-4 text-gray-600 max-w-[140px] truncate">{c.propertyName}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{c.guestName}</td>
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">₱{c.totalBookingAmount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{c.commissionRate}%</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0B5858] whitespace-nowrap">₱{c.commissionAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                        style={LEVEL_CHIP_STYLES[c.referralLevel].chipStyle}
                      >
                        {LEVEL_CHIP_STYLES[c.referralLevel].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                        style={STATUS_CHIP_STYLES[c.status].chipStyle}
                      >
                        {STATUS_CHIP_STYLES[c.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination — same as agents: 10 per page, prev/next + page numbers */}
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

      {/* Modals */}
      {breakdownTarget && (
        <BreakdownModal
          commission={breakdownTarget}
          onClose={() => setBreakdownTarget(null)}
        />
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
