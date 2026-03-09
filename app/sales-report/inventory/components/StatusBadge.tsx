'use client';

type StatusBadgeStyle = {
  activeContainerClass: string;
  inactiveContainerClass: string;
  activeDotClass: string;
  inactiveDotClass: string;
};

type CustomStatusConfig = {
  label: string;
  bgClass: string;
  textClass: string;
  dotColor: string;
};

const defaultStyle: StatusBadgeStyle = {
  activeContainerClass: 'bg-green-50 text-green-700 border border-green-200',
  inactiveContainerClass: 'bg-gray-50 text-gray-500 border border-gray-200',
  activeDotClass: 'bg-green-500',
  inactiveDotClass: 'bg-gray-400',
};

export default function StatusBadge({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  styleConfig,
  className = '',
  // New props for custom status types (e.g., PO status, stock status)
  status,
  statusConfig,
}: {
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  styleConfig?: Partial<StatusBadgeStyle>;
  className?: string;
  status?: string;
  statusConfig?: Record<string, CustomStatusConfig>;
}) {
  // If using custom status config
  if (status && statusConfig && statusConfig[status]) {
    const cfg = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cfg.bgClass} ${cfg.textClass} ${className}`.trim()}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />
        {cfg.label}
      </span>
    );
  }

  // Original active/inactive style
  const style = { ...defaultStyle, ...styleConfig };
  const containerClass = active ? style.activeContainerClass : style.inactiveContainerClass;
  const dotClass = active ? style.activeDotClass : style.inactiveDotClass;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide ${containerClass} ${className}`.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
