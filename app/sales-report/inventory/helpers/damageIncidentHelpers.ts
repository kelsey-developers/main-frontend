/** Backend damage incident status values (API): only open or resolved. */
export type DamageIncidentStatus = 'open' | 'resolved';

/** Human-readable labels for status (open vs resolved only). */
export const DAMAGE_STATUS_LABELS: Record<DamageIncidentStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
};

/** Settlement type derived from amounts when displaying (not stored as status). */
export type SettlementType = 'absorbed' | 'charged_to_guest' | 'charged_and_absorbed';

/** Labels for settlement display (from amounts). */
export const SETTLEMENT_LABELS: Record<SettlementType, string> = {
  absorbed: 'Absorbed',
  charged_to_guest: 'Charged to guest',
  charged_and_absorbed: 'Charged and absorbed',
};

/**
 * Derive settlement type from charged/absorbed amounts (for display only).
 * If both are 0, returns null. Otherwise: absorbed only, charged only, or both.
 */
export function getSettlementFromAmounts(
  chargedToGuest: number | undefined,
  absorbedAmount: number | undefined
): SettlementType | null {
  const charged = Math.max(0, Number(chargedToGuest) || 0);
  const absorbed = Math.max(0, Number(absorbedAmount) || 0);
  if (charged === 0 && absorbed === 0) return null;
  if (charged > 0 && absorbed === 0) return 'charged_to_guest';
  if (charged === 0 && absorbed > 0) return 'absorbed';
  return 'charged_and_absorbed';
}

/**
 * Normalize API status to open | resolved.
 * Backend may return open, resolved, or legacy values (charged_to_guest, absorbed, settled, in_review).
 */
export function normalizeDamageStatus(raw: string | undefined): DamageIncidentStatus {
  const s = (raw ?? 'open').toLowerCase().replace(/\s/g, '_');
  if (s === 'open') return 'open';
  if (
    s === 'resolved' ||
    s === 'charged_to_guest' ||
    s === 'absorbed' ||
    s === 'settled' ||
    s === 'in-review' ||
    s === 'in_review'
  )
    return 'resolved';
  return 'open';
}

/** True if status allows editing charged/absorbed amounts */
export function canEditChargedAbsorbed(status: DamageIncidentStatus): boolean {
  return status === 'resolved';
}

/** True when transitioning from open to resolved (sets resolvedAt) */
export function isTransitioningToSettled(
  newStatus: DamageIncidentStatus,
  prevStatus: string | undefined
): boolean {
  if (newStatus !== 'resolved') return false;
  const prev = normalizeDamageStatus(prevStatus);
  return prev === 'open';
}

/** True if status shows resolution section (notes, resolved by/at) */
export function isResolvedStatus(status: DamageIncidentStatus): boolean {
  return status === 'resolved';
}

/** Inventory action: write_off = deduct from inventory (do Stock Out); record_only = no deduction. */
export type InventoryActionType = 'write_off' | 'record_only';

export const INVENTORY_ACTION_LABELS: Record<InventoryActionType, string> = {
  write_off: 'Write off',
  record_only: 'Record only',
};

export function getInventoryActionLabel(raw: string | undefined): string {
  const v = (raw ?? 'write_off').toLowerCase().replace(/\s/g, '_');
  if (v === 'record_only') return INVENTORY_ACTION_LABELS.record_only;
  return INVENTORY_ACTION_LABELS.write_off;
}

export function normalizeInventoryAction(raw: string | undefined): InventoryActionType {
  const v = (raw ?? 'write_off').toLowerCase().replace(/\s/g, '_');
  return v === 'record_only' ? 'record_only' : 'write_off';
}

/**
 * Parse inventory action from description first line. API has no inventoryAction field;
 * first two words of description are "Write off" or "Record only".
 */
export function parseInventoryActionFromDescription(description: string | undefined | null): InventoryActionType {
  const firstLine = (description ?? '').trim().split('\n')[0] ?? '';
  const firstTwoWords = firstLine.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
  return firstTwoWords === 'record only' ? 'record_only' : 'write_off';
}

/**
 * Get the reason part from the first line (after "Write off - " or "Record only - ").
 */
export function getReasonFromDescriptionFirstLine(description: string | undefined | null): string {
  const firstLine = (description ?? '').trim().split('\n')[0] ?? '';
  return firstLine.replace(/^(?:Write off|Record only)\s*[-–—]\s*/i, '').trim();
}

/** Label for embedding in description first line. */
export function getInventoryActionDescriptionLabel(action: InventoryActionType): string {
  return action === 'record_only' ? 'Record only' : 'Write off';
}
