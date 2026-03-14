'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

function EmployeeModal({
  employee,
  onClose,
  onSaved,
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

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const set = (k: keyof EmpForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name || !form.hire_date || !form.position || !form.current_rate) {
      setError('All required fields must be filled.');
      return;
    }
    setLoading(true);
    setError(null);
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]';
  const lbl = 'block text-xs text-gray-500 mb-1.5';

  return (
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
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)}
                    className={`${inp} pl-9`} />
                </div>
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
                <select value={form.role} onChange={e => set('role', e.target.value)} className={inp}>
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalEmp, setModalEmp]     = useState<Employee | null | 'new'>('new' as any);
  const [showModal, setShowModal]   = useState(false);
  const [deleting, setDeleting]     = useState<number | null>(null);

  // Filters
  const [search, setSearch]       = useState('');
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
                  {['Code', 'Name', 'Position', 'Type', 'Hire Date', 'Rate', 'Role', ''].map(h => (
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
                        <button onClick={() => handleDelete(emp.employee_id, emp.full_name)}
                          disabled={deleting === emp.employee_id}
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
          employee={typeof modalEmp === 'object' ? modalEmp : null}
          onClose={() => setShowModal(false)}
          onSaved={e => { handleSaved(e); setShowModal(false); }}
        />
      )}
    </div>
  );
}
