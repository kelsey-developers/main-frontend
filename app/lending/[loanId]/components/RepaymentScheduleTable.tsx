'use client';

import React from 'react';
import type { ScheduleEntry } from '@/types/lending';

interface Props {
  schedules: ScheduleEntry[];
}

const STATUS_CONFIG: Record<ScheduleEntry['status'], { label: string; classes: string; dot: string }> = {
  upcoming: { label: 'Upcoming',  classes: 'bg-gray-50 text-gray-500 border border-gray-200',           dot: 'bg-gray-300' },
  paid:     { label: 'Paid',      classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20', dot: 'bg-[#0B5858]' },
  overdue:  { label: 'Overdue',   classes: 'bg-red-50 text-red-700 border border-red-200',               dot: 'bg-red-500' },
  partial:  { label: 'Partial',   classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30', dot: 'bg-[#FACC15]' },
};

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RepaymentScheduleTable({ schedules }: Props) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['#', 'Due Date', 'Principal', 'Interest', 'Total Due', 'Balance', 'Status', 'Paid On'].map((h) => (
              <th key={h} className="pb-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {schedules.map((entry) => {
            const cfg = STATUS_CONFIG[entry.status];
            return (
              <tr key={entry.period} className={`${entry.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                <td className="py-3 pr-4 font-mono text-xs text-gray-400 font-medium">{entry.period}</td>
                <td className="py-3 pr-4 text-gray-700 font-medium whitespace-nowrap">
                  {new Date(entry.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="py-3 pr-4 text-gray-800 font-semibold">{fmt(entry.principalDue)}</td>
                <td className="py-3 pr-4 text-gray-600">{fmt(entry.interestDue)}</td>
                <td className="py-3 pr-4 font-bold text-gray-900">{fmt(entry.totalDue)}</td>
                <td className="py-3 pr-4 text-gray-600">{fmt(entry.remainingBalance)}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.classes}`}>
                    <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </td>
                <td className="py-3 text-gray-500 text-xs">
                  {entry.paidAt
                    ? new Date(entry.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
