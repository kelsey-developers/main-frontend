'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';

type EmploymentType = 'DAILY' | 'MONTHLY';

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
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }}
            className="text-gray-300 hover:text-gray-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

// ─── Employee Form Modal ──────────────────────────────────────────────────────
interface EmpForm {
  full_name: string;
  hire_date: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: string;
  role: string;
}

const EMPTY_FORM: EmpForm = {
  full_name: '', hire_date: '', position: '',
  employment_type: 'DAILY', current_rate: '', role: 'employee',
};

const ROLE_OPTIONS: DropdownOption[] = [
  { value: 'employee',   label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager',    label: 'Manager' },
  { value: 'admin',      label: 'Admin' },
];

function EmployeeModal({
  employee, onClose, onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: (e: Employee) => void;
}) {
  const isEdit = !!employee;
  const [form, setForm]       = useState<EmpForm>(employee ? {
    full_name:       employee.full_name,
    hire_date:       employee.hire_date.slice(0, 10),
    position:        employee.position,
    employment_type: employee.employment_type,
    current_rate:    String(employee.current_rate),
    role:            employee.role,
  } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };
  const set = (k: keyof EmpForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name || !form.hire_date || !form.position || !form.current_rate) {
      setError('All required fields must be filled.'); return;
    }
    setLoading(true); setError(null);
    try {
      const url    = isEdit ? `${PAYROLL_API_BASE}/api/employees/${employee!.employee_id}` : `${PAYROLL_API_BASE}/api/employees`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await payrollFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, current_rate: Number(form.current_rate) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? `Server error (${res.status})`);
      }
      onSaved(await res.json());
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900">{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Employee Details */}
        <div className="px-6 py-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Employee Details</p>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="e.g. Maria Santos" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Hire Date *</label>
                <CustomDatePicker
                  value={form.hire_date}
                  onChange={v => set('hire_date', v)}
                  placeholder="Pick a date"
                />
              </div>
              <div>
                <label className={lbl}>Position *</label>
                <input type="text" value={form.position} onChange={e => set('position', e.target.value)}
                  placeholder="e.g. Housekeeper" className={inp} />
              </div>
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="px-6 py-5 border-t border-gray-100">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Employment</p>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Type *</label>
              <div className="flex gap-2">
                {EMPLOYMENT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('employment_type', t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.employment_type === t
                        ? 'bg-[#0B5858] text-white border-[#0B5858]'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'}
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
  const [modalEmp, setModalEmp]   = useState<Employee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<EmploymentType | 'ALL'>('ALL');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = employees.filter(e => {
    const matchSearch = search === '' ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || e.employment_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deactivate ${name}? They will no longer appear in new payroll periods.`)) return;
    setDeleting(id);
    await payrollFetch(`${PAYROLL_API_BASE}/api/employees/${id}`, { method: 'DELETE' });
    setEmployees(e => e.filter(x => x.employee_id !== id));
    setDeleting(null);
  };

  const openAdd  = () => { setModalEmp(null); setShowModal(true); };
  const openEdit = (e: Employee) => { setModalEmp(e); setShowModal(true); };

  const handleSaved = (saved: Employee) => {
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.employee_id === saved.employee_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
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
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#0B5858] hover:bg-[#094444] text-white px-5 py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-[#0B5858]/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Employee
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
                  {['Code','Name','Position','Type','Hire Date','Rate','Role',''].map(h => (
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
                        <button onClick={() => openEdit(emp)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
                          Edit
                        </button>
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

      {showModal && (
        <EmployeeModal
          employee={modalEmp}
          onClose={() => setShowModal(false)}
          onSaved={e => { handleSaved(e); setShowModal(false); }}
        />
      )}
    </div>
  );
}