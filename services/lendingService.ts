/**
 * Money Lending Service — Kelsey's Homestay IIMS
 *
 * When NEXT_PUBLIC_API_URL is not set, returns frontend-only mock data.
 * When set, calls backend API.
 *
 * EMI formula (flat rate):
 *   Total Interest  = Principal × Rate% × Term
 *   Total Payable   = Principal + Total Interest
 *   Monthly Payment = Total Payable / Term
 */

import type {
  Loan,
  LoanPayment,
  RepaymentSchedule,
  LendingSummary,
  LoanStatus,
  ScheduleEntry,
} from '@/types/lending';
import { generateSchedule } from '@/types/lending';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = Date.now();
const d = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
const ds = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString().split('T')[0];
const df = (daysFromNow: number) => new Date(now + daysFromNow * 86_400_000).toISOString().split('T')[0];

// ─── Mock Loans (12 loans, all status variants) ───────────────────────────────

const MOCK_LOANS: Loan[] = [
  // ACTIVE LOANS
  {
    id: 'loan-001',
    borrowerId: 'agent-001',
    borrowerName: 'Juan Dela Cruz',
    borrowerRole: 'agent',
    principalAmount: 20000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 12,
    monthlyPayment: 2033.33,
    totalPayable: 24400,
    disbursedAmount: 19500,
    processingFee: 500,
    outstandingBalance: 14233.33,
    status: 'active',
    purpose: 'Business capital for additional agent marketing materials',
    approvedById: 'admin-001',
    approvedAt: d(90),
    disbursedAt: d(88),
    nextPaymentDue: df(5),
    createdAt: d(92),
    updatedAt: d(30),
  },
  {
    id: 'loan-002',
    borrowerId: 'agent-002',
    borrowerName: 'Maria Santos',
    borrowerRole: 'agent',
    principalAmount: 15000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 6,
    monthlyPayment: 2750,
    totalPayable: 16500,
    disbursedAmount: 14700,
    processingFee: 300,
    outstandingBalance: 8250,
    status: 'active',
    purpose: 'Personal emergency — medical expense',
    approvedById: 'admin-001',
    approvedAt: d(60),
    disbursedAt: d(58),
    nextPaymentDue: df(12),
    createdAt: d(62),
    updatedAt: d(28),
  },
  {
    id: 'loan-003',
    borrowerId: 'agent-003',
    borrowerName: 'Roberto Cruz',
    borrowerRole: 'agent',
    principalAmount: 10000,
    interestRate: 1.5,
    interestType: 'flat',
    termMonths: 3,
    monthlyPayment: 3483.33,
    totalPayable: 10450,
    disbursedAmount: 9800,
    processingFee: 200,
    outstandingBalance: 3483.33,
    status: 'active',
    purpose: 'Short-term bridge loan for property viewing trip',
    approvedById: 'admin-001',
    approvedAt: d(75),
    disbursedAt: d(73),
    nextPaymentDue: df(3),
    createdAt: d(77),
    updatedAt: d(13),
  },

  // OVERDUE LOANS
  {
    id: 'loan-004',
    borrowerId: 'agent-004',
    borrowerName: 'Pedro Flores',
    borrowerRole: 'agent',
    principalAmount: 25000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 12,
    monthlyPayment: 2583.33,
    totalPayable: 31000,
    disbursedAmount: 24500,
    processingFee: 500,
    outstandingBalance: 18083.33,
    status: 'overdue',
    purpose: 'Home renovation loan',
    approvedById: 'admin-001',
    approvedAt: d(150),
    disbursedAt: d(148),
    nextPaymentDue: ds(20),
    createdAt: d(152),
    updatedAt: d(20),
  },
  {
    id: 'loan-005',
    borrowerId: 'user-001',
    borrowerName: 'Grace Villanueva',
    borrowerRole: 'user',
    principalAmount: 8000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 4,
    monthlyPayment: 2040,
    totalPayable: 8160,
    disbursedAmount: 7800,
    processingFee: 200,
    outstandingBalance: 4080,
    status: 'overdue',
    purpose: 'Tuition fee assistance',
    approvedById: 'admin-001',
    approvedAt: d(100),
    disbursedAt: d(98),
    nextPaymentDue: ds(15),
    createdAt: d(102),
    updatedAt: d(15),
  },

  // SETTLED LOANS
  {
    id: 'loan-006',
    borrowerId: 'agent-001',
    borrowerName: 'Juan Dela Cruz',
    borrowerRole: 'agent',
    principalAmount: 5000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 3,
    monthlyPayment: 1766.67,
    totalPayable: 5300,
    disbursedAmount: 4900,
    processingFee: 100,
    outstandingBalance: 0,
    status: 'settled',
    purpose: 'Office supplies and printing materials',
    approvedById: 'admin-001',
    approvedAt: d(200),
    disbursedAt: d(198),
    nextPaymentDue: undefined,
    createdAt: d(202),
    updatedAt: d(110),
  },
  {
    id: 'loan-007',
    borrowerId: 'agent-002',
    borrowerName: 'Maria Santos',
    borrowerRole: 'agent',
    principalAmount: 12000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 6,
    monthlyPayment: 2200,
    totalPayable: 13200,
    disbursedAmount: 11800,
    processingFee: 200,
    outstandingBalance: 0,
    status: 'settled',
    purpose: 'Vehicle repair and maintenance',
    approvedById: 'admin-001',
    approvedAt: d(300),
    disbursedAt: d(298),
    nextPaymentDue: undefined,
    createdAt: d(302),
    updatedAt: d(120),
  },

  // PENDING LOANS
  {
    id: 'loan-008',
    borrowerId: 'agent-005',
    borrowerName: 'Ana Reyes',
    borrowerRole: 'agent',
    principalAmount: 18000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 9,
    monthlyPayment: 2200,
    totalPayable: 19800,
    disbursedAmount: 0,
    processingFee: 400,
    outstandingBalance: 18000,
    status: 'pending',
    purpose: 'Investment capital for real estate photography equipment',
    createdAt: d(3),
    updatedAt: d(3),
  },
  {
    id: 'loan-009',
    borrowerId: 'user-002',
    borrowerName: 'Carlos Tan',
    borrowerRole: 'user',
    principalAmount: 6000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 3,
    monthlyPayment: 2080,
    totalPayable: 6240,
    disbursedAmount: 0,
    processingFee: 150,
    outstandingBalance: 6000,
    status: 'pending',
    purpose: 'Emergency home repair after typhoon damage',
    createdAt: d(1),
    updatedAt: d(1),
  },

  // REJECTED
  {
    id: 'loan-010',
    borrowerId: 'agent-003',
    borrowerName: 'Roberto Cruz',
    borrowerRole: 'agent',
    principalAmount: 50000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 24,
    monthlyPayment: 2916.67,
    totalPayable: 70000,
    disbursedAmount: 0,
    processingFee: 1000,
    outstandingBalance: 0,
    status: 'rejected',
    purpose: 'Large capital investment — buy motorcycle for deliveries',
    createdAt: d(45),
    updatedAt: d(43),
  },

  // WRITTEN OFF
  {
    id: 'loan-011',
    borrowerId: 'user-003',
    borrowerName: 'Luz Marasigan',
    borrowerRole: 'user',
    principalAmount: 15000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 6,
    monthlyPayment: 2750,
    totalPayable: 16800,
    disbursedAmount: 14700,
    processingFee: 300,
    outstandingBalance: 11000,
    status: 'written_off',
    purpose: 'Medical expenses',
    approvedById: 'admin-001',
    approvedAt: d(400),
    disbursedAt: d(398),
    createdAt: d(402),
    updatedAt: d(60),
  },

  // SECOND ACTIVE — for borrower list variety
  {
    id: 'loan-012',
    borrowerId: 'agent-004',
    borrowerName: 'Pedro Flores',
    borrowerRole: 'agent',
    principalAmount: 30000,
    interestRate: 2,
    interestType: 'flat',
    termMonths: 12,
    monthlyPayment: 3050,
    totalPayable: 36600,
    disbursedAmount: 29500,
    processingFee: 500,
    outstandingBalance: 21350,
    status: 'active',
    purpose: 'Expansion of agent referral network — promotional events',
    approvedById: 'admin-001',
    approvedAt: d(45),
    disbursedAt: d(43),
    nextPaymentDue: df(8),
    createdAt: d(47),
    updatedAt: d(13),
  },
];

// ─── Mock Payments (20 records) ───────────────────────────────────────────────

const MOCK_PAYMENTS: LoanPayment[] = [
  // Loan 001 — Juan, 7 payments made (out of 12)
  { id: 'pay-001', loanId: 'loan-001', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 2033.33, principalPortion: 1666.67, interestPortion: 366.67, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20260101-0001', recordedById: 'admin-001', paidAt: d(88) },
  { id: 'pay-002', loanId: 'loan-001', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 2033.33, principalPortion: 1666.67, interestPortion: 366.67, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20260201-0002', recordedById: 'admin-001', paidAt: d(58) },
  { id: 'pay-003', loanId: 'loan-001', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 2033.33, principalPortion: 1666.67, interestPortion: 366.67, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20260301-0003', recordedById: 'admin-001', paidAt: d(30) },

  // Loan 002 — Maria, 3 payments made (out of 6)
  { id: 'pay-004', loanId: 'loan-002', borrowerId: 'agent-002', borrowerName: 'Maria Santos', amount: 2750, principalPortion: 2500, interestPortion: 250, penaltyAmount: 0, paymentMethod: 'bank_transfer', referenceNumber: 'BT-20260115-0004', recordedById: 'admin-001', paidAt: d(58) },
  { id: 'pay-005', loanId: 'loan-002', borrowerId: 'agent-002', borrowerName: 'Maria Santos', amount: 2750, principalPortion: 2500, interestPortion: 250, penaltyAmount: 0, paymentMethod: 'bank_transfer', referenceNumber: 'BT-20260215-0005', recordedById: 'admin-001', paidAt: d(28) },

  // Loan 003 — Roberto, 2 payments made (out of 3)
  { id: 'pay-006', loanId: 'loan-003', borrowerId: 'agent-003', borrowerName: 'Roberto Cruz', amount: 3483.33, principalPortion: 3333.33, interestPortion: 150, penaltyAmount: 0, paymentMethod: 'cash', recordedById: 'admin-001', paidAt: d(73) },
  { id: 'pay-007', loanId: 'loan-003', borrowerId: 'agent-003', borrowerName: 'Roberto Cruz', amount: 3483.33, principalPortion: 3333.33, interestPortion: 150, penaltyAmount: 0, paymentMethod: 'cash', recordedById: 'admin-001', paidAt: d(43) },

  // Loan 004 — Pedro (overdue), last payment 45 days ago
  { id: 'pay-008', loanId: 'loan-004', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 2583.33, principalPortion: 2083.33, interestPortion: 500, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20261001-0008', recordedById: 'admin-001', paidAt: d(148) },
  { id: 'pay-009', loanId: 'loan-004', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 2583.33, principalPortion: 2083.33, interestPortion: 500, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20261101-0009', recordedById: 'admin-001', paidAt: d(118) },
  { id: 'pay-010', loanId: 'loan-004', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 2583.33, principalPortion: 2083.33, interestPortion: 500, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20261201-0010', recordedById: 'admin-001', paidAt: d(88) },
  { id: 'pay-011', loanId: 'loan-004', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 2583.33, principalPortion: 2083.33, interestPortion: 500, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-20270101-0011', recordedById: 'admin-001', paidAt: d(58) },

  // Loan 005 — Grace (overdue), 1 payment
  { id: 'pay-012', loanId: 'loan-005', borrowerId: 'user-001', borrowerName: 'Grace Villanueva', amount: 2040, principalPortion: 2000, interestPortion: 40, penaltyAmount: 0, paymentMethod: 'maya', referenceNumber: 'MAYA-20261101-0012', recordedById: 'admin-001', paidAt: d(98) },
  { id: 'pay-013', loanId: 'loan-005', borrowerId: 'user-001', borrowerName: 'Grace Villanueva', amount: 2090, principalPortion: 2000, interestPortion: 40, penaltyAmount: 50, paymentMethod: 'maya', referenceNumber: 'MAYA-20261215-0013', notes: 'Late payment — penalty applied', recordedById: 'admin-001', paidAt: d(67) },

  // Loan 006 — Juan settled, 3 payments
  { id: 'pay-014', loanId: 'loan-006', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 1766.67, principalPortion: 1666.67, interestPortion: 100, penaltyAmount: 0, paymentMethod: 'salary_deduction', recordedById: 'admin-001', paidAt: d(198) },
  { id: 'pay-015', loanId: 'loan-006', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 1766.67, principalPortion: 1666.67, interestPortion: 100, penaltyAmount: 0, paymentMethod: 'salary_deduction', recordedById: 'admin-001', paidAt: d(168) },
  { id: 'pay-016', loanId: 'loan-006', borrowerId: 'agent-001', borrowerName: 'Juan Dela Cruz', amount: 1766.67, principalPortion: 1666.67, interestPortion: 100, penaltyAmount: 0, paymentMethod: 'salary_deduction', recordedById: 'admin-001', paidAt: d(138) },

  // Loan 007 — Maria settled, 6 payments
  { id: 'pay-017', loanId: 'loan-007', borrowerId: 'agent-002', borrowerName: 'Maria Santos', amount: 2200, principalPortion: 2000, interestPortion: 200, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-PAY-017', recordedById: 'admin-001', paidAt: d(298) },
  { id: 'pay-018', loanId: 'loan-007', borrowerId: 'agent-002', borrowerName: 'Maria Santos', amount: 2200, principalPortion: 2000, interestPortion: 200, penaltyAmount: 0, paymentMethod: 'gcash', referenceNumber: 'GC-PAY-018', recordedById: 'admin-001', paidAt: d(268) },

  // Loan 012 — Pedro, 3 payments
  { id: 'pay-019', loanId: 'loan-012', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 3050, principalPortion: 2500, interestPortion: 550, penaltyAmount: 0, paymentMethod: 'bank_transfer', referenceNumber: 'BT-20260201-0019', recordedById: 'admin-001', paidAt: d(43) },
  { id: 'pay-020', loanId: 'loan-012', borrowerId: 'agent-004', borrowerName: 'Pedro Flores', amount: 3050, principalPortion: 2500, interestPortion: 550, penaltyAmount: 0, paymentMethod: 'bank_transfer', referenceNumber: 'BT-20260301-0020', recordedById: 'admin-001', paidAt: d(13) },
];

// ─── Mock Summary ──────────────────────────────────────────────────────────────

const MOCK_SUMMARY: LendingSummary = {
  totalLoansActive: 4,
  totalLoansOverdue: 2,
  totalPrincipalOutstanding: 67149.99,
  totalCollectedThisMonth: 8116.66,
  totalCollectedYTD: 46782.97,
  monthlyCollections: [
    { month: 'Sep 2025', amount: 6200 },
    { month: 'Oct 2025', amount: 9800 },
    { month: 'Nov 2025', amount: 7350 },
    { month: 'Dec 2025', amount: 11200 },
    { month: 'Jan 2026', amount: 8900 },
    { month: 'Feb 2026', amount: 9300 },
    { month: 'Mar 2026', amount: 8116.66 },
  ],
  loansByStatus: [
    { status: 'active',      count: 4 },
    { status: 'overdue',     count: 2 },
    { status: 'pending',     count: 2 },
    { status: 'settled',     count: 2 },
    { status: 'rejected',    count: 1 },
    { status: 'written_off', count: 1 },
  ],
};

// ─── Service Functions ─────────────────────────────────────────────────────────

// GET /api/admin/lending/loans
export async function getLoans(filters?: {
  status?: LoanStatus;
  borrowerId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Loan[]> {
  if (!API_BASE) {
    let result = [...MOCK_LOANS];
    if (filters?.status) result = result.filter((l) => l.status === filters.status);
    if (filters?.borrowerId) result = result.filter((l) => l.borrowerId === filters.borrowerId);
    return Promise.resolve(result);
  }
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.borrowerId) params.set('borrowerId', filters.borrowerId);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  const res = await fetch(`${API_BASE}/api/admin/lending/loans?${params}`);
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
}

// GET /api/admin/lending/loans/:id
export async function getLoanById(loanId: string): Promise<Loan> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (!loan) throw new Error('Loan not found');
    return Promise.resolve({ ...loan });
  }
  const res = await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}`);
  if (!res.ok) throw new Error('Failed to fetch loan');
  return res.json();
}

// POST /api/admin/lending/loans
export async function createLoan(
  data: Omit<Loan, 'id' | 'outstandingBalance' | 'monthlyPayment' | 'totalPayable' | 'createdAt' | 'updatedAt'>
): Promise<Loan> {
  if (!API_BASE) {
    const { principalAmount, interestRate, termMonths } = data;
    const totalInterest = principalAmount * (interestRate / 100) * termMonths;
    const totalPayable = principalAmount + totalInterest;
    const monthlyPayment = totalPayable / termMonths;
    const loan: Loan = {
      ...data,
      id: `loan-${Date.now()}`,
      monthlyPayment,
      totalPayable,
      outstandingBalance: principalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_LOANS.unshift(loan);
    return Promise.resolve(loan);
  }
  const res = await fetch(`${API_BASE}/api/admin/lending/loans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create loan');
  return res.json();
}

// PATCH /api/admin/lending/loans/:id/approve
export async function approveLoan(loanId: string): Promise<void> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (loan) {
      loan.status = 'active';
      loan.approvedAt = new Date().toISOString();
      loan.disbursedAt = new Date().toISOString();
      loan.disbursedAmount = loan.principalAmount - loan.processingFee;
      loan.updatedAt = new Date().toISOString();
    }
    return Promise.resolve();
  }
  await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/approve`, { method: 'PATCH' });
}

// PATCH /api/admin/lending/loans/:id/reject
export async function rejectLoan(loanId: string, reason: string): Promise<void> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (loan) { loan.status = 'rejected'; loan.updatedAt = new Date().toISOString(); }
    return Promise.resolve();
  }
  await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

// PATCH /api/admin/lending/loans/:id/overdue
export async function markOverdue(loanId: string): Promise<void> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (loan) { loan.status = 'overdue'; loan.updatedAt = new Date().toISOString(); }
    return Promise.resolve();
  }
  await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/overdue`, { method: 'PATCH' });
}

// PATCH /api/admin/lending/loans/:id/write-off
export async function writeOffLoan(loanId: string, reason: string): Promise<void> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (loan) { loan.status = 'written_off'; loan.updatedAt = new Date().toISOString(); }
    return Promise.resolve();
  }
  await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/write-off`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

// POST /api/admin/lending/loans/:id/payments
export async function recordPayment(
  loanId: string,
  data: Omit<LoanPayment, 'id' | 'borrowerId' | 'borrowerName'>
): Promise<LoanPayment> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (!loan) throw new Error('Loan not found');
    const payment: LoanPayment = {
      ...data,
      id: `pay-${Date.now()}`,
      loanId,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
    };
    MOCK_PAYMENTS.unshift(payment);
    loan.outstandingBalance = Math.max(0, loan.outstandingBalance - data.principalPortion);
    loan.updatedAt = new Date().toISOString();
    if (loan.outstandingBalance === 0) loan.status = 'settled';
    else if (loan.status === 'overdue') loan.status = 'active';
    return Promise.resolve(payment);
  }
  const res = await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
}

// GET /api/admin/lending/loans/:id/payments
export async function getPaymentHistory(loanId: string): Promise<LoanPayment[]> {
  if (!API_BASE) {
    return Promise.resolve(MOCK_PAYMENTS.filter((p) => p.loanId === loanId));
  }
  const res = await fetch(`${API_BASE}/api/admin/lending/loans/${loanId}/payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

// GET /api/admin/lending/payments
export async function getAllPayments(filters?: {
  loanId?: string;
  borrowerId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<LoanPayment[]> {
  if (!API_BASE) {
    let result = [...MOCK_PAYMENTS];
    if (filters?.loanId) result = result.filter((p) => p.loanId === filters.loanId);
    if (filters?.borrowerId) result = result.filter((p) => p.borrowerId === filters.borrowerId);
    return Promise.resolve(result);
  }
  const params = new URLSearchParams();
  if (filters?.loanId) params.set('loanId', filters.loanId);
  const res = await fetch(`${API_BASE}/api/admin/lending/payments?${params}`);
  if (!res.ok) throw new Error('Failed to fetch all payments');
  return res.json();
}

// GET /api/lending/borrower/:id/loans
export async function getBorrowerLoans(borrowerId: string): Promise<Loan[]> {
  if (!API_BASE) {
    return Promise.resolve(MOCK_LOANS.filter((l) => l.borrowerId === borrowerId));
  }
  const res = await fetch(`${API_BASE}/api/lending/borrower/${borrowerId}/loans`);
  if (!res.ok) throw new Error('Failed to fetch borrower loans');
  return res.json();
}

// GET /api/lending/loans/:id/schedule
export async function getRepaymentSchedule(loanId: string): Promise<RepaymentSchedule> {
  if (!API_BASE) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId);
    if (!loan) throw new Error('Loan not found');
    const payments = MOCK_PAYMENTS.filter((p) => p.loanId === loanId);
    const baseSchedule = generateSchedule(loan);

    // Overlay payment status onto schedule
    const enriched: ScheduleEntry[] = baseSchedule.map((entry, idx) => {
      const payment = payments[idx];
      if (payment) {
        return {
          ...entry,
          status: 'paid',
          paidAmount: payment.amount,
          paidAt: payment.paidAt,
        };
      }
      const isPast = new Date(entry.dueDate) < new Date();
      return {
        ...entry,
        status: isPast && loan.status === 'overdue' ? 'overdue' : 'upcoming',
      };
    });

    return Promise.resolve({ loanId, schedules: enriched });
  }
  const res = await fetch(`${API_BASE}/api/lending/loans/${loanId}/schedule`);
  if (!res.ok) throw new Error('Failed to fetch repayment schedule');
  return res.json();
}

// GET /api/admin/lending/summary
export async function getLendingSummary(): Promise<LendingSummary> {
  if (!API_BASE) {
    return Promise.resolve({ ...MOCK_SUMMARY });
  }
  const res = await fetch(`${API_BASE}/api/admin/lending/summary`);
  if (!res.ok) throw new Error('Failed to fetch lending summary');
  return res.json();
}

// POST /api/lending/loan-requests
export async function requestLoan(data: {
  borrowerId: string;
  requestedAmount: number;
  purpose: string;
  termMonths: number;
}): Promise<void> {
  if (!API_BASE) {
    return Promise.resolve();
  }
  await fetch(`${API_BASE}/api/lending/loan-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
