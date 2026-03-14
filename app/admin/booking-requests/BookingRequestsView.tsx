'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CalendarRange, Banknote, Users, Mail, Phone, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getAllBookings, confirmBooking, declineBooking } from '@/lib/api/bookings';

interface Client {
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  profile_photo?: string;
}

interface Listing {
  title: string;
  location: string;
  main_image_url?: string;
}

interface Agent {
  id: string;
  fullname: string;
  email?: string;
  contact_number?: string;
  profile_photo?: string;
}

interface Booking {
  id: string;
  client: Client;
  listing: Listing;
  agent?: Agent;
  assigned_agent?: string;
  check_in_date: string;
  check_out_date: string;
  total_guests?: number;
  total_amount: number;
  request_description?: string;
  status: 'pending' | 'pending-payment' | 'booked' | 'ongoing' | 'completed' | 'declined' | 'cancelled';
  created_at: string;
  billing_document_url?: string;
  payment?: { payment_method?: string; reference_number?: string; status?: string; deposit_amount?: number };
  reference_code?: string;
  penciled_at?: string;
}

// Mock agents data (used when no agent from API)
const mockAgents: Agent[] = [
  { id: '1', fullname: 'John Doe', email: 'john@example.com', contact_number: '+63 912 345 6789' },
  { id: '2', fullname: 'Jane Smith', email: 'jane@example.com', contact_number: '+63 923 456 7890' },
  { id: '3', fullname: 'Robert Crown', email: 'robert@example.com', contact_number: '+63 934 567 8901' }
];

/** Map API booking item to Booking interface. raw_status: penciled->pending, confirmed->booked */
function apiToBooking(item: Record<string, unknown>): Booking {
  const agent = item.agent as Record<string, unknown> | null;
  const agentFullname = agent
    ? [agent.first_name, agent.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
    : '';
  const rawStatus = (item.raw_status as string) || 'penciled';
  const statusMap: Record<string, Booking['status']> = {
    penciled: 'pending',
    confirmed: 'booked',
    cancelled: 'cancelled',
    completed: 'completed',
  };
  const status = statusMap[rawStatus] || 'pending';
  const client = (item.client || {}) as Record<string, unknown>;
  const listing = (item.listing || {}) as Record<string, unknown>;
  return {
    id: String(item.id),
    client: {
      first_name: String(client.first_name || ''),
      last_name: String(client.last_name || ''),
      email: String(client.email || ''),
      contact_number: String(client.contact_number || ''),
    },
    listing: { title: String(listing.title || ''), location: String(listing.location || ''), main_image_url: listing.main_image_url as string | undefined },
    agent: agent ? { id: String(agent.id || ''), fullname: agentFullname, email: String(agent.email || '') } : undefined,
    check_in_date: String(item.check_in_date || ''),
    check_out_date: String(item.check_out_date || ''),
    total_guests: Number(item.total_guests) || 0,
    total_amount: Number(item.total_amount) || 0,
    status,
    created_at: String(item.created_at || item.penciled_at || ''),
    payment: (item.payment as Record<string, unknown> | null) || undefined,
    reference_code: item.reference_code as string | undefined,
    penciled_at: item.penciled_at as string | undefined,
  };
}

// Mock bookings data
const mockBookings: Booking[] = [
  {
    id: '1',
    status: 'pending',
    client: { first_name: 'Maria', last_name: 'Garcia', email: 'maria@example.com', contact_number: '+63 925 567 8901', profile_photo: '' },
    listing: { title: 'Beachfront Villa', location: 'Boracay' },
    agent: mockAgents[0],
    check_in_date: '2026-02-20',
    check_out_date: '2026-02-27',
    total_guests: 4,
    total_amount: 45000,
    request_description: 'Would appreciate an early check-in if possible',
    created_at: '2026-02-12T10:30:00Z'
  },
  {
    id: '2',
    status: 'pending',
    client: { first_name: 'James', last_name: 'Wilson', email: 'james@example.com', contact_number: '+63 936 678 9012', profile_photo: '' },
    listing: { title: 'Mountain Resort', location: 'Tagaytay' },
    check_in_date: '2026-02-25',
    check_out_date: '2026-03-05',
    total_guests: 8,
    total_amount: 67500,
    request_description: 'Need wheelchair accessibility',
    created_at: '2026-02-11T14:15:00Z'
  },
  {
    id: '3',
    status: 'pending-payment',
    client: { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@example.com', contact_number: '+63 947 789 0123', profile_photo: '' },
    listing: { title: 'City Apartment', location: 'Manila' },
    agent: mockAgents[1],
    check_in_date: '2026-02-18',
    check_out_date: '2026-02-22',
    total_guests: 2,
    total_amount: 25000,
    request_description: 'Business trip, need high-speed internet',
    created_at: '2026-02-10T09:45:00Z'
  },
  {
    id: '4',
    status: 'pending-payment',
    client: { first_name: 'Miguel', last_name: 'Rodriguez', email: 'miguel@example.com', contact_number: '+63 958 890 1234', profile_photo: '' },
    listing: { title: 'Island Bungalow', location: 'Palawan' },
    agent: mockAgents[2],
    check_in_date: '2026-03-10',
    check_out_date: '2026-03-17',
    total_guests: 5,
    total_amount: 56000,
    request_description: 'Honeymoon package',
    created_at: '2026-02-09T16:20:00Z'
  },
  {
    id: '5',
    status: 'booked',
    client: { first_name: 'Emily', last_name: 'Thompson', email: 'emily@example.com', contact_number: '+63 969 901 2345', profile_photo: '' },
    listing: { title: 'Luxury Villa', location: 'Cebu' },
    agent: mockAgents[0],
    check_in_date: '2026-02-16',
    check_out_date: '2026-02-19',
    total_guests: 8,
    total_amount: 120000,
    created_at: '2026-02-08T11:00:00Z'
  },
  {
    id: '6',
    status: 'declined',
    client: { first_name: 'David', last_name: 'Lee', email: 'david@example.com', contact_number: '+63 970 012 3456', profile_photo: '' },
    listing: { title: 'Garden House', location: 'Davao' },
    check_in_date: '2026-03-01',
    check_out_date: '2026-03-08',
    total_guests: 3,
    total_amount: 36000,
    created_at: '2026-02-07T13:30:00Z'
  }
];

/** Chip style — same shape as cleaning JobCard (backgroundColor, color, boxShadow) */
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const chipShadow = (r: number, g: number, b: number, a = 0.35) => `0 1px 0 rgba(${r},${g},${b},${a})`;

const BOOKING_STATUS_CHIPS: Record<Booking['status'], { label: string; chipStyle: ChipStyle }> = {
  pending:         { label: 'Pending',         chipStyle: { backgroundColor: '#fef3c7', color: '#92400e', boxShadow: chipShadow(245, 158, 11) } },
  'pending-payment': { label: 'Awaiting payment', chipStyle: { backgroundColor: '#e0f2fe', color: '#075985', boxShadow: chipShadow(14, 165, 233) } },
  booked:          { label: 'Booked',          chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  ongoing:         { label: 'Ongoing',         chipStyle: { backgroundColor: '#ccfbf1', color: '#115e59', boxShadow: chipShadow(20, 184, 166) } },
  completed:       { label: 'Completed',       chipStyle: { backgroundColor: '#ccfbf1', color: '#115e59', boxShadow: chipShadow(20, 184, 166) } },
  declined:        { label: 'Declined',        chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  cancelled:       { label: 'Cancelled',       chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
};

/** Shared card styles — matches admin overview/cleaning/payouts design system */
const CARD = {
  base: 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding: 'p-6',
  header: 'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  label: 'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  value: 'text-3xl font-bold text-gray-900 tracking-tight',
  subtitle: 'text-xs font-medium text-gray-500',
} as const;

/** Stat card label → booking status (dot uses same color as status chip) */
const STAT_LABEL_TO_STATUS: Record<string, Booking['status']> = {
  Pending: 'pending',
  'Awaiting Payment': 'pending-payment',
  Booked: 'booked',
  Declined: 'declined',
};

/** Stat card — same layout as agent/payouts: dot + label row, value, subtitle. Dot color matches status chip. */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const status = STAT_LABEL_TO_STATUS[label];
  const dotColor = status != null ? BOOKING_STATUS_CHIPS[status].chipStyle.backgroundColor : undefined;
  return (
    <div className={`${CARD.base} ${CARD.padding} hover:shadow-md transition-shadow relative`}>
      <div className="flex items-center gap-2.5 mb-4">
        {dotColor != null && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
            aria-hidden
          />
        )}
        <p className={CARD.label}>{label}</p>
      </div>
      <p className={CARD.value}>{value}</p>
      {sub != null && <p className={`${CARD.subtitle} mt-1 text-gray-400`}>{sub}</p>}
    </div>
  );
}

/** Dropdown — same format as agents directory: rounded-2xl, shadow, click-outside close */
function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm min-w-[140px]"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full right-0 mt-2 w-full min-w-[160px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** When embedded is true, Navbar and Footer are omitted (e.g. when shown inside admin layout). */
const BookingRequests: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalActive, setDetailModalActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const toastRef = useRef<HTMLDivElement | null>(null);
  
  // Decline confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalActive, setConfirmModalActive] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  // Confirm booking modal (full screen, penciled -> confirmed)
  const [showConfirmBookingModal, setShowConfirmBookingModal] = useState(false);
  const [confirmBookingModalActive, setConfirmBookingModalActive] = useState(false);
  const [pendingConfirmBooking, setPendingConfirmBooking] = useState<Booking | null>(null);
  
  // Payment confirmation modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalActive, setPaymentModalActive] = useState(false);
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState<Booking | null>(null);
  
  /** When embedded: start empty + loading (fetch from API). When not: use mock data. */
  const [allBookings, setAllBookings] = useState<Booking[]>(() => (embedded ? [] : mockBookings));
  const [summaryLoading, setSummaryLoading] = useState(embedded);
  const [sortBy, setSortBy] = useState(embedded ? 'Penciled (earliest first)' : 'Newest first');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Get user initials
  const getInitials = (firstName: string, lastName?: string) => {
    if (lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    return firstName.charAt(0).toUpperCase();
  };

  // Check if we have a valid photo URL
  const hasValidPhoto = (photoUrl?: string, errorKey?: string) => {
    if (!photoUrl) return false;
    if (typeof photoUrl !== 'string') return false;
    const trimmed = photoUrl.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false;
    if (errorKey && imageErrors[errorKey]) return false;
    return true;
  };

  // Handle image error
  const handleImageError = (errorKey: string) => {
    setImageErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  /** Check if URL looks like an image (for proof of payment) */
  const isImageUrl = (url: string | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url.trim());
  };

  // When embedded (admin), fetch penciled bookings from auth-service-backend (sorted by penciled_at ASC)
  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;
    setSummaryLoading(true);
    getAllBookings({ status: 'penciled', limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.data || []).map((item) => apiToBooking(item));
        setAllBookings(mapped);
      })
      .catch(() => {
        if (!cancelled) setAllBookings([]);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => { cancelled = true; };
  }, [embedded]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = toastRef.current;
        if (!el) return;
        el.classList.remove('toast--exit');
        el.offsetHeight;
        el.classList.add('toast--enter');
      });
    });
    window.setTimeout(() => {
      const el = toastRef.current;
      if (!el) return;
      el.classList.remove('toast--enter');
      el.classList.add('toast--exit');
    }, 2200);
  };

  // Handle booking click — open detail modal
  const handleBookingClick = (booking: Booking) => {
    const latestBooking = allBookings.find(b => b.id === booking.id) || booking;
    setSelectedBooking(latestBooking);
    requestAnimationFrame(() => setDetailModalActive(true));
  };

  // Close booking detail modal
  const closeDetailModal = () => {
    setDetailModalActive(false);
    setTimeout(() => setSelectedBooking(null), 250);
  };

  // Modal functions
  const openConfirmModal = (booking: Booking) => {
    setPendingBooking(booking);
    setShowConfirmModal(true);
    requestAnimationFrame(() => setConfirmModalActive(true));
  };

  const closeConfirmModal = () => {
    setConfirmModalActive(false);
    setTimeout(() => {
      setShowConfirmModal(false);
      setPendingBooking(null);
    }, 250);
  };

  const openConfirmBookingModal = (booking: Booking) => {
    setPendingConfirmBooking(booking);
    setShowConfirmBookingModal(true);
    requestAnimationFrame(() => setConfirmBookingModalActive(true));
  };

  const closeConfirmBookingModal = () => {
    setConfirmBookingModalActive(false);
    setTimeout(() => {
      setShowConfirmBookingModal(false);
      setPendingConfirmBooking(null);
    }, 250);
  };

  // Handle confirm booking (penciled -> confirmed)
  const handleConfirmBooking = async (booking: Booking) => {
    try {
      setIsProcessing(true);
      await confirmBooking(booking.id);
      showToast('Booking confirmed', 'success');
      closeConfirmBookingModal();
      // Refetch penciled bookings when embedded
      if (embedded) {
        const res = await getAllBookings({ status: 'penciled', limit: 100 });
        setAllBookings((res.data || []).map((item) => apiToBooking(item)));
      } else {
        setAllBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...booking, status: 'booked' as const } : b)));
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      showToast('Unable to confirm booking. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle decline action (penciled -> cancelled)
  const handleDecline = async () => {
    if (!pendingBooking) return;

    try {
      setIsProcessing(true);
      await declineBooking(pendingBooking.id);
      showToast('Booking request declined', 'success');
      closeConfirmModal();
      // Refetch penciled bookings when embedded
      if (embedded) {
        const res = await getAllBookings({ status: 'penciled', limit: 100 });
        setAllBookings((res.data || []).map((item) => apiToBooking(item)));
      } else {
        const updatedBooking = { ...pendingBooking, status: 'cancelled' as const };
        setAllBookings((prev) => prev.map((b) => (b.id === pendingBooking.id ? updatedBooking : b)));
      }
    } catch (error) {
      console.error('Error declining booking:', error);
      showToast('Unable to decline booking. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date range
  const formatDateRange = (checkIn: string, checkOut: string): string => {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return `${formatDate(startDate)} — ${formatDate(endDate)}`;
  };

  // Get summary stats
  const getSummaryStats = () => {
    const pending = allBookings.filter(b => b.status === 'pending').length;
    const awaitingPayment = allBookings.filter(b => b.status === 'pending-payment').length;
    const booked = allBookings.filter(b => ['booked', 'ongoing', 'completed'].includes(b.status)).length;
    const declined = allBookings.filter(b => ['declined', 'cancelled'].includes(b.status)).length;
    const total = allBookings.length;

    return { pending, awaitingPayment, booked, declined, total };
  };

  // Filter and sort bookings
  const getFilteredBookings = (bookings: Booking[]): Booking[] => {
    if (statusFilter === 'All Status') {
      return bookings;
    }
    
    return bookings.filter(booking => {
      switch (statusFilter) {
        case 'Pending':
          return booking.status === 'pending';
        case 'Awaiting Payment':
          return booking.status === 'pending-payment';
        case 'Booked':
          return ['booked', 'ongoing', 'completed'].includes(booking.status);
        case 'Declined':
          return ['declined', 'cancelled'].includes(booking.status);
        default:
          return true;
      }
    });
  };

  const getStatusOrder = (status: string): number => {
    const statusOrder: Record<string, number> = {
      'pending': 1,
      'pending-payment': 2,
      'booked': 3,
      'ongoing': 3,
      'completed': 3,
      'declined': 4,
      'cancelled': 4
    };
    return statusOrder[status] || 999;
  };

  const getSortedBookings = (bookings: Booking[], preserveStatusOrder: boolean = false): Booking[] => {
    const sorted = [...bookings];
    
    return sorted.sort((a, b) => {
      if (preserveStatusOrder) {
        const statusA = getStatusOrder(a.status);
        const statusB = getStatusOrder(b.status);
        if (statusA !== statusB) {
          return statusA - statusB;
        }
      }
      
      switch (sortBy) {
        case 'Newest first':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'Oldest first':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'Check-in (soonest)':
          return new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime();
        case 'Amount (high to low)':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'Amount (low to high)':
          return (a.total_amount || 0) - (b.total_amount || 0);
        default:
          return 0;
      }
    });
  };

  // Booking card — hierarchy: 1) Guest + listing, 2) Dates & amount, 3) Request preview, 4) Status/actions
  const BookingItem: React.FC<{ booking: Booking }> = ({ booking }) => {
    const guestName = `${booking.client.first_name} ${booking.client.last_name}`;
    const unitName = booking.listing.title;
    const location = booking.listing.location || '';
    const preview = booking.request_description
      ? (booking.request_description.length > 80 ? booking.request_description.substring(0, 80) + '…' : booking.request_description)
      : null;

    const isPending = booking.status === 'pending';
    const isAwaitingPayment = booking.status === 'pending-payment';
    const isBooked = ['booked', 'ongoing', 'completed'].includes(booking.status);
    const isDeclined = ['declined', 'cancelled'].includes(booking.status);

    return (
      <div
        onClick={() => handleBookingClick(booking)}
        className="relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-gray-200"
      >
        <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Primary: avatar + guest + listing */}
          <div className="flex gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shadow-sm"
                style={{
                  background: hasValidPhoto(booking.client?.profile_photo, `client-${booking.id}`)
                    ? 'transparent'
                    : 'linear-gradient(135deg, #0d9488, #0f766e)',
                }}
              >
                {hasValidPhoto(booking.client?.profile_photo, `client-${booking.id}`) ? (
                  <img
                    src={booking.client?.profile_photo}
                    alt={guestName}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(`client-${booking.id}`)}
                  />
                ) : (
                  <span className="text-white text-sm font-bold" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
                    {getInitials(booking.client.first_name, booking.client.last_name)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Poppins' }}>
                {guestName}
              </h3>
              <p className="text-sm font-medium text-gray-700 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                {unitName}
              </p>
              {location && (
                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Status chip — same style as /cleaning JobCard (rounded-full, chipStyle) */}
          <div className="flex-shrink-0 flex items-center justify-between sm:justify-end gap-3">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
              style={{ fontFamily: 'Poppins', ...BOOKING_STATUS_CHIPS[booking.status].chipStyle }}
            >
              {BOOKING_STATUS_CHIPS[booking.status].label}
            </span>
          </div>
        </div>

        {/* Secondary: dates, guests, amount (last) — smaller text, lucide icons */}
        <div className="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-gray-600 font-medium" style={{ fontFamily: 'Poppins' }}>
            <CalendarRange className="w-3.5 h-3.5 text-[#0B5858] shrink-0" aria-hidden />
            {formatDateRange(booking.check_in_date, booking.check_out_date)}
          </span>
          {booking.total_guests != null && booking.total_guests > 0 && (
            <span className="inline-flex items-center gap-1.5 text-gray-500" style={{ fontFamily: 'Poppins' }}>
              <Users className="w-3.5 h-3.5 text-[#0B5858] shrink-0" aria-hidden />
              {booking.total_guests} guest{booking.total_guests !== 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            <Banknote className="w-3.5 h-3.5 text-[#0B5858] shrink-0" aria-hidden />
            ₱{(booking.payment?.deposit_amount ?? booking.total_amount ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Request block — same style as cleaning JobCard: left accent bar, label, content */}
        <div className="px-5 pb-4 pt-0">
          <div className="pl-3 border-l-[3px] border-[#0B5858]/30 min-h-[44px] flex flex-col justify-center" style={{ fontFamily: 'Poppins' }}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Request</p>
            {preview ? (
              <p className="text-xs text-gray-700 leading-snug line-clamp-2">{preview}</p>
            ) : (
              <p className="text-xs text-gray-300 italic">No special requests</p>
            )}
          </div>
        </div>

        {/* Action buttons — bottom of card, centered and full-width; only for pending */}
        {isPending && (
          <div
            className="px-5 py-4 flex flex-wrap gap-3 justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => openConfirmModal(booking)}
              className="min-w-[120px] flex-1 max-w-[180px] px-5 py-2.5 border border-red-200 text-red-700 bg-red-50/50 text-sm font-bold rounded-xl hover:bg-red-100 transition-all active:scale-[0.98] cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => openConfirmBookingModal(booking)}
              className="min-w-[120px] flex-1 max-w-[180px] px-5 py-2.5 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={embedded ? 'min-h-0' : 'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'}>
      {!embedded && <Navbar />}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed right-0 top-24 pr-6 z-[2000] pointer-events-none">
          <div
            ref={toastRef}
            className="toast-base px-4 py-3 rounded-lg pointer-events-auto"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1F2937',
              fontFamily: 'Poppins',
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(10px)',
              borderLeft: `6px solid ${toast.type === 'success' ? '#0B5858' : '#B84C4C'}`
            }}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Booking detail modal — portaled to body so overlay + blur cover whole page (sidebar + nav) */}
      {selectedBooking && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-gray-900/50 backdrop-blur-sm overflow-y-auto"
          onClick={closeDetailModal}
        >
          <div
            className="w-full max-w-[min(calc(100vw-1.5rem),32rem)] max-h-[90vh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col transition-all duration-250 shrink-0 overflow-hidden"
            style={{
              transform: detailModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: detailModalActive ? 1 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const b = selectedBooking;
              const guestName = `${b.client.first_name} ${b.client.last_name}`;
              const isPending = b.status === 'pending';
              const assignedAgent = b.agent ?? (b.assigned_agent ? mockAgents.find(a => a.id === b.assigned_agent) : null);

              return (
                <>
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gray-50/30 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate" style={{ fontFamily: 'Poppins' }}>
                        Booking details
                      </h3>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow"
                        style={BOOKING_STATUS_CHIPS[b.status].chipStyle}
                      >
                        {BOOKING_STATUS_CHIPS[b.status].label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={closeDetailModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-5 sm:space-y-6" style={{ fontFamily: 'Poppins' }}>
                    {/* Client Information */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Client information</h4>
                      <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                          style={{
                            background: hasValidPhoto(b.client?.profile_photo, `detail-client-${b.id}`)
                              ? 'transparent'
                              : 'linear-gradient(135deg, #0d9488, #0f766e)',
                          }}
                        >
                          {hasValidPhoto(b.client?.profile_photo, `detail-client-${b.id}`) ? (
                            <img
                              src={b.client?.profile_photo}
                              alt={guestName}
                              className="w-full h-full object-cover"
                              onError={() => handleImageError(`detail-client-${b.id}`)}
                            />
                          ) : (
                            <span className="text-white text-sm font-bold">{getInitials(b.client.first_name, b.client.last_name)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm font-medium text-gray-900">{guestName}</span>
                          </div>
                          {b.client.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <a href={`mailto:${b.client.email}`} className="text-xs text-gray-700 truncate hover:text-[#0B5858]">{b.client.email}</a>
                            </div>
                          )}
                          {b.client.contact_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-700">{b.client.contact_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Agent */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Assigned agent</h4>
                      {assignedAgent ? (
                        <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                            style={{
                              background: hasValidPhoto(assignedAgent.profile_photo, `detail-agent-${b.id}`)
                                ? 'transparent'
                                : 'linear-gradient(135deg, #0d9488, #0f766e)',
                            }}
                          >
                            {hasValidPhoto(assignedAgent.profile_photo, `detail-agent-${b.id}`) ? (
                              <img
                                src={assignedAgent.profile_photo}
                                alt={assignedAgent.fullname}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(`detail-agent-${b.id}`)}
                              />
                            ) : (
                              <span className="text-white text-sm font-bold">
                                {assignedAgent.fullname
                                  ? (() => {
                                      const parts = assignedAgent.fullname.trim().split(/\s+/);
                                      return parts.length >= 2
                                        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                                        : (parts[0]?.[0] ?? 'A').toUpperCase();
                                    })()
                                  : 'A'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">{assignedAgent.fullname || 'Unknown'}</span>
                            </div>
                            {assignedAgent.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-700 truncate">{assignedAgent.email}</span>
                              </div>
                            )}
                            {assignedAgent.contact_number && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-700">{assignedAgent.contact_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs text-gray-500">No agent assigned</p>
                        </div>
                      )}
                    </div>

                    {/* Booking details — Unit, Location, Check-in, Check-out, Guests, Total */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Booking details</h4>
                      <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 shrink-0">Unit</span>
                          <span className="text-xs text-gray-900 text-right">{b.listing?.title || '—'}</span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 shrink-0">Location</span>
                          <span className="text-xs text-gray-900 text-right">{b.listing?.location || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 shrink-0">Check-in</span>
                          <span className="text-xs text-gray-900">
                            {new Date(b.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 shrink-0">Check-out</span>
                          <span className="text-xs text-gray-900">
                            {new Date(b.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {b.total_guests != null && b.total_guests > 0 && (
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Guests</span>
                            <span className="text-xs text-gray-900">{b.total_guests} guest{b.total_guests !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-2 pt-1 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-600 shrink-0">Total</span>
                          <span className="text-sm font-bold text-gray-900">₱{(b.payment?.deposit_amount ?? b.total_amount ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Special request — full text, left accent */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2">Special request</h4>
                      <div className="pl-3 border-l-[3px] border-[#0B5858]/30 min-h-[36px] flex flex-col justify-center">
                        {b.request_description ? (
                          <p className="text-xs text-gray-700 leading-relaxed">{b.request_description}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No special requests</p>
                        )}
                      </div>
                    </div>

                    {/* Proof of payment — if billing_document_url */}
                    {b.billing_document_url && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Proof of payment</h4>
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                          {isImageUrl(b.billing_document_url) ? (
                            <img
                              src={b.billing_document_url}
                              alt="Proof of payment"
                              className="w-full max-h-48 sm:max-h-64 object-contain rounded-lg border border-gray-200"
                            />
                          ) : (
                            <a
                              href={b.billing_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View document
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center shrink-0">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => { closeDetailModal(); openConfirmModal(b); }}
                          className="w-full sm:w-auto min-w-0 sm:min-w-[140px] px-5 py-2.5 border border-red-200 text-red-700 bg-red-50/50 text-sm font-bold rounded-xl hover:bg-red-100 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => { closeDetailModal(); openConfirmBookingModal(b); }}
                          className="w-full sm:w-auto min-w-0 sm:min-w-[140px] px-5 py-2.5 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Confirm
                        </button>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Booking Modal — full screen, booking + payment details */}
      {showConfirmBookingModal && pendingConfirmBooking && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm overflow-y-auto"
          onClick={closeConfirmBookingModal}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col transition-all duration-250 shrink-0 overflow-hidden"
            style={{
              transform: confirmBookingModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: confirmBookingModalActive ? 1 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const b = pendingConfirmBooking;
              const guestName = `${b.client.first_name} ${b.client.last_name}`;
              const assignedAgent = b.agent ?? (b.assigned_agent ? mockAgents.find((a) => a.id === b.assigned_agent) : null);

              return (
                <>
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gray-50/30 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate" style={{ fontFamily: 'Poppins' }}>
                        Confirm Booking
                      </h3>
                      {b.reference_code && (
                        <span className="text-xs font-medium text-gray-500 truncate">{b.reference_code}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closeConfirmBookingModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-5 sm:space-y-6" style={{ fontFamily: 'Poppins' }}>
                    {/* Client Information */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Client information</h4>
                      <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-gradient-to-br from-teal-600 to-teal-700">
                          <span className="text-white text-sm font-bold">
                            {getInitials(b.client.first_name, b.client.last_name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm font-medium text-gray-900">{guestName}</span>
                          </div>
                          {b.client.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <a href={`mailto:${b.client.email}`} className="text-xs text-gray-700 truncate hover:text-[#0B5858]">{b.client.email}</a>
                            </div>
                          )}
                          {b.client.contact_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-700">{b.client.contact_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Agent */}
                    {assignedAgent && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Assigned agent</h4>
                        <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-gradient-to-br from-teal-600 to-teal-700">
                            <span className="text-white text-sm font-bold">
                              {assignedAgent.fullname ? assignedAgent.fullname.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'A'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <span className="text-sm font-medium text-gray-900">{assignedAgent.fullname || 'Unknown'}</span>
                            {assignedAgent.email && <span className="text-xs text-gray-700 block">{assignedAgent.email}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking details */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Booking details</h4>
                      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {b.listing?.main_image_url && (
                          <div className="shrink-0 w-24 sm:w-32 h-24 sm:h-32">
                            <img
                              src={b.listing.main_image_url}
                              alt={b.listing?.title || 'Unit'}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Unit</span>
                            <span className="text-xs text-gray-900 text-right">{b.listing?.title || '—'}</span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Location</span>
                            <span className="text-xs text-gray-900 text-right">{b.listing?.location || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Check-in</span>
                            <span className="text-xs text-gray-900">{new Date(b.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Check-out</span>
                            <span className="text-xs text-gray-900">{new Date(b.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {b.total_guests != null && b.total_guests > 0 && (
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-medium text-gray-600 shrink-0">Guests</span>
                              <span className="text-xs text-gray-900">{b.total_guests} guest{b.total_guests !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-start gap-2 pt-1 border-t border-gray-100">
                            <span className="text-xs font-medium text-gray-600 shrink-0">Total</span>
                            <span className="text-sm font-bold text-gray-900">₱{(b.payment?.deposit_amount ?? b.total_amount ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment information */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Payment</h4>
                      <div className="space-y-2 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {b.payment ? (
                          <>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-medium text-gray-600 shrink-0">Method</span>
                              <span className="text-xs text-gray-900 capitalize">{b.payment.payment_method || '—'}</span>
                            </div>
                            {b.payment.reference_number && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-medium text-gray-600 shrink-0">Reference</span>
                                <span className="text-xs text-gray-900">{b.payment.reference_number}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-medium text-gray-600 shrink-0">Status</span>
                              <span className="text-xs font-medium capitalize">{b.payment.status || 'pending'}</span>
                            </div>
                            {b.payment.deposit_amount != null && (
                              <div className="flex justify-between items-start gap-2 pt-1 border-t border-gray-100">
                                <span className="text-xs font-medium text-gray-600 shrink-0">Deposit</span>
                                <span className="text-sm font-bold text-gray-900">₱{Number(b.payment.deposit_amount).toLocaleString()}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">No payment record</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/30 flex flex-wrap gap-3 justify-center shrink-0">
                    <button
                      type="button"
                      onClick={closeConfirmBookingModal}
                      className="min-w-[120px] px-5 py-2.5 border border-gray-300 text-gray-700 bg-white text-sm font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmBooking(b)}
                      disabled={isProcessing}
                      className="min-w-[120px] px-5 py-2.5 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .toast-base { transform: translateX(100%); opacity: 0; transition: transform .28s ease-out, opacity .28s ease-out; }
        .toast--enter { transform: translateX(0); opacity: 1; }
        .toast--exit { transform: translateX(100%); opacity: 0; }
      `}</style>

      {/* Main content — space-y-6 layout; when embedded, layout provides max-w-7xl */}
      {(() => {
        const stats = getSummaryStats();
        /** Single fade-in for entire content so header, stats, filter, list appear together. When embedded, layout already wraps with animate-fade-in-up; when not, we add it here. */
        const content = (
          <div className={`space-y-6 ${!embedded ? 'animate-fade-in-up' : ''}`}>
            {/* Page header — same pattern as admin overview: title left, optional actions right */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Booking Requests</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Review and manage guest booking requests, approvals, and payments.
                </p>
              </div>
              {!embedded && (
                <a
                  href="/admin"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#0B5858]/30 text-[#0B5858] bg-white text-sm font-bold rounded-2xl hover:bg-[#0B5858]/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </a>
              )}
            </div>

            {/* Summary stats — same StatCard style as admin overview (no icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard label="Pending" value={stats.pending} sub="Awaiting approval" />
              <StatCard label="Awaiting Payment" value={stats.awaitingPayment} sub="Guest must pay" />
              <StatCard label="Booked" value={stats.booked} sub="Confirmed & ongoing" />
              <StatCard label="Declined" value={stats.declined} sub="Declined or cancelled" />
            </div>

            {/* Filter bar — dropdowns same format as agents directory, left-aligned */}
            <div className="flex flex-wrap gap-3 items-center justify-start">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'All Status', label: 'All Status' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Awaiting Payment', label: 'Awaiting Payment' },
                  { value: 'Booked', label: 'Booked' },
                  { value: 'Declined', label: 'Declined' },
                ]}
                className="min-w-[160px]"
              />
              <CustomDropdown
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'Penciled (earliest first)', label: 'Penciled (earliest first)' },
                  { value: 'Newest first', label: 'Newest first' },
                  { value: 'Oldest first', label: 'Oldest first' },
                  { value: 'Check-in (soonest)', label: 'Check-in (soonest)' },
                  { value: 'Amount (high to low)', label: 'Amount (high to low)' },
                  { value: 'Amount (low to high)', label: 'Amount (low to high)' },
                ]}
                className="min-w-[180px]"
              />
            </div>

            {/* List area — show loading state when fetching, not mock data */}
            {summaryLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[280px] flex flex-col items-center justify-center gap-4 p-12">
                <div className="w-10 h-10 border-2 border-[#0B5858]/30 border-t-[#0B5858] rounded-full animate-spin" aria-hidden />
                <p className="text-sm font-medium text-gray-500">Loading bookings...</p>
              </div>
            ) : getFilteredBookings(allBookings).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const filtered = getFilteredBookings(allBookings);
                  const preserveStatusOrder = statusFilter === 'All Status';
                  return getSortedBookings(filtered, preserveStatusOrder).map((booking) => (
                    <BookingItem key={booking.id} booking={booking} />
                  ));
                })()}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1">
                  No {statusFilter === 'All Status' ? 'Bookings' : statusFilter} Requests
                </h3>
                <p className="text-sm text-gray-500">
                  {statusFilter === 'All Status' ? 'No bookings found' : `No ${statusFilter.toLowerCase()} booking requests`}
                </p>
              </div>
            )}
          </div>
        );
        return embedded ? content : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            {content}
          </div>
        );
      })()}

      {/* Decline Confirmation Modal — full screen like Confirm */}
      {showConfirmModal && pendingBooking && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm overflow-y-auto"
          onClick={closeConfirmModal}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col transition-all duration-250 shrink-0 overflow-hidden"
            style={{
              transform: confirmModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: confirmModalActive ? 1 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const b = pendingBooking;
              const guestName = `${b.client.first_name} ${b.client.last_name}`;

              return (
                <>
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gray-50/30 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate" style={{ fontFamily: 'Poppins' }}>
                        Decline Booking Request
                      </h3>
                      {b.reference_code && (
                        <span className="text-xs font-medium text-gray-500 truncate">{b.reference_code}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closeConfirmModal}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer shrink-0"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-5 sm:space-y-6" style={{ fontFamily: 'Poppins' }}>
                    <p className="text-gray-700">
                      Are you sure you want to decline this booking request? This action cannot be undone.
                    </p>

                    {/* Client */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Client</h4>
                      <div className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-teal-600 to-teal-700">
                          <span className="text-white text-sm font-bold">{getInitials(b.client.first_name, b.client.last_name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">{guestName}</span>
                          {b.client.email && <p className="text-xs text-gray-600 mt-0.5">{b.client.email}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Booking summary */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Booking</h4>
                      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {b.listing?.main_image_url && (
                          <div className="shrink-0 w-24 sm:w-32 h-24 sm:h-32">
                            <img
                              src={b.listing.main_image_url}
                              alt={b.listing?.title || 'Unit'}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-gray-900">{b.listing?.title || '—'}</p>
                          <p className="text-xs text-gray-600">{b.listing?.location || 'N/A'}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(b.check_in_date).toLocaleDateString('en-US')} — {new Date(b.check_out_date).toLocaleDateString('en-US')}
                          </p>
                          <p className="text-sm font-bold text-gray-900">₱{(b.payment?.deposit_amount ?? b.total_amount ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50/30 flex flex-wrap gap-3 justify-center shrink-0">
                    <button
                      type="button"
                      onClick={closeConfirmModal}
                      className="min-w-[120px] px-5 py-2.5 border border-gray-300 text-gray-700 bg-white text-sm font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDecline}
                      disabled={isProcessing}
                      className="min-w-[120px] px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: '#B84C4C' }}
                    >
                      {isProcessing ? 'Processing...' : 'Decline'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {!embedded && <Footer />}
    </div>
  );
};

export { BookingRequests };
