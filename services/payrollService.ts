// PATH: main-frontend-mock/services/payrollService.ts

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
// Mappers — convert snake_case from Supabase to camelCase for the UI
// ---------------------------------------------------------------------------
function mapDaily(r: any): DailyPayrollRecord {
  return {
    id:               r.id,
    employee_id:      r.employee_id,
    employee:         r.employees ?? r.employee ?? null,
    payPeriodStart:   r.pay_period_start,
    payPeriodEnd:     r.pay_period_end,
    status:           r.status,
    daysWorked:       r.days_worked              ?? 0,
    dailyRate:        Number(r.daily_rate)       ?? 0,
    basePay:          Number(r.base_pay)         ?? 0,
    overtimeHours:    Number(r.overtime_hours)   ?? 0,
    overtimePay:      Number(r.overtime_pay)     ?? 0,
    grossIncome:      Number(r.gross_income)     ?? 0,
    totalDeductions:  Number(r.total_deductions) ?? 0,
    netPay:           Number(r.net_pay)          ?? 0,
    reference_number: r.reference_number         ?? '',
    paymentDate:      r.payment_date             ?? undefined,
  };
}

function mapMonthly(r: any): MonthlyPayrollRecord {
  return {
    id:               r.id,
    employee_id:      r.employee_id,
    employee:         r.employees ?? r.employee ?? null,
    payPeriodStart:   r.pay_period_start,
    payPeriodEnd:     r.pay_period_end,
    status:           r.status,
    monthlyRate:      Number(r.monthly_rate)     ?? 0,
    overtimeHours:    Number(r.overtime_hours)   ?? 0,
    overtimePay:      Number(r.overtime_pay)     ?? 0,
    bonusAmount:      Number(r.bonus_amount)     ?? 0,
    grossIncome:      Number(r.gross_income)     ?? 0,
    totalDeductions:  Number(r.total_deductions) ?? 0,
    netPay:           Number(r.net_pay)          ?? 0,
    reference_number: r.reference_number         ?? '',
    paymentDate:      r.payment_date             ?? undefined,
  };
}

function mapCommission(r: any): CommissionPayrollRecord {
  return {
    id:                    r.id,
    agent_id:              r.agent_id,
    agent_name:            r.agent_name              ?? null,
    payPeriodStart:        r.pay_period_start,
    payPeriodEnd:          r.pay_period_end,
    status:                r.status,
    totalBookings:         r.total_bookings           ?? 0,
    totalCommissionAmount: Number(r.gross_income)     ?? 0,
    taxes:                 Number(r.total_deductions) ?? 0,
    netPayout:             Number(r.net_pay)          ?? 0,
    reference_number:      r.reference_number         ?? '',
    paymentDate:           r.payment_date             ?? undefined,
    bookingDetails:        r.bookingDetails           ?? [],
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

// GET all active employees
export async function getEmployees(): Promise<{
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: EmploymentType;
}[]> {
  const res = await fetch(`${API_BASE}/api/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

// POST add a new employee
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

// POST generate a new payroll record
export async function createPayroll(
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/payroll/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? 'Failed to generate payroll'
    );
  }
  return res.json();
}

// GET all payroll records split by employment type
export async function getPayroll(): Promise<{
  daily: DailyPayrollRecord[];
  monthly: MonthlyPayrollRecord[];
  commission: CommissionPayrollRecord[];
}> {
  const [dailyRes, monthlyRes, commissionRes] = await Promise.all([
    fetch(`${API_BASE}/api/payroll/by-type/DAILY`),
    fetch(`${API_BASE}/api/payroll/by-type/MONTHLY`),
    fetch(`${API_BASE}/api/payroll/by-type/COMMISSION`),
  ]);

  // ✅ FIXED: graceful fallback instead of throwing when backend is unreachable
  const [dailyRaw, monthlyRaw, commissionRaw] = await Promise.all([
    dailyRes.ok      ? dailyRes.json()      : Promise.resolve([]),
    monthlyRes.ok    ? monthlyRes.json()    : Promise.resolve([]),
    commissionRes.ok ? commissionRes.json() : Promise.resolve([]),
  ]);

  return {
    daily:      (dailyRaw      as any[]).map(mapDaily),
    monthly:    (monthlyRaw    as any[]).map(mapMonthly),
    commission: (commissionRaw as any[]).map(mapCommission),
  };
}

// GET single payroll record by ID
export async function getPayrollById(
  id: string
): Promise<DailyPayrollRecord | MonthlyPayrollRecord | CommissionPayrollRecord> {
  const res = await fetch(`${API_BASE}/api/payroll/${id}`);
  if (!res.ok) throw new Error('Failed to fetch payroll record');
  const raw = await res.json();

  if (raw.employment_type === 'DAILY')      return mapDaily(raw);
  if (raw.employment_type === 'MONTHLY')    return mapMonthly(raw);
  if (raw.employment_type === 'COMMISSION') return mapCommission(raw);
  return raw;
}

// PATCH mark commission as paid via GCash
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
      payroll_id:        payrollId,
      booking_id:        bookingId,
      gcash_reference:   gcashReference,
      gcash_receipt_url: gcashReceiptUrl,
    }),
  });
  if (!res.ok) throw new Error('Failed to mark commission as paid');
  return res.json();
}