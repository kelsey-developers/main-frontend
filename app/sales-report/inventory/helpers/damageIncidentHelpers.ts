/** Backend damage incident status values (API) */
export type DamageIncidentStatus = 'open' | 'charged_to_guest' | 'absorbed' | 'settled';

/** Human-readable labels for status filter/display */
export const DAMAGE_STATUS_LABELS: Record<DamageIncidentStatus, string> = {
  open: 'Open',
  charged_to_guest: 'Charged to guest',
  absorbed: 'Absorbed',
  settled: 'Settled',
};

/** Normalize API status to backend value. Handles legacy values (in-review, resolved). */
export function normalizeDamageStatus(raw: string | undefined): DamageIncidentStatus {
  const s = (raw ?? 'open').toLowerCase().replace(/\s/g, '_');
  if (s === 'open') return 'open';
  if (s === 'charged_to_guest') return 'charged_to_guest';
  if (s === 'absorbed') return 'absorbed';
  if (s === 'settled') return 'settled';
  if (s === 'in-review' || s === 'in_review' || s === 'resolved') return 'settled';
  return 'open';
}

/** True if status allows editing charged/absorbed amounts */
export function canEditChargedAbsorbed(status: DamageIncidentStatus): boolean {
  return status !== 'open';
}

/** True when transitioning to settled (sets resolvedBy/resolvedAt) */
export function isTransitioningToSettled(
  newStatus: DamageIncidentStatus,
  prevStatus: string | undefined
): boolean {
  if (newStatus !== 'settled') return false;
  const prev = normalizeDamageStatus(prevStatus);
  return prev !== 'settled';
}

/** True if status shows resolution section (notes, resolved by/at) */
export function isResolvedStatus(status: DamageIncidentStatus): boolean {
  return status === 'charged_to_guest' || status === 'absorbed' || status === 'settled';
}
