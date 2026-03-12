'use client';

import React, { useState } from 'react';
import type { Loan, ScheduleEntry, LoanPayment } from '@/types/lending';
import RecordPaymentModal from '../../components/RecordPaymentModal';

interface Props {
  loan: Loan;
  schedules: ScheduleEntry[];
  onPaymentRecorded: (payment: LoanPayment) => void;
}

const STATUS_CONFIG: Record<
  ScheduleEntry['status'],
  { label: string; classes: string; dot: string }
> = {
  upcoming: { label: 'Upcoming', classes: 'bg-gray-50 text-gray-500 border border-gray-200',             dot: 'bg-gray-300' },
  paid:     { label: 'Paid',     classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',  dot: 'bg-[#0B5858]' },
  overdue:  { label: 'Overdue',  classes: 'bg-red-50 text-red-700 border border-red-200',                dot: 'bg-red-500' },
  partial:  { label: 'Partial',  classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30',  dot: 'bg-[#FACC15]' },
};

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ScheduleTab({ loan, schedules, onPaymentRecorded }: Props) {
  const [paymentTarget, setPaymentTarget] = useState<ScheduleEntry | null>(null);

  const paidCount    = schedules.filter((s) => s.status === 'paid').length;
  const overdueCount = schedules.filter((s) => s.status === 'overdue').length;

  return (
    <div className="space-y-4">

      {/* Summary mini-cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Periods', value: schedules.length.toString(), color: 'text-gray-900' },
          { label: 'Paid',          value: paidCount.toString(),         color: 'text-[#0B5858]' },
          { label: 'Overdue',       value: overdueCount.toString(),      color: overdueCount > 0 ? 'text-red-600' : 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['#', 'Due Date', 'Principal', 'Interest', 'Total Due', 'Balance', 'Status', 'Paid On', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap first:pl-4 last:pr-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {schedules.map((s) => {
              const sc     = STATUS_CONFIG[s.status];
              const canPay = s.status === 'upcoming' || s.status === 'overdue' || s.status === 'partial';
              return (
                <tr
                  key={s.period}
                  className={`hover:bg-gray-50/50 transition-colors ${s.status === 'overdue' ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-3 py-3 pl-4 font-bold text-gray-700">{s.period}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtDate(s.dueDate)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-700">{fmt(s.principalDue)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{fmt(s.interestDue)}</td>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-gray-900">{fmt(s.totalDue)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{fmt(s.remainingBalance)}</td>
                  <td className="px-3 py-3">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.classes}`}>
                        <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      {s.paidAmount && s.status === 'partial' && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmt(s.paidAmount)} paid</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {s.paidAt ? fmtDate(s.paidAt) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 pr-4">
                    {canPay && (
                      <button
                        type="button"
                        onClick={() => setPaymentTarget(s)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#0B5858] bg-[#0B5858]/5 hover:bg-[#0B5858]/10 border border-[#0B5858]/10 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Record
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paymentTarget && (
        <RecordPaymentModal
          loan={loan}
          onClose={() => setPaymentTarget(null)}
          onRecorded={(payment) => {
            setPaymentTarget(null);
            onPaymentRecorded(payment);
          }}
        />
      )}
    </div>
  );
}
