import type {
  FinanceDashboardSummary,
  SalesTrendPoint,
  RevenueByProperty,
  RevenueByChannel,
  RevenueByAgent,
  RevenueByTypeItem,
  BookingLinkedRow,
  DamagePenalty,
  SalesReportFilters,
} from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export function computeBookingRevenue(row: BookingLinkedRow): number {
  if (row.totalAmount != null) return row.totalAmount;
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

type Granularity = 'day' | 'month';

const monthIndexFromAbbrev = (abbr: string): number | null => {
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === abbr.toLowerCase());
  return idx === -1 ? null : idx;
};

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfWeekMonday = (d: Date) => {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0=Sun,1=Mon,...
  const diff = (day + 6) % 7; // days since Monday
  copy.setDate(copy.getDate() - diff);
  return copy;
};

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const addMonths = (d: Date, months: number) => {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const formatDayLabel = (d: Date): string => {
  // e.g. "Apr 30"
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const formatMonthLabel = (d: Date, includeYear: boolean): string => {
  const base = MONTHS[d.getMonth()];
  if (!includeYear) return base;
  return `${base} ${d.getFullYear()}`;
};

interface DateRangeConfig {
  start: Date;
  end: Date;
  granularity: Granularity;
  includeYearInMonthLabel: boolean;
}

const getDateRangeFromFilters = (filters?: SalesReportFilters): DateRangeConfig => {
  const today = startOfDay(new Date());

  if (!filters || filters.filterMethod === 'quick') {
    const scope = filters?.timePeriodScope ?? 'this';
    const period = filters?.timePeriod ?? 'year';

    if (period === 'week') {
      const thisWeekStart = startOfWeekMonday(today);
      const start =
        scope === 'this' ? thisWeekStart : addDays(thisWeekStart, -7);
      const end = addDays(start, 6);
      return { start, end, granularity: 'day', includeYearInMonthLabel: false };
    }

    if (period === 'month') {
      const base = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStart = scope === 'this' ? base : addMonths(base, -1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      return { start: monthStart, end: monthEnd, granularity: 'day', includeYearInMonthLabel: false };
    }

    // year
    const year = scope === 'this' ? today.getFullYear() : today.getFullYear() - 1;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    return { start: yearStart, end: yearEnd, granularity: 'month', includeYearInMonthLabel: false };
  }

  // Custom filter: use start/end month/year. If difference < 3 months, use day granularity; else month.
  const startMonthIdx = filters.timePeriodStart ? monthIndexFromAbbrev(filters.timePeriodStart) : null;
  const endMonthIdx = filters.timePeriodEnd ? monthIndexFromAbbrev(filters.timePeriodEnd) : null;
  const startYear = filters.timePeriodStartYear ? Number(filters.timePeriodStartYear) : NaN;
  const endYear = filters.timePeriodEndYear ? Number(filters.timePeriodEndYear) : NaN;

  if (
    startMonthIdx == null ||
    endMonthIdx == null ||
    Number.isNaN(startYear) ||
    Number.isNaN(endYear)
  ) {
    // Fallback: last 12 months by month if custom fields are incomplete
    const fallbackEnd = today;
    const fallbackStart = addMonths(fallbackEnd, -11);
    return {
      start: new Date(fallbackStart.getFullYear(), fallbackStart.getMonth(), 1),
      end: new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth() + 1, 0),
      granularity: 'month',
      includeYearInMonthLabel: true,
    };
  }

  const customStart = new Date(startYear, startMonthIdx, 1);
  const customEnd = new Date(endYear, endMonthIdx + 1, 0);
  const monthsDiff =
    (customEnd.getFullYear() - customStart.getFullYear()) * 12 +
    (customEnd.getMonth() - customStart.getMonth()) +
    1;

  const granularity: Granularity = monthsDiff <= 3 ? 'day' : 'month';
  const includeYearInMonthLabel = customStart.getFullYear() !== customEnd.getFullYear();

  return { start: customStart, end: customEnd, granularity, includeYearInMonthLabel };
};

export function buildSalesTrend(
  bookings: BookingLinkedRow[],
  damageIncidents: DamagePenalty[],
  filters?: SalesReportFilters,
): SalesTrendPoint[] {
  const { start, end, granularity, includeYearInMonthLabel } = getDateRangeFromFilters(filters);
  const points: { key: string; label: string; value: number }[] = [];
  const keyToIndex = new Map<string, number>();

  // Pre-build buckets so gaps show as zero on chart
  if (granularity === 'day') {
    let cursor = startOfDay(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const label = formatDayLabel(cursor);
      keyToIndex.set(key, points.length);
      points.push({ key, label, value: 0 });
      cursor = addDays(cursor, 1);
    }
  } else {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      const label = formatMonthLabel(cursor, includeYearInMonthLabel);
      keyToIndex.set(key, points.length);
      points.push({ key, label, value: 0 });
      cursor = addMonths(cursor, 1);
    }
  }

  const accumulate = (dateStr: string | undefined, amount: number) => {
    if (!dateStr || !amount) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return;
    const day = startOfDay(d);
    if (day < start || day > end) return;

    let key: string;
    if (granularity === 'day') {
      key = day.toISOString().slice(0, 10);
    } else {
      key = `${day.getFullYear()}-${day.getMonth()}`;
    }

    const idx = keyToIndex.get(key);
    if (idx == null) return;
    points[idx].value += amount;
  };

  bookings.forEach((row) => {
    accumulate(row.checkIn, computeBookingRevenue(row));
  });

  damageIncidents.forEach((inc) => {
    accumulate(inc.reportedAt, inc.chargedToGuest);
  });

  return points.map((p) => ({ name: p.label, value: p.value }));
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

