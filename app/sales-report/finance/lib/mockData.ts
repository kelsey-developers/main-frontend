import type {
  FinanceDashboardSummary,
  SalesTrendPoint,
  RevenueByTypeItem,
  TopUnit,
  RevenueByProperty,
  RevenueByChannel,
  RevenueByAgent,
  BookingLinkedRow,
  ChargeType,
  DamagePenaltyMonth,
} from '../types';

export const mockDashboardSummary: FinanceDashboardSummary = {
  totalSales: 1_200_000,
  totalRevenue: 1_500_000,
  totalRent: 200_000,
  totalRentUnits: 0,
};

export const mockSalesTrend: SalesTrendPoint[] = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 520 },
  { name: 'Mar', value: 480 },
  { name: 'Apr', value: 600 },
  { name: 'May', value: 750 },
  { name: 'Jun', value: 820 },
  { name: 'Jul', value: 900 },
  { name: 'Aug', value: 1100 },
  { name: 'Sep', value: 1300 },
  { name: 'Oct', value: 1500 },
  { name: 'Nov', value: 1800 },
  { name: 'Dec', value: 2400 },
];

export const mockRevenueByType: RevenueByTypeItem[] = [
  { name: 'Condo', value: 35, color: '#22c55e' },
  { name: 'Apartment', value: 30, color: '#3b82f6' },
  { name: 'Penthouse', value: 20, color: '#ef4444' },
  { name: 'House', value: 15, color: '#f97316' },
];

export const mockRevenueByProperty: RevenueByProperty[] = [
  { propertyId: '1', propertyName: 'Condo A', revenue: 420_000, bookingCount: 45 },
  { propertyId: '2', propertyName: 'Apartment B', revenue: 380_000, bookingCount: 52 },
  { propertyId: '3', propertyName: 'Penthouse C', revenue: 250_000, bookingCount: 18 },
  { propertyId: '4', propertyName: 'House D', revenue: 150_000, bookingCount: 12 },
];

export const mockRevenueByChannel: RevenueByChannel[] = [
  { channel: 'Airbnb', revenue: 600_000, bookingCount: 80, percentage: 48 },
  { channel: 'direct', revenue: 450_000, bookingCount: 35, percentage: 36 },
  { channel: 'corporate', revenue: 200_000, bookingCount: 12, percentage: 16 },
];

export const mockRevenueByAgent: RevenueByAgent[] = [
  { agentId: '1', agentName: 'Maria Santos', revenue: 380_000, bookingCount: 42 },
  { agentId: '2', agentName: 'Juan Dela Cruz', revenue: 320_000, bookingCount: 38 },
  { agentId: '3', agentName: 'Ana Reyes', revenue: 280_000, bookingCount: 35 },
];

export const mockTopUnits: TopUnit[] = [
  {
    id: '1',
    title: 'Apartment complex in Davao',
    location: 'Matina, Davao City',
    totalSales: 234_000,
    imageUrl: '/heroimage.png',
  },
  {
    id: '2',
    title: 'Apartment complex in Davao',
    location: 'Matina, Davao City',
    totalSales: 234_000,
    imageUrl: '/heroimage.png',
  },
  {
    id: '3',
    title: 'Apartment complex in Davao',
    location: 'Matina, Davao City',
    totalSales: 234_000,
    imageUrl: '/heroimage.png',
  },
];

export const mockBookingLinkedRows: BookingLinkedRow[] = [
  { id: '1', bookingId: 'BK-1024', unit: 'Unit 711', checkIn: '2025-02-01', checkOut: '2025-02-05', guestType: 'Airbnb', basePrice: 12000, discounts: 500, extraHeads: 800, extraHours: 500, addOns: ['Pool', 'Towels'], total: 13800 },
  { id: '2', bookingId: 'BK-1023', unit: 'Unit 712', checkIn: '2025-02-03', checkOut: '2025-02-07', guestType: 'direct', basePrice: 15000, discounts: 0, extraHeads: 0, extraHours: 1200, addOns: ['Early check-in'], total: 16200 },
  { id: '3', bookingId: 'BK-1022', unit: 'A-1 Davao', checkIn: '2025-02-05', checkOut: '2025-02-10', guestType: 'corporate', basePrice: 22000, discounts: 2000, extraHeads: 1600, extraHours: 0, addOns: ['Cleaning fee', 'Towels'], total: 21600 },
];

export const mockChargeTypes: ChargeType[] = [
  { id: '1', name: 'Extra head fee', description: 'Per additional guest', defaultAmount: 400, appliedToBills: true, exampleLabel: 'Pulled into bill when extra heads selected' },
  { id: '2', name: 'Pool fee', description: 'One-time or per stay', defaultAmount: 500, appliedToBills: true, exampleLabel: 'Added when pool access is selected' },
  { id: '3', name: 'Early check-in / late check-out', description: 'Per hour or fixed', appliedToBills: true, exampleLabel: 'Applied based on actual times' },
  { id: '4', name: 'Cleaning fee', description: 'Per stay', defaultAmount: 800, appliedToBills: true, exampleLabel: 'Included in receipt automatically' },
];

export const mockDamagePenaltyMonths: DamagePenaltyMonth[] = [
  { month: 'Jan 2025', chargedToGuest: 4200, absorbed: 1800, totalLoss: 6000, incidentCount: 5 },
  { month: 'Feb 2025', chargedToGuest: 3100, absorbed: 900, totalLoss: 4000, incidentCount: 4 },
];
