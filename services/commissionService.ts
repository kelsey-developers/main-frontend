/**
 * Commission Service — Kelsey's Homestay Agent Hub
 *
 * When NEXT_PUBLIC_API_URL is not set, returns frontend-only mock data.
 * When set, calls backend API.
 *
 * Commission formula: commissionAmount = totalBookingAmount × (commissionRate / 100)
 * where totalBookingAmount = baseAmount (room rate × nights) + extraCharges (extra heads, fees)
 */

import type { BookingCommission, CommissionWallet, CommissionStatus } from '@/types/commission';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const now = Date.now();
const d = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

// Referral level semantics (from Juan's perspective as the logged-in agent):
//   referralLevel 1 → Juan's own referral code used (Direct booking)         → 10% commission, no referralAgentName
//   referralLevel 2 → Juan's direct sub-agent's code used (L1 referral)      → 5% commission,  referralAgentName = sub-agent
//   referralLevel 3 → Sub-agent's sub-agent code used (L2 referral)          → 2% commission,  referralAgentName = deeper agent
//
// Referral tree for mock data:
//   Juan (agent-001, JUAN2025)
//     ├── Maria Santos  (agent-002, MARIA2025)   ← L2 in tree = L1 referral for Juan
//     │     ├── Ana Reyes       (agent-005, ANA2025)    ← L3 in tree = L2 referral for Juan
//     │     └── Luz Marasigan   (agent-006, LUZ2025)    ← L3 in tree = L2 referral for Juan
//     ├── Roberto Cruz  (agent-003, ROBERTO2025) ← L2 in tree = L1 referral for Juan
//     │     └── Carlos Tan      (agent-007, CARLOS2025) ← L3 in tree = L2 referral for Juan
//     └── Pedro Flores  (agent-004, PEDRO2025)   ← L2 in tree = L1 referral for Juan
//           └── Grace Villanueva(agent-008, GRACE2025)  ← L3 in tree = L2 referral for Juan

const MOCK_COMMISSIONS: BookingCommission[] = [
  // ── Direct bookings (Juan's own code, referralLevel: 1) ─────────────────
  {
    id: 'com-001', bookingId: 'bk-001', bookingRef: 'BK-1024',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '1', propertyName: 'Luxury Beachfront Villa',
    guestName: 'Jasmine Aquino', checkIn: d(2), checkOut: d(0),
    numberOfNights: 3, numberOfGuests: 4,
    baseAmount: 25500, extraCharges: 1500, totalBookingAmount: 27000,
    commissionRate: 10, commissionAmount: 2700,
    referralLevel: 1, status: 'available', createdAt: d(2), approvedAt: d(1),
  },
  {
    id: 'com-002', bookingId: 'bk-002', bookingRef: 'BK-1023',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '3', propertyName: 'Cozy Mountain Retreat',
    guestName: 'Bernard Reyes', checkIn: d(5), checkOut: d(3),
    numberOfNights: 2, numberOfGuests: 2,
    baseAmount: 8400, extraCharges: 0, totalBookingAmount: 8400,
    commissionRate: 10, commissionAmount: 840,
    referralLevel: 1, status: 'approved', createdAt: d(5), approvedAt: d(4),
  },
  {
    id: 'com-003', bookingId: 'bk-003', bookingRef: 'BK-1022',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '2', propertyName: 'Modern City Condo',
    guestName: 'Claire Villanueva', checkIn: d(8), checkOut: d(6),
    numberOfNights: 2, numberOfGuests: 1,
    baseAmount: 7000, extraCharges: 500, totalBookingAmount: 7500,
    commissionRate: 10, commissionAmount: 750,
    referralLevel: 1, status: 'pending', createdAt: d(8),
  },
  {
    id: 'com-004', bookingId: 'bk-004', bookingRef: 'BK-1021',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '4', propertyName: 'Seaside Bungalow',
    guestName: 'Dennis Tan', checkIn: d(12), checkOut: d(9),
    numberOfNights: 3, numberOfGuests: 5,
    baseAmount: 17400, extraCharges: 2500, totalBookingAmount: 19900,
    commissionRate: 10, commissionAmount: 1990,
    referralLevel: 1, status: 'paid', createdAt: d(12), approvedAt: d(11), paidAt: d(10),
  },
  {
    id: 'com-005', bookingId: 'bk-005', bookingRef: 'BK-1020',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '1', propertyName: 'Luxury Beachfront Villa',
    guestName: 'Elena Flores', checkIn: d(15), checkOut: d(12),
    numberOfNights: 3, numberOfGuests: 6,
    baseAmount: 25500, extraCharges: 3000, totalBookingAmount: 28500,
    commissionRate: 10, commissionAmount: 2850,
    referralLevel: 1, status: 'paid', createdAt: d(15), approvedAt: d(14), paidAt: d(13),
  },
  {
    id: 'com-006', bookingId: 'bk-006', bookingRef: 'BK-1019',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '6', propertyName: 'Lakeside Cabin',
    guestName: 'Francis Marasigan', checkIn: d(20), checkOut: d(18),
    numberOfNights: 2, numberOfGuests: 3,
    baseAmount: 9600, extraCharges: 600, totalBookingAmount: 10200,
    commissionRate: 10, commissionAmount: 1020,
    referralLevel: 1, status: 'paid', createdAt: d(20), approvedAt: d(19), paidAt: d(18),
  },
  {
    id: 'com-010', bookingId: 'bk-010', bookingRef: 'BK-1015',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '4', propertyName: 'Seaside Bungalow',
    guestName: 'Rosa Bautista', checkIn: d(40), checkOut: d(37),
    numberOfNights: 3, numberOfGuests: 3,
    baseAmount: 17400, extraCharges: 900, totalBookingAmount: 18300,
    commissionRate: 10, commissionAmount: 1830,
    referralLevel: 1, status: 'paid', createdAt: d(40), approvedAt: d(39), paidAt: d(38),
  },
  {
    id: 'com-011', bookingId: 'bk-011', bookingRef: 'BK-1014',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '1', propertyName: 'Luxury Beachfront Villa',
    guestName: 'Marco Santiago', checkIn: d(45), checkOut: d(42),
    numberOfNights: 3, numberOfGuests: 4,
    baseAmount: 25500, extraCharges: 1200, totalBookingAmount: 26700,
    commissionRate: 10, commissionAmount: 2670,
    referralLevel: 1, status: 'paid', createdAt: d(45), approvedAt: d(44), paidAt: d(43),
  },
  {
    id: 'com-012', bookingId: 'bk-012', bookingRef: 'BK-1013',
    agentId: 'agent-001', referralCode: 'JUAN2025',
    propertyId: '6', propertyName: 'Lakeside Cabin',
    guestName: 'Teresa Gomez', checkIn: d(50), checkOut: d(48),
    numberOfNights: 2, numberOfGuests: 2,
    baseAmount: 9600, extraCharges: 300, totalBookingAmount: 9900,
    commissionRate: 10, commissionAmount: 990,
    referralLevel: 1, status: 'available', createdAt: d(50), approvedAt: d(49),
  },

  // ── L1 Referral earnings (Juan's direct sub-agents' bookings, referralLevel: 2) ──
  // Booking made with Maria Santos' code → Juan earns 5%
  {
    id: 'com-007', bookingId: 'bk-007', bookingRef: 'BK-1018',
    agentId: 'agent-001', referralCode: 'MARIA2025',
    propertyId: '5', propertyName: 'Heritage House Stay',
    guestName: 'Pedro Cruz', checkIn: d(25), checkOut: d(22),
    numberOfNights: 3, numberOfGuests: 4,
    baseAmount: 9600, extraCharges: 800, totalBookingAmount: 10400,
    commissionRate: 5, commissionAmount: 520,
    referralLevel: 2, referralAgentId: 'agent-002', referralAgentName: 'Maria Santos',
    status: 'approved', createdAt: d(25), approvedAt: d(24),
  },
  // Booking made with Roberto Cruz's code → Juan earns 5%
  {
    id: 'com-008', bookingId: 'bk-008', bookingRef: 'BK-1017',
    agentId: 'agent-001', referralCode: 'ROBERTO2025',
    propertyId: '3', propertyName: 'Cozy Mountain Retreat',
    guestName: 'Diana Luna', checkIn: d(30), checkOut: d(28),
    numberOfNights: 2, numberOfGuests: 2,
    baseAmount: 8400, extraCharges: 0, totalBookingAmount: 8400,
    commissionRate: 5, commissionAmount: 420,
    referralLevel: 2, referralAgentId: 'agent-003', referralAgentName: 'Roberto Cruz',
    status: 'paid', createdAt: d(30), approvedAt: d(29), paidAt: d(28),
  },
  // Booking made with Pedro Flores' code → Juan earns 5%
  {
    id: 'com-013', bookingId: 'bk-013', bookingRef: 'BK-1012',
    agentId: 'agent-001', referralCode: 'PEDRO2025',
    propertyId: '2', propertyName: 'Modern City Condo',
    guestName: 'Noel Jimenez', checkIn: d(22), checkOut: d(21),
    numberOfNights: 1, numberOfGuests: 2,
    baseAmount: 3500, extraCharges: 300, totalBookingAmount: 3800,
    commissionRate: 5, commissionAmount: 190,
    referralLevel: 2, referralAgentId: 'agent-004', referralAgentName: 'Pedro Flores',
    status: 'pending', createdAt: d(22),
  },
  // Booking made with Maria Santos' code → Juan earns 5%
  {
    id: 'com-015', bookingId: 'bk-015', bookingRef: 'BK-1010',
    agentId: 'agent-001', referralCode: 'MARIA2025',
    propertyId: '4', propertyName: 'Seaside Bungalow',
    guestName: 'Vivian Ocampo', checkIn: d(55), checkOut: d(52),
    numberOfNights: 3, numberOfGuests: 3,
    baseAmount: 17400, extraCharges: 600, totalBookingAmount: 18000,
    commissionRate: 5, commissionAmount: 900,
    referralLevel: 2, referralAgentId: 'agent-002', referralAgentName: 'Maria Santos',
    status: 'paid', createdAt: d(55), approvedAt: d(54), paidAt: d(53),
  },

  // ── L2 Referral earnings (sub-agents of sub-agents, referralLevel: 3) ───
  // Booking made with Ana Reyes' code (under Maria) → Juan earns 2%
  {
    id: 'com-009', bookingId: 'bk-009', bookingRef: 'BK-1016',
    agentId: 'agent-001', referralCode: 'ANA2025',
    propertyId: '2', propertyName: 'Modern City Condo',
    guestName: 'Kevin Uy', checkIn: d(35), checkOut: d(34),
    numberOfNights: 1, numberOfGuests: 2,
    baseAmount: 3500, extraCharges: 200, totalBookingAmount: 3700,
    commissionRate: 2, commissionAmount: 74,
    referralLevel: 3, referralAgentId: 'agent-005', referralAgentName: 'Ana Reyes',
    status: 'pending', createdAt: d(35),
  },
  // Booking made with Carlos Tan's code (under Roberto) → Juan earns 2%
  {
    id: 'com-014', bookingId: 'bk-014', bookingRef: 'BK-1011',
    agentId: 'agent-001', referralCode: 'CARLOS2025',
    propertyId: '5', propertyName: 'Heritage House Stay',
    guestName: 'Irene Castillo', checkIn: d(18), checkOut: d(17),
    numberOfNights: 1, numberOfGuests: 1,
    baseAmount: 3200, extraCharges: 0, totalBookingAmount: 3200,
    commissionRate: 2, commissionAmount: 64,
    referralLevel: 3, referralAgentId: 'agent-007', referralAgentName: 'Carlos Tan',
    status: 'approved', createdAt: d(18), approvedAt: d(17),
  },
];

const MOCK_WALLET: CommissionWallet = {
  agentId: 'agent-001',
  // pending:   com-003 (750) + com-009 (74) + com-013 (190) = 1014
  pending: 1014,
  // approved:  com-002 (840) + com-007 (520) + com-014 (64) = 1424
  approved: 1424,
  // available: com-001 (2700) + com-012 (990) = 3690
  available: 3690,
  // paid:      com-004 (1990) + com-005 (2850) + com-006 (1020) + com-008 (420)
  //          + com-010 (1830) + com-011 (2670) + com-015 (900) = 11680
  paid: 11680,
  updatedAt: new Date().toISOString(),
};

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getCommissionWallet(agentId: string): Promise<CommissionWallet> {
  if (!API_BASE) return { ...MOCK_WALLET, agentId };
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/commission/wallet`);
  if (!res.ok) throw new Error('Failed to fetch commission wallet');
  return res.json();
}

export async function getBookingCommissions(
  agentId: string,
  filters?: { status?: CommissionStatus; from?: string; to?: string }
): Promise<BookingCommission[]> {
  if (!API_BASE) {
    let data = MOCK_COMMISSIONS.filter((c) => c.agentId === agentId);
    if (filters?.status) data = data.filter((c) => c.status === filters.status);
    return [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const params = new URLSearchParams({ agentId, ...filters });
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/commissions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch commissions');
  return res.json();
}

export async function approveCommission(commissionId: string): Promise<BookingCommission> {
  if (!API_BASE) {
    const item = MOCK_COMMISSIONS.find((c) => c.id === commissionId);
    if (!item) throw new Error('Commission not found');
    return { ...item, status: 'approved', approvedAt: new Date().toISOString() };
  }
  const res = await fetch(`${API_BASE}/api/admin/commissions/${commissionId}/approve`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to approve commission');
  return res.json();
}

export async function rejectCommission(commissionId: string, reason: string): Promise<BookingCommission> {
  if (!API_BASE) {
    const item = MOCK_COMMISSIONS.find((c) => c.id === commissionId);
    if (!item) throw new Error('Commission not found');
    return { ...item, status: 'pending' };
  }
  const res = await fetch(`${API_BASE}/api/admin/commissions/${commissionId}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to reject commission');
  return res.json();
}

/** Get all commissions for admin ledger view (all agents) */
export async function getAllCommissions(filters?: {
  status?: CommissionStatus;
  agentId?: string;
  from?: string;
  to?: string;
}): Promise<BookingCommission[]> {
  if (!API_BASE) {
    let data = [...MOCK_COMMISSIONS];
    if (filters?.status) data = data.filter((c) => c.status === filters.status);
    if (filters?.agentId) data = data.filter((c) => c.agentId === filters.agentId);
    return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const params = new URLSearchParams(filters as Record<string, string>);
  const res = await fetch(`${API_BASE}/api/admin/commissions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch all commissions');
  return res.json();
}
