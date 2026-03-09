'use client';

interface AdminSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function AdminSection({
  title,
  subtitle,
  children,
  className = '',
  headerAction,
}: AdminSectionProps) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}
