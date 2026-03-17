'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string;
  variant?: 'danger' | 'warning'; onConfirm: () => void; onCancel: () => void;
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
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
          <svg className={`w-6 h-6 ${variant === 'danger' ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Custom Date Picker ───────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CustomDatePicker({ value, onChange, placeholder = 'Pick a date' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const ref = useRef<HTMLDivElement>(null);
  const today  = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [cursor, setCursor] = useState({
    year:  parsed ? parsed.getFullYear() : today.getFullYear(),
    month: parsed ? parsed.getMonth()    : today.getMonth(),
  });

  useEffect(() => {
    if (parsed) setCursor({ year: parsed.getFullYear(), month: parsed.getMonth() });
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setView('days'); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay    = (y: number, m: number) => new Date(y, m, 1).getDay();
  const selectDate  = (day: number) => {
    onChange(`${cursor.year}-${String(cursor.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
    setOpen(false); setView('days');
  };
  const isSelected = (day: number) =>
    !!parsed && parsed.getFullYear() === cursor.year && parsed.getMonth() === cursor.month && parsed.getDate() === day;
  const isToday = (day: number) =>
    today.getFullYear() === cursor.year && today.getMonth() === cursor.month && today.getDate() === day;

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const yearRange = Array.from({ length: 10 }, (_, i) => cursor.year - 4 + i);
  const prevMonth = () => cursor.month === 0 ? setCursor({ year: cursor.year - 1, month: 11 }) : setCursor(c => ({ ...c, month: c.month - 1 }));
  const nextMonth = () => cursor.month === 11 ? setCursor({ year: cursor.year + 1, month: 0 }) : setCursor(c => ({ ...c, month: c.month + 1 }));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(o => !o); setView('days'); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] hover:border-gray-300 transition-colors">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`flex-1 text-left ${displayValue ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span role="button" tabIndex={0}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onChange(''); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onChange(''); }}
            className="text-gray-300 hover:text-gray-500 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 w-72">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1 mb-1">
              {MONTHS.map((m, i) => (
                <button key={m} type="button" onClick={() => { setCursor(c => ({ ...c, month: i })); setView('days'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors ${i === cursor.month ? 'bg-[#0B5858] text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                  {m.slice(0,3)}
                </button>
              ))}
            </div>
          )}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1 mb-1">
              {yearRange.map(y => (
                <button key={y} type="button" onClick={() => { setCursor(c => ({ ...c, year: y })); setView('days'); }}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors ${y === cursor.year ? 'bg-[#0B5858] text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                  {y}
                </button>
              ))}
            </div>
          )}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDay(cursor.year, cursor.month) }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth(cursor.year, cursor.month) }, (_, i) => i + 1).map(day => (
                  <button key={day} type="button" onClick={() => selectDate(day)}
                    className={`aspect-square flex items-center justify-center text-xs rounded-xl transition-colors font-medium ${
                      isSelected(day) ? 'bg-[#0B5858] text-white shadow-sm'
                      : isToday(day)  ? 'bg-[#0B5858]/10 text-[#0B5858] font-bold'
                      : 'hover:bg-gray-100 text-gray-700'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1">Clear</button>
            <button type="button"
              onClick={() => { const t = new Date(); setCursor({ year: t.getFullYear(), month: t.getMonth() }); selectDate(t.getDate()); }}
              className="text-xs font-semibold text-[#0B5858] hover:opacity-70 px-1">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
function CustomDropdown({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] hover:border-gray-300 transition-colors">
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected ? selected.label : 'Select…'}</span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  o.value === value ? 'bg-[#0B5858]/10 text-[#0B5858] font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type EmploymentType = 'DAILY' | 'MONTHLY' | 'COMMISSION';

interface Employee {
  employee_id: number;
  employee_code: string;
  full_name: string;
  hire_date: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Charge {
  charge_id: number;
  charge_date: string;
  description: string;
  amount: number;
}

interface PayrollAppearance {
  payroll_id: string;
  period_start: string;
  period_end: string;
  status: string;
  days_worked: number;
  overtime_hours: number;
  gross_income: number;
  total_charges: number;
  net_pay: number;
  effective_start: string;
  effective_end: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number | string) {
  return `₱ ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_COLORS: Record<EmploymentType, string> = {
  DAILY:      'bg-blue-100 text-blue-700',
  MONTHLY:    'bg-purple-100 text-purple-700',
  COMMISSION: 'bg-orange-100 text-orange-700',
};

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  processed: 'bg-purple-100 text-purple-700',
  paid:      'bg-green-100 text-green-700',
};

// ─── Rate Update Section ──────────────────────────────────────────────────────
function RateEditor({
  employee,
  onUpdated,
}: {
  employee: Employee;
  onUpdated: (updated: Employee) => void;
}) {
  const [rate, setRate]       = useState(String(employee.current_rate));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const isDirty = rate !== String(employee.current_rate);

  const handleSave = async () => {
    const n = parseFloat(rate);
    if (isNaN(n) || n < 0) { setError('Enter a valid amount.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employees/${employee.employee_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_rate: n }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const updated = await res.json();
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const rateLabel =
    employee.employment_type === 'DAILY'   ? 'Daily Rate' :
    employee.employment_type === 'MONTHLY' ? 'Monthly Rate' :
    'Commission Rate';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{rateLabel}</h3>
          <p className="text-xs text-gray-400">Updates automatically apply to future payroll periods</p>
        </div>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            {rateLabel} (₱)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₱</span>
            <input
              type="number" min="0" step="0.01"
              value={rate}
              onChange={e => { setRate(e.target.value); setSaved(false); setError(null); }}
              className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            />
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : isDirty
                ? 'bg-[#0B5858] hover:bg-[#094444] text-white shadow-lg shadow-[#0B5858]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Update Rate'}
        </button>
      </div>

      {/* Payroll impact note */}
      <div className="mt-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 flex gap-2">
        <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-600">
          This rate is used when generating payroll periods.{' '}
          {employee.employment_type === 'DAILY'
            ? `Daily pay = rate × days worked. Overtime = rate ÷ 8 × 1.25 × OT hours.`
            : employee.employment_type === 'MONTHLY'
              ? `Monthly pay is prorated if employee was hired mid-period. Overtime = (rate ÷ 26 ÷ 8) × 1.25 × OT hours.`
              : `Commission is calculated per booking — this rate is informational.`
          }
        </p>
      </div>
    </div>
  );
}

// ─── Info Editor ──────────────────────────────────────────────────────────────
function InfoEditor({
  employee,
  onUpdated,
}: {
  employee: Employee;
  onUpdated: (updated: Employee) => void;
}) {
  const [form, setForm] = useState({
    full_name:       employee.full_name,
    hire_date:       employee.hire_date.slice(0, 10),
    position:        employee.position,
    employment_type: employee.employment_type as string,
    role:            employee.role,
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isDirty =
    form.full_name       !== employee.full_name ||
    form.hire_date       !== employee.hire_date ||
    form.position        !== employee.position  ||
    form.employment_type !== employee.employment_type ||
    form.role            !== employee.role;

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employees/${employee.employee_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      onUpdated(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  const EMPLOYMENT_OPTS = [
    { value: 'DAILY',   label: 'Daily' },
    { value: 'MONTHLY', label: 'Monthly' },
  ];
  const POSITION_OPTS = [
    { value: 'Housekeeper', label: 'Housekeeper' },
    { value: 'Cleaner',     label: 'Cleaner' },
  ];
  const ROLE_OPTS = [
    { value: 'employee', label: 'Employee' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-[#0B5858]/10 rounded-xl flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 text-sm">Basic Information</h3>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Hire Date</label>
            <CustomDatePicker value={form.hire_date} onChange={v => set('hire_date', v)} />
          </div>
          <div>
            <label className={labelClass}>Position</label>
            <CustomDropdown value={form.position} onChange={v => set('position', v)} options={POSITION_OPTS} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Employment Type</label>
            <CustomDropdown value={form.employment_type} onChange={v => set('employment_type', v)} options={EMPLOYMENT_OPTS} />
          </div>
          <div>
            <label className={labelClass}>Role (Admin-assigned)</label>
            <CustomDropdown value={form.role} onChange={v => set('role', v)} options={ROLE_OPTS} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : isDirty
                ? 'bg-[#0B5858] hover:bg-[#094444] text-white shadow-lg shadow-[#0B5858]/20'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub != null && <p className="text-xs font-medium text-gray-500 mt-2 text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function EmployeeProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params?.id as string;

  const [employee, setEmployee]           = useState<Employee | null>(null);
  const [charges, setCharges]             = useState<Charge[]>([]);
  const [appearances, setAppearances]     = useState<PayrollAppearance[]>([]);
  const [loading, setLoading]             = useState(true);
  const [deactivating, setDeactivating]   = useState(false);
  const [activeTab, setActiveTab]         = useState<'overview' | 'payroll' | 'edit'>('overview');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      payrollFetch(`${PAYROLL_API_BASE}/api/employees/${id}`).then(r => r.json()),
      payrollFetch(`${PAYROLL_API_BASE}/api/charges?employee_id=${id}`).then(r => r.json()).catch(() => []),
    ]).then(([emp, chg]) => {
      setEmployee(emp);
      setCharges(Array.isArray(chg) ? chg.slice(0, 10) : []);
    }).finally(() => setLoading(false));
  }, [id]);

  // Fetch payroll appearances from periods
  useEffect(() => {
    if (!id) return;
    payrollFetch(`${PAYROLL_API_BASE}/api/payroll-periods`)
      .then(r => r.json())
      .then(async (periods: any[]) => {
        if (!Array.isArray(periods)) return;
        // For each period, fetch detail and find this employee's line item
        const results: PayrollAppearance[] = [];
        await Promise.all(
          periods.slice(0, 20).map(async (p: any) => {
            try {
              const detail = await payrollFetch(`${PAYROLL_API_BASE}/api/payroll-periods/${p.payroll_id}`).then(r => r.json());
              const empRow = (detail.employees ?? []).find((e: any) => String(e.employee_id) === String(id));
              if (empRow) {
                results.push({
                  payroll_id:     p.payroll_id,
                  period_start:   p.period_start,
                  period_end:     p.period_end,
                  status:         p.status,
                  days_worked:    empRow.days_worked,
                  overtime_hours: empRow.overtime_hours,
                  gross_income:   empRow.gross_income,
                  total_charges:  empRow.total_charges,
                  net_pay:        empRow.net_pay,
                  effective_start: empRow.effective_start,
                  effective_end:   empRow.effective_end,
                });
              }
            } catch { /* skip */ }
          })
        );
        results.sort((a, b) => b.period_start.localeCompare(a.period_start));
        setAppearances(results);
      }).catch(() => {});
  }, [id]);

  const handleDeactivate = async () => {
    if (!employee) return;
    setDeactivating(true);
    await payrollFetch(`${PAYROLL_API_BASE}/api/employees/${employee.employee_id}`, { method: 'DELETE' });
    router.push('/payroll/employees');
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif' }} className="py-20 text-center text-gray-400 text-sm">
        Loading employee profile…
      </div>
    );
  }

  if (!employee || (employee as any).error) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif' }} className="py-20 text-center">
        <p className="text-gray-500 font-medium">Employee not found.</p>
        <Link href="/payroll/employees" className="text-[#0B5858] text-sm hover:underline mt-2 inline-block">← Back to Employees</Link>
      </div>
    );
  }

  const totalCharges  = charges.reduce((s, c) => s + Number(c.amount), 0);
  const totalNet      = appearances.reduce((s, a) => s + Number(a.net_pay), 0);
  const initials      = employee.full_name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const rateSubLabel  = employee.employment_type === 'MONTHLY' ? 'per month' : 'per day';

  const TABS: { key: 'overview' | 'payroll' | 'edit'; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'payroll',  label: 'Payroll History' },
    { key: 'edit',     label: 'Edit' },
  ];

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }} className="space-y-6">

      {/* 1. Page header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{employee.full_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Employee profile, payroll history, and charges.</p>
        </div>
        <Link
          href="/payroll/employees"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Employees
        </Link>
      </div>

      {/* 2. Profile card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <p className="font-bold text-gray-900 text-sm">Profile</p>
          <p className="text-xs text-gray-400 mt-0.5">Employment info and contact</p>
        </div>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-[#0B5858]/10 flex items-center justify-center shrink-0">
            <span className="text-[#0B5858] font-bold text-xl">{initials}</span>
          </div>

          {/* Name + badges + position */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-base">{employee.full_name}</span>
              <span className="flex items-center gap-1 text-xs font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={employee.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                  {employee.status}
                </span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[employee.employment_type]}`}>
                {employee.employment_type}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{employee.position}</p>
          </div>

          {/* Right side details */}
          <div className="flex flex-col sm:items-end gap-1 text-sm shrink-0">
            <span className="text-gray-500 capitalize">{employee.role}</span>
            <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-mono">
              {employee.employee_code}
            </code>
            <span className="text-xs text-gray-400">Hired {fmtDate(employee.hire_date)}</span>
          </div>
        </div>
      </div>

      {/* 3. Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <StatCard
          label="Payroll Periods"
          value={appearances.length}
          sub="Total appearances"
        />
        <StatCard
          label="Net Earned"
          value={fmtPeso(totalNet)}
          sub="All periods"
        />
        <StatCard
          label="Total Charges"
          value={fmtPeso(totalCharges)}
          sub="Deductions"
        />
        <StatCard
          label="Type"
          value={employee.employment_type}
          sub={`${fmtPeso(employee.current_rate)} ${rateSubLabel}`}
        />
      </div>

      {/* 4. Tabs card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-100">
          <div className="flex items-center gap-1 pb-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors mb-[-1px] ${
                  activeTab === tab.key
                    ? 'bg-[#0B5858] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div className="p-6">

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div>
              {charges.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No charges recorded.</p>
              ) : (
                <>
                  <div className="space-y-0">
                    {charges.slice(0, 6).map(c => (
                      <div key={c.charge_id} className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{c.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(c.charge_date)}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600 ml-4">{fmtPeso(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                  {totalCharges > 0 && (
                    <div className="mt-4 bg-red-50 rounded-2xl px-4 py-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Total Charges</span>
                      <span className="font-bold text-red-600">{fmtPeso(totalCharges)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Payroll History tab */}
          {activeTab === 'payroll' && (
            <div>
              {appearances.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Not included in any payroll period yet.</p>
              ) : (
                <div className="space-y-2">
                  {appearances.map(a => (
                    <div key={a.payroll_id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="font-mono text-xs font-semibold text-gray-700">{a.payroll_id}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(a.period_start)} – {fmtDate(a.period_end)}</p>
                        <p className="text-xs text-gray-300 mt-0.5">Active: {fmtDate(a.effective_start)} – {fmtDate(a.effective_end)}</p>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Days</p>
                          <p className="font-semibold text-gray-800">{a.days_worked}</p>
                        </div>
                        {Number(a.overtime_hours) > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">OT</p>
                            <p className="font-semibold text-orange-500">⚡{Number(a.overtime_hours).toFixed(1)}h</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Pay</p>
                          <p className="font-bold text-gray-900">{fmtPeso(a.net_pay)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit tab */}
          {activeTab === 'edit' && (
            <div className="space-y-5">
              <RateEditor employee={employee} onUpdated={setEmployee} />
              <InfoEditor employee={employee} onUpdated={setEmployee} />
            </div>
          )}

        </div>
      </div>

      {/* 5. Danger Zone card */}
      {employee.status === 'active' && (
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
          <h3 className="font-bold text-red-600 text-sm mb-2">Danger Zone</h3>
          <p className="text-xs text-gray-400 mb-4">
            Deactivating this employee excludes them from all future payroll periods. Existing payroll records are preserved.
          </p>
          <button
            onClick={() => setShowDeactivateConfirm(true)}
            disabled={deactivating}
            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold text-sm border border-red-200 transition-colors disabled:opacity-50"
          >
            {deactivating ? 'Deactivating…' : 'Deactivate Employee'}
          </button>
        </div>
      )}

      {showDeactivateConfirm && (
        <ConfirmModal
          title="Deactivate Employee"
          message={`Deactivate ${employee.full_name}? They will be excluded from all future payroll periods. Existing records are preserved.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => { setShowDeactivateConfirm(false); handleDeactivate(); }}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}

    </div>
  );
}
