/**
 * Money Lending — Type Definitions
 * Kelsey's Homestay IIMS
 */

export type LoanStatus =
  | 'pending'      // submitted, awaiting admin approval
  | 'active'       // approved and disbursed
  | 'overdue'      // missed payment(s)
  | 'settled'      // fully paid
  | 'written_off'  // admin flagged uncollectible
  | 'rejected';    // not approved

export type LendingPaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank_transfer' | 'salary_deduction';

export type InterestType = 'flat' | 'diminishing';

export type BorrowerRole = 'agent' | 'user' | 'cleaner';

export interface Loan {
  id: string;
  borrowerId: string;
  borrowerName: string;
  borrowerRole: BorrowerRole;
  principalAmount: number;
  interestRate: number;          // % per month
  interestType: InterestType;
  termMonths: number;            // number of monthly payments
  monthlyPayment: number;        // computed EMI
  totalPayable: number;          // principal + total interest
  disbursedAmount: number;       // actual amount released (principal - processing fee)
  processingFee: number;
  outstandingBalance: number;    // remaining balance
  status: LoanStatus;
  purpose: string;
  collateral?: string;
  approvedById?: string;
  approvedAt?: string;
  disbursedAt?: string;
  nextPaymentDue?: string;       // ISO date
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  penaltyAmount: number;
  paymentMethod: LendingPaymentMethod;
  referenceNumber?: string;
  proofUrl?: string;
  notes?: string;
  recordedById: string;
  paidAt: string;
}

export interface ScheduleEntry {
  period: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  remainingBalance: number;
  status: 'upcoming' | 'paid' | 'overdue' | 'partial';
  paidAmount?: number;
  paidAt?: string;
}

export interface RepaymentSchedule {
  loanId: string;
  schedules: ScheduleEntry[];
}

export interface LendingSummary {
  totalLoansActive: number;
  totalLoansOverdue: number;
  totalPrincipalOutstanding: number;
  totalCollectedThisMonth: number;
  totalCollectedYTD: number;
  monthlyCollections: { month: string; amount: number }[];
  loansByStatus: { status: LoanStatus; count: number }[];
}

export const PAYMENT_METHOD_LABELS: Record<LendingPaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  salary_deduction: 'Salary Deduction',
};

/** Chip style for payment method pills — same pattern as status chips; distinct colors per method. */
export type PaymentMethodChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const pmShadow = (r: number, g: number, b: number, a = 0.35) =>
  `0 1px 0 rgba(${r},${g},${b},${a})`;

export const PAYMENT_METHOD_CHIP_STYLE: Record<LendingPaymentMethod, PaymentMethodChipStyle> = {
  cash:             { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: pmShadow(168, 162, 158, 0.22) },
  gcash:            { backgroundColor: '#dbeafe', color: '#1d4ed8', boxShadow: pmShadow(59, 130, 246, 0.35) },
  maya:             { backgroundColor: '#dcfce7', color: '#15803d', boxShadow: pmShadow(34, 197, 94, 0.35) },
  bank_transfer:    { backgroundColor: '#e0e7ff', color: '#3730a3', boxShadow: pmShadow(99, 102, 241, 0.35) },
  salary_deduction: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: pmShadow(11, 88, 88, 0.32) },
};

/** Chip style for status pills — aligned with cleaning hub (backgroundColor, color, boxShadow). */
export type LoanStatusChipStyle = { backgroundColor: string; color: string; boxShadow: string };

/** Color-matched solid shadow for 3D chip edge (same pattern as cleaning types). */
const chipShadow = (r: number, g: number, b: number, a = 0.35) =>
  `0 1px 0 rgba(${r},${g},${b},${a})`;

export const LOAN_STATUS_CONFIG: Record<
  LoanStatus,
  { label: string; classes: string; dot: string; chipStyle: LoanStatusChipStyle }
> = {
  pending:    { label: 'Pending',    classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30', dot: 'bg-[#FACC15]', chipStyle: { backgroundColor: 'rgba(250, 204, 21, 0.2)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  active:     { label: 'Active',     classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20', dot: 'bg-[#0B5858]', chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  overdue:    { label: 'Overdue',    classes: 'bg-red-50 text-red-700 border border-red-200',               dot: 'bg-red-500', chipStyle: { backgroundColor: '#fef2f2', color: '#b91c1c', boxShadow: chipShadow(239, 68, 68, 0.35) } },
  settled:    { label: 'Settled',    classes: 'bg-gray-50 text-gray-600 border border-gray-200',            dot: 'bg-gray-400', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  written_off:{ label: 'Written Off',classes: 'bg-gray-100 text-gray-500 border border-gray-300',           dot: 'bg-gray-500', chipStyle: { backgroundColor: '#e7e5e4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.25) } },
  rejected:   { label: 'Rejected',   classes: 'bg-red-50 text-red-600 border border-red-200',               dot: 'bg-red-400', chipStyle: { backgroundColor: '#fef2f2', color: '#dc2626', boxShadow: chipShadow(239, 68, 68, 0.35) } },
};

/**
 * EMI Computation — Flat Rate
 * Total Interest  = Principal × Rate% × Term
 * Total Payable   = Principal + Total Interest
 * Monthly Payment = Total Payable / Term
 */
export function computeEMI(principal: number, ratePercent: number, termMonths: number): {
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
} {
  const totalInterest = principal * (ratePercent / 100) * termMonths;
  const totalPayable = principal + totalInterest;
  const monthlyPayment = totalPayable / termMonths;
  return { monthlyPayment, totalPayable, totalInterest };
}

/**
 * Generate a repayment schedule for a flat-rate loan
 */
export function generateSchedule(loan: Loan): ScheduleEntry[] {
  const { principalAmount, interestRate, termMonths, monthlyPayment } = loan;
  const principalPerPeriod = principalAmount / termMonths;
  const interestPerPeriod = principalAmount * (interestRate / 100);

  const schedules: ScheduleEntry[] = [];
  let balance = principalAmount;

  const startDate = new Date(loan.disbursedAt ?? loan.createdAt);

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    balance -= principalPerPeriod;

    schedules.push({
      period: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principalDue: principalPerPeriod,
      interestDue: interestPerPeriod,
      totalDue: monthlyPayment,
      remainingBalance: Math.max(0, balance),
      status: 'upcoming',
    });
  }

  return schedules;
}
