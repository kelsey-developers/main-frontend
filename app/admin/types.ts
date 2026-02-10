export interface AdminStats {
  totalUsers: number;
  totalBookings: number;
  totalListings: number;
  monthlyBookings: number;
  revenue: number;
}

export interface ChartData {
  name: string;
  value?: number;
  bookings?: number;
  revenue?: number;
  users?: number;
}
