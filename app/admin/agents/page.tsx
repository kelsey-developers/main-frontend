'use client';

import React, { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { getAgentAnalytics } from '@/services/agentDashboardService';
import type { TopAgent } from '@/services/agentDashboardService';
import SingleDatePicker from '@/components/SingleDatePicker';
import { getAdminRegistrations, approveAdminRegistration, rejectAdminRegistration } from '@/lib/api/adminRegistrations';
import { listUsers, updateUser } from '@/lib/api/users';
import type { PendingRegistration } from '@/lib/api/adminRegistrations';
import AgentSettingsModal from './components/AgentSettingsModal';

/** Chip style — same shape as cleaning/booking-requests (backgroundColor, color, boxShadow) */
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const chipShadow = (r: number, g: number, b: number, a = 0.35) => `0 1px 0 rgba(${r},${g},${b},${a})`;

const LEVEL_CHIP_STYLES: Record<number, { label: string; chipStyle: ChipStyle }> = {
  1: { label: 'L1', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  2: { label: 'L2', chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  3: { label: 'L3', chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
};

const STATUS_CHIP_STYLES: Record<'active' | 'inactive', { label: string; chipStyle: ChipStyle }> = {
  active:   { label: 'Active',   chipStyle: { backgroundColor: '#d1fae5', color: '#065f46', boxShadow: chipShadow(5, 150, 105) } },
  inactive: { label: 'Inactive', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
};

/** Registration status chips — design system (backgroundColor, color, boxShadow) */
const REG_STATUS_CHIP_STYLES: Record<'pending' | 'approved' | 'rejected', { label: string; chipStyle: ChipStyle }> = {
  pending:  { label: 'Pending',  chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
  approved: { label: 'Approved', chipStyle: { backgroundColor: '#d1fae5', color: '#065f46', boxShadow: chipShadow(5, 150, 105) } },
  rejected: { label: 'Rejected', chipStyle: { backgroundColor: '#fef2f2', color: '#b91c1c', boxShadow: chipShadow(239, 68, 68, 0.35) } },
};

/** Fee status chips — design system */
const FEE_PAID_CHIP_STYLE: ChipStyle = { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) };
const FEE_UNPAID_CHIP_STYLE: ChipStyle = { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) };

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Dropdown matching agent/commissions — rounded-2xl, shadow, click-outside close */
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

/** Export modal — same structure as agent/commissions: date range (joined), format CSV, Export Now */
function ExportAgentsModal({
  onClose,
  onExport,
}: {
  onClose: () => void;
  onExport: (format: 'csv', startDate: string, endDate: string) => void;
}) {
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
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Export Agents</h3>
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
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Joined Date Range</label>
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
            <p className="text-[11px] font-medium text-gray-500 mt-2">Leave blank to export all agents.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">Format</label>
            <div className="flex">
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-bold uppercase tracking-wider">CSV</span>
              </div>
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
            onClick={() => { onExport('csv', startDate, endDate); onClose(); }}
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

type FilterStatus = 'all' | 'active' | 'inactive';
type FilterLevel = 'all' | '1' | '2' | '3';

type AgentRow = TopAgent & { level: 1 | 2 | 3; status: 'active' | 'inactive'; email: string; joinedAt: string };

export default function AdminAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, totalPaid: 0, totalPending: 0 });
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [currentRegPage, setCurrentRegPage] = useState(1);
  const itemsPerRegPage = 10;
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);
  const [approveRegTarget, setApproveRegTarget] = useState<PendingRegistration | null>(null);
  const [rejectRegTarget, setRejectRegTarget] = useState<PendingRegistration | null>(null);
  const [rejectRegReason, setRejectRegReason] = useState('');
  const [proofModalReg, setProofModalReg] = useState<PendingRegistration | null>(null);

  /** Sliding tab indicator for tab nav */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const idx = activeTab === 'all' ? 0 : 1;
    const el = tabRefs.current[idx];
    if (el) setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, analyticsRes, pending] = await Promise.all([
          listUsers({ role: 'Agent', limit: 500 }),
          getAgentAnalytics().catch(() => ({ totalCommissionsPaid: 0, totalCommissionsPending: 0 })),
          getAdminRegistrations(),
        ]);
        const analytics = analyticsRes && typeof analyticsRes === 'object' ? analyticsRes : { totalCommissionsPaid: 0, totalCommissionsPending: 0 };
        const mapped: AgentRow[] = (usersRes.users || []).map((u) => ({
          agentId: String(u.id),
          agentName: u.fullname,
          referralCode: `AGENT-${u.id}`,
          totalCommissions: u.totalCommissions ?? 0,
          totalBookings: u.bookingCount ?? 0,
          activeSubAgents: u.subAgentCount ?? 0,
          level: Math.min(3, Math.max(1, u.agentLevel ?? 1)) as 1 | 2 | 3,
          status: (u.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
          email: u.email,
          joinedAt: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
        }));
        setAgents(mapped);
        setSummary({
          total: usersRes.total ?? mapped.length,
          active: mapped.filter((a) => a.status === 'active').length,
          totalPaid: analytics.totalCommissionsPaid ?? 0,
          totalPending: analytics.totalCommissionsPending ?? 0,
        });
        setPendingRegistrations(pending);
      } catch {
        setAgents([]);
        setPendingRegistrations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggleStatus = useCallback(async (agent: AgentRow) => {
    const nextStatus = agent.status === 'active' ? 'inactive' : 'active';
    setTogglingAgentId(agent.agentId);
    try {
      await updateUser(agent.agentId, { status: nextStatus });
      setAgents((prev) => prev.map((a) => (a.agentId === agent.agentId ? { ...a, status: nextStatus } : a)));
    } finally {
      setTogglingAgentId(null);
    }
  }, []);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.agentName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.referralCode.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchLevel = filterLevel === 'all' || String(a.level) === filterLevel;
      return matchSearch && matchStatus && matchLevel;
    });
  }, [agents, search, filterStatus, filterLevel]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterLevel]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  /** Pending registrations: filtered by status, then paginated */
  const filteredPending = useMemo(() => {
    return pendingRegistrations.filter((r) => regFilter === 'all' || r.status === regFilter);
  }, [pendingRegistrations, regFilter]);
  useEffect(() => setCurrentRegPage(1), [regFilter]);
  const totalRegPages = Math.ceil(filteredPending.length / itemsPerRegPage);
  const paginatedPending = useMemo(() => {
    const start = (currentRegPage - 1) * itemsPerRegPage;
    return filteredPending.slice(start, start + itemsPerRegPage);
  }, [filteredPending, currentRegPage, itemsPerRegPage]);

  /** Export CSV — optionally filter by joined date range (same pattern as commissions) */
  const handleExport = (format: 'csv', startDate: string, endDate: string) => {
    let dataToExport = [...agents];
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      dataToExport = dataToExport.filter((a) => {
        const d = new Date(a.joinedAt).getTime();
        return d >= s && d <= e;
      });
    }
    // Apply same search/filters as UI
    const exportFiltered = dataToExport.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.agentName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.referralCode.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchLevel = filterLevel === 'all' || String(a.level) === filterLevel;
      return matchSearch && matchStatus && matchLevel;
    });
    const header = ['Agent ID', 'Name', 'Email', 'Referral Code', 'Level', 'Status', 'Bookings', 'Commissions (₱)', 'Sub-Agents', 'Joined'];
    const rows = exportFiltered.map((a) => [a.agentId, a.agentName, a.email, a.referralCode, `L${a.level}`, a.status, a.totalBookings, a.totalCommissions, a.activeSubAgents, a.joinedAt]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents${startDate ? `-${startDate}-to-${endDate}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — title, Settings button; filters live in filter row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agents</h1>
          <p className="text-sm text-gray-500 mt-1">All registered agents and their performance overview.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
        >
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Summary Cards — always visible above tabs (same style as overview: rounded-3xl, no icon) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: 'Total Agents', value: summary.total, sub: 'Registered on platform' },
          { label: 'Active', value: summary.active, sub: 'With recent activity' },
          { label: 'Total Paid', value: `₱${summary.totalPaid.toLocaleString()}`, sub: 'Commissions disbursed' },
          { label: 'Pending Commissions', value: `₱${summary.totalPending.toLocaleString()}`, sub: 'Awaiting clearance' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{s.value}</p>
            {s.sub != null && <p className="text-xs font-medium text-gray-400 mt-2">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs — grey baseline + sliding indicator */}
      <div className="relative -mb-px pb-[1px] mb-5">
        <div className="flex">
          {([
            { key: 'all' as const, label: 'All Agents' },
            { key: 'pending' as const, label: 'Pending Registrations' },
          ]).map(({ key, label }, i) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 py-3.5 pr-6 text-sm font-semibold transition-colors cursor-pointer ${activeTab === key ? 'text-[#0B5858]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Grey baseline for tab nav */}
        <div
          className="pointer-events-none absolute -bottom-px left-0 h-px w-[95%] z-0"
          style={{
            background: 'linear-gradient(to right, rgba(209,213,219,1) 0%, rgba(209,213,219,0.5) 40%, transparent 70%)',
          }}
          aria-hidden
        />
        <div
          className="absolute -bottom-px left-0 h-1 bg-[#0B5858] transition-all duration-200 z-10"
          style={{ left: tabIndicator.left, width: tabIndicator.width }}
        />
      </div>

      {/* Pending registrations filter — below baseline, above table; right-aligned */}
      {activeTab === 'pending' && (
        <div className="flex justify-end mb-4">
          <CustomDropdown
            value={regFilter}
            onChange={(val) => setRegFilter(val as typeof regFilter)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            className="min-w-[160px]"
          />
        </div>
      )}

      {activeTab === 'all' && (
        <>
      {/* Search, filters (dropdowns), export — same layout and styling as agent/commissions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or referral code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <CustomDropdown
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as FilterStatus)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="min-w-[140px]"
          />
          <CustomDropdown
            value={filterLevel}
            onChange={(val) => setFilterLevel(val as FilterLevel)}
            options={[
              { value: 'all', label: 'All Levels' },
              { value: '1', label: 'Level 1' },
              { value: '2', label: 'Level 2' },
              { value: '3', label: 'Level 3' },
            ]}
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

      {/* Agent Table — same design as agent/commissions: rounded-3xl, header style, pagination */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Agent', 'Referral Code', 'Level', 'Status', 'Bookings', 'Commissions', 'Sub-Agents', 'Joined'].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                    No agents match your filters.
                  </td>
                </tr>
              ) : (
                paginatedAgents.map((agent) => (
                  <tr key={agent.agentId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/agents/${agent.agentId}`} className="flex items-center gap-3 min-w-0 group">
                        <div className="w-9 h-9 rounded-full bg-[#0B5858]/10 flex items-center justify-center text-sm font-bold text-[#0B5858] flex-shrink-0">
                          {getInitials(agent.agentName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate group-hover:text-[#0B5858] transition-colors">{agent.agentName}</p>
                          <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">{agent.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-[11px] font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{agent.referralCode}</code>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                        style={LEVEL_CHIP_STYLES[agent.level].chipStyle}
                      >
                        {LEVEL_CHIP_STYLES[agent.level].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                          style={STATUS_CHIP_STYLES[agent.status].chipStyle}
                        >
                          {STATUS_CHIP_STYLES[agent.status].label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(agent)}
                          disabled={togglingAgentId === agent.agentId}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 cursor-pointer disabled:opacity-50 ${agent.status === 'active' ? '' : 'bg-gray-200'}`}
                          style={{ backgroundColor: agent.status === 'active' ? '#0B5858' : undefined }}
                          aria-label={agent.status === 'active' ? 'Set inactive' : 'Set active'}
                        >
                          {togglingAgentId === agent.agentId ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                            </div>
                          ) : (
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${agent.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">{agent.totalBookings}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0B5858] whitespace-nowrap">₱{agent.totalCommissions.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600 font-medium">{agent.activeSubAgents}</td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {new Date(agent.joinedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — always show footer; prev/next + page numbers when more than one page */}
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
        </>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Applicant', 'Email', 'Contact', 'Referred by', 'Applied', 'Status', 'Fee', 'Proof of payment', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                      No {regFilter !== 'all' ? regFilter : ''} registrations.
                    </td>
                  </tr>
                ) : (
                  paginatedPending.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#0B5858]/10 flex items-center justify-center text-sm font-bold text-[#0B5858] flex-shrink-0">
                              {getInitials(reg.fullname)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate">{reg.fullname}</p>
                              {reg.notes && <p className="text-xs text-gray-500 truncate italic mt-0.5">{reg.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{reg.email}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{reg.contactNumber}</td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{reg.recruitedByName ?? '—'}</td>
                        <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                          {new Date(reg.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                            style={REG_STATUS_CHIP_STYLES[reg.status].chipStyle}
                          >
                            {REG_STATUS_CHIP_STYLES[reg.status].label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {reg.registrationFeeStatus === 'paid' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow" style={FEE_PAID_CHIP_STYLE}>
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow" style={FEE_UNPAID_CHIP_STYLE}>
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {reg.proofOfPaymentUrl ? (
                            <button
                              type="button"
                              onClick={() => setProofModalReg(reg)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B5858] hover:underline cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {reg.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setApproveRegTarget(reg)}
                                disabled={processingRegId === reg.id}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => { setRejectRegTarget(reg); setRejectRegReason(''); }}
                                disabled={processingRegId === reg.id}
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — same pattern as All Agents table */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
            <p className="text-xs font-medium text-gray-500">
              Showing <span className="font-medium text-gray-900">{(currentRegPage - 1) * itemsPerRegPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentRegPage * itemsPerRegPage, filteredPending.length)}</span> of <span className="font-medium text-gray-900">{filteredPending.length}</span> results
            </p>
            {totalRegPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentRegPage((p) => Math.max(1, p - 1))}
                  disabled={currentRegPage === 1}
                  className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalRegPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalRegPages > 5) {
                      if (currentRegPage > 3 && currentRegPage < totalRegPages - 1) {
                        pageNum = currentRegPage - 2 + i;
                      } else if (currentRegPage >= totalRegPages - 1) {
                        pageNum = totalRegPages - 4 + i;
                      }
                    }
                    const isActive = currentRegPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentRegPage(pageNum)}
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
                  onClick={() => setCurrentRegPage((p) => Math.min(totalRegPages, p + 1))}
                  disabled={currentRegPage === totalRegPages}
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
      )}

      {/* Proof of payment image modal */}
      {proofModalReg?.proofOfPaymentUrl && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setProofModalReg(null)} aria-hidden />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Proof of payment — {proofModalReg.fullname}</h3>
              <button
                type="button"
                onClick={() => setProofModalReg(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center min-h-0 bg-gray-50">
              <img
                src={proofModalReg.proofOfPaymentUrl}
                alt={`Proof of payment for ${proofModalReg.fullname}`}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Approve Registration Confirmation Modal */}
      {approveRegTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApproveRegTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Approve Registration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to approve <strong>{approveRegTarget.fullname}</strong>? They will be granted Agent access.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setApproveRegTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setProcessingRegId(approveRegTarget.id);
                  await approveAdminRegistration(approveRegTarget.id);
                  setPendingRegistrations((prev) => prev.map((r) => r.id === approveRegTarget.id ? { ...r, status: 'approved' as const } : r));
                  setProcessingRegId(null);
                  setApproveRegTarget(null);
                }}
                disabled={processingRegId === approveRegTarget.id}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {processingRegId === approveRegTarget.id ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Registration Modal */}
      {rejectRegTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectRegTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Reject Registration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to reject <strong>{rejectRegTarget.fullname}</strong>? Please provide a reason below.
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for rejection</label>
            <textarea
              rows={3}
              value={rejectRegReason}
              onChange={(e) => setRejectRegReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectRegTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button
                onClick={async () => {
                  if (!rejectRegReason.trim()) return;
                  setProcessingRegId(rejectRegTarget.id);
                  await rejectAdminRegistration(rejectRegTarget.id, rejectRegReason);
                  setPendingRegistrations((prev) => prev.map((r) => r.id === rejectRegTarget.id ? { ...r, status: 'rejected' as const } : r));
                  setProcessingRegId(null);
                  setRejectRegTarget(null);
                }}
                disabled={!rejectRegReason.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reject Applicant
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showExportModal && (
        <ExportAgentsModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
      {showSettingsModal && <AgentSettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}
