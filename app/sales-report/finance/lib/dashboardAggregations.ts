import type {
  FinanceDashboardSummary,
  SalesTrendPoint,
  RevenueByProperty,
  RevenueByChannel,
  RevenueByAgent,
  RevenueByTypeItem,
  BookingLinkedRow,
  DamagePenalty,
} from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export function computeBookingRevenue(row: BookingLinkedRow): number {
  return row.basePrice - row.discounts + row.extraHeads + row.extraHours + row.addOnsAmount;
}

export function buildSummary(
  bookings: BookingLinkedRow[],
  damageIncidents: DamagePenalty[],
): FinanceDashboardSummary {
  const bookingRevenue = bookings.reduce((sum, row) => sum + computeBookingRevenue(row), 0);
  const damageRevenue = damageIncidents.reduce((sum, inc) => sum + inc.chargedToGuest, 0);
  const absorbedDamage = damageIncidents.reduce((sum, inc) => sum + inc.absorbed, 0);

  const totalSales = bookingRevenue + damageRevenue;
  const totalRevenue = totalSales - absorbedDamage;
  const totalBookings = bookings.length;

  return {
    totalSales,
    // Total Revenue: net after absorbed damage
    totalRevenue,
    // Reuse totalRent as "Total Bookings" count for summary card
    totalRent: totalBookings,
    totalRentUnits: totalBookings,
  };
}

export function buildSalesTrend(
  bookings: BookingLinkedRow[],
  damageIncidents: DamagePenalty[],
): SalesTrendPoint[] {
  const monthly: number[] = Array(12).fill(0);

  bookings.forEach((row) => {
    const d = new Date(row.checkIn + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) {
      const idx = d.getMonth();
      monthly[idx] += computeBookingRevenue(row);
    }
  });

  damageIncidents.forEach((inc) => {
    const d = new Date(inc.reportedAt + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) {
      const idx = d.getMonth();
      monthly[idx] += inc.chargedToGuest;
    }
  });

  return MONTHS.map((name, idx) => ({
    name,
    value: monthly[idx],
  }));
}

export function buildRevenueByProperty(
  bookings: BookingLinkedRow[],
  damageIncidents: DamagePenalty[],
): RevenueByProperty[] {
  const map = new Map<string, { revenue: number; bookingCount: number }>();

  bookings.forEach((row) => {
    const key = row.unit;
    const prev = map.get(key) ?? { revenue: 0, bookingCount: 0 };
    prev.revenue += computeBookingRevenue(row);
    prev.bookingCount += 1;
    map.set(key, prev);
  });

  damageIncidents.forEach((inc) => {
    const key = inc.unit;
    const prev = map.get(key) ?? { revenue: 0, bookingCount: 0 };
    prev.revenue += inc.chargedToGuest;
    map.set(key, prev);
  });

  const result: RevenueByProperty[] = [];
  let idx = 1;
  map.forEach((value, propertyName) => {
    result.push({
      propertyId: String(idx++),
      propertyName,
      revenue: value.revenue,
      bookingCount: value.bookingCount,
    });
  });
  return result;
}

export function buildRevenueByChannel(bookings: BookingLinkedRow[]): RevenueByChannel[] {
  const base: Record<'Airbnb' | 'direct' | 'corporate', { revenue: number; bookingCount: number }> = {
    Airbnb: { revenue: 0, bookingCount: 0 },
    direct: { revenue: 0, bookingCount: 0 },
    corporate: { revenue: 0, bookingCount: 0 },
  };

  bookings.forEach((row) => {
    const bucket = base[row.guestType];
    bucket.revenue += computeBookingRevenue(row);
    bucket.bookingCount += 1;
  });

  const totalRevenue = Object.values(base).reduce((sum, v) => sum + v.revenue, 0) || 1;

  return (Object.entries(base) as [RevenueByChannel['channel'], { revenue: number; bookingCount: number }][])
    .map(([channel, stats]) => ({
      channel,
      revenue: stats.revenue,
      bookingCount: stats.bookingCount,
      percentage: Math.round((stats.revenue / totalRevenue) * 100),
    }))
    // Hide channels with zero data
    .filter((item) => item.bookingCount > 0);
}

export function buildRevenueByAgent(bookings: BookingLinkedRow[]): RevenueByAgent[] {
  const map = new Map<string, { revenue: number; bookingCount: number }>();
  bookings.forEach((row) => {
    const key = row.agent;
    const prev = map.get(key) ?? { revenue: 0, bookingCount: 0 };
    prev.revenue += computeBookingRevenue(row);
    prev.bookingCount += 1;
    map.set(key, prev);
  });
  const result: RevenueByAgent[] = [];
  map.forEach((value, agentName) => {
    result.push({
      agentId: agentName,
      agentName,
      revenue: value.revenue,
      bookingCount: value.bookingCount,
    });
  });
  return result;
}

export function buildRevenueByType(bookings: BookingLinkedRow[]): RevenueByTypeItem[] {
  const map = new Map<string, number>();
  let total = 0;

  bookings.forEach((row) => {
    const type = row.unitType ?? 'Other';
    const rev = computeBookingRevenue(row);
    total += rev;
    map.set(type, (map.get(type) ?? 0) + rev);
  });

  if (total === 0) return [];

  const palette = ['#0B5858', '#3b82f6', '#f97316', '#22c55e', '#ef4444'];
  let idx = 0;

  return Array.from(map.entries()).map(([name, revenue]) => ({
    name,
    value: Math.round((revenue / total) * 100),
    color: palette[idx++ % palette.length],
  }));
}

