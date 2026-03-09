'use client';

type Accent = 'teal' | 'slate' | 'amber' | 'orange' | 'red' | 'green';

const ACCENT_STYLES: Record<Accent, { border: string; bg: string; value: string }> = {
  teal: {
    border: 'border-l-[#0B5858]',
    bg: 'bg-gradient-to-br from-[#0B5858]/5 to-transparent',
    value: 'text-[#0B5858]',
  },
  slate: {
    border: 'border-l-gray-500',
    bg: 'bg-gradient-to-br from-gray-500/5 to-transparent',
    value: 'text-gray-700',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'bg-gradient-to-br from-amber-500/5 to-transparent',
    value: 'text-amber-600',
  },
  orange: {
    border: 'border-l-orange-500',
    bg: 'bg-gradient-to-br from-orange-500/5 to-transparent',
    value: 'text-orange-600',
  },
  red: {
    border: 'border-l-red-500',
    bg: 'bg-gradient-to-br from-red-500/5 to-transparent',
    value: 'text-red-600',
  },
  green: {
    border: 'border-l-emerald-500',
    bg: 'bg-gradient-to-br from-emerald-500/5 to-transparent',
    value: 'text-emerald-600',
  },
};

interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  accent?: Accent;
}

export function AdminStatCard({
  label,
  value,
  valueClassName,
  accent = 'teal',
}: AdminStatCardProps) {
  const styles = ACCENT_STYLES[accent];
  const valueColor = valueClassName ?? styles.value;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300/80 ${styles.bg} border-l-4 ${styles.border}`}
      style={{ fontFamily: 'Poppins' }}
    >
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </div>
        <div className={`mt-2 text-3xl font-bold tabular-nums ${valueColor}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
