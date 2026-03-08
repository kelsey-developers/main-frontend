'use client';

import React, { useState, useEffect } from 'react';

// Type definitions
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
  bookingDetails?: Array<{
    booking_id: number;
    guest_name: string;
    booking_date: string;
    amount: number;
    commission_rate: number;
    commission_amount: number;
  }>;
}

// Navigation Component (Same as before)
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
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              Dashboard
            </a>
            <a href="#" className="text-[#0B5858] font-medium border-b-2 border-[#0B5858]" style={{fontFamily: 'Poppins'}}>
              Payroll
            </a>
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              DTR
            </a>
            <a href="#" className="text-gray-600 hover:text-[#0B5858] font-medium transition-colors" style={{fontFamily: 'Poppins'}}>
              Employees
            </a>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                AD
              </span>
            </div>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-[#0B5858]"
            >
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

// Footer Component (Same as before)
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B5858] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4" style={{fontFamily: 'Poppins'}}>
              Kelsey's Homestay
            </h3>
            <p className="text-gray-300 text-sm" style={{fontFamily: 'Poppins'}}>
              Managing your property and payroll with ease and efficiency.
            </p>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Dashboard</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Payroll</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>DTR</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>
              Support
            </h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Documentation</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-md font-semibold mb-4" style={{fontFamily: 'Poppins'}}>
              Legal
            </h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm transition-colors" style={{fontFamily: 'Poppins'}}>Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-300 text-sm" style={{fontFamily: 'Poppins'}}>
            © {currentYear} Kelsey's Homestay. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

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
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee.full_name}
                </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
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
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    {payroll.daysWorked} days
                  </span>
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

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                Deductions
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>SSS (4.5%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.sss || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Philhealth (2.5%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.philhealth || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Pag-IBIG (2%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.pagibig || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Income Tax</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.incomeTax || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded mt-4">
                  <span className="text-red-900 font-semibold" style={{fontFamily: 'Poppins'}}>Total Deductions</span>
                  <span className="font-bold text-red-700 text-lg" style={{fontFamily: 'Poppins'}}>
                    ₱ {payroll.totalDeductions.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
              Download Payslip
            </button>
            <button
              type="button"
              onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
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
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  {payroll.employee.full_name}
                </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
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

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                Deductions
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>SSS (4.5%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.sss || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Philhealth (2.5%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.philhealth || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Pag-IBIG (2%)</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.pagibig || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Income Tax</span>
                  <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                    ₱ {(payroll.breakdown?.incomeTax || 0).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded mt-4">
                  <span className="text-red-900 font-semibold" style={{fontFamily: 'Poppins'}}>Total Deductions</span>
                  <span className="font-bold text-red-700 text-lg" style={{fontFamily: 'Poppins'}}>
                    ₱ {payroll.totalDeductions.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
              Download Payslip
            </button>
            <button
              type="button"
              onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
              View Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// COMMISSION PAYROLL ROW COMPONENT
const CommissionPayrollRow: React.FC<{
  payroll: CommissionPayrollRecord;
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
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm" style={{fontFamily: 'Poppins'}}>
                    {payroll.agent_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                  {payroll.agent_name}
                </p>
                <p className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                  Agent • <span className="text-amber-600 font-medium">{payroll.totalBookings} bookings</span>
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
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                Booking Details & Commission
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {payroll.bookingDetails?.map((booking, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" style={{fontFamily: 'Poppins'}}>
                        {booking.guest_name}
                      </p>
                      <p className="text-xs text-gray-500" style={{fontFamily: 'Poppins'}}>
                        {new Date(booking.booking_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                        ₱ {booking.amount.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                      </p>
                      <p className="text-xs text-amber-600" style={{fontFamily: 'Poppins'}}>
                        {(booking.commission_rate * 100).toFixed(1)}% = ₱ {booking.commission_amount.toLocaleString('en-PH', {maximumFractionDigits: 2})}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                  Commission Totals
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Bookings</span>
                    <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                      {payroll.totalBookings}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Total Commission</span>
                    <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                      ₱ {payroll.totalCommissionAmount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide" style={{fontFamily: 'Poppins'}}>
                  Taxes
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600" style={{fontFamily: 'Poppins'}}>Withholding Tax</span>
                    <span className="font-semibold text-gray-900" style={{fontFamily: 'Poppins'}}>
                      ₱ {payroll.taxes.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded mt-4">
                    <span className="text-red-900 font-semibold" style={{fontFamily: 'Poppins'}}>Total Taxes</span>
                    <span className="font-bold text-red-700 text-lg" style={{fontFamily: 'Poppins'}}>
                      ₱ {payroll.taxes.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onDownloadPayslip(payroll.id)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
              Download Report
            </button>
            <button
              type="button"
              onClick={() => onView(payroll.id)}
              className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              style={{fontFamily: 'Poppins'}}
            >
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
    // Mock data - replace with real API calls
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
            amount: 5000,
            commission_rate: 0.10,
            commission_amount: 500
          },
          {
            booking_id: 2,
            guest_name: 'Jane Doe',
            booking_date: '2024-02-10',
            amount: 7500,
            commission_rate: 0.10,
            commission_amount: 750
          }
        ]
      }
    ];

    setDailyPayroll(mockDaily);
    setMonthlyPayroll(mockMonthly);
    setCommissionPayroll(mockCommission);
    setIsLoading(false);
  }, []);

  const handleView = (id: string) => {
    console.log('View payroll:', id);
  };

  const handleDownloadPayslip = (id: string) => {
    console.log('Download payslip:', id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      <main className="flex-grow w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
              Payroll Management
            </h1>
            <p className="text-lg text-gray-600" style={{fontFamily: 'Poppins'}}>
              Manage salaries for all employment types: Daily Workers, Monthly Staff, and Commission-based Agents
            </p>
          </div>

          {/* Main Layout: Sidebar + Scrollable List */}
          <div className="flex gap-6 items-start">

            {/* Sticky Sidebar - Summary Cards */}
            <div className="hidden lg:flex flex-col gap-5 w-56 flex-shrink-0 top-8">
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-blue-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
                  Daily Workers
                </p>
                <p className="text-3xl font-bold text-blue-700" style={{fontFamily: 'Poppins'}}>
                  {dailyPayroll.length}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg border border-purple-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-purple-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
                  Monthly Staff
                </p>
                <p className="text-3xl font-bold text-purple-700" style={{fontFamily: 'Poppins'}}>
                  {monthlyPayroll.length}
                </p>
              </div>

              <div className="bg-amber-50 rounded-lg border border-amber-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-amber-700 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
                  Agents
                </p>
                <p className="text-3xl font-bold text-amber-700" style={{fontFamily: 'Poppins'}}>
                  {commissionPayroll.length}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <p className="text-s font-semibold text-gray-600 uppercase tracking-wide mb-3" style={{fontFamily: 'Poppins'}}>
                  Total Payroll
                </p>
                <p className="text-3xl font-bold text-[#0B5858]" style={{fontFamily: 'Poppins'}}>
                  {dailyPayroll.length + monthlyPayroll.length + commissionPayroll.length}
                </p>
              </div>
            </div>

            {/* Right Panel - Filter + Scrollable Records */}
            <div className="flex-1 min-w-0">

              {/* Mobile summary cards (horizontal, only on small screens) */}
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

              {/* Bordered scrollable container */}
              <div className="border border-gray-200 rounded-xl shadow-sm bg-white">
                {/* Filter bar - sticky inside the container */}
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEmploymentTypeFilter('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        employmentTypeFilter === 'all'
                          ? 'bg-[#0B5858] text-white'
                          : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{fontFamily: 'Poppins'}}
                    >
                      All Types
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmploymentTypeFilter('DAILY')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        employmentTypeFilter === 'DAILY'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{fontFamily: 'Poppins'}}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmploymentTypeFilter('MONTHLY')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        employmentTypeFilter === 'MONTHLY'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{fontFamily: 'Poppins'}}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmploymentTypeFilter('COMMISSION')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        employmentTypeFilter === 'COMMISSION'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                      style={{fontFamily: 'Poppins'}}
                    >
                      Commission
                    </button>
                  </div>
                </div>

                {/* Scrollable records area */}
                <div className="overflow-y-auto" style={{maxHeight: '70vh'}}>
                  {isLoading ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-600 text-lg" style={{fontFamily: 'Poppins'}}>
                        Loading payroll data...
                      </p>
                    </div>
                  ) : (
                    <div className="p-5">
                      {/* DAILY WORKERS */}
                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'DAILY') && dailyPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                              Daily Workers
                            </h2>
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>
                              {dailyPayroll.length}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {dailyPayroll.map((record) => (
                              <DailyPayrollRow
                                key={record.id}
                                payroll={record}
                                onView={handleView}
                                onDownloadPayslip={handleDownloadPayslip}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MONTHLY STAFF */}
                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'MONTHLY') && monthlyPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                              Monthly Staff
                            </h2>
                            <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>
                              {monthlyPayroll.length}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {monthlyPayroll.map((record) => (
                              <MonthlyPayrollRow
                                key={record.id}
                                payroll={record}
                                onView={handleView}
                                onDownloadPayslip={handleDownloadPayslip}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* COMMISSION AGENTS */}
                      {(employmentTypeFilter === 'all' || employmentTypeFilter === 'COMMISSION') && commissionPayroll.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center space-x-3 mb-4">
                            <h2 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>
                              Commission-Based Agents
                            </h2>
                            <span className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-semibold" style={{fontFamily: 'Poppins'}}>
                              {commissionPayroll.length}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {commissionPayroll.map((record) => (
                              <CommissionPayrollRow
                                key={record.id}
                                payroll={record}
                                onView={handleView}
                                onDownloadPayslip={handleDownloadPayslip}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {dailyPayroll.length === 0 && monthlyPayroll.length === 0 && commissionPayroll.length === 0 && (
                        <div className="p-12 text-center">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{fontFamily: 'Poppins'}}>
                            No payroll records found
                          </h3>
                          <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
                            Start by creating a new payroll period for your employees.
                          </p>
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