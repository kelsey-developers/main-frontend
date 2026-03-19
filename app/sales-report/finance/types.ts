

/** Summary for finance-style summary cards (Total Sales, Total Revenue, Monthly Revenue) */
export interface FinanceDashboardSummary {
  totalSales: number;
  totalRevenue: number;
  totalRent: number;
  totalRentUnits: number;
}

export interface SalesTrendPoint {
  name: string;
  value: number;
  commissionReduction?: number;
}

export interface RevenueByTypeItem {
  name: string;
  value: number;
  color: string;
}

export interface TopUnit {
  id: string;
  title: string;
  location: string;
  totalSales: number;
  imageUrl: string;
  rate: number;
}

export interface SalesReportFilters {
  searchName: string;
  propertyType: string;
  location: string;
  /** Quick select: 'quick' | 'custom' */
  filterMethod: 'quick' | 'custom';
  /** Quick select: view by week | month | year | all (no date filter) */
  timePeriod: 'week' | 'month' | 'year' | 'all';
  /** Quick select: this period or last period */
  timePeriodScope: 'this' | 'last';
  /** Custom: start month (e.g. Jan) */
  timePeriodStart: string;
  /** Custom: start year (e.g. 2025) */
  timePeriodStartYear: string;
  /** Custom: end month */
  timePeriodEnd: string;
  /** Custom: end year */
  timePeriodEndYear: string;
}

/** Default values for SalesReportFilters */
export const defaultSalesReportFilters: SalesReportFilters = {
  searchName: '',
  propertyType: 'All',
  location: 'All',
  filterMethod: 'quick',
  timePeriod: 'all',
  timePeriodScope: 'this',
  timePeriodStart: '',
  timePeriodStartYear: '',
  timePeriodEnd: '',
  timePeriodEndYear: '',
};

/** Revenue by property/unit */
export interface RevenueByProperty {
  propertyId: string;
  propertyName: string;
  unit?: string;
  revenue: number;
  bookingCount: number;
}

/** Revenue by channel */
export interface RevenueByChannel {
  channel: 'Airbnb' | 'direct' | 'corporate';
  revenue: number;
  bookingCount: number;
  percentage: number;
}

/** Revenue by agent */
export interface RevenueByAgent {
  agentId: string;
  agentName: string;
  revenue: number;
  bookingCount: number;
}

/** Link item for dashboard feature grid */
export interface FinanceFeatureLink {
  href: string;
  title: string;
  icon: 'chart' | 'breakdown' | 'bookings' | 'charges' | 'damage' | 'export' | 'future' | 'commission';
}

/** Revenue overview (totals and period) */
export interface RevenueOverview {
  daily: number;
  weekly: number;
  monthly: number;
  periodLabel: string;
}

/** Single point for revenue trend chart */
export interface RevenueTrendPoint {
  name: string;
  revenue: number;
}

/** Booking-linked row */
export interface BookingLinkedRow {
  id: string;
  bookingId: string;
  /** Booking creation timestamp (ISO). Optional; used for newest-first sorting in lists. */
  createdAt?: string;
  unit: string;
  /** Unit/property image URL. Optional, shown on booking detail. */
  imageUrl?: string;
  /** Unit type for filtering (e.g. Condo, Apartment). Optional. */
  unitType?: string;
  /** Location for filtering (e.g. Davao City, Manila). Optional. */
  location?: string;
  /** Unit rate (e.g. nightly rate) */
  rate: number;
  agent: string;
  guest: string;
  checkIn: string;
  checkOut: string;
  /** Check-in time (e.g. "14:00" or "14:00:00"). Optional, shown on detail page only. */
  checkInTime?: string;
  /** Check-out time (e.g. "11:00" or "11:00:00"). Optional, shown on detail page only. */
  checkOutTime?: string;
  guestType: 'Airbnb' | 'direct' | 'corporate';
  basePrice: number;
  discounts: number;
  extraHeads: number;
  extraHours: number;
  addOns: string[];
  /** Per-add-on name and amount. When set, used for bullet list with price per item. */
  addOnsWithPrice?: { name: string; amount: number }[];
  /** Amount for add-ons (e.g. pool, towels). Used to compute total. */
  addOnsAmount: number;
  /** Actual total from backend (e.g. getBookingById). When set, use for Grand Total instead of computing from rate × nights. */
  totalAmount?: number;
  /** @deprecated Use computed total from rate × nights - discounts + extras + addOnsAmount instead. */
  total?: number;
}

/** Commission reduction row for approved bookings in finance. */
export interface CommissionReductionRow {
  id: string;
  bookingRef: string;
  propertyName: string;
  unitType?: string;
  location?: string;
  guestName: string;
  agentName: string;
  bookingTotal: number;
  commissionRate: number;
  commissionAmount: number;
  checkIn: string;
  checkOut: string;
  createdAt?: string;
}

/** Charge type */
export interface ChargeType {
  id: string;
  name: string;
  description: string;
  defaultAmount?: number;
  appliedToBills: boolean;
  exampleLabel: string;
}

/** One reported item in a damage incident: lost or broken */
export interface DamagePenaltyItem {
  item: string;
  type: 'loss' | 'broken';
}

/** Damage & penalty incident */
export interface DamagePenalty {
  /** Unique damage incident id from backend. */
  damageId?: string;
  bookingId: string;
  unit: string;
  /** Full unit address (e.g. for display on detail). */
  unitAddress?: string;
  /** Unit type for filtering. Optional. */
  unitType?: string;
  /** Location for filtering. Optional. */
  location?: string;
  reportedAt: string;
  description: string;
  /** Reason/cause of damage (e.g. guest negligence, wear and tear). */
  reasonOfDamage?: string;
  /** Who reported the incident (e.g. staff name, guest). */
  reportedBy?: string;
  /** URLs of proof images (photos of damage). */
  proofUrls?: string[];
  /** Items reported as lost or broken. */
  items?: DamagePenaltyItem[];
  cost: number;
  chargedToGuest: number;
  absorbed: number;
  totalLoss: number;
  status: string;
}

/** Audit trail: data kind for export logging */
export type AuditDataKind = 'booking-linked' | 'damage-penalty';

/** One audit entry (e.g. export event) */
export interface AuditEntry {
  id: string;
  action: 'export';
  dataKind: AuditDataKind;
  format: 'csv' | 'pdf';
  filters: SalesReportFilters;
  recordCount: number;
  timestamp: string;
}
