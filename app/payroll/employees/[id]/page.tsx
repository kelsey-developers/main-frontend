'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const PAYROLL_API = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

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
      const res = await fetch(`${PAYROLL_API}/api/employees/${employee.employee_id}`, {
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
      const res = await fetch(`${PAYROLL_API}/api/employees/${employee.employee_id}`, {
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
            <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Position</label>
            <input type="text" value={form.position} onChange={e => set('position', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Employment Type</label>
            <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={inputClass}>
              <option value="DAILY">DAILY</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="COMMISSION">COMMISSION</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Role (Admin-assigned)</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className={inputClass}>
              <option value="employee">Employee</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
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

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${PAYROLL_API}/api/employees/${id}`).then(r => r.json()),
      fetch(`${PAYROLL_API}/api/charges/employee/${id}`).then(r => r.json()).catch(() => []),
    ]).then(([emp, chg]) => {
      setEmployee(emp);
      setCharges(Array.isArray(chg) ? chg.slice(0, 10) : []);
    }).finally(() => setLoading(false));
  }, [id]);

  // Fetch payroll appearances from periods
  useEffect(() => {
    if (!id) return;
    fetch(`${PAYROLL_API}/api/payroll-periods`)
      .then(r => r.json())
      .then(async (periods: any[]) => {
        if (!Array.isArray(periods)) return;
        // For each period, fetch detail and find this employee's line item
        const results: PayrollAppearance[] = [];
        await Promise.all(
          periods.slice(0, 20).map(async (p: any) => {
            try {
              const detail = await fetch(`${PAYROLL_API}/api/payroll-periods/${p.payroll_id}`).then(r => r.json());
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
    if (!confirm(`Deactivate ${employee.full_name}? They will be excluded from future payroll periods.`)) return;
    setDeactivating(true);
    await fetch(`${PAYROLL_API}/api/employees/${employee.employee_id}`, { method: 'DELETE' });
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

  const totalCharges = charges.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Back nav */}
      <Link href="/payroll/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B5858] transition-colors mb-5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Employees
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#0B5858]/30 to-[#0B5858]/50 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">
              {employee.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{employee.full_name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[employee.employment_type]}`}>
                {employee.employment_type}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {employee.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{employee.position}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{employee.employee_code}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 sm:gap-6 text-center shrink-0">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Rate</p>
              <p className="font-bold text-[#0B5858] text-lg">{fmtPeso(employee.current_rate)}</p>
              <p className="text-[10px] text-gray-400">per {employee.employment_type === 'MONTHLY' ? 'month' : 'day'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hire Date</p>
              <p className="font-semibold text-gray-900">{fmtDate(employee.hire_date)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</p>
              <p className="font-semibold text-gray-900 capitalize">{employee.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: editors */}
        <div className="lg:col-span-2 space-y-5">
          {/* Rate editor — primary action */}
          <RateEditor employee={employee} onUpdated={setEmployee} />

          {/* Basic info editor */}
          <InfoEditor employee={employee} onUpdated={setEmployee} />

          {/* Payroll History */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Payroll History</h3>
            </div>

            {appearances.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">
                Not included in any payroll period yet.
              </div>
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
        </div>

        {/* Right column: charges + danger */}
        <div className="space-y-5">
          {/* Recent charges */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Recent Charges</h3>
              </div>
              <Link href={`/payroll/charges?employee_id=${employee.employee_id}`}
                className="text-xs text-[#0B5858] hover:underline">View all</Link>
            </div>

            {charges.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No charges recorded.</p>
            ) : (
              <>
                <div className="space-y-2 mb-3">
                  {charges.slice(0, 6).map(c => (
                    <div key={c.charge_id} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{c.description}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(c.charge_date)}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600 ml-2">{fmtPeso(c.amount)}</span>
                    </div>
                  ))}
                </div>
                {totalCharges > 0 && (
                  <div className="bg-red-50 rounded-2xl px-3 py-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Total</span>
                    <span className="font-bold text-red-600">{fmtPeso(totalCharges)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payroll appearances</span>
                <span className="font-semibold text-gray-900">{appearances.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total periods paid</span>
                <span className="font-semibold text-green-600">{appearances.filter(a => a.status === 'paid').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total earned (net)</span>
                <span className="font-bold text-gray-900">
                  {fmtPeso(appearances.reduce((s, a) => s + Number(a.net_pay), 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total charges</span>
                <span className="font-semibold text-red-500">{fmtPeso(totalCharges)}</span>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          {employee.status === 'active' && (
            <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
              <h3 className="font-bold text-red-600 text-sm mb-2">Danger Zone</h3>
              <p className="text-xs text-gray-400 mb-4">
                Deactivating this employee excludes them from all future payroll periods. Existing payroll records are preserved.
              </p>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold text-sm border border-red-200 transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Deactivating…' : 'Deactivate Employee'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
