'use client';

/** Returns true if value should display as "None" badge (null, empty, "none", "—", etc.) */
export function isNoneLike(value: string | null | undefined): boolean {
  if (value == null) return true;
  const s = String(value).trim().toLowerCase();
  return (
    s === '' ||
    s === 'none' ||
    s === '—' ||
    s === '-' ||
    s === 'unknown warehouse' ||
    s === 'n/a'
  );
}

/** Badge shown when warehouse/unit value is null or "none" */
export default function NoneBadge() {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gray-100 text-gray-600 border border-gray-200">
      None
    </span>
  );
}
