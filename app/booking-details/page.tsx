import { redirect } from 'next/navigation';

/** /booking-details without reference redirects to /booking */
export default function BookingDetailsIndex() {
  redirect('/booking');
}
