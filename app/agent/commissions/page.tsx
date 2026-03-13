'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMyBookings } from '@/lib/api/bookings';
import type { MyBookingItem } from '@/lib/api/bookings';
import type { CommissionStatus } from '@/types/commission';
import CommissionBreakdownModal from './components/CommissionBreakdownModal';
import SingleDatePicker from '@/components/SingleDatePicker';

const COMMISSION_RATE = 0.1; // 10%

/** Map booking status to commission status (same as /admin/commissions) */
function mapStatus(raw: string): CommissionStatus {
  if (raw === 'penciled') return 'pending';
  if (raw === 'confirmed') return 'approved';
  if (raw === 'completed') return 'available';
  if (raw === 'cancelled') return 'cancelled';
  return 'pending';
}

/** Convert MyBookingItem to commission row (10% of total_amount) */
function bookingToCommission(b: MyBookingItem) {
  const checkIn = b.check_in_date || '';
  const checkOut = b.check_out_date || '';
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  const total = b.total_amount ?? 0;
  const commission = Math.round(total * COMMISSION_RATE);
  return {
    id: b.id,
    bookingId: b.id,
    bookingRef: b.reference_code || `BKG-${b.id}`,
    agentId: 'me',
    referralCode: 'Direct',
    propertyId: '',
    propertyName: b.listing?.title || 'Unit',
    guestName: [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ') || 'Guest',
    checkIn,
    checkOut,
    numberOfNights: nights,
    numberOfGuests: 1,
    baseAmount: total,
    extraCharges: 0,
    totalBookingAmount: total,
    commissionRate: 10,
    commissionAmount: commission,
    referralLevel: 1 as const,
    referralAgentName: undefined,
    status: mapStatus(b.raw_status || b.status || 'penciled'),
    createdAt: checkIn || new Date().toISOString(),
  };
}

function fmt(n: number) {
  return `₱${n.toLocaleString()}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  available: 'Available',
  paid: 'Paid',
  cancelled: 'Canceled',
};

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  pending:   { label: 'Pending',   classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30', dot: 'bg-[#FACC15]' },
  approved:  { label: 'Approved',  classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20', dot: 'bg-[#0B5858]/50' },
  available: { label: 'Available', classes: 'bg-[#0B5858] text-white border border-[#0B5858]', dot: 'bg-white' },
  paid:      { label: 'Paid',      classes: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
  cancelled: { label: 'Canceled', classes: 'bg-gray-100 text-gray-500 border border-gray-200', dot: 'bg-gray-400' },
};

const LEVEL_BADGE: Record<1 | 2 | 3, { classes: string; label: string }> = {
  1: { classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',   label: 'L1' },
  2: { classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30',   label: 'L2'  },
  3: { classes: 'bg-gray-100 text-gray-500 border border-gray-200',             label: 'L3'  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
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
                // Slight delay to allow the user to see the selection animation
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

function ExportModal({ 
  onClose, 
  onExport 
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40"
      onClick={onClose}
    >
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
                <SingleDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start date"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                <SingleDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End date"
                />
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
                    format === f 
                      ? 'border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]' 
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
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
            onClick={() => {
              onExport(format, startDate, endDate);
              onClose();
            }}
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

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<ReturnType<typeof bookingToCommission>[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReturnType<typeof bookingToCommission> | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'thisMonth'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    (async () => {
      try {
        const bookings = await getMyBookings();
        setCommissions(bookings.map(bookingToCommission));
      } catch {
        setCommissions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let data = [...commissions];
    if (statusFilter !== 'all') data = data.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((c) =>
        c.bookingRef.toLowerCase().includes(q) ||
        c.propertyName.toLowerCase().includes(q) ||
        c.guestName.toLowerCase().includes(q)
      );
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      data = data.filter(c => {
        const d = new Date(c.checkIn);
        if (dateFilter === '7days') {
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        }
        if (dateFilter === '30days') {
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30;
        }
        if (dateFilter === 'thisMonth') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return data;
  }, [commissions, statusFilter, search, dateFilter]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search, dateFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCommissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const chartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    commissions
      .filter((c) => c.status === 'approved' || c.status === 'available')
      .forEach((c) => {
        const d = new Date(c.checkIn || Date.now());
        const m = d.toLocaleString('default', { month: 'short' });
        byMonth[m] = (byMonth[m] || 0) + c.commissionAmount;
      });
    const data = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
    return data.length > 0 ? data : [{ month: '—', amount: 0 }];
  }, [commissions]);

  const handleExport = (format: 'csv' | 'pdf', start: string, end: string) => {
    let dataToExport = commissions;
    
    if (start && end) {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      dataToExport = commissions.filter(c => {
        const d = new Date(c.checkIn).getTime();
        return d >= s && d <= e;
      });
    }

    if (format === 'csv') {
      const rows = [
        ['Booking Ref', 'Property', 'Guest', 'Check-In', 'Check-Out', 'Nights', 'Total', 'Commission Rate', 'Commission', 'Status'],
        ...dataToExport.map((c) => [
          c.bookingRef, c.propertyName, c.guestName,
          c.checkIn.slice(0, 10), c.checkOut.slice(0, 10),
          c.numberOfNights, c.totalBookingAmount, `${c.commissionRate}%`, c.commissionAmount,
          STATUS_LABEL[c.status] ?? c.status,
        ]),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings-statement${start ? `-${start}-to-${end}` : ''}.csv`;
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
      doc.text("Earnings Statement", 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Kelsey's Homestay Agent Commission Report`, 14, 21);
      doc.text(start && end ? `Period: ${start} to ${end}` : `Generated: ${today}`, 14, 27);

      doc.setTextColor(0, 0, 0);
      const startY = 42;
      const totalCommission = dataToExport.reduce((sum, c) => sum + c.commissionAmount, 0);
      autoTable(doc, {
        startY,
        head: [['Booking', 'Ref. Code', 'Property', 'Guest', 'Commission', 'Rate', 'Status']],
        body: dataToExport.map((c) => [
          c.bookingRef,
          c.referralCode,
          c.propertyName.length > 18 ? c.propertyName.slice(0, 16) + '…' : c.propertyName,
          c.guestName,
          `PHP ${c.commissionAmount.toLocaleString()}`,
          `${c.commissionRate}%`,
          STATUS_LABEL[c.status] ?? c.status,
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: teal, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 250] },
        columnStyles: {
          0: { cellWidth: 28 }, 1: { cellWidth: 32 }, 2: { cellWidth: 35 },
          3: { cellWidth: 32 }, 4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' }, 6: { cellWidth: 20 },
        },
      });

      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 88, 88);
      doc.text(`Total Commissions Earned: PHP ${totalCommission.toLocaleString()}`, 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This document is for reference only. Contact admin for official records.", 14, finalY + 6);
      doc.save(`earnings-statement${start ? `-${start}-to-${end}` : ''}.pdf`);
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Commission Wallet</h1>
          <p className="text-sm text-gray-500 mt-1">Track your referral earnings across all bookings.</p>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Earnings Over Time</p>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">Commission Trend</h3>
          </div>
        </div>
        <div className="h-[250px] w-full focus:outline-none focus-visible:outline-none">
          <ResponsiveContainer width="100%" height="100%" className="focus:outline-none focus-visible:outline-none">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} className="focus:outline-none focus-visible:outline-none">
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B5858" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0B5858" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `₱${val / 1000}k`}
                tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                dx={-10}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [fmt(value as number), 'Earnings']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600, fontSize: '14px', color: '#111827' }}
                itemStyle={{ color: '#0B5858' }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#0B5858" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorEarnings)" 
                activeDot={{ r: 6, fill: '#FACC15', stroke: '#0B5858', strokeWidth: 2, style: { outline: 'none' } }}
                style={{ outline: 'none' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search booking, property, or guest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
            <CustomDropdown
              value={dateFilter}
              onChange={(val) => setDateFilter(val as 'all' | '7days' | '30days' | 'thisMonth')}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'thisMonth', label: 'This Month' },
                { value: '30days', label: 'Last 30 Days' },
                { value: '7days', label: 'Last 7 Days' },
              ]}
              className="min-w-[140px]"
            />
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as CommissionStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'available', label: 'Available' },
                { value: 'cancelled', label: 'Canceled' },
              ]}
              className="min-w-[140px] capitalize"
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

      {/* Commission Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Booking Details', 'Guest & Stay', 'Commission', 'Agent', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                    No commissions found.
                  </td>
                </tr>
              ) : (
                paginatedCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Booking Details: property + ref */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900 truncate max-w-[180px]">{c.propertyName}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{c.bookingRef}</p>
                    </td>
                    {/* Guest & Stay */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 whitespace-nowrap">{c.guestName}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{c.numberOfNights} night{c.numberOfNights > 1 ? 's' : ''}</p>
                    </td>
                    {/* Commission: 10% of total */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0B5858] whitespace-nowrap">{fmt(c.commissionAmount)}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5 whitespace-nowrap">{c.commissionRate}% of {fmt(c.totalBookingAmount)}</p>
                    </td>
                    {/* Agent: Direct + L1 badge (all bookings are agent's own) */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 whitespace-nowrap">
                          {c.referralAgentName ?? 'Direct'}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${LEVEL_BADGE[c.referralLevel].classes}`}>
                          {LEVEL_BADGE[c.referralLevel].label}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5 whitespace-nowrap">
                        {c.referralLevel === 1 ? 'Your referral link' : c.referralLevel === 2 ? 'L1 sub-agent' : 'L2 sub-agent'}
                      </p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="text-[#0B5858] text-xs font-bold hover:text-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        View Details
                      </button>
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

      {selected && (
        <CommissionBreakdownModal commission={selected} onClose={() => setSelected(null)} />
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
