'use client';

import React, { useState, useEffect } from 'react';
import { getPayroll, getPayrollById, markCommissionPaid } from '@/services/payrollService';
import { downloadDailyPayslipPDF, downloadMonthlyPayslipPDF } from '@/lib/payslipGenerator';

type EmploymentType = 'DAILY' | 'MONTHLY' | 'COMMISSION';
type PayrollStatus = 'pending' | 'approved' | 'processed' | 'paid' | 'declined';

interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
  unit_id?: number;
}

interface DailyPayrollRecord {
  id: string;
  employee_id: number;
  employee: Employee;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: PayrollStatus;
  daysWorked: number;
  dailyRate: number;
  basePay: number;
  overtimeHours: number;
  overtimePay: number;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  reference_number: string;
  paymentDate?: string;
}

interface MonthlyPayrollRecord {
  id: string;
  employee_id: number;
  employee: Employee;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: PayrollStatus;
  monthlyRate: number;
  overtimeHours: number;
  overtimePay: number;
  bonusAmount: number;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  reference_number: string;
  paymentDate?: string;
}

type CommissionPaymentStatus = 'unpaid' | 'paid';

interface BookingCommission {
  booking_id: number;
  guest_name: string;
  booking_date: string;
  check_in_date: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  commission_status: CommissionPaymentStatus;
  paid_date?: string;
  approved_by?: string;
  gcash_reference?: string;
  gcash_receipt_url?: string;
}

interface GCashModalState {
  open: boolean;
  payrollId: string;
  bookingId: number;
  agentName: string;
  commissionAmount: number;
}

interface CommissionPayrollRecord {
  id: string;
  agent_id: number;
  agent_name: string | null;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: PayrollStatus;
  totalBookings: number;
  totalCommissionAmount: number;
  taxes: number;
  netPayout: number;
  reference_number: string;
  paymentDate?: string;
  bookingDetails?: BookingCommission[];
}

// ─── CARD tokens ──────────────────────────────────────────────────────────────
const CARD = {
  base:    'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  header:  'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  padding: 'p-6',
  label:   'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number) {
  return `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function agentInitials(name: string | null): string {
  return (name ?? 'AG').substring(0, 2).toUpperCase();
}
function agentDisplay(name: string | null): string {
  return name ?? '—';
}

const STATUS_STYLES: Record<PayrollStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved:  'bg-blue-100 text-blue-800 border-blue-200',
  processed: 'bg-purple-100 text-purple-800 border-purple-200',
  paid:      'bg-green-100 text-green-800 border-green-200',
  declined:  'bg-red-100 text-red-800 border-red-200',
};

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by name or position…"
        className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
      />
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── GCash Modal ──────────────────────────────────────────────────────────────
const GCashModal: React.FC<{
  modal: GCashModalState;
  onClose: () => void;
  onConfirm: (payrollId: string, bookingId: number, ref: string, receiptUrl: string) => void;
}> = ({ modal, onClose, onConfirm }) => {
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (modal.open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [modal.open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => { setMounted(false); setReceiptPreview(null); setReceiptFile(null); onClose(); }, 300);
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0
        transition-[background-color] duration-300 ease-in-out ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-md p-6
        transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">GCash Payment</h3>
            <p className="text-xs text-gray-500">{modal.agentName} • ₱ {modal.commissionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Receipt Screenshot</label>
          <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-[#0B5858]/40 transition-colors">
            {receiptPreview
              ? <img src={receiptPreview} alt="Receipt" className="max-h-40 rounded-xl object-contain" />
              : <>
                  <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-400">Tap to upload GCash receipt</p>
                </>
            }
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setReceiptFile(f);
              const r = new FileReader(); r.onload = () => setReceiptPreview(r.result as string); r.readAsDataURL(f);
            }} />
          </label>
          {receiptFile && (
            <button type="button" onClick={() => { setReceiptPreview(null); setReceiptFile(null); }}
              className="text-xs text-red-500 mt-1 hover:underline">Remove photo</button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-2xl font-medium text-sm transition-colors">
            Cancel
          </button>
          <button type="button" onClick={() => { onConfirm(modal.payrollId, modal.bookingId, '', receiptPreview ?? ''); handleClose(); }}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-md shadow-[#0B5858]/20">
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Generate Payroll Modal ───────────────────────────────────────────────────
interface DBEmployee {
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
}

interface GeneratePayrollForm {
  employee_id: string;
  employment_type: EmploymentType;
  current_rate: string;
  pay_period_start: string;
  pay_period_end: string;
}

const EMPTY_GENERATE_FORM: GeneratePayrollForm = {
  employee_id: '',
  employment_type: 'DAILY',
  current_rate: '',
  pay_period_start: '',
  pay_period_end: '',
};

const TYPE_COLORS = {
  DAILY:      { active: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20',      inactive: 'border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50',      avatar: 'from-blue-500 to-blue-600',      btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'      },
  MONTHLY:    { active: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20', inactive: 'border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-50', avatar: 'from-purple-500 to-purple-600',   btn: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'  },
  COMMISSION: { active: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20',   inactive: 'border-gray-200 text-gray-600 hover:border-amber-200 hover:bg-amber-50',   avatar: 'from-amber-500 to-amber-600',    btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'     },
} as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const GeneratePayrollModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [visible, setVisible]         = useState(false);
  const [mounted, setMounted]         = useState(false);
  const [form, setForm]               = useState<GeneratePayrollForm>(EMPTY_GENERATE_FORM);
  const [employees, setEmployees]     = useState<DBEmployee[]>([]);
  const [loadingEmp, setLoadingEmp]   = useState(false);
  const [empSearch, setEmpSearch]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [step, setStep]               = useState<'form' | 'success'>('form');

  // Derived selected employee
  const selectedEmp = employees.find(e => String(e.employee_id) === form.employee_id) ?? null;

  // Filter employees by selected type
  const filteredEmployees  = employees.filter(e => e.employment_type === form.employment_type);
  const searchedEmployees  = empSearch.trim()
    ? filteredEmployees.filter(e => e.full_name.toLowerCase().includes(empSearch.toLowerCase()) || e.position.toLowerCase().includes(empSearch.toLowerCase()))
    : filteredEmployees;

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    setForm(EMPTY_GENERATE_FORM);
    setError(null);
    setStep('form');
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));

    // Fetch employees from DB
    setLoadingEmp(true);
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then((data: DBEmployee[]) => setEmployees(data))
      .catch(() => setError('Could not load employees. Is the backend running?'))
      .finally(() => setLoadingEmp(false));
  }, [open]);

  // Auto-fill rate when employee selected
  useEffect(() => {
    if (selectedEmp) {
      setForm(prev => ({
        ...prev,
        current_rate: String(selectedEmp.current_rate),
        employment_type: selectedEmp.employment_type,
      }));
    }
  }, [form.employee_id]);

  // Clear selected employee when type changes
  useEffect(() => {
    setForm(prev => ({ ...prev, employee_id: '', current_rate: '' }));
    setEmpSearch('');
  }, [form.employment_type]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => { setMounted(false); onClose(); }, 300);
  };

  const set = <K extends keyof GeneratePayrollForm>(key: K, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const tc = TYPE_COLORS[form.employment_type];

  const rateLabel =
    form.employment_type === 'DAILY'   ? 'Daily Rate (₱)' :
    form.employment_type === 'MONTHLY' ? 'Monthly Salary (₱)' : 'Commission Rate (%)';

  const isValid =
    !!form.employee_id &&
    !!form.current_rate &&
    Number(form.current_rate) > 0 &&
    !!form.pay_period_start &&
    !!form.pay_period_end &&
    form.pay_period_start <= form.pay_period_end;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id:      Number(form.employee_id),
          employment_type:  form.employment_type,
          current_rate:     Number(form.current_rate),
          pay_period_start: form.pay_period_start,
          pay_period_end:   form.pay_period_end,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Server error (${res.status})`);
      }
      setStep('success');
      setTimeout(() => { onSuccess(); handleClose(); }, 1800);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 pb-4 sm:pb-0 sm:px-4
        transition-[background-color] duration-300 ease-in-out ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto
        transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 bg-gradient-to-br ${tc.avatar} rounded-xl flex items-center justify-center transition-all duration-300`}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Generate Payroll</h2>
              <p className="text-xs text-gray-400">Create a new payroll record</p>
            </div>
          </div>
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Success ── */}
        {step === 'success' ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-3xl flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">Payroll Generated!</p>
              <p className="text-sm text-gray-400 mt-1">{selectedEmp?.full_name ?? 'Employee'}'s payroll record has been created.</p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">

            {/* ── Employment Type ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Employment Type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['DAILY', 'MONTHLY', 'COMMISSION'] as EmploymentType[]).map(type => (
                  <button key={type} type="button" onClick={() => set('employment_type', type)}
                    className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                      form.employment_type === type ? TYPE_COLORS[type].active : TYPE_COLORS[type].inactive
                    }`}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Employee Picker ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Employee</p>

              {/* Search bar — shown only when employees are loaded */}
              {!loadingEmp && filteredEmployees.length > 0 && (
                <div className="relative mb-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                  </svg>
                  <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search employee…"
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  />
                  {empSearch && (
                    <button type="button" onClick={() => setEmpSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Scrollable list container */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                {loadingEmp ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading employees…
                  </div>
                ) : searchedEmployees.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">
                    {empSearch ? `No results for "${empSearch}"` : `No ${form.employment_type.toLowerCase()} employees found`}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto overscroll-contain">
                    {searchedEmployees.map(emp => {
                      const isSelected = String(emp.employee_id) === form.employee_id;
                      return (
                        <button key={emp.employee_id} type="button"
                          onClick={() => set('employee_id', String(emp.employee_id))}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                            isSelected ? `bg-gradient-to-r ${tc.avatar}` : 'hover:bg-gray-50'
                          }`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold
                            ${isSelected ? 'bg-white/20 text-white' : `bg-gradient-to-br ${TYPE_COLORS[emp.employment_type].avatar} text-white`}`}>
                            {emp.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>{emp.full_name}</p>
                            <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>{emp.position}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-semibold ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>Rate</p>
                            <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[#0B5858]'}`}>
                              {emp.employment_type === 'COMMISSION' ? `${emp.current_rate}%` : fmtPeso(emp.current_rate)}
                            </p>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Count hint when list is long */}
              {!loadingEmp && filteredEmployees.length > 4 && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Showing {searchedEmployees.length} of {filteredEmployees.length} employees
                </p>
              )}
            </div>

            {/* ── Rate (auto-filled, editable) ── */}
            {form.employee_id && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{rateLabel}</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold select-none">
                    {form.employment_type === 'COMMISSION' ? '%' : '₱'}
                  </span>
                  <input type="number" min="0" value={form.current_rate}
                    onChange={e => set('current_rate', e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Auto-filled from employee record. Edit to override.</p>
              </div>
            )}

            {/* ── Pay Period ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pay Period</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">From</p>
                  <input type="date" value={form.pay_period_start}
                    onChange={e => set('pay_period_start', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">To</p>
                  <input type="date" value={form.pay_period_end} min={form.pay_period_start}
                    onChange={e => set('pay_period_end', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  />
                </div>
              </div>
              {form.pay_period_start && form.pay_period_end && form.pay_period_start > form.pay_period_end && (
                <p className="text-xs text-red-500 mt-1.5">End date must be after start date.</p>
              )}
            </div>

            {/* ── Summary preview ── */}
            {selectedEmp && form.pay_period_start && form.pay_period_end && form.current_rate && (
              <div className={`rounded-2xl border p-4 bg-gray-50`}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Summary</p>
                <div className="space-y-2">
                  {[
                    ['Employee',    selectedEmp.full_name],
                    ['Type',        form.employment_type.charAt(0) + form.employment_type.slice(1).toLowerCase()],
                    ['Rate',        form.employment_type === 'COMMISSION' ? `${form.current_rate}%` : fmtPeso(Number(form.current_rate))],
                    ['Period',      form.pay_period_start && form.pay_period_end ? `${form.pay_period_start} → ${form.pay_period_end}` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-900">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {step === 'form' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-b-3xl px-6 py-4 flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-2xl font-medium text-sm transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={!isValid || isSubmitting}
              className={`flex-1 px-4 py-2.5 rounded-2xl font-semibold text-sm text-white transition-all shadow-md ${
                !isValid || isSubmitting ? 'bg-gray-300 cursor-not-allowed shadow-none' : `${tc.btn}`
              }`}>
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generating…
                  </span>
                : 'Generate Payroll'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Daily Row ────────────────────────────────────────────────────────────────
const DailyPayrollRow: React.FC<{
  payroll: DailyPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ payroll, onView, onDownloadPayslip }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div
        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 group ${expanded ? 'border-[#0B5858]/20 bg-[#0B5858]/5' : 'border-gray-100'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{(payroll.employee?.full_name ?? 'EM').substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 group-hover:text-[#0B5858] transition-colors">{payroll.employee?.full_name ?? `Employee #${payroll.employee_id}`}</p>
            <p className="text-xs text-gray-500 mt-0.5">{payroll.employee?.position} • <span className="text-blue-600 font-semibold">{payroll.daysWorked} days</span></p>
          </div>
          <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">DAILY</span>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Net Pay</p>
            <p className="text-base font-bold text-[#0B5858]">{fmtPeso(payroll.netPay)}</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mx-1 bg-blue-50/60 rounded-2xl border border-blue-100 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Earnings — Daily Worker</p>
          <div className="space-y-2 mb-4">
            {[
              ['Daily Rate', fmtPeso(payroll.dailyRate)],
              ['Days Worked', `${payroll.daysWorked} days`],
              ['Base Pay', fmtPeso(payroll.basePay)],
              [`Overtime (${payroll.overtimeHours}h)`, fmtPeso(payroll.overtimePay)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1.5 border-b border-blue-100">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 bg-blue-100/60 rounded-xl px-3 mt-3">
              <span className="font-bold text-blue-900">Gross Income</span>
              <span className="font-bold text-blue-700">{fmtPeso(payroll.grossIncome)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-white border border-gray-200 hover:border-[#0B5858]/30 text-gray-700 px-4 py-2 rounded-2xl text-sm font-semibold transition-all">
              Download Payslip
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[#0B5858]/20">
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Monthly Row ──────────────────────────────────────────────────────────────
const MonthlyPayrollRow: React.FC<{
  payroll: MonthlyPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ payroll, onView, onDownloadPayslip }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div
        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:border-purple-200 hover:bg-purple-50/40 group ${expanded ? 'border-purple-200 bg-purple-50/40' : 'border-gray-100'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{(payroll.employee?.full_name ?? 'EM').substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 group-hover:text-purple-700 transition-colors">{payroll.employee?.full_name ?? `Employee #${payroll.employee_id}`}</p>
            <p className="text-xs text-gray-500 mt-0.5">{payroll.employee?.position} • <span className="text-purple-600 font-semibold">Fixed Salary</span></p>
          </div>
          <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">MONTHLY</span>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Net Pay</p>
            <p className="text-base font-bold text-[#0B5858]">{fmtPeso(payroll.netPay)}</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mx-1 bg-purple-50/60 rounded-2xl border border-purple-100 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Earnings — Monthly Staff</p>
          <div className="space-y-2 mb-4">
            {[
              ['Monthly Salary', fmtPeso(payroll.monthlyRate)],
              [`Overtime (${payroll.overtimeHours}h)`, fmtPeso(payroll.overtimePay)],
              ['Bonus', fmtPeso(payroll.bonusAmount)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1.5 border-b border-purple-100">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 bg-purple-100/60 rounded-xl px-3 mt-3">
              <span className="font-bold text-purple-900">Gross Income</span>
              <span className="font-bold text-purple-700">{fmtPeso(payroll.grossIncome)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-white border border-gray-200 hover:border-purple-300 text-gray-700 px-4 py-2 rounded-2xl text-sm font-semibold transition-all">
              Download Payslip
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[#0B5858]/20">
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Commission Row ───────────────────────────────────────────────────────────
const CommissionPayrollRow: React.FC<{
  payroll: CommissionPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
  onMarkPaid: (payrollId: string, bookingId: number, gcashRef: string, receiptUrl: string) => void;
}> = ({ payroll, onView, onDownloadPayslip, onMarkPaid }) => {
  const [expanded, setExpanded] = useState(false);
  const [gcashModal, setGcashModal] = useState<GCashModalState>({ open: false, payrollId: '', bookingId: 0, agentName: '', commissionAmount: 0 });

  const paidCount   = payroll.bookingDetails?.filter(b => b.commission_status === 'paid').length ?? 0;
  const unpaidCount = payroll.bookingDetails?.filter(b => b.commission_status === 'unpaid').length ?? 0;

  return (
    <>
      <GCashModal modal={gcashModal} onClose={() => setGcashModal(m => ({ ...m, open: false }))}
        onConfirm={(pid, bid, ref, url) => onMarkPaid(pid, bid, ref, url)} />

      <div
        className={`p-4 rounded-2xl border cursor-pointer transition-all hover:border-amber-200 hover:bg-amber-50/40 group ${expanded ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{agentInitials(payroll.agent_name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 group-hover:text-amber-700 transition-colors">{agentDisplay(payroll.agent_name)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Agent • <span className="text-amber-600 font-semibold">{payroll.totalBookings} bookings</span>
              {unpaidCount > 0 && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">{unpaidCount} unpaid</span>}
              {paidCount > 0 && <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">{paidCount} paid</span>}
            </p>
          </div>
          <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">COMMISSION</span>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Net Payout</p>
            <p className="text-base font-bold text-[#0B5858]">{fmtPeso(payroll.netPayout)}</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mx-1 bg-amber-50/60 rounded-2xl border border-amber-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Booking Details & Commission</p>

          {!payroll.bookingDetails || payroll.bookingDetails.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No booking details available.</p>
          ) : (
            <div className="space-y-2">
              {payroll.bookingDetails.map((booking, idx) => (
                <div key={idx} className={`rounded-2xl border p-4 ${booking.commission_status === 'paid' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-white'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{booking.guest_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Booked: {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' • '}Check-in: {new Date(booking.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${booking.commission_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      {booking.commission_status === 'paid' ? '✓ Paid' : '● Unpaid'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      {booking.commission_status === 'paid' && booking.gcash_reference && (
                        <p className="text-xs font-semibold text-blue-600">GCash Ref: {booking.gcash_reference}</p>
                      )}
                      {booking.commission_status === 'unpaid' && (
                        <p className="text-xs text-gray-400">Awaiting GCash payment</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-amber-700">{fmtPeso(booking.commission_amount)}</p>
                      {booking.commission_status === 'unpaid' && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setGcashModal({ open: true, payrollId: payroll.id, bookingId: booking.booking_id, agentName: agentDisplay(payroll.agent_name), commissionAmount: booking.commission_amount }); }}
                          className="px-3 py-1 bg-[#0B5858] hover:bg-[#094444] text-white text-xs font-semibold rounded-xl transition-colors">
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {[
              ['Total Bookings', `${payroll.totalBookings}`],
              ['Paid', fmtPeso(payroll.bookingDetails?.filter(b => b.commission_status === 'paid').reduce((s, b) => s + b.commission_amount, 0) ?? 0)],
              ['Unpaid', fmtPeso(payroll.bookingDetails?.filter(b => b.commission_status === 'unpaid').reduce((s, b) => s + b.commission_amount, 0) ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1.5 border-b border-amber-100">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 bg-amber-100/60 rounded-xl px-3">
              <span className="font-bold text-amber-900">Gross Commission</span>
              <span className="font-bold text-amber-700">{fmtPeso(payroll.totalCommissionAmount)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-white border border-gray-200 hover:border-amber-300 text-gray-700 px-4 py-2 rounded-2xl text-sm font-semibold transition-all">
              Download Report
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[#0B5858]/20">
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Payroll Detail Modal ─────────────────────────────────────────────────────
type ViewRecord =
  | { type: 'DAILY';      data: DailyPayrollRecord }
  | { type: 'MONTHLY';    data: MonthlyPayrollRecord }
  | { type: 'COMMISSION'; data: CommissionPayrollRecord }
  | null;

const PayrollDetailModal: React.FC<{
  record: ViewRecord;
  onClose: () => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ record, onClose, onDownloadPayslip }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (record) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }
  }, [record]);

  const handleClose = () => { setVisible(false); setTimeout(() => { setMounted(false); onClose(); }, 300); };

  if (!mounted || !record) return null;
  const { type, data } = record;

  const avatarLabel = type === 'COMMISSION' ? agentInitials((data as CommissionPayrollRecord).agent_name) : ((data as DailyPayrollRecord).employee?.full_name ?? 'EM').substring(0, 2).toUpperCase();
  const displayName = type === 'COMMISSION' ? agentDisplay((data as CommissionPayrollRecord).agent_name) : (data as DailyPayrollRecord).employee?.full_name ?? `Employee #${(data as DailyPayrollRecord).employee_id}`;
  const displaySub  = type === 'COMMISSION' ? 'Commission Agent' : (data as DailyPayrollRecord).employee?.position ?? '';
  const avatarBg    = type === 'DAILY' ? 'from-blue-500 to-blue-600' : type === 'MONTHLY' ? 'from-purple-500 to-purple-600' : 'from-amber-500 to-amber-600';
  const netLabel    = type === 'COMMISSION' ? 'Net Payout' : 'Net Pay';
  const netAmount   = type === 'COMMISSION' ? (data as CommissionPayrollRecord).netPayout : data.netPay;
  const netBg       = type === 'DAILY' ? 'bg-blue-50 border-blue-200 text-blue-800' : type === 'MONTHLY' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 pb-4 sm:pb-0 sm:px-4
        transition-[background-color] duration-300 ease-in-out ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto
        transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">Payroll Details</h2>
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${avatarBg} rounded-2xl flex items-center justify-center shrink-0`}>
              <span className="text-white font-bold text-base">{avatarLabel}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg leading-tight">{displayName}</p>
              <p className="text-sm text-gray-500">{displaySub}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[data.status]}`}>
              {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Reference No.</p>
              <p className="text-sm font-semibold text-gray-900 font-mono">{data.reference_number}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Pay Period</p>
              <p className="text-xs font-semibold text-gray-900">{fmtDate(data.payPeriodStart)} – {fmtDate(data.payPeriodEnd)}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              {type === 'DAILY' ? 'Earnings — Daily Worker' : type === 'MONTHLY' ? 'Earnings — Monthly Staff' : 'Commission Summary'}
            </p>
            <div className="space-y-1">
              {type === 'DAILY' && (() => {
                const d = data as DailyPayrollRecord;
                return [['Daily Rate', fmtPeso(d.dailyRate)], ['Days Worked', `${d.daysWorked} days`], ['Base Pay', fmtPeso(d.basePay)], [`Overtime (${d.overtimeHours}h)`, fmtPeso(d.overtimePay)], ['Gross Income', fmtPeso(d.grossIncome)], ['Deductions', fmtPeso(d.totalDeductions)]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-600">{label}</span><span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ));
              })()}
              {type === 'MONTHLY' && (() => {
                const d = data as MonthlyPayrollRecord;
                return [['Monthly Salary', fmtPeso(d.monthlyRate)], [`Overtime (${d.overtimeHours}h)`, fmtPeso(d.overtimePay)], ['Bonus', fmtPeso(d.bonusAmount)], ['Gross Income', fmtPeso(d.grossIncome)], ['Deductions', fmtPeso(d.totalDeductions)]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-600">{label}</span><span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ));
              })()}
              {type === 'COMMISSION' && (() => {
                const d = data as CommissionPayrollRecord;
                return [['Total Bookings', `${d.totalBookings}`], ['Total Commission', fmtPeso(d.totalCommissionAmount)], ['Taxes / Deductions', fmtPeso(d.taxes)]].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                    <span className="text-gray-600">{label}</span><span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 flex items-center justify-between ${netBg}`}>
            <span className="font-bold text-base">{netLabel}</span>
            <span className="font-bold text-2xl">{fmtPeso(netAmount)}</span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-b-3xl px-6 py-4 flex gap-3">
          {(type === 'DAILY' || type === 'MONTHLY') && (
            <button type="button" onClick={() => { onDownloadPayslip(data.id); handleClose(); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-2xl font-medium text-sm transition-colors">
              Download Payslip
            </button>
          )}
          <button type="button" onClick={handleClose}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-2xl font-semibold text-sm transition-colors shadow-md shadow-[#0B5858]/20">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<EmploymentType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false); // ← NEW

  const [dailyPayroll,      setDailyPayroll]      = useState<DailyPayrollRecord[]>([]);
  const [monthlyPayroll,    setMonthlyPayroll]    = useState<MonthlyPayrollRecord[]>([]);
  const [commissionPayroll, setCommissionPayroll] = useState<CommissionPayrollRecord[]>([]);
  const [viewRecord,        setViewRecord]        = useState<ViewRecord>(null);

  const loadPayroll = async () => {
    setIsLoading(true); setError(null);
    try {
      const { daily, monthly, commission } = await getPayroll();
      const enrichedCommission = await Promise.all(
        commission.map(async record => {
          try {
            const detail = await getPayrollById(record.id) as CommissionPayrollRecord;
            return { ...record, bookingDetails: detail.bookingDetails ?? [] };
          } catch { return { ...record, bookingDetails: [] }; }
        })
      );
      setDailyPayroll(daily); setMonthlyPayroll(monthly); setCommissionPayroll(enrichedCommission);
    } catch (err) {
      setError('Failed to load payroll records. Is the backend running?');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { loadPayroll(); }, []);

  // Filtered lists
  const q = search.toLowerCase();
  const filteredDaily      = dailyPayroll.filter(p =>
    !q || p.employee?.full_name?.toLowerCase().includes(q) || p.employee?.position?.toLowerCase().includes(q)
  );
  const filteredMonthly    = monthlyPayroll.filter(p =>
    !q || p.employee?.full_name?.toLowerCase().includes(q) || p.employee?.position?.toLowerCase().includes(q)
  );
  const filteredCommission = commissionPayroll.filter(p =>
    !q || p.agent_name?.toLowerCase().includes(q)
  );

  const handleView = (id: string) => {
    const d = dailyPayroll.find(p => p.id === id);      if (d) { setViewRecord({ type: 'DAILY', data: d }); return; }
    const m = monthlyPayroll.find(p => p.id === id);    if (m) { setViewRecord({ type: 'MONTHLY', data: m }); return; }
    const c = commissionPayroll.find(p => p.id === id); if (c) { setViewRecord({ type: 'COMMISSION', data: c }); }
  };

  const handleDownloadPayslip = (id: string) => {
    const d = dailyPayroll.find(p => p.id === id);   if (d) { downloadDailyPayslipPDF(d); return; }
    const m = monthlyPayroll.find(p => p.id === id); if (m) { downloadMonthlyPayslipPDF(m); }
  };

  const handleMarkPaid = async (payrollId: string, bookingId: number, gcashRef: string, receiptUrl: string) => {
    try {
      const updated = await markCommissionPaid(payrollId, bookingId, gcashRef, receiptUrl);
      setCommissionPayroll(prev => prev.map(record => {
        if (record.id !== payrollId) return record;
        return { ...record, bookingDetails: record.bookingDetails?.map(b => b.booking_id === bookingId ? { ...b, ...updated } : b) };
      }));
    } catch (err) { console.error('Error marking commission as paid:', err); }
  };

  const totalResults = filteredDaily.length + filteredMonthly.length + filteredCommission.length;

  return (
    <>
      <PayrollDetailModal record={viewRecord} onClose={() => setViewRecord(null)} onDownloadPayslip={handleDownloadPayslip} />

      {/* ── Generate Payroll Modal ── */}
      <GeneratePayrollModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={loadPayroll}
      />

      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employee payroll, commissions, and payslips.</p>
        </div>
        {/* ── Generate Payroll Button ── */}
        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[#0B5858]/20 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Generate Payroll
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Daily Workers', count: dailyPayroll.length, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Monthly Staff', count: monthlyPayroll.length, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
          { label: 'Agents', count: commissionPayroll.length, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Total Payroll', count: dailyPayroll.length + monthlyPayroll.length + commissionPayroll.length, color: 'text-[#0B5858]', bg: 'bg-white', border: 'border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`${CARD.base} ${CARD.padding} border ${s.border} ${s.bg}`}>
            <p className={`${CARD.label} mb-2`}>{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className={CARD.base}>
        <div className={CARD.header}>
          {/* Filter tabs + search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'DAILY', 'MONTHLY', 'COMMISSION'] as const).map(type => (
                <button key={type} type="button" onClick={() => setEmploymentTypeFilter(type)}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                    employmentTypeFilter === type
                      ? type === 'all' ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                        : type === 'DAILY' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : type === 'MONTHLY' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  {type === 'all' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto sm:w-64">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>
          {search && (
            <p className="text-xs text-gray-500 mt-2">{totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</p>
          )}
        </div>

        <div className={CARD.padding}>
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-700 font-semibold mb-3">{error}</p>
              <button type="button" onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-2xl text-sm font-semibold hover:bg-red-700 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && !error && (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
              <p className="text-sm text-gray-400">Loading payroll data…</p>
            </div>
          )}

          {/* Records */}
          {!isLoading && !error && (
            <div className="space-y-8">
              {(employmentTypeFilter === 'all' || employmentTypeFilter === 'DAILY') && filteredDaily.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Daily Workers</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">{filteredDaily.length}</span>
                  </div>
                  <div className="space-y-2">
                    {filteredDaily.map(record => (
                      <DailyPayrollRow key={record.id} payroll={record} onView={handleView} onDownloadPayslip={handleDownloadPayslip} />
                    ))}
                  </div>
                </div>
              )}

              {(employmentTypeFilter === 'all' || employmentTypeFilter === 'MONTHLY') && filteredMonthly.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Monthly Staff</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">{filteredMonthly.length}</span>
                  </div>
                  <div className="space-y-2">
                    {filteredMonthly.map(record => (
                      <MonthlyPayrollRow key={record.id} payroll={record} onView={handleView} onDownloadPayslip={handleDownloadPayslip} />
                    ))}
                  </div>
                </div>
              )}

              {(employmentTypeFilter === 'all' || employmentTypeFilter === 'COMMISSION') && filteredCommission.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Commission-Based Agents</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{filteredCommission.length}</span>
                  </div>
                  <div className="space-y-2">
                    {filteredCommission.map(record => (
                      <CommissionPayrollRow key={record.id} payroll={record} onView={handleView} onDownloadPayslip={handleDownloadPayslip}
                        onMarkPaid={(pid, bid, ref, url) => handleMarkPaid(pid, bid, ref, url)} />
                    ))}
                  </div>
                </div>
              )}

              {totalResults === 0 && !isLoading && (
                <div className="py-16 text-center">
                  {search ? (
                    <>
                      <p className="text-base font-bold text-gray-500">No results found</p>
                      <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-gray-500">No payroll records found</p>
                      <p className="text-sm text-gray-400 mt-1">Start by adding an employee to payroll.</p>
                      <button type="button" onClick={() => setShowGenerateModal(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[#0B5858]/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Generate Payroll
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}