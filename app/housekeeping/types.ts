/** A single cleaning task for a unit on a given day */
export interface CleaningTask {
  id: string;
  unit: string;
  /** Unit type e.g. Condo, Apartment */
  unitType?: string;
  /** Location/building */
  location?: string;
  /** Date of the cleaning (YYYY-MM-DD) */
  date: string;
  /** Task type e.g. turnover, inspection, deep clean */
  taskType: 'turnover' | 'inspection' | 'deep_clean' | 'restock';
  /** Check-out time or preferred window - optional */
  dueBy?: string;
  /** Whether the cleaner has marked this task as done */
  done: boolean;
  /** Optional booking/guest reference */
  bookingId?: string;
}
