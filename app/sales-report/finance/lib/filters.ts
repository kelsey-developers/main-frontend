import type { SalesReportFilters } from '../types';
import type { BookingLinkedRow } from '../types';
import type { DamagePenalty } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  s.setHours(23, 59, 59, 999);
  return s;
}

function startOfMonth(y: number, m: number): Date {
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(y: number, m: number): Date {
  return new Date(y, m, 0, 23, 59, 59, 999);
}

/**
 * Returns the date range [start, end] as YYYY-MM-DD from the current filters, or null if no range applies (e.g. custom with missing fields).
 */
export function getDateRangeFromFilters(filters: SalesReportFilters): { start: string; end: string } | null {
  const now = new Date();

  if (filters.filterMethod === 'custom') {
    const startMonth = filters.timePeriodStart;
    const startYear = filters.timePeriodStartYear;
    const endMonth = filters.timePeriodEnd;
    const endYear = filters.timePeriodEndYear;
    if (!startMonth || !startYear || !endMonth || !endYear) return null;
    const si = MONTHS.indexOf(startMonth) + 1;
    const sy = parseInt(startYear, 10);
    const ei = MONTHS.indexOf(endMonth) + 1;
    const ey = parseInt(endYear, 10);
    if (si < 1 || ei < 1 || !Number.isFinite(sy) || !Number.isFinite(ey)) return null;
    const start = startOfMonth(sy, si);
    const end = endOfMonth(ey, ei);
    if (start.getTime() > end.getTime()) return null;
    return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
  }

  // Quick select
  const period = filters.timePeriod;
  const scope = filters.timePeriodScope;

  if (period === 'all') return null;

  if (period === 'week') {
    let ref: Date;
    if (scope === 'this') ref = now;
    else {
      ref = new Date(now);
      ref.setDate(ref.getDate() - 7);
    }
    const start = startOfWeek(ref);
    const end = endOfWeek(ref);
    return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
  }

  if (period === 'month') {
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    if (scope === 'last') {
      m -= 1;
      if (m < 1) {
        m += 12;
        y -= 1;
      }
    }
    const start = startOfMonth(y, m);
    const end = endOfMonth(y, m);
    return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
  }

  if (period === 'year') {
    let y = now.getFullYear();
    if (scope === 'last') y -= 1;
    const start = startOfMonth(y, 1);
    const end = endOfMonth(y, 12);
    return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
  }

  return null;
}

function matchesSearch(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

const SEARCH_GRAM_SIZE = 3;

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSearchKeys(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  const keys = new Set<string>();
  const terms = normalized.split(' ').filter(Boolean);
  for (const term of terms) {
    keys.add(term);

    const maxGram = Math.min(SEARCH_GRAM_SIZE, term.length);
    for (let gramSize = 1; gramSize <= maxGram; gramSize += 1) {
      for (let i = 0; i <= term.length - gramSize; i += 1) {
        keys.add(term.slice(i, i + gramSize));
      }
    }
  }
  return Array.from(keys);
}

export interface BookingSearchIndex {
  tokenBuckets: Map<number, Set<string>>;
  normalizedTextById: Map<string, string>;
}

function getBookingSearchSource(row: BookingLinkedRow): string {
  return `${row.id} ${row.bookingId} ${row.unit} ${row.agent} ${row.guest}`;
}

export function buildBookingSearchIndex(rows: BookingLinkedRow[]): BookingSearchIndex {
  const tokenBuckets = new Map<number, Set<string>>();
  const normalizedTextById = new Map<string, string>();

  for (const row of rows) {
    const rowId = String(row.id);
    const normalized = normalizeSearchText(getBookingSearchSource(row));
    normalizedTextById.set(rowId, normalized);

    const keys = buildSearchKeys(normalized);
    for (const key of keys) {
      const hash = hashToken(key);
      const existing = tokenBuckets.get(hash);
      if (existing) {
        existing.add(rowId);
      } else {
        tokenBuckets.set(hash, new Set([rowId]));
      }
    }
  }

  return { tokenBuckets, normalizedTextById };
}

function findMatchingBookingIds(
  rows: BookingLinkedRow[],
  query: string,
  searchIndex?: BookingSearchIndex
): Set<string> | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const index = searchIndex ?? buildBookingSearchIndex(rows);
  const queryKeys = buildSearchKeys(normalizedQuery);
  if (queryKeys.length === 0) return new Set<string>();

  let candidates: Set<string> | null = null;

  for (const key of queryKeys) {
    const bucket = index.tokenBuckets.get(hashToken(key));
    if (!bucket || bucket.size === 0) return new Set<string>();

    if (!candidates) {
      candidates = new Set(bucket);
      continue;
    }

    for (const id of Array.from(candidates)) {
      if (!bucket.has(id)) candidates.delete(id);
    }

    if (candidates.size === 0) return candidates;
  }

  if (!candidates) return new Set<string>();

  const queryTerms = normalizedQuery.split(' ').filter(Boolean);
  const verified = new Set<string>();
  for (const rowId of candidates) {
    const text = index.normalizedTextById.get(rowId);
    if (!text) continue;
    if (queryTerms.every((term) => text.includes(term))) {
      verified.add(rowId);
    }
  }

  return verified;
}

/**
 * Filter booking rows by searchName, propertyType, location, and date range (check-in/check-out overlap).
 */
export function filterBookingRows(
  rows: BookingLinkedRow[],
  filters: SalesReportFilters,
  searchIndex?: BookingSearchIndex
): BookingLinkedRow[] {
  const matchedIds = findMatchingBookingIds(rows, filters.searchName, searchIndex);
  const dateRange = getDateRangeFromFilters(filters);

  return rows.filter((row) => {
    if (matchedIds && !matchedIds.has(String(row.id))) {
      return false;
    }
    if (filters.propertyType && filters.propertyType !== 'All') {
      if (row.unitType != null && row.unitType !== filters.propertyType) return false;
    }
    if (filters.location && filters.location !== 'All') {
      if (row.location != null && row.location !== filters.location) return false;
    }
    if (dateRange) {
      const checkIn = row.checkIn;
      const checkOut = row.checkOut;
      if (checkOut < dateRange.start || checkIn > dateRange.end) return false;
    }
    return true;
  });
}

/**
 * Filter damage incidents by searchName and date range (reportedAt).
 */
export function filterDamageIncidents(incidents: DamagePenalty[], filters: SalesReportFilters): DamagePenalty[] {
  const q = filters.searchName.trim().toLowerCase();
  const dateRange = getDateRangeFromFilters(filters);

  return incidents.filter((inc) => {
    if (q) {
      const match =
        matchesSearch(inc.bookingId, filters.searchName) ||
        matchesSearch(inc.unit, filters.searchName) ||
        matchesSearch(inc.description, filters.searchName) ||
        (inc.reportedBy != null && matchesSearch(inc.reportedBy, filters.searchName));
      if (!match) return false;
    }
    if (filters.propertyType && filters.propertyType !== 'All') {
      if (inc.unitType != null && inc.unitType !== filters.propertyType) return false;
    }
    if (filters.location && filters.location !== 'All') {
      if (inc.location != null && inc.location !== filters.location) return false;
    }
    if (dateRange) {
      const reported = inc.reportedAt;
      if (reported < dateRange.start || reported > dateRange.end) return false;
    }
    return true;
  });
}
