export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalRent: number;
  totalRentUnits: number;
}

export interface SalesTrendPoint {
  name: string;
  value: number;
}

export interface RevenueByTypeItem {
  name: string;
  value: number;
  color: string;
}

export interface TopUnit {
  id: string;
  title: string;
  location: string;
  totalSales: number;
  imageUrl: string;
}

export interface SalesReportFilters {
  searchName: string;
  propertyType: string;
  location: string;
  timePeriodStart: string;
  timePeriodEnd: string;
}
