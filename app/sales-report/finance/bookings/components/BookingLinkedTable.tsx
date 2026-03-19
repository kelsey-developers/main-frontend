'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { BookingLinkedRow } from '../../types';
import { formatPHP, formatDateNumeric, getBookingTotal } from '../../lib/format';

interface BookingLinkedTableProps {
  rows: BookingLinkedRow[];
}

const ITEMS_PER_PAGE = 11;

const BookingLinkedTable: React.FC<BookingLinkedTableProps> = ({ rows }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const isEmpty = !rows || rows.length === 0;
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows]);

  useEffect(() => {
    if (totalPages === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return rows.slice(start, start + ITEMS_PER_PAGE);
  }, [rows, currentPage]);

  const showingFrom = totalRows === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = totalRows === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, totalRows);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Booking Ref', 'Unit / Type', 'Agent', 'Guest', 'Check-in / Out', 'Rate', 'Add-ons', 'Total', 'Action'].map((header) => (
                <th key={header} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isEmpty ? (
              <tr>
                <td colSpan={9} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                  No bookings match your filters.
                </td>
              </tr>
            ) : paginatedRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4">
                  <Link
                    href={`/sales-report/finance/bookings/${row.id}`}
                    className="font-bold text-[#0B5858] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {row.bookingId}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <div className="leading-tight min-w-0 max-w-[220px]">
                    <p className="text-gray-600 truncate">{row.unit}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{row.unitType ?? '—'}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.agent}</td>
                <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.guest}</td>
                <td className="px-5 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">
                  {formatDateNumeric(row.checkIn)} – {formatDateNumeric(row.checkOut)}
                </td>
                <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">{formatPHP(row.rate)}</td>
                <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatPHP(row.addOnsAmount)}</td>
                <td className="px-5 py-4">
                  <p className="font-bold text-[#0B5858] whitespace-nowrap">
                    {formatPHP(
                      row.totalAmount != null
                        ? row.totalAmount
                        : getBookingTotal(
                            row.rate,
                            row.checkIn,
                            row.checkOut,
                            row.discounts,
                            row.extraHeads,
                            row.extraHours,
                            row.addOnsAmount,
                          )
                    )}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/sales-report/finance/bookings/${row.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0B5858] text-white text-xs font-semibold hover:bg-[#094848] transition-colors whitespace-nowrap"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
        <p className="text-xs font-medium text-gray-500">
          Showing <span className="font-medium text-gray-900">{showingFrom}</span> to <span className="font-medium text-gray-900">{showingTo}</span> of <span className="font-medium text-gray-900">{totalRows}</span> results
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
  );
};

export default BookingLinkedTable;
