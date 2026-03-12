/**
 * Referral Tree Service — Kelsey's Homestay Agent Hub
 *
 * When NEXT_PUBLIC_API_URL is not set, returns frontend-only mock data.
 * When set, calls backend API.
 */

import type { ReferralNode, ReferralStats, PendingRegistration } from '@/types/referralTree';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const now = Date.now();
const d = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

/** Full referral tree rooted at agent-001 (Juan Dela Cruz) */
const MOCK_TREE: ReferralNode = {
  agentId: 'agent-001',
  agentName: 'Juan Dela Cruz',
  email: 'juan@example.com',
  referralCode: 'JUAN2025',
  level: 0,
  status: 'active',
  joinedAt: d(365),
  totalCommissionsEarned: 18940,
  totalBookings: 24,
  children: [
    {
      agentId: 'agent-002',
      agentName: 'Maria Santos',
      email: 'maria.santos@example.com',
      referralCode: 'MARIA2025',
      level: 1,
      status: 'active',
      joinedAt: d(200),
      totalCommissionsEarned: 5420,
      totalBookings: 11,
      children: [
        {
          agentId: 'agent-005',
          agentName: 'Ana Reyes',
          email: 'ana.reyes@example.com',
          referralCode: 'ANA2025',
          level: 2,
          status: 'active',
          joinedAt: d(90),
          totalCommissionsEarned: 1240,
          totalBookings: 4,
          children: [],
        },
        {
          agentId: 'agent-006',
          agentName: 'Luz Marasigan',
          email: 'luz.marasigan@example.com',
          referralCode: 'LUZ2025',
          level: 2,
          status: 'inactive',
          joinedAt: d(75),
          totalCommissionsEarned: 380,
          totalBookings: 1,
          children: [],
        },
      ],
    },
    {
      agentId: 'agent-003',
      agentName: 'Roberto Cruz',
      email: 'roberto.cruz@example.com',
      referralCode: 'ROBERTO2025',
      level: 1,
      status: 'active',
      joinedAt: d(180),
      totalCommissionsEarned: 3870,
      totalBookings: 8,
      children: [
        {
          agentId: 'agent-007',
          agentName: 'Carlos Tan',
          email: 'carlos.tan@example.com',
          referralCode: 'CARLOS2025',
          level: 2,
          status: 'active',
          joinedAt: d(60),
          totalCommissionsEarned: 890,
          totalBookings: 3,
          children: [
            {
              agentId: 'agent-009',
              agentName: 'Miguel Santos',
              email: 'miguel.santos@example.com',
              referralCode: 'MIGUEL2025',
              level: 3,
              status: 'active',
              joinedAt: d(15),
              totalCommissionsEarned: 150,
              totalBookings: 1,
              children: [],
            },
          ],
        },
      ],
    },
    {
      agentId: 'agent-004',
      agentName: 'Pedro Flores',
      email: 'pedro.flores@example.com',
      referralCode: 'PEDRO2025',
      level: 1,
      status: 'active',
      joinedAt: d(120),
      totalCommissionsEarned: 2180,
      totalBookings: 6,
      children: [
        {
          agentId: 'agent-008',
          agentName: 'Grace Villanueva',
          email: 'grace.villanueva@example.com',
          referralCode: 'GRACE2025',
          level: 2,
          status: 'active',
          joinedAt: d(45),
          totalCommissionsEarned: 640,
          totalBookings: 2,
          children: [],
        },
      ],
    },
  ],
};

/** Mock proof-of-payment image URLs for paid registrations (placeholder; real app would use uploaded receipt images) */
const MOCK_PROOF_URL = 'https://picsum.photos/600/400?random=receipt';

const MOCK_PENDING_REGISTRATIONS: PendingRegistration[] = [
  { id: 'reg-001', fullname: 'Diana Luna', email: 'diana.luna@example.com', contactNumber: '+63 917 555 1234', recruitedById: 'agent-001', recruitedByName: 'Juan Dela Cruz', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(2), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-002', fullname: 'Kevin Uy', email: 'kevin.uy@example.com', contactNumber: '+63 928 555 5678', registrationFeeStatus: 'unpaid', status: 'pending', appliedAt: d(1) },
  { id: 'reg-003', fullname: 'Rosa Bautista', email: 'rosa.bautista@example.com', contactNumber: '+63 939 555 9012', recruitedById: 'agent-002', recruitedByName: 'Maria Santos', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(4), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-004', fullname: 'Eduardo Lim', email: 'eduardo.lim@example.com', contactNumber: '+63 905 555 2345', recruitedById: 'agent-001', recruitedByName: 'Juan Dela Cruz', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(3), notes: 'Referred from Facebook group.', proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-005', fullname: 'Liza Morales', email: 'liza.morales@example.com', contactNumber: '+63 918 555 6789', registrationFeeStatus: 'unpaid', status: 'pending', appliedAt: d(1) },
  { id: 'reg-006', fullname: 'Francisco Reyes', email: 'francisco.reyes@example.com', contactNumber: '+63 919 555 3456', recruitedById: 'agent-003', recruitedByName: 'Roberto Cruz', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(5), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-007', fullname: 'Tina Villar', email: 'tina.villar@example.com', contactNumber: '+63 920 555 4567', registrationFeeStatus: 'paid', status: 'rejected', appliedAt: d(6), notes: 'Duplicate application.', proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-008', fullname: 'Hector Dizon', email: 'hector.dizon@example.com', contactNumber: '+63 921 555 5678', recruitedById: 'agent-002', recruitedByName: 'Maria Santos', registrationFeeStatus: 'unpaid', status: 'pending', appliedAt: d(0) },
  { id: 'reg-009', fullname: 'Nina Castillo', email: 'nina.castillo@example.com', contactNumber: '+63 922 555 6789', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(2), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-010', fullname: 'Oscar Navarro', email: 'oscar.navarro@example.com', contactNumber: '+63 923 555 7890', recruitedById: 'agent-004', recruitedByName: 'Pedro Flores', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(7), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-011', fullname: 'Paula Chua', email: 'paula.chua@example.com', contactNumber: '+63 924 555 8901', registrationFeeStatus: 'unpaid', status: 'rejected', appliedAt: d(8) },
  { id: 'reg-012', fullname: 'Quinn Tan', email: 'quinn.tan@example.com', contactNumber: '+63 925 555 9012', recruitedById: 'agent-001', recruitedByName: 'Juan Dela Cruz', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(1), notes: 'Previous cleaner, wants to try agent side.', proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-013', fullname: 'Rita Ong', email: 'rita.ong@example.com', contactNumber: '+63 926 555 0123', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(9), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-014', fullname: 'Sergio Ramos', email: 'sergio.ramos@example.com', contactNumber: '+63 927 555 1234', recruitedById: 'agent-003', recruitedByName: 'Roberto Cruz', registrationFeeStatus: 'unpaid', status: 'pending', appliedAt: d(0) },
  { id: 'reg-015', fullname: 'Uma Santos', email: 'uma.santos@example.com', contactNumber: '+63 928 555 2345', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(10), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-016', fullname: 'Vicente Torres', email: 'vicente.torres@example.com', contactNumber: '+63 929 555 3456', registrationFeeStatus: 'paid', status: 'rejected', appliedAt: d(11), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-017', fullname: 'Wendy Lim', email: 'wendy.lim@example.com', contactNumber: '+63 930 555 4567', recruitedById: 'agent-002', recruitedByName: 'Maria Santos', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(2), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-018', fullname: 'Xavier Yu', email: 'xavier.yu@example.com', contactNumber: '+63 931 555 5678', registrationFeeStatus: 'unpaid', status: 'pending', appliedAt: d(1) },
  { id: 'reg-019', fullname: 'Yolanda Cruz', email: 'yolanda.cruz@example.com', contactNumber: '+63 932 555 6789', recruitedById: 'agent-004', recruitedByName: 'Pedro Flores', registrationFeeStatus: 'paid', status: 'approved', appliedAt: d(12), proofOfPaymentUrl: MOCK_PROOF_URL },
  { id: 'reg-020', fullname: 'Zachary Bautista', email: 'zachary.bautista@example.com', contactNumber: '+63 933 555 7890', registrationFeeStatus: 'paid', status: 'pending', appliedAt: d(0), proofOfPaymentUrl: MOCK_PROOF_URL },
];

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getReferralTree(agentId: string): Promise<ReferralNode> {
  if (!API_BASE) return { ...MOCK_TREE, agentId };
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/referral-tree`);
  if (!res.ok) throw new Error('Failed to fetch referral tree');
  return res.json();
}

export async function getReferralStats(agentId: string): Promise<ReferralStats> {
  if (!API_BASE) {
    const flatten = (node: ReferralNode): ReferralNode[] => [node, ...node.children.flatMap(flatten)];
    const all = flatten(MOCK_TREE).filter((n) => n.agentId !== agentId);
    return {
      totalSubAgents: all.length,
      activeSubAgents: all.filter((n) => n.status === 'active').length,
      totalNetworkCommissions: all.reduce((sum, n) => sum + n.totalCommissionsEarned, 0),
      networkBookings: all.reduce((sum, n) => sum + n.totalBookings, 0),
    };
  }
  const res = await fetch(`${API_BASE}/api/agents/${agentId}/referral-stats`);
  if (!res.ok) throw new Error('Failed to fetch referral stats');
  return res.json();
}

export async function getPendingRegistrations(): Promise<PendingRegistration[]> {
  if (!API_BASE) return [...MOCK_PENDING_REGISTRATIONS];
  const res = await fetch(`${API_BASE}/api/admin/registrations/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending registrations');
  return res.json();
}

export async function approveRegistration(registrationId: string): Promise<void> {
  if (!API_BASE) return;
  const res = await fetch(`${API_BASE}/api/admin/registrations/${registrationId}/approve`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to approve registration');
}

export async function rejectRegistration(registrationId: string, reason: string): Promise<void> {
  if (!API_BASE) return;
  const res = await fetch(`${API_BASE}/api/admin/registrations/${registrationId}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to reject registration');
}
