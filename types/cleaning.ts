/**
 * Cleaning Services — Type Definitions
 * Kelsey's Homestay IIMS
 */

export type CleaningJobStatus =
  | 'scheduled'    // created, not started
  | 'in_progress'  // cleaner tapped Start
  | 'completed'    // cleaner submitted done
  | 'verified'     // admin confirmed quality
  | 'cancelled';   // job voided

export type CleaningJobType =
  | 'checkout'     // triggered post-checkout
  | 'checkin_prep' // deep clean before next guest
  | 'routine'      // periodic scheduled
  | 'adhoc'        // one-off request
  | 'deep_clean'   // intensive session
  | 'inspection'   // admin QA walkthrough
  | 'emergency';   // urgent same-day

export interface CleaningChecklistItem {
  id: string;
  label: string;    // e.g. "Wipe countertops"
  area: string;     // e.g. "Kitchen"
  isChecked: boolean;
  checkedAt?: string;
}

export interface CleaningJob {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitName?: string;
  jobType: CleaningJobType;
  status: CleaningJobStatus;
  scheduledDate: string;          // ISO date
  scheduledTime: string;          // "HH:MM"
  estimatedDuration: number;      // minutes
  actualDuration?: number;        // minutes (set on completion)
  assignedCleanerId?: string;
  assignedCleanerName?: string;
  requestedBy: string;            // admin/agent name
  notes?: string;                 // admin instructions
  completionNotes?: string;       // cleaner notes on done
  photoUrls?: string[];           // completion proof photos (mock: placeholder URLs)
  checklistItems?: CleaningChecklistItem[];
  linkedBookingId?: string;       // if triggered by a booking
  createdAt: string;
  updatedAt: string;
}

export interface Cleaner {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: 'available' | 'busy' | 'off_duty' | 'inactive';
  assignedProperties: string[];   // propertyId[]
  totalJobsCompleted: number;
  averageRating: number;          // 1–5
  joinedAt: string;
}

export interface CleaningReport {
  period: string;                 // "2026-03"
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  averageDuration: number;        // minutes
  topCleaner: string;
  jobsByProperty: { propertyName: string; count: number }[];
  jobsByType: { type: CleaningJobType; count: number }[];
  dailyJobCounts: { date: string; count: number }[];
}

export interface CleanerPerformance {
  cleanerId: string;
  cleanerName: string;
  totalJobs: number;
  completedJobs: number;
  averageDuration: number;
  averageRating: number;
  lastJobDate: string;
}

// ─── Config maps ────────────────────────────────────────────────────────────────

export const JOB_STATUS_CONFIG: Record<CleaningJobStatus, { label: string; classes: string; dot: string; bg: string }> = {
  scheduled:   { label: 'Scheduled',   classes: 'bg-blue-50 text-blue-700 border border-blue-200',              dot: 'bg-blue-500',  bg: '#3b82f6' },
  in_progress: { label: 'In Progress', classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30',    dot: 'bg-[#FACC15]', bg: '#FACC15' },
  completed:   { label: 'Completed',   classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',    dot: 'bg-[#0B5858]', bg: '#0B5858' },
  verified:    { label: 'Verified',    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',      dot: 'bg-emerald-500', bg: '#10b981' },
  cancelled:   { label: 'Cancelled',   classes: 'bg-gray-50 text-gray-500 border border-gray-200',              dot: 'bg-gray-400',  bg: '#9ca3af' },
};

export const JOB_TYPE_CONFIG: Record<CleaningJobType, { label: string; color: string; bgColor: string }> = {
  checkout:     { label: 'Checkout',     color: 'text-orange-700',  bgColor: 'bg-orange-50 border-orange-200' },
  checkin_prep: { label: 'Check-in Prep',color: 'text-blue-700',    bgColor: 'bg-blue-50 border-blue-200' },
  routine:      { label: 'Routine',      color: 'text-gray-600',    bgColor: 'bg-gray-50 border-gray-200' },
  adhoc:        { label: 'Ad Hoc',       color: 'text-purple-700',  bgColor: 'bg-purple-50 border-purple-200' },
  deep_clean:   { label: 'Deep Clean',   color: 'text-[#0B5858]',   bgColor: 'bg-[#0B5858]/5 border-[#0B5858]/20' },
  inspection:   { label: 'Inspection',   color: 'text-indigo-700',  bgColor: 'bg-indigo-50 border-indigo-200' },
  emergency:    { label: '⚡ Emergency',  color: 'text-red-700',     bgColor: 'bg-red-50 border-red-200' },
};

export const CLEANER_STATUS_CONFIG: Record<Cleaner['status'], { label: string; dot: string; classes: string }> = {
  available: { label: 'Available', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  busy:      { label: 'Busy',      dot: 'bg-[#FACC15]',  classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30' },
  off_duty:  { label: 'Off Duty',  dot: 'bg-gray-400',   classes: 'bg-gray-50 text-gray-500 border border-gray-200' },
  inactive:  { label: 'Inactive',  dot: 'bg-red-400',    classes: 'bg-red-50 text-red-600 border border-red-200' },
};

// ─── Default checklist template ────────────────────────────────────────────────

export const DEFAULT_CHECKLIST: Omit<CleaningChecklistItem, 'id'>[] = [
  { label: 'Wipe countertops',      area: 'Kitchen',  isChecked: false },
  { label: 'Clean stovetop',        area: 'Kitchen',  isChecked: false },
  { label: 'Empty trash',           area: 'Kitchen',  isChecked: false },
  { label: 'Mop floor',             area: 'Kitchen',  isChecked: false },
  { label: 'Scrub toilet',          area: 'Bathroom', isChecked: false },
  { label: 'Clean sink',            area: 'Bathroom', isChecked: false },
  { label: 'Replace towels',        area: 'Bathroom', isChecked: false },
  { label: 'Restock toiletries',    area: 'Bathroom', isChecked: false },
  { label: 'Change linens',         area: 'Bedroom',  isChecked: false },
  { label: 'Dust surfaces',         area: 'Bedroom',  isChecked: false },
  { label: 'Vacuum floor',          area: 'Bedroom',  isChecked: false },
  { label: 'Check AC',              area: 'Bedroom',  isChecked: false },
  { label: 'Dust furniture',        area: 'Living',   isChecked: false },
  { label: 'Vacuum/mop floor',      area: 'Living',   isChecked: false },
  { label: 'Check pillows/blankets',area: 'Living',   isChecked: false },
  { label: 'Wipe windows',          area: 'Living',   isChecked: false },
  { label: 'Check all lights',      area: 'General',  isChecked: false },
  { label: 'Lock windows',          area: 'General',  isChecked: false },
  { label: 'Set AC to 25°C',        area: 'General',  isChecked: false },
  { label: 'Log out Wi-Fi guests',  area: 'General',  isChecked: false },
];

export function makeChecklist(): CleaningChecklistItem[] {
  return DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `cl-${i + 1}` }));
}
