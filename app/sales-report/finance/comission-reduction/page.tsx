'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import FinancePageHeader from '../components/FinancePageHeader';
import { fetchFinanceCommissionReductions } from '../lib/financeDataService';
import type { CommissionReductionRow } from '../types';

const ITEMS_PER_PAGE = 11;

function getSortTimestamp(row: CommissionReductionRow): number {
  const createdAtTimestamp = row.createdAt ? new Date(row.createdAt).getTime() : Number.NaN;
  if (Number.isFinite(createdAtTimestamp)) return createdAtTimestamp;

  const checkInTimestamp = row.checkIn ? new Date(row.checkIn).getTime() : Number.NaN;
  if (Number.isFinite(checkInTimestamp)) return checkInTimestamp;

  const numericId = Number(row.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

export default function ComissionReductionPage() {
  const { user } = useAuth();
  const currentUser = user
    ? { userId: user.id, email: user.email, role: user.roles?.[0] }
    : null;

  const [rows, setRows] = useState<CommissionReductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchFinanceCommissionReductions(currentUser);
        if (mounted) setRows(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser?.userId ?? null, currentUser?.email ?? null, currentUser?.role ?? null]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.bookingRef.toLowerCase().includes(q) ||
      row.agentName.toLowerCase().includes(q) ||
      row.propertyName.toLowerCase().includes(q) ||
      row.guestName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a)),
    [filteredRows],
  );

  const totalCommissionReduction = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.commissionAmount, 0),
    [filteredRows],
  );

  const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rows]);

  useEffect(() => {
    if (totalPages === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedRows.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedRows, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Comission reduction"
        description="Approved commissions deducted from finance revenue reporting."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Commission</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">₱{totalCommissionReduction.toLocaleString()}</p>
          <p className="text-xs font-medium text-gray-400 mt-2">Approved deductions only</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Approved Records</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{filteredRows.length.toLocaleString()}</p>
          <p className="text-xs font-medium text-gray-400 mt-2">Visible with current search</p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by booking ref, agent, property, guest…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
          style={{ fontFamily: 'Poppins' }}
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Booking Ref', 'Agent', 'Property', 'Guest', 'Booking Total', 'Rate', 'Commission', 'Date'].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                    No approved commission records match your search.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/sales-report/finance/bookings/${row.id}`}
                        className="font-bold text-[#0B5858] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {row.bookingRef}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.agentName}</td>
                    <td className="px-5 py-4 text-gray-600 max-w-[160px] truncate">{row.propertyName}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.guestName}</td>
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">₱{row.bookingTotal.toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.commissionRate}%</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0B5858] whitespace-nowrap">₱{row.commissionAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : (row.checkIn || '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
          <p className="text-xs font-medium text-gray-500">
            Showing <span className="font-medium text-gray-900">{sortedRows.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, sortedRows.length)}</span> of <span className="font-medium text-gray-900">{sortedRows.length}</span> results
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
    </div>
  );
}
