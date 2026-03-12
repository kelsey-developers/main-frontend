/** Philippine Standard Time (Asia/Manila, UTC+8) */

const PH_TIMEZONE = 'Asia/Manila';

/**
 * Returns today's date in YYYY-MM-DD format, in Philippine Standard Time.
 * Use for form defaults (order date, receipt date, etc.) so all users see the same date.
 */
export function getTodayInPhilippineTime(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
