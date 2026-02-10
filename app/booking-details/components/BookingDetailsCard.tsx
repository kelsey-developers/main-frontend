import React from 'react';

interface BookingDetailsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const BookingDetailsSection: React.FC<BookingDetailsSectionProps> = ({
  title,
  children
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h4 className="text-base font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>
        {title}
      </h4>
      {children}
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
}

export const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  icon
}) => {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word', fontFamily: 'Poppins' }}>
          {value}
        </div>
      </div>
    </div>
  );
};

interface ChargeLineProps {
  label: string;
  amount: string;
  isTotal?: boolean;
}

export const ChargeLine: React.FC<ChargeLineProps> = ({
  label,
  amount,
  isTotal = false
}) => {
  return (
    <div className={`flex justify-between ${isTotal ? 'border-t border-gray-200 mt-4 pt-3' : ''}`}>
      <span className={isTotal ? 'font-semibold' : ''}>{label}</span>
      <span className={isTotal ? 'font-bold text-lg' : ''}>{amount}</span>
    </div>
  );
};

export default BookingDetailsSection;
