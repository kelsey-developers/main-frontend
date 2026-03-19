'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';
import jsPDF from 'jspdf';

const PAYROLL_API = PAYROLL_API_BASE;

// ─── Types ────────────────────────────────────────────────────────────────────
type PeriodStatus = 'pending' | 'approved' | 'processed' | 'paid';

interface PayrollPeriodEmployee {
  id: number;
  payroll_id: string;
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: 'DAILY' | 'MONTHLY';
  hire_date: string;
  effective_start: string;
  effective_end: string;
  days_worked: number;
  total_hours: number;
  overtime_hours: number;
  daily_rate: number | null;
  monthly_rate: number | null;
  base_pay: number;
  overtime_pay: number;
  gross_income: number;
  total_charges: number;
  net_pay: number;
  charges?: { charge_id: number; charge_date: string; description: string; amount: number }[];
}

interface PayrollPeriod {
  payroll_id: string;
  period_start: string;
  period_end: string;
  status: PeriodStatus;
  total_gross: number;
  total_deductions: number;
  total_net_pay: number;
  employee_count: number;
  notes: string | null;
  created_at: string;
  employees?: PayrollPeriodEmployee[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  // Parse as local midnight to avoid UTC-offset date shift
  const s = d.length === 10 ? d + 'T00:00:00' : d;
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number | string) {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  const abs = Math.abs(v || 0);
  const formatted = abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v || 0) < 0 ? `−₱ ${formatted}` : `₱ ${formatted}`;
}

const STATUS_STYLES: Record<PeriodStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  approved:  'bg-blue-100 text-blue-800 border border-blue-200',
  processed: 'bg-purple-100 text-purple-800 border border-purple-200',
  paid:      'bg-green-100 text-green-800 border border-green-200',
};
const STATUS_NEXT: Record<PeriodStatus, PeriodStatus | null> = {
  pending:   'approved',
  approved:  'processed',
  processed: 'paid',
  paid:      null,
};

// ─── Custom Date Picker ───────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CustomDatePicker({
  value, onChange, placeholder = 'Pick a date', minDate = '', className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
}) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState<'days' | 'months' | 'years'>('days');
  const ref               = useRef<HTMLDivElement>(null);

  const today   = new Date();
  const parsed  = value ? new Date(value + 'T00:00:00') : null;
  const [cursor, setCursor] = useState({
    year:  parsed ? parsed.getFullYear() : today.getFullYear(),
    month: parsed ? parsed.getMonth()    : today.getMonth(),
  });

  useEffect(() => {
    if (parsed) setCursor({ year: parsed.getFullYear(), month: parsed.getMonth() });
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setView('days');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay    = (y: number, m: number) => new Date(y, m, 1).getDay();

  const selectDate = (day: number) => {
    const d = `${cursor.year}-${String(cursor.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(d); setOpen(false); setView('days');
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = `${cursor.year}-${String(cursor.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return d < minDate;
  };

  const isSelected = (day: number) =>
    !!parsed && parsed.getFullYear() === cursor.year && parsed.getMonth() === cursor.month && parsed.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === cursor.year && today.getMonth() === cursor.month && today.getDate() === day;

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const yearRange = Array.from({ length: 10 }, (_, i) => cursor.year - 4 + i);

  const prevMonth = () => {
    if (cursor.month === 0) setCursor({ year: cursor.year - 1, month: 11 });
    else setCursor(c => ({ ...c, month: c.month - 1 }));
  };
  const nextMonth = () => {
    if (cursor.month === 11) setCursor({ year: cursor.year + 1, month: 0 });
    else setCursor(c => ({ ...c, month: c.month + 1 }));
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setView('days'); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] hover:border-gray-300 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`flex-1 text-left ${displayValue ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onChange(''); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onChange(''); }}
            className="text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 w-72">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setView(v => v === 'months' ? 'days' : 'months')}
                className="px-2 py-1 rounded-lg text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors">
                {MONTHS[cursor.month]}
              </button>
              <button type="button" onClick={() => setView(v => v === 'years' ? 'days' : 'years')}
                className="px-2 py-1 rounded-lg text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors">
                {cursor.year}
              </button>
            </div>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month picker */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1 mb-1">
              {MONTHS.map((m, i) => (
                <button key={m} type="button"
                  onClick={() => { setCursor(c => ({ ...c, month: i })); setView('days'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                    i === cursor.month ? 'bg-[#0B5858] text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}>
                  {m.slice(0,3)}
                </button>
              ))}
            </div>
          )}

          {/* Year picker */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1 mb-1">
              {yearRange.map(y => (
                <button key={y} type="button"
                  onClick={() => { setCursor(c => ({ ...c, year: y })); setView('days'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                    y === cursor.year ? 'bg-[#0B5858] text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}>
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Days grid */}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDay(cursor.year, cursor.month) }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth(cursor.year, cursor.month) }, (_, i) => i + 1).map(day => (
                  <button key={day} type="button" disabled={isDisabled(day)} onClick={() => selectDate(day)}
                    className={`aspect-square flex items-center justify-center text-xs rounded-xl transition-colors font-medium ${
                      isSelected(day)   ? 'bg-[#0B5858] text-white shadow-sm'
                      : isToday(day)    ? 'bg-[#0B5858]/10 text-[#0B5858] font-bold'
                      : isDisabled(day) ? 'text-gray-200 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-700'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1">
              Clear
            </button>
            <button type="button"
              onClick={() => {
                const t = new Date();
                setCursor({ year: t.getFullYear(), month: t.getMonth() });
                selectDate(t.getDate());
              }}
              className="text-xs font-semibold text-[#0B5858] hover:opacity-70 transition-opacity px-1">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }, []);
  const close = (cb: () => void) => { setVisible(false); setTimeout(cb, 200); };
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center px-4 transition-all duration-200 ${visible ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0'}`}
      onClick={e => { if (e.target === e.currentTarget) close(onCancel); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 text-base mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={() => close(onCancel)}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => close(onConfirm)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Generate Payroll Modal ───────────────────────────────────────────────────
function GenerateModal({
  onClose, onGenerated,
}: {
  onClose: () => void;
  onGenerated: (period: PayrollPeriod) => void;
}) {
  const [form, setForm]       = useState({ period_start: '', period_end: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  const handleSubmit = async () => {
    if (!form.period_start || !form.period_end) {
      setError('Both start and end dates are required.'); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await payrollFetch(`${PAYROLL_API}/api/payroll-periods/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? `Server error (${res.status})`);
      }
      onGenerated(await res.json());
      handleClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-300 ${visible ? 'bg-black/30 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[420px] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900">Generate Payroll</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pay Period */}
        <div className="px-6 py-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Pay Period</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">From</label>
              <CustomDatePicker
                value={form.period_start}
                onChange={v => setForm(f => ({ ...f, period_start: v }))}
                placeholder="Start date"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">To</label>
              <CustomDatePicker
                value={form.period_end}
                onChange={v => setForm(f => ({ ...f, period_end: v }))}
                placeholder="End date"
                minDate={form.period_start}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="px-6 py-5 border-t border-gray-100">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">
            Notes <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </p>
          <div className="border-l-2 border-[#0B5858]/30 pl-4">
            <input type="text" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. March 1–15 payroll"
              className={inp} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? 'Generating…' : 'Generate Now'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Payslip PDF Generation ───────────────────────────────────────────────────
function pdfPeso(n: number | string) {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  const abs = Math.abs(v || 0);
  const formatted = abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v || 0) < 0 ? `PHP -${formatted}` : `PHP ${formatted}`;
}

function generatePayslipPDF(emp: PayrollPeriodEmployee, period: PayrollPeriod) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = 148;
  const margin = 14;
  let y = 0;

  const teal: [number, number, number] = [11, 88, 88];
  const lightTeal: [number, number, number] = [236, 246, 246];

  // Header
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', margin, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(period.payroll_id, margin, 18);
  doc.setFontSize(8);
  doc.text(`Pay Period: ${fmtDate(period.period_start)} to ${fmtDate(period.period_end)}`, margin, 24);

  y = 38;

  // Employee info box
  doc.setFillColor(...lightTeal);
  doc.roundedRect(margin, y, W - margin * 2, 24, 3, 3, 'F');
  doc.setTextColor(...teal);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(emp.full_name, margin + 4, y + 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(emp.position || '—', margin + 4, y + 15);
  doc.text(emp.employment_type === 'DAILY' ? 'Daily Rate Employee' : 'Monthly Rate Employee', margin + 4, y + 21);

  y = 70;

  // Earnings section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text('EARNINGS', margin, y);
  y += 3;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  const earningsRows: [string, string][] = [
    ['Days Worked', `${emp.days_worked} day${emp.days_worked !== 1 ? 's' : ''}`],
    ['Total Hours', `${Number(emp.total_hours).toFixed(2)} hrs`],
    ...(Number(emp.overtime_hours) > 0 ? [['Overtime Hours', `${Number(emp.overtime_hours).toFixed(2)} hrs`] as [string, string]] : []),
    ['Base Pay', pdfPeso(emp.base_pay)],
    ...(Number(emp.overtime_pay) > 0 ? [['Overtime Pay (+25%)', pdfPeso(emp.overtime_pay)] as [string, string]] : []),
  ];

  for (const [label, value] of earningsRows) {
    doc.setFontSize(8);
    doc.text(label, margin, y);
    doc.text(value, W - margin, y, { align: 'right' });
    y += 6;
  }

  // Gross total bar
  y += 1;
  doc.setFillColor(...lightTeal);
  doc.rect(margin, y - 4, W - margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.setFontSize(8.5);
  doc.text('Gross Income', margin + 3, y + 2);
  doc.text(pdfPeso(emp.gross_income), W - margin - 3, y + 2, { align: 'right' });
  y += 12;

  // Deductions section
  if (Number(emp.total_charges) > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.setFontSize(8);
    doc.text('DEDUCTIONS', margin, y);
    y += 3;
    doc.line(margin, y, W - margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    if (emp.charges && emp.charges.length > 0) {
      for (const c of emp.charges) {
        doc.setFontSize(7.5);
        const label = `${fmtDate(c.charge_date)} — ${c.description}`;
        doc.text(label, margin, y);
        doc.text(pdfPeso(c.amount), W - margin, y, { align: 'right' });
        y += 5.5;
      }
    } else {
      doc.setFontSize(8);
      doc.text('Total Charges', margin, y);
      doc.text(pdfPeso(emp.total_charges), W - margin, y, { align: 'right' });
      y += 6;
    }

    y += 2;
    doc.setFillColor(255, 235, 235);
    doc.rect(margin, y - 4, W - margin * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 40, 40);
    doc.setFontSize(8.5);
    doc.text('Total Deductions', margin + 3, y + 2);
    doc.text(`-${pdfPeso(emp.total_charges)}`, W - margin - 3, y + 2, { align: 'right' });
    y += 14;
  }

  // Net Pay
  doc.setFillColor(...teal);
  doc.roundedRect(margin, y, W - margin * 2, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', margin + 5, y + 8);
  doc.setFontSize(15);
  doc.text(pdfPeso(emp.net_pay), W - margin - 5, y + 12, { align: 'right' });

  // Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}`,
    W / 2, 202, { align: 'center' }
  );

  doc.save(`payslip_${emp.full_name.replace(/\s+/g, '_')}_${period.payroll_id}.pdf`);
}

function generateAllPayslipsPDF(employees: PayrollPeriodEmployee[], period: PayrollPeriod) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = 148;
  const margin = 14;
  const teal: [number, number, number] = [11, 88, 88];
  const lightTeal: [number, number, number] = [236, 246, 246];

  employees.forEach((emp, idx) => {
    if (idx > 0) doc.addPage();
    let y = 0;

    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYSLIP', margin, 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(period.payroll_id, margin, 18);
    doc.setFontSize(8);
    doc.text(`Pay Period: ${fmtDate(period.period_start)} to ${fmtDate(period.period_end)}`, margin, 24);

    y = 38;

    doc.setFillColor(...lightTeal);
    doc.roundedRect(margin, y, W - margin * 2, 24, 3, 3, 'F');
    doc.setTextColor(...teal);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.full_name, margin + 4, y + 9);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(emp.position || '—', margin + 4, y + 15);
    doc.text(emp.employment_type === 'DAILY' ? 'Daily Rate Employee' : 'Monthly Rate Employee', margin + 4, y + 21);

    y = 70;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.text('EARNINGS', margin, y);
    y += 3;
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    const earningsRows: [string, string][] = [
      ['Days Worked', `${emp.days_worked} day${emp.days_worked !== 1 ? 's' : ''}`],
      ['Total Hours', `${Number(emp.total_hours).toFixed(2)} hrs`],
      ...(Number(emp.overtime_hours) > 0 ? [['Overtime Hours', `${Number(emp.overtime_hours).toFixed(2)} hrs`] as [string, string]] : []),
      ['Base Pay', fmtPeso(emp.base_pay)],
      ...(Number(emp.overtime_pay) > 0 ? [['Overtime Pay (+25%)', fmtPeso(emp.overtime_pay)] as [string, string]] : []),
    ];

    for (const [label, value] of earningsRows) {
      doc.setFontSize(8);
      doc.text(label, margin, y);
      doc.text(value, W - margin, y, { align: 'right' });
      y += 6;
    }

    y += 1;
    doc.setFillColor(...lightTeal);
    doc.rect(margin, y - 4, W - margin * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.setFontSize(8.5);
    doc.text('Gross Income', margin + 3, y + 2);
    doc.text(pdfPeso(emp.gross_income), W - margin - 3, y + 2, { align: 'right' });
    y += 12;

    if (Number(emp.total_charges) > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...teal);
      doc.setFontSize(8);
      doc.text('DEDUCTIONS', margin, y);
      y += 3;
      doc.line(margin, y, W - margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      if (emp.charges && emp.charges.length > 0) {
        for (const c of emp.charges) {
          doc.setFontSize(7.5);
          doc.text(`${fmtDate(c.charge_date)} - ${c.description}`, margin, y);
          doc.text(pdfPeso(c.amount), W - margin, y, { align: 'right' });
          y += 5.5;
        }
      } else {
        doc.setFontSize(8);
        doc.text('Total Charges', margin, y);
        doc.text(pdfPeso(emp.total_charges), W - margin, y, { align: 'right' });
        y += 6;
      }

      y += 2;
      doc.setFillColor(255, 235, 235);
      doc.rect(margin, y - 4, W - margin * 2, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 40, 40);
      doc.setFontSize(8.5);
      doc.text('Total Deductions', margin + 3, y + 2);
      doc.text(`-${pdfPeso(emp.total_charges)}`, W - margin - 3, y + 2, { align: 'right' });
      y += 14;
    }

    doc.setFillColor(...teal);
    doc.roundedRect(margin, y, W - margin * 2, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAY', margin + 5, y + 8);
    doc.setFontSize(15);
    doc.text(pdfPeso(emp.net_pay), W - margin - 5, y + 12, { align: 'right' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}  •  Page ${idx + 1} of ${employees.length}`,
      W / 2, 202, { align: 'center' }
    );
  });

  doc.save(`payslips_all_${period.payroll_id}.pdf`);
}

// ─── Period Detail Modal ──────────────────────────────────────────────────────
function PeriodDetail({
  period, onClose, onStatusUpdated,
}: {
  period: PayrollPeriod;
  onClose: () => void;
  onStatusUpdated: (updated: PayrollPeriod) => void;
}) {
  const [detail, setDetail]       = useState<PayrollPeriod | null>(null);
  const [loading, setLoading]     = useState(true);
  const [visible, setVisible]     = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    payrollFetch(`${PAYROLL_API}/api/payroll-periods/${period.payroll_id}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => setDetail(period))
      .finally(() => setLoading(false));
  }, [period.payroll_id]);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  const advanceStatus = async () => {
    if (!detail) return;
    const next = STATUS_NEXT[detail.status];
    if (!next) return;
    setAdvancing(true);
    try {
      const res = await payrollFetch(`${PAYROLL_API}/api/payroll-periods/${detail.payroll_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(d => d ? { ...d, status: updated.status } : d);
        onStatusUpdated({ ...period, status: updated.status });
      }
    } finally { setAdvancing(false); }
  };

  const d = detail ?? period;
  const nextStatus = STATUS_NEXT[d.status];

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto transition-all duration-300 ${visible ? 'bg-black/30 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl mb-8 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex flex-wrap items-center gap-3 z-10">
          <div className="w-9 h-9 bg-gradient-to-br from-[#0B5858] to-[#0d7a7a] rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base font-mono">{d.payroll_id}</h2>
            <p className="text-xs text-gray-400">{fmtDate(d.period_start)} – {fmtDate(d.period_end)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[d.status]}`}>{d.status}</span>
          <div className="ml-auto flex items-center gap-2">
            {(d.employees ?? []).length > 0 && (
              <button
                onClick={() => generateAllPayslipsPDF(d.employees!, d)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All Payslips
              </button>
            )}
            {nextStatus && (
              <button onClick={advanceStatus} disabled={advancing}
                className="px-4 py-2 bg-[#0B5858] hover:bg-[#094444] text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60">
                {advancing ? '…' : `Mark as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`}
              </button>
            )}
            <button onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {([
              { label: 'Employees',     value: String(d.employee_count),  sub: 'included in payroll', accent: false },
              { label: 'Total Gross',   value: fmtPeso(d.total_gross),    sub: 'before deductions',   accent: false },
              { label: 'Total Charges', value: fmtPeso(d.total_deductions), sub: 'deducted',           accent: false },
              { label: 'Total Net Pay', value: fmtPeso(d.total_net_pay),  sub: 'to be disbursed',     accent: true  },
            ] as const).map(card => (
              <div key={card.label} className={`rounded-2xl p-4 ${card.accent ? 'bg-[#0B5858] text-white' : 'bg-gray-50'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${card.accent ? 'text-white/70' : 'text-gray-400'}`}>{card.label}</p>
                <p className={`text-lg font-bold truncate ${card.accent ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                <p className={`text-xs mt-0.5 ${card.accent ? 'text-white/60' : 'text-gray-400'}`}>{card.sub}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading breakdown…</div>
          ) : (
            <>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Employee Breakdown</h3>
              {(d.employees ?? []).length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No employees matched this payroll period.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Employee','Type','Effective Period','Days','OT hrs','Base Pay','OT Pay','Charges','Net Pay',''].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(d.employees ?? []).map((emp, i) => (
                        <React.Fragment key={emp.id}>
                          <tr className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-gray-900">{emp.full_name}</p>
                              <p className="text-xs text-gray-400">{emp.position}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${emp.employment_type === 'DAILY' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {emp.employment_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                              {fmtDate(emp.effective_start)} – {fmtDate(emp.effective_end)}
                            </td>
                            <td className="py-3 px-4 text-gray-700 font-medium">{emp.days_worked}</td>
                            <td className="py-3 px-4">
                              <span className={Number(emp.overtime_hours) > 0 ? 'text-orange-600 font-semibold' : 'text-gray-300'}>
                                {Number(emp.overtime_hours).toFixed(1)}h
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{fmtPeso(emp.base_pay)}</td>
                            <td className="py-3 px-4">
                              <span className={Number(emp.overtime_pay) > 0 ? 'text-orange-600' : 'text-gray-300'}>
                                {fmtPeso(emp.overtime_pay)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={Number(emp.total_charges) > 0 ? 'text-red-600 font-semibold' : 'text-gray-300'}>
                                {Number(emp.total_charges) > 0 ? `-${pdfPeso(emp.total_charges)}` : '—'}
                              </span>
                            </td>
                            <td className={`py-3 px-4 font-bold ${Number(emp.net_pay) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {fmtPeso(emp.net_pay)}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => generatePayslipPDF(emp, d)}
                                title="Download Payslip"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#0B5858] hover:text-white text-gray-500 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                          {(emp.charges ?? []).length > 0 && (
                            <tr>
                              <td colSpan={9} className="pb-3 px-8">
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
                                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Charges Detail</p>
                                  {(emp.charges ?? []).map(c => (
                                    <div key={c.charge_id} className="flex justify-between text-xs text-red-700">
                                      <span>{fmtDate(c.charge_date)} — {c.description}</span>
                                      <span className="font-semibold ml-4">{fmtPeso(c.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPeriodsPage() {
  const [periods, setPeriods]           = useState<PayrollPeriod[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showGenerate, setShowGenerate]     = useState(false);
  const [selected, setSelected]             = useState<PayrollPeriod | null>(null);
  const [deleting, setDeleting]             = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [search, setSearch]           = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]     = useState('');

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)      params.set('payroll_id', search);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd)   params.set('end', filterEnd);
      const res = await payrollFetch(`${PAYROLL_API}/api/payroll-periods?${params}`);
      if (res.ok) setPeriods(await res.json());
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [search, filterStart, filterEnd]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const handleDelete = async (payrollId: string) => {
    setDeleting(payrollId);
    await payrollFetch(`${PAYROLL_API}/api/payroll-periods/${payrollId}`, { method: 'DELETE' });
    setPeriods(p => p.filter(x => x.payroll_id !== payrollId));
    setDeleting(null);
  };

  const handleStatusUpdated = (updated: PayrollPeriod) => {
    setPeriods(p => p.map(x => x.payroll_id === updated.payroll_id ? { ...x, status: updated.status } : x));
  };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll Periods</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate and manage payroll by period</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 bg-[#0B5858] hover:bg-[#094444] text-white px-5 py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-[#0B5858]/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Generate Payroll
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by Payroll ID…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]" />
          </div>
          <CustomDatePicker
            value={filterStart}
            onChange={setFilterStart}
            placeholder="Start date"
            className="sm:w-44"
          />
          <CustomDatePicker
            value={filterEnd}
            onChange={setFilterEnd}
            placeholder="End date"
            minDate={filterStart}
            className="sm:w-44"
          />
          {(search || filterStart || filterEnd) && (
            <button onClick={() => { setSearch(''); setFilterStart(''); setFilterEnd(''); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Periods table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading payroll periods…</div>
        ) : periods.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No payroll periods found</p>
            <p className="text-gray-400 text-sm mt-1">Click "Generate Payroll" to create the first period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Payroll ID','Period','Employees','Total Gross','Charges','Net Pay','Status',''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p.payroll_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-gray-800 text-xs">{p.payroll_id}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 text-xs">
                      {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{p.employee_count}</td>
                    <td className="py-3.5 px-4 text-gray-700">{fmtPeso(p.total_gross)}</td>
                    <td className="py-3.5 px-4">
                      <span className={Number(p.total_deductions) > 0 ? 'text-red-600' : 'text-gray-300'}>
                        {Number(p.total_deductions) > 0 ? `−${fmtPeso(p.total_deductions)}` : '—'}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-bold ${Number(p.total_net_pay) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmtPeso(p.total_net_pay)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(p)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
                          View
                        </button>
                        <button onClick={() => setConfirmDeleteId(p.payroll_id)} disabled={deleting === p.payroll_id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                          {deleting === p.payroll_id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGenerate && (
        <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={period => { setPeriods(p => [period, ...p]); }} />
      )}
      {selected && (
        <PeriodDetail period={selected} onClose={() => setSelected(null)} onStatusUpdated={handleStatusUpdated} />
      )}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Payroll Period"
          message={`Delete ${confirmDeleteId}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}