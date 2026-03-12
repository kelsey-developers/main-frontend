/**
 * Payroll service — calls the backend API for all payroll data.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export type EmploymentType = 'DAILY' | 'MONTHLY' | 'COMMISSION';
export type PayrollStatus = 'pending' | 'approved' | 'processed' | 'paid' | 'declined';
export type CommissionPaymentStatus = 'unpaid' | 'paid';

export interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
  unit_id?: number;
}

export interface DailyPayrollRecord {
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

export interface MonthlyPayrollRecord {
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

export interface BookingCommission {
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

export interface CommissionPayrollRecord {
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

/**
 * Fetch active employees list (for dropdowns).
 */
export async function getEmployees(): Promise<{ employee_id: number; full_name: string; position: string; employment_type: EmploymentType; }[]> {
  const res = await fetch(`${API_BASE}/api/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

/**
 * Add a new employee.
 */
export async function addEmployee(body: {
  full_name: string;
  position: string;
  employment_type: EmploymentType;
  current_rate: number;
  role?: string;
}): Promise<Employee> {
  const res = await fetch(`${API_BASE}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to add employee');
  }
  return res.json();
}

/**
 * Generate a new payroll record.
 */
export async function createPayroll(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/payroll/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to generate payroll');
  }
  return res.json();
}

/**
 * Fetch all payroll records split by employment type.
 */
export async function getPayroll(): Promise<{
  daily: DailyPayrollRecord[];
  monthly: MonthlyPayrollRecord[];
  commission: CommissionPayrollRecord[];
}> {
  const [dailyRes, monthlyRes, commissionRes] = await Promise.all([
    fetch(`${API_BASE}/api/payroll?type=DAILY`),
    fetch(`${API_BASE}/api/payroll?type=MONTHLY`),
    fetch(`${API_BASE}/api/payroll?type=COMMISSION`),
  ]);

  if (!dailyRes.ok || !monthlyRes.ok || !commissionRes.ok) {
    throw new Error('Failed to fetch payroll records');
  }

  const [daily, monthly, commission] = await Promise.all([
    dailyRes.json(),
    monthlyRes.json(),
    commissionRes.json(),
  ]);

  return { daily, monthly, commission };
}

/**
 * Fetch a single payroll record by ID.
 */
export async function getPayrollById(
  id: string
): Promise<DailyPayrollRecord | MonthlyPayrollRecord | CommissionPayrollRecord> {
  const res = await fetch(`${API_BASE}/api/payroll/${id}`);
  if (!res.ok) throw new Error('Failed to fetch payroll record');
  return res.json();
}

/**
 * Mark a booking commission as paid via GCash.
 */
export async function markCommissionPaid(
  payrollId: string,
  bookingId: number,
  gcashReference: string,
  gcashReceiptUrl: string
): Promise<BookingCommission> {
  const res = await fetch(`${API_BASE}/api/payroll/commission/mark-paid`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payroll_id: payrollId,
      booking_id: bookingId,
      gcash_reference: gcashReference,
      gcash_receipt_url: gcashReceiptUrl,
    }),
  });

  if (!res.ok) throw new Error('Failed to mark commission as paid');
  return res.json();
}
