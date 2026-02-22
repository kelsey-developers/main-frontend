import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  description: string;
  accentColor: 'green' | 'blue' | 'yellow';
}

const accentClasses = {
  green: 'bg-green-200',
  blue: 'bg-blue-200',
  yellow: 'bg-amber-200',
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  description,
  accentColor,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 flex items-center justify-between border border-gray-100 overflow-hidden">
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium text-gray-600 mb-0.5"
          style={{ fontFamily: 'Poppins' }}
        >
          {title}
        </p>
        <p
          className="text-2xl font-bold text-gray-900 truncate"
          style={{ fontFamily: 'Poppins' }}
        >
          {value}
        </p>
        <p
          className="text-xs text-gray-500 mt-0.5"
          style={{ fontFamily: 'Poppins' }}
        >
          {description}
        </p>
      </div>
      <div
        className={`w-12 h-12 rounded-lg flex-shrink-0 ${accentClasses[accentColor]}`}
        aria-hidden
      />
    </div>
  );
};

export default SummaryCard;
