/**
 * Format monetary values for display.
 * Abbreviated form (M / k) only for millions and hundred thousands; otherwise full number with PHP prefix.
 */
export function formatPHP(value: number | undefined | null): string {
  const n = value != null && Number.isFinite(value) ? value : 0;
  if (n >= 1_000_000) {
    return `PHP ${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 100_000) {
    return `PHP ${Math.round(n / 1_000)}k`;
  }
  return `PHP ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPHPForChart(value: number | undefined | null): string {
  const n = value != null && Number.isFinite(value) ? value : 0;

  // Millions: show whole M (1M, 2M, …) until we reach at least 100k into that million,
  // then show one decimal (1.1M, 1.5M, …).
  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    const remainder = n % 1_000_000;
    if (remainder < 100_000) {
      return `PHP ${Math.round(millions)}M`;
    }
    return `PHP ${millions.toFixed(1)}M`;
  }

  // Ten-thousands and hundred-thousands: use k with no decimals.
  if (n >= 10_000) {
    return `PHP ${Math.round(n / 1_000)}k`;
  }

  // Below 10,000: show plain number without decimals.
  return `PHP ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Number of nights between check-in and check-out (check-out day excluded).
 * Dates as YYYY-MM-DD strings.
 */
export function getNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

/**
 * Base price = unit rate × nights.
 */
export function getBasePrice(rate: number, checkIn: string, checkOut: string): number {
  return rate * getNights(checkIn, checkOut);
}

/**
 * Total = base price (rate × nights) − discounts + extraHeads + extraHours + addOnsAmount.
 */
export function getBookingTotal(
  rate: number,
  checkIn: string,
  checkOut: string,
  discounts: number,
  extraHeads: number,
  extraHours: number,
  addOnsAmount: number
): number {
  const base = getBasePrice(rate, checkIn, checkOut);
  return base - discounts + extraHeads + extraHours + addOnsAmount;
}

/**
 * Format date for tables: numeric, month first then day then year (MM/DD/YYYY).
 * Input: YYYY-MM-DD string.
 */
export function formatDateNumeric(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format date for unit/detail pages: month as word (e.g. February 1, 2025).
 * Input: YYYY-MM-DD string.
 */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Format time for display (e.g. "14:00:00" → "2:00 PM"). Same as booking-details.
 * Input: "HH:mm" or "HH:mm:ss" string.
 */
export function formatTime(time?: string): string {
  if (!time) return '';
  const timeParts = time.trim().split(':');
  if (timeParts.length < 2) return time;
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }
  return `${hours}:${minutes} ${period}`;
}

/**
 * Format numbers for display. Uses k/M for hundred thousands and millions; otherwise two decimals.
 */
export function formatNumber(value: number | undefined | null): string {
  const n = value != null && Number.isFinite(value) ? value : 0;
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 100_000) {
    return `${Math.round(n / 1_000)}k`;
  }
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}