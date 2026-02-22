/**
 * Format monetary values for display (e.g. PHP 1.2M, 423.4k).
 */
export function formatPHP(value: number): string {
  if (value >= 1_000_000) {
    return `PHP ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `${k.toFixed(1)}k`;
  }
  return `PHP ${value.toLocaleString()}`;
}
