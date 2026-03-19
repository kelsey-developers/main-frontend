import type { DiscountRule, HolidayPricingRule } from '@/types/listing';

const parseYMD = (s?: string): Date | null => {
  if (!s) return null;
  const datePart = s.split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatYMD = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isDateInRange = (dateStr: string, startStr: string, endStr: string): boolean => {
  const d = parseYMD(dateStr);
  const start = parseYMD(startStr);
  const end = parseYMD(endStr);
  if (!d || !start || !end) return false;
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

/** Get the best qualifying stay-length discount (highest minNights that qualifies) */
function getBestStayLengthDiscount(nights: number, rules: DiscountRule[]): DiscountRule | null {
  const qualifying = (rules || []).filter((r) => nights >= r.minNights);
  if (qualifying.length === 0) return null;
  return qualifying.reduce((best, r) => (r.minNights > (best?.minNights ?? 0) ? r : best));
}

/** Apply holiday adjustment to a single night's base price. Exported for calendar display. */
export function getNightPriceWithHoliday(
  basePrice: number,
  dateStr: string,
  holidayRules: HolidayPricingRule[]
): number {
  const rules = holidayRules || [];
  for (const rule of rules) {
    if (!isDateInRange(dateStr, rule.startDate, rule.endDate)) continue;
    if (rule.adjustmentType === 'increase') {
      if (rule.adjustmentMode === 'percentage' && rule.adjustmentPercent != null) {
        return basePrice * (1 + rule.adjustmentPercent / 100);
      }
      if (rule.adjustmentMode === 'fixed' && rule.adjustmentAmount != null) {
        return basePrice + rule.adjustmentAmount;
      }
    } else {
      if (rule.adjustmentMode === 'percentage' && rule.adjustmentPercent != null) {
        return Math.max(0, basePrice * (1 - rule.adjustmentPercent / 100));
      }
      if (rule.adjustmentMode === 'fixed' && rule.adjustmentAmount != null) {
        return Math.max(0, basePrice - rule.adjustmentAmount);
      }
    }
  }
  return basePrice;
}

export interface UnitPricingResult {
  /** Base subtotal (nights × base price, no holiday) */
  baseSubtotal: number;
  /** Holiday adjustment: positive = increase, negative = discount */
  holidayAdjustmentAmount: number;
  /** Subtotal before stay-length discount (baseSubtotal + holidayAdjustmentAmount) */
  subtotalBeforeDiscount: number;
  /** Amount of stay-length discount in currency */
  stayLengthDiscountAmount: number;
  /** Subtotal after discount (subtotalBeforeDiscount - stayLengthDiscountAmount) */
  subtotal: number;
  nights: number;
  appliedStayLengthDiscount: DiscountRule | null;
  appliedHolidayRules: HolidayPricingRule[];
}

/**
 * Compute pricing for a stay using unit_pricing (stay_length_discount + holiday_pricing).
 * - For each night: apply holiday pricing if the date falls in a holiday period.
 * - Subtotal = sum of nightly prices (before stay-length discount).
 * - Stay-length discount is applied as a separate line item.
 */
export function computePriceWithUnitPricing(
  basePricePerNight: number,
  checkInDate: string,
  checkOutDate: string,
  discountRules: DiscountRule[] | undefined,
  holidayPricingRules: HolidayPricingRule[] | undefined
): UnitPricingResult {
  const start = parseYMD(checkInDate);
  const end = parseYMD(checkOutDate);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return {
      baseSubtotal: 0,
      holidayAdjustmentAmount: 0,
      subtotalBeforeDiscount: 0,
      stayLengthDiscountAmount: 0,
      subtotal: 0,
      nights: 0,
      appliedStayLengthDiscount: null,
      appliedHolidayRules: [],
    };
  }

  let baseSubtotal = 0;
  let subtotalWithHoliday = 0;
  const current = new Date(start);
  const holidayDatesUsed = new Set<string>();

  while (current.getTime() < end.getTime()) {
    const dateStr = formatYMD(current);
    const baseNightPrice = basePricePerNight;
    const nightPrice = getNightPriceWithHoliday(
      basePricePerNight,
      dateStr,
      holidayPricingRules || []
    );
    baseSubtotal += baseNightPrice;
    subtotalWithHoliday += nightPrice;
    if (nightPrice !== basePricePerNight) {
      (holidayPricingRules || []).forEach((r) => {
        if (isDateInRange(dateStr, r.startDate, r.endDate)) holidayDatesUsed.add(r.id);
      });
    }
    current.setDate(current.getDate() + 1);
  }

  const holidayAdjustmentAmount = subtotalWithHoliday - baseSubtotal;
  const subtotalBeforeDiscount = subtotalWithHoliday;

  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.round((end.getTime() - start.getTime()) / msPerDay);

  const stayDiscount = getBestStayLengthDiscount(nights, discountRules || []);
  let stayLengthDiscountAmount = 0;
  if (stayDiscount) {
    if (stayDiscount.discountType === 'percentage' && stayDiscount.discountPercent != null) {
      stayLengthDiscountAmount = subtotalBeforeDiscount * (stayDiscount.discountPercent / 100);
    } else if (stayDiscount.discountType === 'fixed' && stayDiscount.discountAmount != null) {
      stayLengthDiscountAmount = Math.min(subtotalBeforeDiscount, stayDiscount.discountAmount);
    }
  }

  const subtotal = Math.max(0, subtotalBeforeDiscount - stayLengthDiscountAmount);
  const appliedHolidayRules = (holidayPricingRules || []).filter((r) => holidayDatesUsed.has(r.id));

  return {
    baseSubtotal,
    holidayAdjustmentAmount,
    subtotalBeforeDiscount,
    stayLengthDiscountAmount,
    subtotal,
    nights,
    appliedStayLengthDiscount: stayDiscount,
    appliedHolidayRules,
  };
}
