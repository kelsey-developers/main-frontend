'use client';

import React, { useState, useEffect } from 'react';

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
  agent_name: string;
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

const BackButton: React.FC = () => (
  <button
    type="button"
    onClick={() => window.history.back()}
    className="flex items-center gap-2 text-gray-600 hover:text-[#0B5858] font-medium transition-colors group mb-6"
    style={{fontFamily: 'Poppins'}}
  >
    <span className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 group-hover:border-[#0B5858] group-hover:bg-[#0B5858]/5 transition-all">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </span>
    <span className="text-sm font-semibold">Admin Dashboard</span>
  </button>
);

// DAILY PAYROLL ROW COMPONENT
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
                    {payroll.employee.full_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.employee.full_name}</p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee.position} • <span className="text-blue-600 font-medium">{payroll.daysWorked} days</span>
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

// MONTHLY PAYROLL ROW COMPONENT
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
                    {payroll.employee.full_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.employee.full_name}</p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee.position} • <span className="text-purple-600 font-medium">Fixed Salary</span>
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

// GCASH MODAL COMPONENT
const GCashModal: React.FC<{
  modal: GCashModalState;
  onClose: () => void;
  onConfirm: (payrollId: string, bookingId: number, ref: string, receiptUrl: string) => void;
}> = ({ modal, onClose, onConfirm }) => {
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  // visible drives the CSS transition — separate from modal.open so we can animate out
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount first, then flip visible on next frame so the enter transition fires
  useEffect(() => {
    if (modal.open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [modal.open]);

  // Animate out: flip visible → false, then unmount after transition
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
    const mockReceiptUrl = receiptPreview ?? '';
    onConfirm(modal.payrollId, modal.bookingId, '', mockReceiptUrl);
    handleClose();
  };

  return (
    /* Backdrop — fades from transparent to black/40 */
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0
        transition-[background-color] duration-300 ease-in-out
        ${visible ? 'bg-black/60' : 'bg-black/0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Card — slides up from below and fades in */}
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

// COMMISSION PAYROLL ROW COMPONENT
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
                  <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                    {payroll.agent_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>{payroll.agent_name}</p>
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
              <div className="space-y-3">
                {payroll.bookingDetails?.map((booking, idx) => (
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
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
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
                                agentName: payroll.agent_name,
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

// MAIN PAYROLL PAGE
export default function PayrollPage() {
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<EmploymentType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [dailyPayroll, setDailyPayroll] = useState<DailyPayrollRecord[]>([]);
  const [monthlyPayroll, setMonthlyPayroll] = useState<MonthlyPayrollRecord[]>([]);
  const [commissionPayroll, setCommissionPayroll] = useState<CommissionPayrollRecord[]>([]);

  useEffect(() => {
    const mockDaily: DailyPayrollRecord[] = [
      {
        id: '1',
        employee_id: 1,
        employee: {
          employee_id: 1,
          full_name: 'Maria Santos',
          position: 'Cleaner',
          employment_type: 'DAILY',
          current_rate: 1500
        },
        payPeriodStart: '2024-02-01',
        payPeriodEnd: '2024-02-29',
        status: 'paid',
        daysWorked: 22,
        dailyRate: 1500,
        basePay: 33000,
        overtimeHours: 6,
        overtimePay: 1350,
        grossIncome: 34350,
        totalDeductions: 5152.5,
        netPay: 29197.5,
        reference_number: 'PAY-2024-D-001',
        paymentDate: '2024-03-05'
      }
    ];

    const mockMonthly: MonthlyPayrollRecord[] = [
      {
        id: '2',
        employee_id: 2,
        employee: {
          employee_id: 2,
          full_name: 'Juan Dela Cruz',
          position: 'Admin Staff',
          employment_type: 'MONTHLY',
          current_rate: 18000
        },
        payPeriodStart: '2024-02-01',
        payPeriodEnd: '2024-02-29',
        status: 'processed',
        monthlyRate: 18000,
        overtimeHours: 8,
        overtimePay: 900,
        bonusAmount: 0,
        grossIncome: 18900,
        totalDeductions: 2835,
        netPay: 16065,
        reference_number: 'PAY-2024-M-001'
      }
    ];

    const mockCommission: CommissionPayrollRecord[] = [
      {
        id: '3',
        agent_id: 1,
        agent_name: 'Sarah Johnson',
        payPeriodStart: '2024-02-01',
        payPeriodEnd: '2024-02-29',
        status: 'pending',
        totalBookings: 5,
        totalCommissionAmount: 12500,
        taxes: 1250,
        netPayout: 11250,
        reference_number: 'COMM-2024-001',
        bookingDetails: [
          {
            booking_id: 1,
            guest_name: 'John Smith',
            booking_date: '2024-02-05',
            check_in_date: '2024-02-06',
            amount: 5000,
            commission_rate: 0.10,
            commission_amount: 500,
            commission_status: 'paid',
            paid_date: '2024-02-06',
            approved_by: 'Admin',
            gcash_reference: '1234567890',
            gcash_receipt_url: ''
          },
          {
            booking_id: 2,
            guest_name: 'Jane Doe',
            booking_date: '2024-02-10',
            check_in_date: '2024-02-11',
            amount: 7500,
            commission_rate: 0.10,
            commission_amount: 750,
            commission_status: 'unpaid'
          }
        ]
      }
    ];

    setDailyPayroll(mockDaily);
    setMonthlyPayroll(mockMonthly);
    setCommissionPayroll(mockCommission);
    setIsLoading(false);
  }, []);

  const handleView = (id: string) => { console.log('View payroll:', id); };
  const handleDownloadPayslip = (id: string) => { console.log('Download payslip:', id); };

  const handleMarkPaid = (payrollId: string, bookingId: number, gcashRef: string, receiptUrl: string) => {
    const today = new Date().toISOString().split('T')[0];
    setCommissionPayroll(prev =>
      prev.map(record => {
        if (record.id !== payrollId) return record;
        return {
          ...record,
          bookingDetails: record.bookingDetails?.map(b =>
            b.booking_id === bookingId
              ? { ...b, commission_status: 'paid' as const, paid_date: today, approved_by: 'Admin', gcash_reference: gcashRef, gcash_receipt_url: receiptUrl }
              : b
          )
        };
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />
      <main className="flex-grow w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton />
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
              Payroll Management
            </h1>
            <p className="text-lg text-gray-600" style={{fontFamily: 'Poppins'}}>
              Manage salaries for all employment types: Daily Workers, Monthly Staff, and Commission-based Agents
            </p>
          </div>

          <div className="flex gap-6 items-start">
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
                  {isLoading ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-600 text-lg" style={{fontFamily: 'Poppins'}}>Loading payroll data...</p>
                    </div>
                  ) : (
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