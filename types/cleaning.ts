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
  /** Incoming guest name (e.g. "John S.") for cleaner context */
  guestName?: string;
  /** Number of guests for display (e.g. "4 Guests") */
  guestCount?: number;
  /** Entry code for property access; optionally masked in UI */
  entryCode?: string;
  /** Schedule window end (e.g. "16:00") when different from start + estimatedDuration */
  dueByTime?: string;
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
// UX: Maximize distinction between statuses. Brand: #0B5858, #0d9488, #FACC15, #eab308.
// chipStyle: inline styles so chip colors always render. boxShadow = color-matched (darker hue) for soft 3D / neomorphic chip.
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };

/** Color-matched solid shadow: darker hue, bottom offset only, no blur for crisp 3D edge. */
const shadow = (r: number, g: number, b: number, a = 0.35) =>
  `0 1px 0 rgba(${r},${g},${b},${a})`;

export const JOB_STATUS_CONFIG: Record<CleaningJobStatus, { label: string; classes: string; dot: string; bg: string; chipStyle: ChipStyle }> = {
  scheduled:   { label: 'Scheduled',   classes: 'bg-sky-100 text-sky-800',           dot: 'bg-sky-500',  bg: '#0ea5e9', chipStyle: { backgroundColor: '#e0f2fe', color: '#075985', boxShadow: shadow(14, 165, 233) } },
  in_progress: { label: 'In Progress', classes: 'bg-amber-100 text-amber-800',      dot: 'bg-amber-500', bg: '#d97706', chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: shadow(245, 158, 11) } },
  completed:   { label: 'Completed',   classes: 'bg-[#0B5858]/15 text-[#0B5858]', dot: 'bg-[#0B5858]', bg: '#0B5858', chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: shadow(11, 88, 88, 0.32) } },
  verified:    { label: 'Verified',    classes: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500', bg: '#0d9488', chipStyle: { backgroundColor: '#ccfbf1', color: '#115e59', boxShadow: shadow(20, 184, 166) } },
  cancelled:   { label: 'Cancelled',   classes: 'bg-stone-100 text-stone-600',         dot: 'bg-stone-400',  bg: '#a8a29e', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: shadow(168, 162, 158, 0.22) } },
};

export const JOB_TYPE_CONFIG: Record<CleaningJobType, { label: string; color: string; bgColor: string; chipStyle: ChipStyle }> = {
  checkout:     { label: 'Checkout',      color: 'text-amber-800',   bgColor: 'bg-amber-100',   chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: shadow(245, 158, 11) } },
  checkin_prep: { label: 'Check-in Prep', color: 'text-cyan-800',     bgColor: 'bg-cyan-100',     chipStyle: { backgroundColor: '#cffafe', color: '#155e75', boxShadow: shadow(6, 182, 212) } },
  routine:      { label: 'Routine',       color: 'text-stone-700',   bgColor: 'bg-stone-100',   chipStyle: { backgroundColor: '#f5f5f4', color: '#44403c', boxShadow: shadow(168, 162, 158, 0.22) } },
  adhoc:        { label: 'Ad Hoc',        color: 'text-violet-800', bgColor: 'bg-violet-100', chipStyle: { backgroundColor: '#ede9fe', color: '#5b21b6', boxShadow: shadow(124, 58, 237) } },
  deep_clean:   { label: 'Deep Clean',   color: 'text-emerald-800', bgColor: 'bg-emerald-100', chipStyle: { backgroundColor: '#d1fae5', color: '#065f46', boxShadow: shadow(5, 150, 105) } },
  inspection:   { label: 'Inspection',   color: 'text-teal-800', bgColor: 'bg-teal-100', chipStyle: { backgroundColor: '#ccfbf1', color: '#115e59', boxShadow: shadow(20, 184, 166) } },
  emergency:    { label: '⚡ Emergency',  color: 'text-rose-800',    bgColor: 'bg-rose-100',    chipStyle: { backgroundColor: '#ffe4e6', color: '#9f1239', boxShadow: shadow(225, 29, 72) } },
};

export const CLEANER_STATUS_CONFIG: Record<Cleaner['status'], { label: string; dot: string; classes: string; chipStyle: ChipStyle }> = {
  available: { label: 'Available', dot: 'bg-[#0B5858]', classes: 'bg-[#0B5858]/15 text-[#0B5858]', chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: shadow(11, 88, 88, 0.32) } },
  busy:      { label: 'Busy',      dot: 'bg-amber-500',   classes: 'bg-amber-100 text-amber-800', chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: shadow(245, 158, 11) } },
  off_duty:  { label: 'Off Duty',  dot: 'bg-stone-400',   classes: 'bg-stone-100 text-stone-500', chipStyle: { backgroundColor: '#f5f5f4', color: '#78716c', boxShadow: shadow(168, 162, 158, 0.22) } },
  inactive:  { label: 'Inactive',  dot: 'bg-stone-500',  classes: 'bg-stone-100 text-stone-600', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: shadow(168, 162, 158, 0.22) } },
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
