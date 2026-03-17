'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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
  const close   = (cb: () => void) => { setVisible(false); setTimeout(cb, 200); };
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

type EmploymentType = 'DAILY' | 'MONTHLY';

interface Employee {
  employee_id: number;
  employee_code: string;
  full_name: string;
  email: string | null;
  hire_date: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
  role: string;
  status: 'active' | 'inactive';
  unit_id: number | null;
  created_at: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number) {
  return `₱ ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_COLORS: Record<EmploymentType, string> = {
  DAILY:   'bg-blue-100 text-blue-700',
  MONTHLY: 'bg-purple-100 text-purple-700',
};
const EMPLOYMENT_TYPES: EmploymentType[] = ['DAILY', 'MONTHLY'];

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
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] hover:border-gray-300 transition-colors"
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

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
interface DropdownOption { label: string; value: string; }

function CustomDropdown({
  value, onChange, options, placeholder = 'Select…', className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] hover:border-gray-300 transition-colors"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(o => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  o.value === value ? 'bg-[#0B5858]/8 text-[#0B5858] font-semibold' : 'text-gray-700 hover:bg-gray-50'
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

// ─── Approve Registration Modal ───────────────────────────────────────────────
interface Registration {
  id: number;
  full_name: string;
  email: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface ApproveForm {
  hire_date: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: string;
  role: string;
}

const EMPTY_APPROVE: ApproveForm = {
  hire_date: '', position: '', employment_type: 'DAILY', current_rate: '', role: 'employee',
};

const ROLE_OPTIONS: DropdownOption[] = [
  { value: 'employee', label: 'Employee' },
];

const POSITION_OPTIONS: DropdownOption[] = [
  { value: 'Housekeeper', label: 'Housekeeper' },
  { value: 'Cleaner',     label: 'Cleaner' },
];

function ApproveModal({
  registration, onClose, onApproved,
}: {
  registration: Registration;
  onClose: () => void;
  onApproved: (employee: Employee) => void;
}) {
  const [form, setForm]       = useState<ApproveForm>(EMPTY_APPROVE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };
  const set = (k: keyof ApproveForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleApprove = async () => {
    if (!form.hire_date || !form.position || !form.current_rate) {
      setError('Hire date, position, and rate are required.'); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employee-registrations/${registration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', ...form, current_rate: Number(form.current_rate) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      onApproved(data.employee);
      handleClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]';
  const lbl = 'block text-xs text-gray-500 mb-1.5';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-300 ${visible ? 'bg-black/30 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[420px] max-h-[90vh] overflow-y-auto transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900">Approve Registration</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Applicant info */}
        <div className="px-6 pt-5 pb-3">
          <div className="p-3 bg-[#0B5858]/5 rounded-xl mb-4">
            <p className="text-sm font-semibold text-gray-800">{registration.full_name}</p>
            <p className="text-xs text-gray-500">{registration.email}</p>
            {registration.message && (
              <p className="text-xs text-gray-500 mt-1.5 italic">"{registration.message}"</p>
            )}
          </div>
          <p className="text-[13px] font-semibold text-gray-900 mb-3">Employment Details</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Hire Date *</label>
                <CustomDatePicker value={form.hire_date} onChange={v => set('hire_date', v)} placeholder="Pick a date" />
              </div>
              <div>
                <label className={lbl}>Position *</label>
                <CustomDropdown
                  value={form.position}
                  onChange={v => set('position', v)}
                  options={POSITION_OPTIONS}
                  placeholder="Select position"
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Type *</label>
              <div className="flex gap-2">
                {(['DAILY', 'MONTHLY'] as EmploymentType[]).map(t => (
                  <button key={t} type="button" onClick={() => set('employment_type', t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.employment_type === t ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{form.employment_type === 'DAILY' ? 'Daily Rate (₱) *' : 'Monthly Rate (₱) *'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                  <input type="number" min="0" value={form.current_rate} onChange={e => set('current_rate', e.target.value)}
                    placeholder="0.00" className={`${inp} pl-7`} />
                </div>
              </div>
              <div>
                <label className={lbl}>Role</label>
                <CustomDropdown
                  value={form.role}
                  onChange={v => set('role', v)}
                  options={ROLE_OPTIONS}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleApprove} disabled={loading}
              className="flex-1 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? 'Approving…' : 'Approve & Add'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<EmploymentType | 'ALL'>('ALL');

  // Pending registrations
  const [registrations, setRegistrations]     = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs]         = useState(true);
  const [approveReg, setApproveReg]           = useState<Registration | null>(null);
  const [rejectingId, setRejectingId]         = useState<number | null>(null);

  // Confirm modal
  type ConfirmState = { title: string; message: string; confirmLabel: string; variant: 'danger' | 'warning'; onConfirm: () => void; };
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const askConfirm = (state: ConfirmState) => setConfirmState(state);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, []);

  const fetchRegistrations = useCallback(async () => {
    setLoadingRegs(true);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employee-registrations`);
      if (res.ok) setRegistrations(await res.json());
    } catch { /* network error */ }
    finally { setLoadingRegs(false); }
  }, []);

  useEffect(() => { fetchEmployees(); fetchRegistrations(); }, [fetchEmployees, fetchRegistrations]);

  const handleReject = (id: number) => {
    askConfirm({
      title: 'Reject Registration',
      message: 'This will mark the registration as rejected. The applicant will not be added as an employee.',
      confirmLabel: 'Reject',
      variant: 'danger',
      onConfirm: async () => {
        setRejectingId(id);
        try {
          await payrollFetch(`${PAYROLL_API_BASE}/api/employee-registrations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' }),
          });
          setRegistrations(r => r.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
        } catch { /* ignore */ }
        finally { setRejectingId(null); }
      },
    });
  };

  const handleApproved = (employee: Employee, regId: number) => {
    setRegistrations(r => r.map(x => x.id === regId ? { ...x, status: 'approved' } : x));
    setEmployees(prev => [employee, ...prev]);
  };

  const filtered = employees.filter(e => {
    const matchSearch = search === '' ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || e.employment_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = (id: number, name: string) => {
    askConfirm({
      title: 'Remove Employee',
      message: `Remove ${name}? They will no longer appear in new payroll periods. Existing records are preserved.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setDeleting(id);
        await payrollFetch(`${PAYROLL_API_BASE}/api/employees/${id}`, { method: 'DELETE' });
        setEmployees(e => e.filter(x => x.employee_id !== id));
        setDeleting(null);
      },
    });
  };


  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage employee records and rates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, position, or code…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
            {(['ALL', ...EMPLOYMENT_TYPES] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t ? 'bg-white text-[#0B5858] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading employees…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">{search || typeFilter !== 'ALL' ? 'No employees match your filter' : 'No employees yet'}</p>
            {!search && typeFilter === 'ALL' && <p className="text-gray-400 text-sm mt-1">Add an employee to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Code','Name','Email','Position','Type','Hire Date','Rate','Role',''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.employee_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-500">{emp.employee_code}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#0B5858]/20 to-[#0B5858]/30 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-[#0B5858] text-xs font-bold">
                            {emp.full_name.split(' ').map(n => n[0]).slice(0,2).join('')}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs">
                      {emp.email ?? <span className="text-gray-300 italic">not linked</span>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{emp.position}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[emp.employment_type]}`}>
                        {emp.employment_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">{fmtDate(emp.hire_date)}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">{fmtPeso(emp.current_rate)}</td>
                    <td className="py-3.5 px-4 text-gray-500 capitalize">{emp.role}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/payroll/employees/${emp.employee_id}`}
                          className="px-3 py-1.5 bg-[#0B5858]/10 hover:bg-[#0B5858]/20 text-[#0B5858] rounded-xl text-xs font-medium transition-colors">
                          Profile
                        </Link>
                        <button onClick={() => handleDelete(emp.employee_id, emp.full_name)} disabled={deleting === emp.employee_id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                          {deleting === emp.employee_id ? '…' : 'Remove'}
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

      {/* Pending Registrations */}
      {(() => {
        const pending = registrations.filter(r => r.status === 'pending');
        const reviewed = registrations.filter(r => r.status !== 'pending');
        return (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Pending Registrations</h2>
              {pending.length > 0 && (
                <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-semibold">
                  {pending.length} pending
                </span>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingRegs ? (
                <div className="py-10 text-center text-gray-400 text-sm">Loading registrations…</div>
              ) : pending.length === 0 && reviewed.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No registration requests yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {[...pending, ...reviewed].map(reg => (
                    <div key={reg.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{reg.full_name}</p>
                        <p className="text-xs text-gray-500">{reg.email}</p>
                        {reg.message && (
                          <p className="text-xs text-gray-400 mt-1 italic">"{reg.message}"</p>
                        )}
                        <p className="text-[11px] text-gray-300 mt-1">
                          {new Date(reg.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {reg.status === 'pending' ? (
                          <>
                            <button onClick={() => setApproveReg(reg)}
                              className="px-3 py-1.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-xs font-semibold transition-colors">
                              Approve
                            </button>
                            <button onClick={() => handleReject(reg.id)} disabled={rejectingId === reg.id}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                              {rejectingId === reg.id ? '…' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            reg.status === 'approved'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            {reg.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {approveReg && (
        <ApproveModal
          registration={approveReg}
          onClose={() => setApproveReg(null)}
          onApproved={employee => { handleApproved(employee, approveReg.id); setApproveReg(null); }}
        />
      )}
      {confirmState && (
        <ConfirmModal
          {...confirmState}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}