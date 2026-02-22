

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
}

export interface SalesReportFilters {
  searchName: string;
  propertyType: string;
  location: string;
  timePeriodStart: string;
  timePeriodEnd: string;
}

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
  icon: 'chart' | 'breakdown' | 'bookings' | 'charges' | 'damage' | 'export' | 'future';
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
  unit: string;
  checkIn: string;
  checkOut: string;
  guestType: 'Airbnb' | 'direct' | 'corporate';
  basePrice: number;
  discounts: number;
  extraHeads: number;
  extraHours: number;
  addOns: string[];
  total: number;
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

/** Damage & penalty monthly summary */
export interface DamagePenaltyMonth {
  month: string;
  chargedToGuest: number;
  absorbed: number;
  totalLoss: number;
  incidentCount: number;
}
