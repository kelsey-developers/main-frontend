'use client';

import React, { useState, useEffect } from 'react';
import { getPayroll, getPayrollById, markCommissionPaid, getEmployees, createPayroll, addEmployee } from '@/services/payrollService';
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
  breakdown?: {
    basePay: number;
    overtime: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    incomeTax: number;
  };
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
  breakdown?: {
    monthlySalary: number;
    overtime: number;
    bonus: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    incomeTax: number;
  };
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
  // FIX: agent_name can be null from the database
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number) {
  return `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Safe agent name helper — used everywhere agent_name might be null
function agentInitials(name: string | null): string {
  return (name ?? 'AG').substring(0, 2).toUpperCase();
}
function agentDisplay(name: string | null): string {
  return name ?? '—';
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
              Kelsey's Homestay
            </h1>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>Dashboard</a>
            <a href="#" className="text-[#0B5858] font-medium border-b-2 border-[#0B5858]" style={{fontFamily: 'Poppins'}}>Payroll</a>
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>DTR</a>
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>Employees</a>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>AD</span>
            </div>
          </div>
          <div className="md:hidden">
            <button type="button" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 hover:text-[#0B5858]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-[#0B5858] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4" style={{fontFamily: 'Poppins'}}>Kelsey's Homestay</h3>
            <p className="text-gray-300 text-sm" style={{fontFamily: 'Poppins'}}>Managing your property and payroll with ease and efficiency.</p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Dashboard</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Payroll</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>DTR</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Documentation</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-300 text-sm" style={{fontFamily: 'Poppins'}}>© {currentYear} Kelsey's Homestay. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// ---------------------------------------------------------------------------
// Back Button
// ---------------------------------------------------------------------------
const BackButton: React.FC = () => (
  <button
    type="button"
    onClick={() => window.history.back()}
    className="flex items-center gap-1 text-[#0B5858] hover:opacity-75 transition-opacity mb-4"
    style={{fontFamily: 'Poppins'}}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
    </svg>
    <span className="text-xl font-bold">Admin Dashboard</span>
  </button>
);

// ---------------------------------------------------------------------------
// Daily Payroll Row
// ---------------------------------------------------------------------------
const DailyPayrollRow: React.FC<{
  payroll: DailyPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ payroll, onView, onDownloadPayslip }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${expanded ? 'bg-gray-50' : ''}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                    {(payroll.employee?.full_name ?? 'EM').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.employee?.full_name ?? `Employee #${payroll.employee_id}`}</p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee?.position} • <span className="text-blue-600 font-medium">{payroll.daysWorked} days</span>
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 flex-1">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Daily Rate</p>
                <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.dailyRate.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <span style={{fontFamily: 'Poppins'}}>DAILY</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Net Pay</p>
                <p className="text-lg font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.netPay.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-gradient-to-b from-blue-50 to-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-lg mx-auto">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
              Earnings (Daily Worker)
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Daily Rate</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.dailyRate.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Days Worked</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.daysWorked} days</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Base Pay</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.basePay.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Overtime ({payroll.overtimeHours}h)</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.overtimePay.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded mt-4">
                <span className="text-blue-900 font-semibold" style={{fontFamily: 'Poppins'}}>Gross Income</span>
                <span className="font-bold text-blue-700 text-lg" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.grossIncome.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              Download Payslip
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Monthly Payroll Row
// ---------------------------------------------------------------------------
const MonthlyPayrollRow: React.FC<{
  payroll: MonthlyPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ payroll, onView, onDownloadPayslip }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${expanded ? 'bg-gray-50' : ''}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                    {(payroll.employee?.full_name ?? 'EM').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.employee?.full_name ?? `Employee #${payroll.employee_id}`}</p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee?.position} • <span className="text-purple-600 font-medium">Fixed Salary</span>
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 flex-1">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Monthly Salary</p>
                <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.monthlyRate.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                <span style={{fontFamily: 'Poppins'}}>MONTHLY</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Net Pay</p>
                <p className="text-lg font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.netPay.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-gradient-to-b from-purple-50 to-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-lg mx-auto">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
              Earnings (Monthly Worker)
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Monthly Salary</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.monthlyRate.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Overtime ({payroll.overtimeHours}h)</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.overtimePay.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Bonus</span>
                <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.bonusAmount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between items-center bg-purple-50 px-3 py-2 rounded mt-4">
                <span className="text-purple-900 font-semibold" style={{fontFamily: 'Poppins'}}>Gross Income</span>
                <span className="font-bold text-purple-700 text-lg" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.grossIncome.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              Download Payslip
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// GCash Modal
// ---------------------------------------------------------------------------
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
    setTimeout(() => {
      setMounted(false);
      setReceiptPreview(null);
      setReceiptFile(null);
      onClose();
    }, 300);
  };

  if (!mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    onConfirm(modal.payrollId, modal.bookingId, '', receiptPreview ?? '');
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0
        transition-[background-color] duration-300 ease-in-out
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md p-6
          transition-all duration-300 ease-in-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>G</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base" style={{fontFamily: 'Poppins'}}>GCash Payment</h3>
            <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>
              {modal.agentName} • ₱ {modal.commissionAmount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-700 mb-1" style={{fontFamily: 'Poppins'}}>
            Receipt Screenshot
          </label>
          <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors">
            {receiptPreview ? (
              <img src={receiptPreview} alt="Receipt" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>Tap to upload GCash receipt</p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          {receiptFile && (
            <button type="button" onClick={() => { setReceiptPreview(null); setReceiptFile(null); }}
              className="text-xs text-red-500 mt-1 hover:underline" style={{fontFamily: 'Poppins'}}>
              Remove photo
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors" style={{fontFamily: 'Poppins'}}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors" style={{fontFamily: 'Poppins'}}>
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Commission Payroll Row
// ---------------------------------------------------------------------------
const CommissionPayrollRow: React.FC<{
  payroll: CommissionPayrollRecord;
  onView: (id: string) => void;
  onDownloadPayslip: (id: string) => void;
  onMarkPaid: (payrollId: string, bookingId: number, gcashRef: string, receiptUrl: string) => void;
}> = ({ payroll, onView, onDownloadPayslip, onMarkPaid }) => {
  const [expanded, setExpanded] = useState(false);
  const [gcashModal, setGcashModal] = useState<GCashModalState>({
    open: false, payrollId: '', bookingId: 0, agentName: '', commissionAmount: 0
  });

  const paidCount   = payroll.bookingDetails?.filter(b => b.commission_status === 'paid').length ?? 0;
  const unpaidCount = payroll.bookingDetails?.filter(b => b.commission_status === 'unpaid').length ?? 0;

  return (
    <>
      <GCashModal
        modal={gcashModal}
        onClose={() => setGcashModal(m => ({ ...m, open: false }))}
        onConfirm={(pid, bid, ref, url) => onMarkPaid(pid, bid, ref, url)}
      />
      <div className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${expanded ? 'bg-gray-50' : ''}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  {/* FIX: safe null check for agent_name */}
                  <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                    {agentInitials(payroll.agent_name)}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{agentDisplay(payroll.agent_name)}</p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  Agent • <span className="text-amber-600 font-medium">{payroll.totalBookings} bookings</span>
                  {unpaidCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                      {unpaidCount} unpaid
                    </span>
                  )}
                  {paidCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                      {paidCount} paid
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 flex-1">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Commission Rate</p>
                <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Poppins'}}>
                  <span className="text-amber-600">Variable</span> per booking
                </p>
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <span style={{fontFamily: 'Poppins'}}>COMMISSION</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Net Payout</p>
                <p className="text-lg font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
                  ₱ {payroll.netPayout.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-gradient-to-b from-amber-50 to-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-lg mx-auto">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                Booking Details & Commission
              </h4>
              {/* FIX: guard against missing bookingDetails */}
              {!payroll.bookingDetails || payroll.bookingDetails.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-4" style={{fontFamily: 'Poppins'}}>No booking details available.</p>
              ) : (
                <div className="space-y-3">
                  {payroll.bookingDetails.map((booking, idx) => (
                    <div key={idx} className={`rounded-lg border p-4 ${booking.commission_status === 'paid' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-white'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{booking.guest_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5" style={{fontFamily: 'Poppins'}}>
                            Booked: {new Date(booking.booking_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                            {' • '}
                            Check-in: {new Date(booking.check_in_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                          </p>
                        </div>
                        <span className={`ml-3 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                          booking.commission_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                        }`} style={{fontFamily: 'Poppins'}}>
                          {booking.commission_status === 'paid' ? '✓ Paid' : '● Unpaid'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {booking.commission_status === 'paid' ? (
                            <>
                              <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>
                                Paid on {booking.paid_date ? new Date(booking.paid_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : '—'}
                                {booking.approved_by ? ` by ${booking.approved_by}` : ''}
                              </p>
                              {booking.gcash_reference && (
                                <p className="text-xs font-semibold text-blue-600 mt-0.5" style={{fontFamily: 'Poppins'}}>
                                  GCash Ref: {booking.gcash_reference}
                                </p>
                              )}
                              {booking.gcash_receipt_url && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); window.open(booking.gcash_receipt_url, '_blank'); }}
                                  className="text-xs text-blue-500 hover:underline mt-0.5 flex items-center gap-1"
                                  style={{fontFamily: 'Poppins'}}
                                >
                                  View Receipt
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>Awaiting GCash payment after check-in</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                          <p className="text-sm font-bold text-amber-700" style={{fontFamily: 'Poppins'}}>
                            ₱ {booking.commission_amount.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                          </p>
                          {booking.commission_status === 'unpaid' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGcashModal({
                                  open: true,
                                  payrollId: payroll.id,
                                  bookingId: booking.booking_id,
                                  agentName: agentDisplay(payroll.agent_name),
                                  commissionAmount: booking.commission_amount
                                });
                              }}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                              style={{fontFamily: 'Poppins'}}
                            >
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                Commission Totals
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Total Bookings</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.totalBookings}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Paid Commissions</span>
                  <span className="font-semibold text-green-700" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.bookingDetails?.filter(b => b.commission_status === 'paid').reduce((sum, b) => sum + b.commission_amount, 0) ?? 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Unpaid Commissions</span>
                  <span className="font-semibold text-red-600" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.bookingDetails?.filter(b => b.commission_status === 'unpaid').reduce((sum, b) => sum + b.commission_amount, 0) ?? 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 px-3 py-2 rounded">
                  <span className="text-amber-900 font-semibold" style={{fontFamily: 'Poppins'}}>Gross Commission</span>
                  <span className="font-bold text-amber-700 text-lg" style={{fontFamily: 'Poppins'}}>
                    ₱ {payroll.totalCommissionAmount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button type="button" onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              Download Report
            </button>
            <button type="button" onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Payroll Detail Modal
// ---------------------------------------------------------------------------
type ViewRecord =
  | { type: 'DAILY';      data: DailyPayrollRecord }
  | { type: 'MONTHLY';    data: MonthlyPayrollRecord }
  | { type: 'COMMISSION'; data: CommissionPayrollRecord }
  | null;

const STATUS_STYLES: Record<PayrollStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved:  'bg-blue-100 text-blue-800 border-blue-200',
  processed: 'bg-purple-100 text-purple-800 border-purple-200',
  paid:      'bg-green-100 text-green-800 border-green-200',
  declined:  'bg-red-100 text-red-800 border-red-200',
};

const PayrollDetailModal: React.FC<{
  record: ViewRecord;
  onClose: () => void;
  onDownloadPayslip: (id: string) => void;
}> = ({ record, onClose, onDownloadPayslip }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (record) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [record]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => { setMounted(false); onClose(); }, 300);
  };

  if (!mounted || !record) return null;

  const { type, data } = record;

  // FIX: safe null checks for all name fields
  const avatarLabel =
    type === 'COMMISSION'
      ? agentInitials((data as CommissionPayrollRecord).agent_name)
      : ((data as DailyPayrollRecord).employee?.full_name ?? 'EM').substring(0, 2).toUpperCase();

  const displayName =
    type === 'COMMISSION'
      ? agentDisplay((data as CommissionPayrollRecord).agent_name)
      : (data as DailyPayrollRecord).employee?.full_name ?? `Employee #${(data as DailyPayrollRecord).employee_id}`;

  const displaySub =
    type === 'COMMISSION'
      ? 'Commission Agent'
      : (data as DailyPayrollRecord).employee?.position ?? '';

  const avatarBg =
    type === 'DAILY'       ? 'from-blue-500 to-blue-600'
    : type === 'MONTHLY'   ? 'from-purple-500 to-purple-600'
    : 'from-amber-500 to-amber-600';

  const netLabel  = type === 'COMMISSION' ? 'Net Payout' : 'Net Pay';
  const netAmount = type === 'COMMISSION' ? (data as CommissionPayrollRecord).netPayout : data.netPay;

  const netBg =
    type === 'DAILY'       ? 'bg-blue-50 border-blue-200 text-blue-800'
    : type === 'MONTHLY'   ? 'bg-purple-50 border-purple-200 text-purple-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 pb-4 sm:pb-0 sm:px-4
        transition-[background-color] duration-300 ease-in-out
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col
          transition-all duration-300 ease-in-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        {/* Header — outside scroll area so it never overlaps content */}
        <div className="flex-shrink-0 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg" style={{fontFamily: 'Poppins'}}>Payroll Details</h2>
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Employee / Agent */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${avatarBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className="text-white font-bold text-base" style={{fontFamily: 'Poppins'}}>{avatarLabel}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight" style={{fontFamily: 'Poppins'}}>{displayName}</p>
              <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>{displaySub}</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[data.status]}`} style={{fontFamily: 'Poppins'}}>
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Reference No.</p>
              <p className="text-sm font-semibold text-gray-900 font-mono">{data.reference_number}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Pay Period</p>
              <p className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                {fmtDate(data.payPeriodStart)} – {fmtDate(data.payPeriodEnd)}
              </p>
            </div>
            {data.paymentDate && (
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-500 mb-1" style={{fontFamily: 'Poppins'}}>Payment Date</p>
                <p className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{fmtDate(data.paymentDate)}</p>
              </div>
            )}
          </div>

          {/* Earnings breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
              {type === 'DAILY' ? 'Earnings — Daily Worker'
               : type === 'MONTHLY' ? 'Earnings — Monthly Staff'
               : 'Commission Summary'}
            </p>
            <div className="space-y-2">
              {type === 'DAILY' && (() => {
                const d = data as DailyPayrollRecord;
                return (
                  <>
                    {[
                      ['Daily Rate',    fmtPeso(d.dailyRate)],
                      ['Days Worked',   `${d.daysWorked} days`],
                      ['Base Pay',      fmtPeso(d.basePay)],
                      ...(d.overtimeHours > 0 ? [[`Overtime (${d.overtimeHours}h)`, fmtPeso(d.overtimePay)]] : []),
                      ['Gross Income',  fmtPeso(d.grossIncome)],
                      ['Deductions',    fmtPeso(d.totalDeductions)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                        <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>{label}</span>
                        <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{value}</span>
                      </div>
                    ))}
                  </>
                );
              })()}

              {type === 'MONTHLY' && (() => {
                const d = data as MonthlyPayrollRecord;
                return (
                  <>
                    {[
                      ['Monthly Salary', fmtPeso(d.monthlyRate)],
                      ...(d.overtimeHours > 0 ? [[`Overtime (${d.overtimeHours}h)`, fmtPeso(d.overtimePay)]] : []),
                      ...(d.bonusAmount > 0   ? [['Bonus', fmtPeso(d.bonusAmount)]] : []),
                      ['Gross Income',   fmtPeso(d.grossIncome)],
                      ['Deductions',     fmtPeso(d.totalDeductions)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                        <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>{label}</span>
                        <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{value}</span>
                      </div>
                    ))}
                  </>
                );
              })()}

              {type === 'COMMISSION' && (() => {
                const d = data as CommissionPayrollRecord;
                return (
                  <>
                    {[
                      ['Total Bookings',       `${d.totalBookings}`],
                      ['Total Commission',     fmtPeso(d.totalCommissionAmount)],
                      ['Taxes / Deductions',   fmtPeso(d.taxes)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                        <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>{label}</span>
                        <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{value}</span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Net Pay banner */}
          <div className={`rounded-xl border p-4 flex items-center justify-between ${netBg}`}>
            <span className="font-bold text-base" style={{fontFamily: 'Poppins'}}>{netLabel}</span>
            <span className="font-bold text-2xl" style={{fontFamily: 'Poppins'}}>{fmtPeso(netAmount)}</span>
          </div>

          {/* Commission booking table */}
          {type === 'COMMISSION' && (() => {
            const d = data as CommissionPayrollRecord;
            const bookings = d.bookingDetails ?? [];
            if (bookings.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
                  Booking Details
                </p>
                <div className="space-y-2">
                  {bookings.map(b => (
                    <div key={b.booking_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{b.guest_name}</p>
                        <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>Check-in: {fmtDate(b.check_in_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>{fmtPeso(b.commission_amount)}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          b.commission_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`} style={{fontFamily: 'Poppins'}}>
                          {b.commission_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer — outside scroll area */}
        <div className="flex-shrink-0 border-t border-gray-100 rounded-b-2xl px-6 py-4 flex gap-3">
          {(type === 'DAILY' || type === 'MONTHLY') && (
            <button type="button"
              onClick={() => { onDownloadPayslip(data.id); handleClose(); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{fontFamily: 'Poppins'}}>
              Download Payslip
            </button>
          )}
          <button type="button" onClick={handleClose}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
            style={{fontFamily: 'Poppins'}}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add Employee Modal
// ---------------------------------------------------------------------------
const AddEmployeeModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('DAILY');
  const [currentRate, setCurrentRate] = useState('');
  const [role, setRole] = useState('employee');

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      setFormError(null);
      setFullName(''); setPosition(''); setEmploymentType('DAILY');
      setCurrentRate(''); setRole('employee');
      onClose();
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !position.trim() || !currentRate) {
      setFormError('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await addEmployee({
        full_name: fullName.trim(),
        position: position.trim(),
        employment_type: employmentType,
        current_rate: Number(currentRate),
        role,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col transition-transform duration-300 ${visible ? 'scale-100' : 'scale-95'}`}
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>Add New Employee</h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="add-employee-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3" style={{ fontFamily: 'Poppins' }}>
              {formError}
            </div>
          )}
          <div>
            <label className={labelCls} style={{ fontFamily: 'Poppins' }}>Full Name</label>
            <input className={inputCls} style={{ fontFamily: 'Poppins' }} placeholder="e.g. Juan dela Cruz"
              value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: 'Poppins' }}>Position / Job Title</label>
            <input className={inputCls} style={{ fontFamily: 'Poppins' }} placeholder="e.g. Housekeeping Staff"
              value={position} onChange={e => setPosition(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: 'Poppins' }}>Employment Type</label>
            <select className={inputCls} style={{ fontFamily: 'Poppins' }}
              value={employmentType} onChange={e => setEmploymentType(e.target.value as EmploymentType)}>
              <option value="DAILY">Daily Worker</option>
              <option value="MONTHLY">Monthly Staff</option>
              <option value="COMMISSION">Commission Agent</option>
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: 'Poppins' }}>
              {employmentType === 'DAILY' ? 'Daily Rate (₱)' : employmentType === 'MONTHLY' ? 'Monthly Rate (₱)' : 'Commission Rate (₱)'}
            </label>
            <input className={inputCls} style={{ fontFamily: 'Poppins' }} type="number" min="0" step="0.01"
              placeholder="0.00" value={currentRate} onChange={e => setCurrentRate(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls} style={{ fontFamily: 'Poppins' }}>System Role</label>
            <select className={inputCls} style={{ fontFamily: 'Poppins' }}
              value={role} onChange={e => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 rounded-b-2xl px-6 py-4 flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button type="submit" form="add-employee-form" disabled={submitting}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
            style={{ fontFamily: 'Poppins' }}>
            {submitting ? 'Saving…' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Generate Payroll Modal
// ---------------------------------------------------------------------------
interface EmployeeOption { employee_id: number; full_name: string; position: string; employment_type: EmploymentType; }

const GeneratePayrollModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<EmploymentType>('DAILY');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [daysWorked, setDaysWorked] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  // Commission: list of individual booking amounts
  const [commissionAmounts, setCommissionAmounts] = useState<string[]>(['']);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      setLoadingEmp(true);
      getEmployees()
        .then(setEmployees)
        .catch(() => setEmployees([]))
        .finally(() => setLoadingEmp(false));
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      setFormError(null);
      setEmployeeId(''); setPeriodStart(''); setPeriodEnd('');
      setDaysWorked(''); setDailyRate(''); setMonthlyRate('');
      setOvertimeHours(''); setBonusAmount('');
      setCommissionAmounts(['']);
      onClose();
    }, 300);
  };

  const filteredEmployees = employees.filter(e => e.employment_type === step);

  const handleSubmit = async () => {
    setFormError(null);
    if (!periodStart || !periodEnd) { setFormError('Pay period start and end are required.'); return; }

    let body: Record<string, unknown> = { employment_type: step, pay_period_start: periodStart, pay_period_end: periodEnd };

    if (step === 'DAILY') {
      if (!employeeId || !daysWorked || !dailyRate) { setFormError('Employee, days worked, and daily rate are required.'); return; }
      body = { ...body, employee_id: Number(employeeId), days_worked: Number(daysWorked), daily_rate: Number(dailyRate) };
    } else if (step === 'MONTHLY') {
      if (!employeeId || !monthlyRate) { setFormError('Employee and monthly rate are required.'); return; }
      body = { ...body, employee_id: Number(employeeId), monthly_rate: Number(monthlyRate),
        overtime_hours: overtimeHours ? Number(overtimeHours) : 0,
        bonus_amount: bonusAmount ? Number(bonusAmount) : 0 };
    } else {
      if (!employeeId) { setFormError('Select an agent.'); return; }
      const amounts = commissionAmounts.map(Number).filter(n => n > 0);
      if (amounts.length === 0) { setFormError('Add at least one commission amount.'); return; }
      body = { ...body, agent_id: Number(employeeId), booking_commissions: amounts };
    }

    setSubmitting(true);
    try {
      await createPayroll(body);
      onSuccess();
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to generate payroll.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const typeColors: Record<EmploymentType, string> = {
    DAILY:      'bg-blue-600 text-white',
    MONTHLY:    'bg-purple-600 text-white',
    COMMISSION: 'bg-amber-600 text-white',
  };
  const typeInactive = 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 pb-4 sm:pb-0 sm:px-4
        transition-[background-color] duration-300 ease-in-out
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col
        transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Header */}
        <div className="flex-shrink-0 rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg" style={{fontFamily:'Poppins'}}>Generate Payroll</h2>
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Type Selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{fontFamily:'Poppins'}}>Employment Type</p>
            <div className="flex gap-2">
              {(['DAILY', 'MONTHLY', 'COMMISSION'] as EmploymentType[]).map(t => (
                <button key={t} type="button" onClick={() => { setStep(t); setEmployeeId(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${step === t ? typeColors[t] : typeInactive}`}
                  style={{fontFamily:'Poppins'}}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Employee / Agent */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>
              {step === 'COMMISSION' ? 'Agent' : 'Employee'}
            </label>
            {loadingEmp ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                style={{fontFamily:'Poppins'}}>
                <option value="">— Select {step === 'COMMISSION' ? 'agent' : 'employee'} —</option>
                {filteredEmployees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} {e.position ? `(${e.position})` : ''}
                  </option>
                ))}
                {filteredEmployees.length === 0 && (
                  <option disabled>No {step.toLowerCase()} employees found</option>
                )}
              </select>
            )}
          </div>

          {/* Pay Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Period Start</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                style={{fontFamily:'Poppins'}} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Period End</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                style={{fontFamily:'Poppins'}} />
            </div>
          </div>

          {/* DAILY fields */}
          {step === 'DAILY' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Days Worked</label>
                <input type="number" min="0" value={daysWorked} onChange={e => setDaysWorked(e.target.value)}
                  placeholder="e.g. 22"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                  style={{fontFamily:'Poppins'}} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Daily Rate (₱)</label>
                <input type="number" min="0" value={dailyRate} onChange={e => setDailyRate(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                  style={{fontFamily:'Poppins'}} />
              </div>
            </div>
          )}

          {/* MONTHLY fields */}
          {step === 'MONTHLY' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Monthly Rate (₱)</label>
                <input type="number" min="0" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                  style={{fontFamily:'Poppins'}} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Overtime Hours (optional)</label>
                  <input type="number" min="0" value={overtimeHours} onChange={e => setOvertimeHours(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                    style={{fontFamily:'Poppins'}} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" style={{fontFamily:'Poppins'}}>Bonus (₱, optional)</label>
                  <input type="number" min="0" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                    style={{fontFamily:'Poppins'}} />
                </div>
              </div>
            </div>
          )}

          {/* COMMISSION fields */}
          {step === 'COMMISSION' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2" style={{fontFamily:'Poppins'}}>Booking Commission Amounts (₱)</label>
              <div className="space-y-2">
                {commissionAmounts.map((amt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="number" min="0" value={amt}
                      onChange={e => setCommissionAmounts(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                      placeholder={`Booking ${i + 1} commission`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] outline-none"
                      style={{fontFamily:'Poppins'}} />
                    {commissionAmounts.length > 1 && (
                      <button type="button"
                        onClick={() => setCommissionAmounts(prev => prev.filter((_, j) => j !== i))}
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setCommissionAmounts(prev => [...prev, ''])}
                  className="text-sm text-[#0B5858] hover:underline font-medium transition-colors"
                  style={{fontFamily:'Poppins'}}>
                  + Add booking
                </button>
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" style={{fontFamily:'Poppins'}}>
              {formError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 rounded-b-2xl px-6 py-4 flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            style={{fontFamily:'Poppins'}}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
            style={{fontFamily:'Poppins'}}>
            {submitting ? 'Generating…' : 'Generate Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MAIN PAYROLL PAGE
// ---------------------------------------------------------------------------
export default function PayrollPage() {
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<EmploymentType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dailyPayroll,      setDailyPayroll]      = useState<DailyPayrollRecord[]>([]);
  const [monthlyPayroll,    setMonthlyPayroll]    = useState<MonthlyPayrollRecord[]>([]);
  const [commissionPayroll, setCommissionPayroll] = useState<CommissionPayrollRecord[]>([]);
  const [viewRecord,        setViewRecord]        = useState<ViewRecord>(null);
  const [showGenerate,      setShowGenerate]      = useState(false);
  const [showAddEmployee,   setShowAddEmployee]   = useState(false);
  const [refreshKey,        setRefreshKey]        = useState(0);

  const reloadPayroll = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { daily, monthly, commission } = await getPayroll();

        // FIX: For each commission record, fetch its bookingDetails individually
        const enrichedCommission = await Promise.all(
          commission.map(async (record) => {
            try {
              const detail = await getPayrollById(record.id) as CommissionPayrollRecord;
              return { ...record, bookingDetails: detail.bookingDetails ?? [] };
            } catch {
              return { ...record, bookingDetails: [] };
            }
          })
        );

        setDailyPayroll(daily);
        setMonthlyPayroll(monthly);
        setCommissionPayroll(enrichedCommission);
      } catch (err) {
        console.error('Error loading payroll:', err);
        setError('Failed to load payroll records. Is the backend running?');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const handleView = (id: string) => {
    const daily = dailyPayroll.find(p => p.id === id);
    if (daily) { setViewRecord({ type: 'DAILY', data: daily }); return; }
    const monthly = monthlyPayroll.find(p => p.id === id);
    if (monthly) { setViewRecord({ type: 'MONTHLY', data: monthly }); return; }
    const commission = commissionPayroll.find(p => p.id === id);
    if (commission) { setViewRecord({ type: 'COMMISSION', data: commission }); return; }
  };

  const handleDownloadPayslip = (id: string) => {
    const daily = dailyPayroll.find(p => p.id === id);
    if (daily) { downloadDailyPayslipPDF(daily); return; }
    const monthly = monthlyPayroll.find(p => p.id === id);
    if (monthly) { downloadMonthlyPayslipPDF(monthly); return; }
  };

  const handleMarkPaid = async (payrollId: string, bookingId: number, gcashRef: string, receiptUrl: string) => {
    try {
      const updated = await markCommissionPaid(payrollId, bookingId, gcashRef, receiptUrl);
      setCommissionPayroll(prev =>
        prev.map(record => {
          if (record.id !== payrollId) return record;
          return {
            ...record,
            bookingDetails: record.bookingDetails?.map(b =>
              b.booking_id === bookingId ? { ...b, ...updated } : b
            ),
          };
        })
      );
    } catch (err) {
      console.error('Error marking commission as paid:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <PayrollDetailModal
        record={viewRecord}
        onClose={() => setViewRecord(null)}
        onDownloadPayslip={handleDownloadPayslip}
      />
      <AddEmployeeModal
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onSuccess={() => { setShowAddEmployee(false); reloadPayroll(); }}
      />
      <GeneratePayrollModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        onSuccess={() => { setShowGenerate(false); reloadPayroll(); }}
      />
      <Navbar />
      <main className="flex-grow w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton />
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
                Payroll Management
              </h1>
              <p className="text-lg text-gray-600" style={{fontFamily: 'Poppins'}}>
                Manage salaries for all employment types: Daily Workers, Monthly Staff, and Commission-based Agents
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddEmployee(true)}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#0B5858] border border-[#0B5858] px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Add Employee
              </button>
              <button
                type="button"
                onClick={() => setShowGenerate(true)}
                className="flex items-center gap-2 bg-[#0B5858] hover:bg-[#094444] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Generate Payroll
              </button>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            {/* Sidebar stats — desktop */}
            <div className="hidden lg:flex flex-col gap-5 w-56 flex-shrink-0 top-8">
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-blue-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>Daily Workers</p>
                <p className="text-3xl font-bold text-blue-700" style={{fontFamily: 'Poppins'}}>{dailyPayroll.length}</p>
              </div>
              <div className="bg-purple-50 rounded-lg border border-purple-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-purple-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>Monthly Staff</p>
                <p className="text-3xl font-bold text-purple-700" style={{fontFamily: 'Poppins'}}>{monthlyPayroll.length}</p>
              </div>
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-amber-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>Agents</p>
                <p className="text-3xl font-bold text-amber-700" style={{fontFamily: 'Poppins'}}>{commissionPayroll.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-gray-600 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>Total Payroll</p>
                <p className="text-3xl font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>{dailyPayroll.length + monthlyPayroll.length + commissionPayroll.length}</p>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Mobile stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 lg:hidden">
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1" style={{fontFamily: 'Poppins'}}>Daily</p>
                  <p className="text-2xl font-bold text-blue-700" style={{fontFamily: 'Poppins'}}>{dailyPayroll.length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1" style={{fontFamily: 'Poppins'}}>Monthly</p>
                  <p className="text-2xl font-bold text-purple-700" style={{fontFamily: 'Poppins'}}>{monthlyPayroll.length}</p>
                </div>
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1" style={{fontFamily: 'Poppins'}}>Agents</p>
                  <p className="text-2xl font-bold text-amber-700" style={{fontFamily: 'Poppins'}}>{commissionPayroll.length}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1" style={{fontFamily: 'Poppins'}}>Total</p>
                  <p className="text-2xl font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>{dailyPayroll.length + monthlyPayroll.length + commissionPayroll.length}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl shadow-sm bg-white">
                {/* Filter tabs */}
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'DAILY', 'MONTHLY', 'COMMISSION'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEmploymentTypeFilter(type)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          employmentTypeFilter === type
                            ? type === 'all' ? 'bg-[#0B5858] text-white'
                              : type === 'DAILY' ? 'bg-blue-600 text-white'
                              : type === 'MONTHLY' ? 'bg-purple-600 text-white'
                              : 'bg-amber-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100'
                        }`}
                        style={{fontFamily: 'Poppins'}}
                      >
                        {type === 'all' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto" style={{maxHeight: '70vh'}}>
                  {/* Error state */}
                  {error && (
                    <div className="p-8 text-center">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 inline-block">
                        <p className="text-red-700 font-semibold mb-2" style={{fontFamily: 'Poppins'}}>{error}</p>
                        <button type="button" onClick={() => window.location.reload()}
                          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors" style={{fontFamily: 'Poppins'}}>
                          Retry
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {isLoading && !error && (
                    <div className="p-12 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-[#0B5858] border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>Loading payroll data...</p>
                    </div>
                  )}

                  {/* Records */}
                  {!isLoading && !error && (
                    <div className="p-5">
                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'DAILY') && dailyPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>Daily Workers</h2>
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>{dailyPayroll.length}</span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {dailyPayroll.map((record) => (
                              <DailyPayrollRow key={record.id} payroll={record} onView={handleView} onDownloadPayslip={handleDownloadPayslip} />
                            ))}
                          </div>
                        </div>
                      )}

                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'MONTHLY') && monthlyPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>Monthly Staff</h2>
                            <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>{monthlyPayroll.length}</span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {monthlyPayroll.map((record) => (
                              <MonthlyPayrollRow key={record.id} payroll={record} onView={handleView} onDownloadPayslip={handleDownloadPayslip} />
                            ))}
                          </div>
                        </div>
                      )}

                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'COMMISSION') && commissionPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>Commission-Based Agents</h2>
                            <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>{commissionPayroll.length}</span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {commissionPayroll.map((record) => (
                              <CommissionPayrollRow
                                key={record.id}
                                payroll={record}
                                onView={handleView}
                                onDownloadPayslip={handleDownloadPayslip}
                                onMarkPaid={(pid, bid, ref, url) => handleMarkPaid(pid, bid, ref, url)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {dailyPayroll.length === 0 && monthlyPayroll.length === 0 && commissionPayroll.length === 0 && (
                        <div className="p-12 text-center">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>No payroll records found</h3>
                          <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>Start by creating a new payroll period for your employees.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}