export type POStatus = 'pending' | 'partially-received' | 'received' | 'cancelled';

export const PO_STATUS_CONFIG: Record<
  POStatus,
  { label: string; bgClass: string; textClass: string; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-[#fffbeb]',
    textClass: 'text-[#e0b819]',
    dotColor: '#e0b819',
  },
  'partially-received': {
    label: 'Partially Received',
    bgClass: 'bg-[#fff7ed]',
    textClass: 'text-[#f18b0e]',
    dotColor: '#f18b0e',
  },
  received: {
    label: 'Received',
    bgClass: 'bg-[#f0fdf4]',
    textClass: 'text-[#15803d]',
    dotColor: '#15803d',
  },
  cancelled: {
    label: 'Cancelled',
    bgClass: 'bg-[#fef2f2]',
    textClass: 'text-[#f10e3b]',
    dotColor: '#f10e3b',
  },
};

export const formatPhp = (value: number) =>
  'PHP ' + value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
