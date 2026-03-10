'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getAllCommissions, approveCommission, rejectCommission } from '@/services/commissionService';
import type { BookingCommission, CommissionStatus } from '@/types/commission';

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-blue-100 text-blue-700 border-blue-200',
  available: 'bg-green-100 text-green-700 border-green-200',
  paid: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  available: 'Available',
  paid: 'Paid',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-teal-100 text-teal-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-purple-100 text-purple-700',
};

type FilterStatus = 'all' | CommissionStatus;

interface RejectModalProps {
  commission: BookingCommission;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

function RejectModal({ commission, onConfirm, onClose }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" style={{ fontFamily: 'Poppins' }}>
        <h3 className="text-base font-bold text-gray-900 mb-1">Reject Commission</h3>
        <p className="text-sm text-gray-500 mb-4">
          Booking ref: <strong>{commission.bookingRef}</strong> — ₱{commission.commissionAmount.toLocaleString()}
        </p>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for rejection</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Reject Commission
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

interface BreakdownModalProps {
  commission: BookingCommission;
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
          <div className="flex justify-between"><span className="text-gray-500">Nights</span><span className="font-medium">{commission.numberOfNights}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Agent ID</span><span className="font-medium text-[#0B5858]">{commission.agentId}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Level</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[commission.referralLevel]}`}>Level {commission.referralLevel}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Computation</p>
          <div className="flex justify-between"><span className="text-gray-600">Base Amount</span><span>₱{commission.baseAmount.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Extra Charges</span><span>₱{commission.extraCharges.toLocaleString()}</span></div>
          <div className="flex justify-between font-medium border-t border-gray-200 pt-2"><span>Total Booking</span><span>₱{commission.totalBookingAmount.toLocaleString()}</span></div>
          <div className="flex justify-between text-gray-500"><span>Commission Rate</span><span>{commission.commissionRate}%</span></div>
          <div className="flex justify-between font-bold text-[#0B5858] text-base border-t border-gray-200 pt-2">
            <span>Commission Earned</span><span>₱{commission.commissionAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[commission.status]}`}>
            {STATUS_LABELS[commission.status]}
          </span>
          <span className="text-xs text-gray-400">{new Date(commission.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<BookingCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<BookingCommission | null>(null);
  const [breakdownTarget, setBreakdownTarget] = useState<BookingCommission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllCommissions();
    setCommissions(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    await approveCommission(id);
    setCommissions((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'approved' as CommissionStatus, approvedAt: new Date().toISOString() } : c)
    );
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    await rejectCommission(rejectTarget.id, reason);
    setCommissions((prev) => prev.filter((c) => c.id !== rejectTarget.id));
    setRejectTarget(null);
  };

  const filtered = commissions.filter((c) => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || c.bookingRef.toLowerCase().includes(q) || c.agentId.toLowerCase().includes(q) || c.propertyName.toLowerCase().includes(q) || c.guestName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commissionAmount, 0);
  const totalApproved = commissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commissionAmount, 0);
  const totalAvailable = commissions.filter((c) => c.status === 'available').reduce((s, c) => s + c.commissionAmount, 0);
  const totalPaid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commissionAmount, 0);

  const exportCSV = () => {
    const header = ['ID', 'Booking Ref', 'Agent', 'Property', 'Guest', 'Check-in', 'Check-out', 'Nights', 'Total (₱)', 'Rate (%)', 'Commission (₱)', 'Level', 'Status', 'Date'];
    const rows = filtered.map((c) => [
      c.id, c.bookingRef, c.agentId, c.propertyName, c.guestName,
      c.checkIn, c.checkOut, c.numberOfNights,
      c.totalBookingAmount, c.commissionRate, c.commissionAmount,
      `L${c.referralLevel}`, c.status, c.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FILTER_TABS: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Available', value: 'available' },
    { label: 'Paid', value: 'paid' },
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
            Commission Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
            Review and approve agent booking commissions.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] text-white text-sm font-semibold rounded-xl hover:bg-[#0d7a7a] transition-colors cursor-pointer"
          style={{ fontFamily: 'Poppins' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review', value: `₱${totalPending.toLocaleString()}`, color: 'text-yellow-600', bg: 'bg-yellow-50', count: commissions.filter((c) => c.status === 'pending').length },
          { label: 'Approved', value: `₱${totalApproved.toLocaleString()}`, color: 'text-blue-600', bg: 'bg-blue-50', count: commissions.filter((c) => c.status === 'approved').length },
          { label: 'Available to Pay', value: `₱${totalAvailable.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50', count: commissions.filter((c) => c.status === 'available').length },
          { label: 'Total Paid', value: `₱${totalPaid.toLocaleString()}`, color: 'text-gray-600', bg: 'bg-gray-50', count: commissions.filter((c) => c.status === 'paid').length },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-white shadow-sm p-4`}>
            <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Poppins' }}>{s.count} record{s.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by ref, agent, property, guest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filterStatus === tab.value
                  ? 'bg-[#0B5858] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Booking Ref', 'Agent', 'Property', 'Guest', 'Booking Total', 'Rate', 'Commission', 'Level', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No commissions match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <button
                        onClick={() => setBreakdownTarget(c)}
                        className="text-[#0B5858] hover:underline cursor-pointer font-semibold"
                      >
                        {c.bookingRef}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.agentId}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{c.propertyName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.guestName}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">₱{c.totalBookingAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.commissionRate}%</td>
                    <td className="px-4 py-3 font-bold text-[#0B5858] whitespace-nowrap">₱{c.commissionAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.referralLevel]}`}>
                        L{c.referralLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(c.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-[#0B5858] hover:bg-[#0d7a7a] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(c)}
                            className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
            Showing {filtered.length} of {commissions.length} records
          </div>
        )}
      </div>

      {/* Modals */}
      {rejectTarget && (
        <RejectModal
          commission={rejectTarget}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
      {breakdownTarget && (
        <BreakdownModal
          commission={breakdownTarget}
          onClose={() => setBreakdownTarget(null)}
        />
      )}
    </div>
  );
}
