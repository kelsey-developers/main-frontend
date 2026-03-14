'use client';

import React from 'react';
import { BookingRequests } from './BookingRequestsView';

/**
 * Admin booking requests page. Renders the booking-requests UI inside the admin
 * layout so the sidebar remains visible (no Navbar/Footer).
 */
export default function AdminBookingRequestsPage() {
  return <BookingRequests embedded />;
}
