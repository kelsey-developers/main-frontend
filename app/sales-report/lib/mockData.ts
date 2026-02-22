import type {
  SalesSummary,
  SalesTrendPoint,
  RevenueByTypeItem,
  TopUnit,
} from '../types';

export const mockSummary: SalesSummary = {
  totalSales: 1_200_000,
  totalRevenue: 1_500_000,
  totalRent: 423_400,
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
