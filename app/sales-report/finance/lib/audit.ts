import type { AuditEntry, AuditDataKind, SalesReportFilters } from '../types';

const STORAGE_KEY = 'finance-audit-trail';
const MAX_ENTRIES = 100;

let inMemoryEntries: AuditEntry[] = [];

function loadFromStorage(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: AuditEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

export function getAuditEntries(): AuditEntry[] {
  if (inMemoryEntries.length === 0) {
    inMemoryEntries = loadFromStorage();
  }
  return [...inMemoryEntries].sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
}

export function logExport(
  dataKind: AuditDataKind,
  format: 'csv' | 'pdf',
  filters: SalesReportFilters,
  recordCount: number
): void {
  const full: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    action: 'export',
    dataKind,
    format,
    filters: { ...filters },
    recordCount,
    timestamp: new Date().toISOString(),
  };
  if (inMemoryEntries.length === 0) {
    inMemoryEntries = loadFromStorage();
  }
  inMemoryEntries = [...inMemoryEntries, full].slice(-MAX_ENTRIES);
  saveToStorage(inMemoryEntries);
}
