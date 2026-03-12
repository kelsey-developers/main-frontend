/**
 * Cleaning Services — Service Layer
 * Kelsey's Homestay IIMS
 *
 * Pattern: if (!API_BASE) return MOCK_DATA else fetch(API_BASE + endpoint)
 * Set NEXT_PUBLIC_API_URL to enable real API; unset = mock mode.
 */

import type {
  CleaningJob,
  Cleaner,
  CleaningChecklistItem,
  CleaningReport,
  CleanerPerformance,
} from '@/types/cleaning';
import { makeChecklist } from '@/types/cleaning';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Mock cleaners ──────────────────────────────────────────────────────────────

const MOCK_CLEANERS: Cleaner[] = [
  {
    id: 'cleaner-001',
    name: 'Maria Concepcion',
    email: 'maria.c@kelseyshomestay.com',
    phone: '+63 912 345 6789',
    status: 'available',
    assignedProperties: ['prop-001', 'prop-002'],
    totalJobsCompleted: 142,
    averageRating: 4.9,
    joinedAt: '2024-01-15',
  },
  {
    id: 'cleaner-002',
    name: 'Rowena Buenaflor',
    email: 'rowena.b@kelseyshomestay.com',
    phone: '+63 917 890 1234',
    status: 'busy',
    assignedProperties: ['prop-001', 'prop-003'],
    totalJobsCompleted: 98,
    averageRating: 4.7,
    joinedAt: '2024-03-10',
  },
  {
    id: 'cleaner-003',
    name: 'Dolores Mangahas',
    email: 'dolores.m@kelseyshomestay.com',
    phone: '+63 918 234 5678',
    status: 'available',
    assignedProperties: ['prop-002', 'prop-003'],
    totalJobsCompleted: 76,
    averageRating: 4.6,
    joinedAt: '2024-06-01',
  },
  {
    id: 'cleaner-004',
    name: 'Josephine Ramos',
    email: 'josephine.r@kelseyshomestay.com',
    phone: '+63 919 876 5432',
    status: 'off_duty',
    assignedProperties: ['prop-001'],
    totalJobsCompleted: 55,
    averageRating: 4.5,
    joinedAt: '2024-08-20',
  },
  {
    id: 'cleaner-005',
    name: 'Teresita Villanueva',
    email: 'teresita.v@kelseyshomestay.com',
    phone: '+63 920 111 2233',
    status: 'inactive',
    assignedProperties: [],
    totalJobsCompleted: 23,
    averageRating: 4.2,
    joinedAt: '2025-01-05',
  },
];

// ─── Helper to build a checklist with some items pre-checked ───────────────────

function partialChecklist(checkedCount: number): CleaningChecklistItem[] {
  const list = makeChecklist();
  for (let i = 0; i < Math.min(checkedCount, list.length); i++) {
    list[i].isChecked = true;
    list[i].checkedAt = new Date(Date.now() - (list.length - i) * 60000).toISOString();
  }
  return list;
}

// ─── Mock jobs: 20 records covering all statuses ───────────────────────────────

const TODAY = '2026-03-10';
const YESTERDAY = '2026-03-09';
const TOMORROW = '2026-03-11';
const TWO_DAYS = '2026-03-12';
const LAST_WEEK = '2026-03-03';
const LAST_WEEK2 = '2026-03-05';

const MOCK_JOBS: CleaningJob[] = [
  // ── SCHEDULED (5) ──────────────────────────────────────────────────────────
  {
    id: 'job-001',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-2b',
    unitName: 'Unit 2B',
    guestName: 'John S.',
    guestCount: 4,
    entryCode: '1234',
    dueByTime: '16:00',
    jobType: 'checkout',
    status: 'scheduled',
    scheduledDate: TODAY,
    scheduledTime: '11:00',
    estimatedDuration: 120,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    notes: 'Guest checked out this morning. Pay extra attention to bathroom and kitchen.',
    checklistItems: makeChecklist(),
    linkedBookingId: 'BKG-2026-0310-001',
    createdAt: `${TODAY}T07:00:00.000Z`,
    updatedAt: `${TODAY}T07:00:00.000Z`,
  },
  {
    id: 'job-002',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-3a',
    unitName: 'Unit 3A',
    guestName: 'Sarah M.',
    guestCount: 2,
    entryCode: '5678',
    jobType: 'checkin_prep',
    status: 'scheduled',
    scheduledDate: TODAY,
    scheduledTime: '13:00',
    estimatedDuration: 90,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    notes: 'New guests arrive at 3pm. Ensure fresh linens and fully stocked toiletries.',
    checklistItems: makeChecklist(),
    linkedBookingId: 'BKG-2026-0310-002',
    createdAt: `${TODAY}T07:00:00.000Z`,
    updatedAt: `${TODAY}T07:00:00.000Z`,
  },
  {
    id: 'job-003',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitName: 'Suite 1',
    guestName: 'Alex T.',
    guestCount: 1,
    entryCode: '9012',
    jobType: 'routine',
    status: 'scheduled',
    scheduledDate: TODAY,
    scheduledTime: '09:00',
    estimatedDuration: 60,
    assignedCleanerId: 'cleaner-003',
    assignedCleanerName: 'Dolores Mangahas',
    requestedBy: 'Admin',
    checklistItems: makeChecklist(),
    createdAt: `${TODAY}T06:00:00.000Z`,
    updatedAt: `${TODAY}T06:00:00.000Z`,
  },
  {
    id: 'job-004',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-101',
    unitName: 'Room 101',
    guestName: 'Vacant',
    guestCount: 0,
    entryCode: '3456',
    jobType: 'deep_clean',
    status: 'scheduled',
    scheduledDate: TOMORROW,
    scheduledTime: '08:00',
    estimatedDuration: 180,
    assignedCleanerId: 'cleaner-002',
    assignedCleanerName: 'Rowena Buenaflor',
    requestedBy: 'Admin',
    notes: 'Quarterly deep clean — all areas including behind furniture.',
    checklistItems: makeChecklist(),
    createdAt: `${TODAY}T08:00:00.000Z`,
    updatedAt: `${TODAY}T08:00:00.000Z`,
  },
  {
    id: 'job-005',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-4c',
    unitName: 'Unit 4C',
    guestName: 'Inspection',
    guestCount: 0,
    entryCode: '7890',
    jobType: 'inspection',
    status: 'scheduled',
    scheduledDate: TWO_DAYS,
    scheduledTime: '14:00',
    estimatedDuration: 45,
    requestedBy: 'Admin',
    notes: 'Admin QA walkthrough before long-stay guest arrival.',
    checklistItems: makeChecklist(),
    createdAt: `${TODAY}T09:00:00.000Z`,
    updatedAt: `${TODAY}T09:00:00.000Z`,
  },

  // ── IN PROGRESS (3) ────────────────────────────────────────────────────────
  {
    id: 'job-006',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitId: 'unit-b2',
    unitName: 'Bungalow 2',
    guestName: 'Patricia L.',
    guestCount: 3,
    entryCode: '2468',
    jobType: 'checkout',
    status: 'in_progress',
    scheduledDate: TODAY,
    scheduledTime: '08:00',
    estimatedDuration: 120,
    assignedCleanerId: 'cleaner-002',
    assignedCleanerName: 'Rowena Buenaflor',
    requestedBy: 'Admin',
    notes: 'Long-stay checkout — expect heavy load.',
    checklistItems: partialChecklist(8),
    linkedBookingId: 'BKG-2026-0310-003',
    createdAt: `${YESTERDAY}T18:00:00.000Z`,
    updatedAt: `${TODAY}T08:15:00.000Z`,
  },
  {
    id: 'job-007',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-205',
    unitName: 'Room 205',
    guestName: 'Jordan K.',
    guestCount: 2,
    entryCode: '2050',
    dueByTime: '12:15',
    jobType: 'adhoc',
    status: 'in_progress',
    scheduledDate: TODAY,
    scheduledTime: '11:00',
    estimatedDuration: 75,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Juan Dela Cruz',
    notes: 'Guest requested mid-stay room refresh.',
    checklistItems: partialChecklist(5),
    createdAt: `${TODAY}T10:30:00.000Z`,
    updatedAt: `${TODAY}T11:05:00.000Z`,
  },
  {
    id: 'job-008',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-1a',
    unitName: 'Unit 1A',
    guestName: 'Urgent',
    guestCount: 0,
    entryCode: '1122',
    jobType: 'emergency',
    status: 'in_progress',
    scheduledDate: TODAY,
    scheduledTime: '09:30',
    estimatedDuration: 60,
    assignedCleanerId: 'cleaner-003',
    assignedCleanerName: 'Dolores Mangahas',
    requestedBy: 'Admin',
    notes: '⚡ Water leak reported — clean up and sanitize affected area.',
    checklistItems: partialChecklist(3),
    createdAt: `${TODAY}T09:00:00.000Z`,
    updatedAt: `${TODAY}T09:35:00.000Z`,
  },

  // ── COMPLETED (5) ──────────────────────────────────────────────────────────
  {
    id: 'job-009',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-2a',
    unitName: 'Unit 2A',
    guestName: 'Morgan R.',
    guestCount: 2,
    entryCode: '3344',
    jobType: 'checkout',
    status: 'completed',
    scheduledDate: YESTERDAY,
    scheduledTime: '10:00',
    estimatedDuration: 120,
    actualDuration: 105,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    completionNotes: 'All areas cleaned thoroughly. Guest left the unit in good condition.',
    photoUrls: ['https://placehold.co/400x300?text=Photo+1', 'https://placehold.co/400x300?text=Photo+2'],
    checklistItems: partialChecklist(20),
    linkedBookingId: 'BKG-2026-0309-001',
    createdAt: `${YESTERDAY}T08:00:00.000Z`,
    updatedAt: `${YESTERDAY}T12:45:00.000Z`,
  },
  {
    id: 'job-010',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitName: 'Suite 2',
    guestName: 'Casey W.',
    guestCount: 4,
    entryCode: '5566',
    jobType: 'routine',
    status: 'completed',
    scheduledDate: YESTERDAY,
    scheduledTime: '14:00',
    estimatedDuration: 60,
    actualDuration: 65,
    assignedCleanerId: 'cleaner-003',
    assignedCleanerName: 'Dolores Mangahas',
    requestedBy: 'Admin',
    completionNotes: 'Routine maintenance complete. Found a broken door handle — reported to admin.',
    checklistItems: partialChecklist(20),
    createdAt: `${YESTERDAY}T13:00:00.000Z`,
    updatedAt: `${YESTERDAY}T15:05:00.000Z`,
  },
  {
    id: 'job-011',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-301',
    unitName: 'Room 301',
    guestName: 'Incoming VIP',
    guestCount: 2,
    entryCode: '3010',
    jobType: 'checkin_prep',
    status: 'completed',
    scheduledDate: YESTERDAY,
    scheduledTime: '16:00',
    estimatedDuration: 90,
    actualDuration: 88,
    assignedCleanerId: 'cleaner-002',
    assignedCleanerName: 'Rowena Buenaflor',
    requestedBy: 'Admin',
    completionNotes: 'Room fully prepped for incoming VIP guests.',
    photoUrls: ['https://placehold.co/400x300?text=Bedroom', 'https://placehold.co/400x300?text=Bathroom', 'https://placehold.co/400x300?text=Living'],
    checklistItems: partialChecklist(20),
    linkedBookingId: 'BKG-2026-0310-004',
    createdAt: `${YESTERDAY}T15:00:00.000Z`,
    updatedAt: `${YESTERDAY}T17:28:00.000Z`,
  },
  {
    id: 'job-012',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-3b',
    unitName: 'Unit 3B',
    guestName: 'Vacant',
    guestCount: 0,
    entryCode: '3B42',
    jobType: 'deep_clean',
    status: 'completed',
    scheduledDate: LAST_WEEK2,
    scheduledTime: '08:00',
    estimatedDuration: 180,
    actualDuration: 200,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    completionNotes: 'Deep clean done. Took a bit longer due to oven grease — all resolved.',
    photoUrls: ['https://placehold.co/400x300?text=Kitchen+Before', 'https://placehold.co/400x300?text=Kitchen+After'],
    checklistItems: partialChecklist(20),
    createdAt: `${LAST_WEEK2}T07:00:00.000Z`,
    updatedAt: `${LAST_WEEK2}T11:20:00.000Z`,
  },
  {
    id: 'job-013',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitName: 'Suite 3',
    guestName: 'Taylor M.',
    guestCount: 2,
    entryCode: 'SU3X',
    jobType: 'adhoc',
    status: 'completed',
    scheduledDate: LAST_WEEK2,
    scheduledTime: '15:00',
    estimatedDuration: 45,
    actualDuration: 40,
    assignedCleanerId: 'cleaner-003',
    assignedCleanerName: 'Dolores Mangahas',
    requestedBy: 'Maria Santos',
    completionNotes: 'Quick clean done as requested. Restocked mini-fridge area.',
    checklistItems: partialChecklist(10),
    createdAt: `${LAST_WEEK2}T14:00:00.000Z`,
    updatedAt: `${LAST_WEEK2}T15:40:00.000Z`,
  },

  // ── VERIFIED (3) ───────────────────────────────────────────────────────────
  {
    id: 'job-014',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-1b',
    unitName: 'Unit 1B',
    guestName: 'Riley F.',
    guestCount: 1,
    entryCode: '1B99',
    jobType: 'checkout',
    status: 'verified',
    scheduledDate: LAST_WEEK,
    scheduledTime: '10:00',
    estimatedDuration: 120,
    actualDuration: 115,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    completionNotes: 'All areas spotless. Photos attached.',
    photoUrls: ['https://placehold.co/400x300?text=Unit1B+1', 'https://placehold.co/400x300?text=Unit1B+2'],
    checklistItems: partialChecklist(20),
    linkedBookingId: 'BKG-2026-0303-001',
    createdAt: `${LAST_WEEK}T09:00:00.000Z`,
    updatedAt: `${LAST_WEEK}T14:30:00.000Z`,
  },
  {
    id: 'job-015',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-402',
    unitName: 'Room 402',
    guestName: 'Incoming VIP',
    guestCount: 2,
    entryCode: '4020',
    jobType: 'checkin_prep',
    status: 'verified',
    scheduledDate: LAST_WEEK,
    scheduledTime: '14:00',
    estimatedDuration: 90,
    actualDuration: 85,
    assignedCleanerId: 'cleaner-002',
    assignedCleanerName: 'Rowena Buenaflor',
    requestedBy: 'Admin',
    completionNotes: 'VIP suite prepped and verified by admin.',
    photoUrls: ['https://placehold.co/400x300?text=Room402'],
    checklistItems: partialChecklist(20),
    createdAt: `${LAST_WEEK}T13:00:00.000Z`,
    updatedAt: `${LAST_WEEK}T16:15:00.000Z`,
  },
  {
    id: 'job-016',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitName: 'Suite 4',
    guestName: 'Sam D.',
    guestCount: 3,
    entryCode: 'S4AB',
    jobType: 'routine',
    status: 'verified',
    scheduledDate: LAST_WEEK2,
    scheduledTime: '11:00',
    estimatedDuration: 60,
    actualDuration: 58,
    assignedCleanerId: 'cleaner-003',
    assignedCleanerName: 'Dolores Mangahas',
    requestedBy: 'Admin',
    completionNotes: 'Routine done on schedule. Quality confirmed.',
    checklistItems: partialChecklist(20),
    createdAt: `${LAST_WEEK2}T10:00:00.000Z`,
    updatedAt: `${LAST_WEEK2}T13:00:00.000Z`,
  },

  // ── CANCELLED (3) ──────────────────────────────────────────────────────────
  {
    id: 'job-017',
    propertyId: 'prop-001',
    propertyName: 'Villa Rosa',
    unitId: 'unit-5a',
    unitName: 'Unit 5A',
    guestName: 'Extended stay',
    guestCount: 2,
    entryCode: '5A77',
    jobType: 'checkout',
    status: 'cancelled',
    scheduledDate: YESTERDAY,
    scheduledTime: '11:00',
    estimatedDuration: 120,
    assignedCleanerId: 'cleaner-004',
    assignedCleanerName: 'Josephine Ramos',
    requestedBy: 'Admin',
    notes: 'Guest extended stay — cleaning moved to next week.',
    checklistItems: makeChecklist(),
    linkedBookingId: 'BKG-2026-0309-002',
    createdAt: `${YESTERDAY}T07:00:00.000Z`,
    updatedAt: `${YESTERDAY}T09:00:00.000Z`,
  },
  {
    id: 'job-018',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-203',
    unitName: 'Room 203',
    guestName: '—',
    guestCount: 0,
    entryCode: '2030',
    jobType: 'adhoc',
    status: 'cancelled',
    scheduledDate: LAST_WEEK,
    scheduledTime: '15:00',
    estimatedDuration: 45,
    requestedBy: 'Roberto Cruz',
    notes: 'Request withdrawn by agent.',
    checklistItems: makeChecklist(),
    createdAt: `${LAST_WEEK}T14:00:00.000Z`,
    updatedAt: `${LAST_WEEK}T14:30:00.000Z`,
  },
  {
    id: 'job-019',
    propertyId: 'prop-002',
    propertyName: 'Casa Blanca',
    unitName: 'Bungalow 1',
    guestName: 'Vacant',
    guestCount: 0,
    entryCode: 'BG1',
    jobType: 'deep_clean',
    status: 'cancelled',
    scheduledDate: LAST_WEEK2,
    scheduledTime: '09:00',
    estimatedDuration: 180,
    assignedCleanerId: 'cleaner-004',
    assignedCleanerName: 'Josephine Ramos',
    requestedBy: 'Admin',
    notes: 'Cleaner unavailable — rescheduled to next month.',
    checklistItems: makeChecklist(),
    createdAt: `${LAST_WEEK2}T08:00:00.000Z`,
    updatedAt: `${LAST_WEEK2}T08:30:00.000Z`,
  },

  // ── EMERGENCY in_progress (1) ── already counted above as job-008
  // Extra variety job for today
  {
    id: 'job-020',
    propertyId: 'prop-003',
    propertyName: 'Bayside Suites',
    unitId: 'unit-501',
    unitName: 'Penthouse Suite',
    guestName: 'Event host',
    guestCount: 0,
    entryCode: 'PH01',
    jobType: 'deep_clean',
    status: 'scheduled',
    scheduledDate: TODAY,
    scheduledTime: '15:00',
    estimatedDuration: 240,
    assignedCleanerId: 'cleaner-001',
    assignedCleanerName: 'Maria Concepcion',
    requestedBy: 'Admin',
    notes: 'Penthouse deep clean before event hosting. All surfaces must be spotless.',
    checklistItems: makeChecklist(),
    createdAt: `${TODAY}T07:30:00.000Z`,
    updatedAt: `${TODAY}T07:30:00.000Z`,
  },
];

// ─── Mock reports ───────────────────────────────────────────────────────────────

const MOCK_REPORTS: Record<string, CleaningReport> = {
  '2026-03': {
    period: '2026-03',
    totalJobs: 20,
    completedJobs: 13,
    cancelledJobs: 3,
    averageDuration: 108,
    topCleaner: 'Maria Concepcion',
    jobsByProperty: [
      { propertyName: 'Villa Rosa', count: 8 },
      { propertyName: 'Casa Blanca', count: 7 },
      { propertyName: 'Bayside Suites', count: 5 },
    ],
    jobsByType: [
      { type: 'checkout', count: 6 },
      { type: 'checkin_prep', count: 4 },
      { type: 'routine', count: 4 },
      { type: 'deep_clean', count: 3 },
      { type: 'adhoc', count: 2 },
      { type: 'emergency', count: 1 },
    ],
    dailyJobCounts: [
      { date: '2026-03-01', count: 2 }, { date: '2026-03-02', count: 1 },
      { date: '2026-03-03', count: 3 }, { date: '2026-03-04', count: 2 },
      { date: '2026-03-05', count: 3 }, { date: '2026-03-06', count: 1 },
      { date: '2026-03-07', count: 2 }, { date: '2026-03-08', count: 2 },
      { date: '2026-03-09', count: 3 }, { date: '2026-03-10', count: 1 },
    ],
  },
  '2026-02': {
    period: '2026-02',
    totalJobs: 18,
    completedJobs: 15,
    cancelledJobs: 2,
    averageDuration: 112,
    topCleaner: 'Maria Concepcion',
    jobsByProperty: [
      { propertyName: 'Villa Rosa', count: 7 },
      { propertyName: 'Casa Blanca', count: 6 },
      { propertyName: 'Bayside Suites', count: 5 },
    ],
    jobsByType: [
      { type: 'checkout', count: 5 },
      { type: 'checkin_prep', count: 4 },
      { type: 'routine', count: 4 },
      { type: 'deep_clean', count: 3 },
      { type: 'adhoc', count: 2 },
    ],
    dailyJobCounts: Array.from({ length: 14 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, '0')}`,
      count: Math.floor(Math.random() * 3) + 1,
    })),
  },
};

// ─── Mock cleaner performance ───────────────────────────────────────────────────

const MOCK_PERFORMANCE: CleanerPerformance[] = [
  { cleanerId: 'cleaner-001', cleanerName: 'Maria Concepcion',  totalJobs: 142, completedJobs: 138, averageDuration: 102, averageRating: 4.9, lastJobDate: TODAY },
  { cleanerId: 'cleaner-002', cleanerName: 'Rowena Buenaflor',  totalJobs: 98,  completedJobs: 94,  averageDuration: 115, averageRating: 4.7, lastJobDate: TODAY },
  { cleanerId: 'cleaner-003', cleanerName: 'Dolores Mangahas',  totalJobs: 76,  completedJobs: 73,  averageDuration: 108, averageRating: 4.6, lastJobDate: YESTERDAY },
  { cleanerId: 'cleaner-004', cleanerName: 'Josephine Ramos',   totalJobs: 55,  completedJobs: 50,  averageDuration: 120, averageRating: 4.5, lastJobDate: LAST_WEEK },
  { cleanerId: 'cleaner-005', cleanerName: 'Teresita Villanueva',totalJobs: 23, completedJobs: 20,  averageDuration: 130, averageRating: 4.2, lastJobDate: '2026-01-15' },
];

// In-memory state for optimistic updates
let _jobs = [...MOCK_JOBS];
let _cleaners = [...MOCK_CLEANERS];

// ─── Service functions ──────────────────────────────────────────────────────────

/** GET /api/admin/cleaning/jobs */
export async function getCleaningJobs(filters?: {
  status?: string;
  propertyId?: string;
  cleanerId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<CleaningJob[]> {
  if (!API_BASE) {
    let result = [..._jobs];
    if (filters?.status) result = result.filter((j) => j.status === filters.status);
    if (filters?.propertyId) result = result.filter((j) => j.propertyId === filters.propertyId);
    if (filters?.cleanerId) result = result.filter((j) => j.assignedCleanerId === filters.cleanerId);
    if (filters?.dateFrom) result = result.filter((j) => j.scheduledDate >= filters.dateFrom!);
    if (filters?.dateTo) result = result.filter((j) => j.scheduledDate <= filters.dateTo!);
    return Promise.resolve(result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime)));
  }
  const params = new URLSearchParams(filters as Record<string, string>);
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

/** GET /api/admin/cleaning/jobs/:id */
export async function getCleaningJobById(jobId: string): Promise<CleaningJob> {
  if (!API_BASE) {
    const job = _jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found');
    return Promise.resolve({ ...job });
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job');
  return res.json();
}

/** POST /api/admin/cleaning/jobs */
export async function createCleaningJob(
  data: Omit<CleaningJob, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CleaningJob> {
  if (!API_BASE) {
    const newJob: CleaningJob = {
      ...data,
      id: `job-${String(_jobs.length + 1).padStart(3, '0')}`,
      checklistItems: data.checklistItems ?? makeChecklist(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    _jobs = [newJob, ..._jobs];
    return Promise.resolve(newJob);
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to create job');
  return res.json();
}

/** PATCH /api/admin/cleaning/jobs/:id */
export async function updateCleaningJob(jobId: string, data: Partial<CleaningJob>): Promise<CleaningJob> {
  if (!API_BASE) {
    _jobs = _jobs.map((j) => j.id === jobId ? { ...j, ...data, updatedAt: new Date().toISOString() } : j);
    const updated = _jobs.find((j) => j.id === jobId)!;
    return Promise.resolve({ ...updated });
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update job');
  return res.json();
}

/** DELETE /api/admin/cleaning/jobs/:id/cancel */
export async function cancelCleaningJob(jobId: string, reason: string): Promise<void> {
  if (!API_BASE) {
    _jobs = _jobs.map((j) => j.id === jobId ? { ...j, status: 'cancelled', notes: reason, updatedAt: new Date().toISOString() } : j);
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs/${jobId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
  if (!res.ok) throw new Error('Failed to cancel job');
}

/** PATCH /api/admin/cleaning/jobs/:id/assign */
export async function assignCleaner(jobId: string, cleanerId: string): Promise<void> {
  if (!API_BASE) {
    const cleaner = _cleaners.find((c) => c.id === cleanerId);
    _jobs = _jobs.map((j) => j.id === jobId ? { ...j, assignedCleanerId: cleanerId, assignedCleanerName: cleaner?.name, updatedAt: new Date().toISOString() } : j);
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs/${jobId}/assign`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cleanerId }) });
  if (!res.ok) throw new Error('Failed to assign cleaner');
}

/** PATCH /api/cleaning/jobs/:id/start — scheduled → in_progress */
export async function startJob(jobId: string): Promise<void> {
  if (!API_BASE) {
    _jobs = _jobs.map((j) => j.id === jobId ? { ...j, status: 'in_progress', updatedAt: new Date().toISOString() } : j);
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/api/cleaning/jobs/${jobId}/start`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to start job');
}

/** PATCH /api/cleaning/jobs/:id/complete — in_progress → completed */
export async function completeJob(
  jobId: string,
  data: { completionNotes: string; photoUrls?: string[]; checklistItems: CleaningChecklistItem[] }
): Promise<void> {
  if (!API_BASE) {
    _jobs = _jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: 'completed',
            completionNotes: data.completionNotes,
            photoUrls: data.photoUrls,
            checklistItems: data.checklistItems,
            actualDuration: j.estimatedDuration,
            updatedAt: new Date().toISOString(),
          }
        : j
    );
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/api/cleaning/jobs/${jobId}/complete`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to complete job');
}

/** PATCH /api/admin/cleaning/jobs/:id/verify — completed → verified */
export async function verifyJob(jobId: string, adminNotes?: string): Promise<void> {
  if (!API_BASE) {
    _jobs = _jobs.map((j) => j.id === jobId ? { ...j, status: 'verified', notes: adminNotes ?? j.notes, updatedAt: new Date().toISOString() } : j);
    return Promise.resolve();
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/jobs/${jobId}/verify`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
  if (!res.ok) throw new Error('Failed to verify job');
}

/** GET /api/admin/cleaning/cleaners */
export async function getCleaners(): Promise<Cleaner[]> {
  if (!API_BASE) return Promise.resolve([..._cleaners]);
  const res = await fetch(`${API_BASE}/api/admin/cleaning/cleaners`);
  if (!res.ok) throw new Error('Failed to fetch cleaners');
  return res.json();
}

/** GET /api/admin/cleaning/cleaners/:id */
export async function getCleanerById(cleanerId: string): Promise<Cleaner> {
  if (!API_BASE) {
    const c = _cleaners.find((c) => c.id === cleanerId);
    if (!c) throw new Error('Cleaner not found');
    return Promise.resolve({ ...c });
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/cleaners/${cleanerId}`);
  if (!res.ok) throw new Error('Failed to fetch cleaner');
  return res.json();
}

/** GET /api/admin/cleaning/cleaners/:id/jobs */
export async function getCleanerJobs(cleanerId: string): Promise<CleaningJob[]> {
  if (!API_BASE) return Promise.resolve(_jobs.filter((j) => j.assignedCleanerId === cleanerId));
  const res = await fetch(`${API_BASE}/api/admin/cleaning/cleaners/${cleanerId}/jobs`);
  if (!res.ok) throw new Error('Failed to fetch cleaner jobs');
  return res.json();
}

/** POST /api/admin/cleaning/cleaners */
export async function addCleaner(data: Omit<Cleaner, 'id' | 'totalJobsCompleted' | 'averageRating' | 'joinedAt'>): Promise<Cleaner> {
  if (!API_BASE) {
    const newCleaner: Cleaner = {
      ...data,
      id: `cleaner-${String(_cleaners.length + 1).padStart(3, '0')}`,
      totalJobsCompleted: 0,
      averageRating: 0,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    _cleaners = [..._cleaners, newCleaner];
    return Promise.resolve(newCleaner);
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/cleaners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to add cleaner');
  return res.json();
}

/** GET /api/admin/cleaning/reports/:period */
export async function getCleaningReport(period: string): Promise<CleaningReport> {
  if (!API_BASE) {
    const report = MOCK_REPORTS[period] ?? MOCK_REPORTS['2026-03'];
    return Promise.resolve({ ...report });
  }
  const res = await fetch(`${API_BASE}/api/admin/cleaning/reports/${period}`);
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
}

/** GET /api/admin/cleaning/performance */
export async function getCleanerPerformance(): Promise<CleanerPerformance[]> {
  if (!API_BASE) return Promise.resolve([...MOCK_PERFORMANCE]);
  const res = await fetch(`${API_BASE}/api/admin/cleaning/performance`);
  if (!res.ok) throw new Error('Failed to fetch performance');
  return res.json();
}
