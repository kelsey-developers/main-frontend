'use client';

interface AdminPageHeaderProps {
  title: string;
  description: string;
}

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
        {title}
      </h1>
      <p className="text-sm text-gray-600 max-w-3xl" style={{ fontFamily: 'Poppins' }}>
        {description}
      </p>
    </div>
  );
}
