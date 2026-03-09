'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
  num_guests?: number;
  extra_guests?: number;
  total_amount: number;
  request_description?: string;
  status: 'pending' | 'pending-payment' | 'booked' | 'ongoing' | 'completed' | 'declined' | 'cancelled';
  created_at: string;
  billing_document_url?: string;
}

// Mock agents data
const mockAgents: Agent[] = [
  { id: '1', fullname: 'John Doe', email: 'john@example.com', contact_number: '+63 912 345 6789' },
  { id: '2', fullname: 'Jane Smith', email: 'jane@example.com', contact_number: '+63 923 456 7890' },
  { id: '3', fullname: 'Robert Crown', email: 'robert@example.com', contact_number: '+63 934 567 8901' }
];

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
    num_guests: 4,
    extra_guests: 0,
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
    num_guests: 6,
    extra_guests: 2,
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
    num_guests: 2,
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
    num_guests: 5,
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
    num_guests: 8,
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
    num_guests: 3,
    total_amount: 36000,
    created_at: '2026-02-07T13:30:00Z'
  }
];

const BookingRequests: React.FC = () => {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const toastRef = useRef<HTMLDivElement | null>(null);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalActive, setConfirmModalActive] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveModalActive, setApproveModalActive] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Payment confirmation modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalActive, setPaymentModalActive] = useState(false);
  const [pendingPaymentBooking, setPendingPaymentBooking] = useState<Booking | null>(null);
  
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Newest first');
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

  // Load mock bookings
  useEffect(() => {
    setSummaryLoading(true);
    setTimeout(() => {
      setAllBookings(mockBookings);
      setSummaryLoading(false);
    }, 800);
  }, []);

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

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    const latestBooking = allBookings.find(b => b.id === booking.id) || booking;
    setSelectedBooking(latestBooking);
    setIsDrawerClosing(false);
    setIsDrawerOpen(true);
  };

  // Close drawer
  const closeDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
      setTimeout(() => setSelectedBooking(null), 50);
    }, 300);
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

  const openApproveModal = (booking: Booking) => {
    setPendingBooking(booking);
    setSelectedAgentId(booking.assigned_agent || (mockAgents[0]?.id ?? null));
    setShowApproveModal(true);
    requestAnimationFrame(() => setApproveModalActive(true));
  };

  const closeApproveModal = () => {
    setApproveModalActive(false);
    setTimeout(() => {
      setShowApproveModal(false);
      setPendingBooking(null);
      setSelectedAgentId(null);
    }, 250);
  };

  // Handle approve action
  const handleApprove = async (booking: Booking, agentId?: string | null) => {
    try {
      setIsProcessing(true);
      console.log('Approving booking', { bookingId: booking.id });
      
      showToast('Booking request approved', 'success');
      
      const updatedBooking = { ...booking, status: 'pending-payment' as const };
      setAllBookings(prev => prev.map(b => b.id === booking.id ? updatedBooking : b));
      
      if (isDrawerOpen && selectedBooking?.id === booking.id) {
        setSelectedBooking(updatedBooking);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Decline overlapping bookings
      const overlapping = allBookings.filter(b => 
        b.id !== booking.id &&
        b.listing.title === booking.listing.title &&
        b.status === 'pending' &&
        new Date(b.check_in_date) < new Date(booking.check_out_date) &&
        new Date(b.check_out_date) > new Date(booking.check_in_date)
      );
      
      if (overlapping.length > 0) {
        setAllBookings(prev => prev.map(b => 
          overlapping.some(ob => ob.id === b.id) 
            ? { ...b, status: 'declined' as const }
            : b
        ));
      }
      
      closeApproveModal();
      
      console.log('Booking approved successfully');
    } catch (error) {
      console.error('Error approving booking:', error);
      showToast('Unable to approve booking. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle decline action
  const handleDecline = async () => {
    if (!pendingBooking) return;

    try {
      setIsProcessing(true);
      console.log('Declining booking', { bookingId: pendingBooking.id });
      
      showToast('Booking request declined', 'success');
      
      const updatedBooking = { ...pendingBooking, status: 'declined' as const };
      setAllBookings(prev => prev.map(b => b.id === pendingBooking.id ? updatedBooking : b));
      
      if (isDrawerOpen && selectedBooking?.id === pendingBooking.id) {
        setSelectedBooking(updatedBooking);
      }
      
      closeConfirmModal();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Booking declined successfully');
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

    return `${formatDate(startDate)} → ${formatDate(endDate)}`;
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

  // Booking item component
  const BookingItem: React.FC<{ booking: Booking }> = ({ booking }) => {
    const guestName = `${booking.client.first_name} ${booking.client.last_name}`;
    const unitName = booking.listing.title;
    const preview = booking.request_description 
      ? (booking.request_description.length > 60 
          ? booking.request_description.substring(0, 60) + '...' 
          : booking.request_description)
      : 'No special requests';

    const isPending = booking.status === 'pending';
    const isAwaitingPayment = booking.status === 'pending-payment';
    const isBooked = ['booked', 'ongoing', 'completed'].includes(booking.status);
    const isDeclined = ['declined', 'cancelled'].includes(booking.status);
    
    return (
      <div
        onClick={() => handleBookingClick(booking)}
        className={`relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer overflow-hidden ${
          isPending ? 'bg-yellow-50/30 hover:border-yellow-300' : 
          isAwaitingPayment ? 'bg-orange-50/30 hover:border-orange-300' : 
          isBooked ? 'bg-teal-50/30 hover:border-teal-300' : 
          isDeclined ? 'bg-red-50/30 hover:border-red-300' : 
          'bg-white'
        }`}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex-shrink-0">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: hasValidPhoto(booking.client?.profile_photo, `client-${booking.id}`)
                  ? 'transparent'
                  : 'linear-gradient(to bottom right, #14b8a6, #0d9488)'
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
                <span 
                  className="text-white text-sm font-bold" 
                  style={{ fontFamily: 'Poppins', fontWeight: 700 }}
                >
                  {getInitials(booking.client.first_name, booking.client.last_name)}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base" style={{ fontFamily: 'Poppins' }}>
                  {guestName}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                  {unitName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mt-0.5">
              <span style={{ fontFamily: 'Poppins' }}>{formatDateRange(booking.check_in_date, booking.check_out_date)}</span>
              <span className="text-gray-300" style={{ fontFamily: 'Poppins' }}>|</span>
              <span className="font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                ₱ {booking.total_amount?.toLocaleString() || '0'}
              </span>
            </div>

            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5" style={{ fontFamily: 'Poppins' }}>
              {preview}
            </p>
          </div>

          {/* Action Buttons */}
          {booking.status === 'pending' ? (
            <div className="flex-shrink-0 flex flex-col gap-2 ml-4 w-[100px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openApproveModal(booking);
                }}
                className="w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                style={{ fontFamily: 'Poppins', backgroundColor: '#05807E' }}
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openConfirmModal(booking);
                }}
                className="w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                style={{ fontFamily: 'Poppins', backgroundColor: '#B84C4C' }}
              >
                Decline
              </button>
            </div>
          ) : (
            <div className="flex-shrink-0 ml-4 w-[100px]">
              <div
                className="w-full px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg backdrop-blur-sm text-center"
                style={{
                  fontFamily: 'Poppins',
                  background: isBooked 
                    ? 'linear-gradient(135deg, #0B5858 0%, #0d7070 100%)' 
                    : isDeclined 
                    ? 'linear-gradient(135deg, #B84C4C 0%, #c46666 100%)'
                    : 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
                }}
              >
                {isBooked && 'Booked'}
                {isDeclined && 'Declined'}
                {isAwaitingPayment && 'Awaiting'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="mb-8">
            <div className="h-10 bg-gray-200 rounded w-64 animate-pulse mb-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-5 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

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

      {/* Approve Modal */}
      {showApproveModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.38)'
          }}
          onClick={closeApproveModal}
        >
          <div 
            className="max-w-md w-full mx-4"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              transform: approveModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: approveModalActive ? 1 : 0,
              transition: 'all 0.25s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>
                Approve Booking Request
              </h3>
              <p className="text-gray-700 mb-4" style={{fontFamily: 'Poppins'}}>
                Assign an agent to handle this booking (optional). The guest will have 24 hours to complete payment.
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2" style={{fontFamily: 'Poppins'}}>Assign agent</label>
                <select
                  value={selectedAgentId ?? ''}
                  onChange={(e) => setSelectedAgentId(e.target.value || null)}
                  className="w-full border rounded p-2"
                  style={{fontFamily: 'Poppins'}}
                >
                  <option value="">(No assignment)</option>
                  {mockAgents.map(a => (
                    <option key={a.id} value={a.id}>{a.fullname}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeApproveModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{fontFamily: 'Poppins'}}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => pendingBooking && handleApprove(pendingBooking, selectedAgentId)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: '#05807E',
                    fontFamily: 'Poppins'
                  }}
                >
                  {isProcessing ? 'Processing...' : 'Approve & Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toast-base { transform: translateX(100%); opacity: 0; transition: transform .28s ease-out, opacity .28s ease-out; }
        .toast--enter { transform: translateX(0); opacity: 1; }
        .toast--exit { transform: translateX(100%); opacity: 0; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Booking Requests
            </h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-1"
              style={{ fontFamily: 'Poppins' }}
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {(() => {
            const stats = getSummaryStats();
            return (
              <>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Pending</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-400">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{stats.pending}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Awaiting Payment</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-400">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{stats.awaitingPayment}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-cyan-600 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Booked</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-600">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{stats.booked}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Declined</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-400">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{stats.declined}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-600 text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Total</p>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-400">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{stats.total}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Sort Controls */}
        {allBookings.length > 0 && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as any}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Awaiting Payment</option>
              <option>Booked</option>
              <option>Declined</option>
            </select>
            
            <span className="text-sm font-medium text-gray-700 ml-2" style={{ fontFamily: 'Poppins' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ fontFamily: 'Poppins' }}
            >
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Check-in (soonest)</option>
              <option>Amount (high to low)</option>
              <option>Amount (low to high)</option>
            </select>
          </div>
        )}

        {/* Booking List */}
        {getFilteredBookings(allBookings).length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
              No {statusFilter === 'All Status' ? 'Bookings' : statusFilter} Requests
            </h3>
            <p className="text-gray-600" style={{ fontFamily: 'Poppins' }}>
              {statusFilter === 'All Status' ? 'No bookings found' : `No ${statusFilter.toLowerCase()} booking requests`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const filtered = getFilteredBookings(allBookings);
              const preserveStatusOrder = statusFilter === 'All Status';
              return getSortedBookings(filtered, preserveStatusOrder).map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ));
            })()}
          </div>
        )}
      </div>

      {/* Decline Confirmation Modal */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.38)'
          }}
          onClick={closeConfirmModal}
        >
          <div 
            className="max-w-md w-full mx-4"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              transform: confirmModalActive ? 'scale(1)' : 'scale(0.95)',
              opacity: confirmModalActive ? 1 : 0,
              transition: 'all 0.25s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>
                Decline Booking Request
              </h3>
              <p className="text-gray-700 mb-5" style={{fontFamily: 'Poppins'}}>
                Are you sure you want to decline this booking request? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeConfirmModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{fontFamily: 'Poppins'}}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: '#B84C4C',
                    fontFamily: 'Poppins'
                  }}
                >
                  {isProcessing ? 'Processing...' : 'Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default BookingRequests;
