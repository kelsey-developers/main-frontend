'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Tooltip from '@/components/Tooltip';
import CalendarSettingsModal from './components/CalendarSettingsModal';

type Booking = {
  date: Date;
  checkInDate: Date;
  checkOutDate: Date;
  checkInDateString: string;
  checkOutDateString: string;
  title: string;
  time: string;
  startHour: number;
  endHour: number;
  bookingId?: string;
  status?: string;
  totalAmount?: number;
  mainImageUrl?: string;
  clientFirstName?: string;
};

/** Mock booking detail for the drawer (no Supabase) */
type DrawerBooking = {
  id: string;
  status: string;
  client?: { first_name: string; last_name: string; email?: string; contact_number?: string };
  agent?: { fullname?: string; email?: string; contact_number?: string };
  listing?: { title?: string; location?: string };
  check_in_date: string;
  check_out_date: string;
  num_guests?: number;
  extra_guests?: number;
  total_amount?: number;
  request_description?: string;
};

type BlockedDateRange = { id: string; start_date: string; end_date: string; reason?: string };

const HOUR_ROW_PX = 48;
const DOT_SIZE = 12;
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function generateMockBookings(): Booking[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  return [
    {
      date: new Date(y, m, 15),
      checkInDate: new Date(y, m, 15),
      checkOutDate: new Date(y, m, 18),
      checkInDateString: new Date(y, m, 15).toISOString().slice(0, 10),
      checkOutDateString: new Date(y, m, 18).toISOString().slice(0, 10),
      title: 'Ocean View Villa',
      time: '2:00 PM – 12:00 PM',
      startHour: 14,
      endHour: 12,
      bookingId: 'mock-1',
      status: 'booked',
      totalAmount: 1200,
      mainImageUrl: undefined,
      clientFirstName: 'John',
    },
    {
      date: new Date(y, m, 20),
      checkInDate: new Date(y, m, 20),
      checkOutDate: new Date(y, m, 25),
      checkInDateString: new Date(y, m, 20).toISOString().slice(0, 10),
      checkOutDateString: new Date(y, m, 25).toISOString().slice(0, 10),
      title: 'Mountain Cabin',
      time: '2:00 PM – 12:00 PM',
      startHour: 14,
      endHour: 12,
      bookingId: 'mock-2',
      status: 'pending',
      totalAmount: 800,
      mainImageUrl: undefined,
      clientFirstName: 'Sarah',
    },
    {
      date: new Date(y, m, 10),
      checkInDate: new Date(y, m, 10),
      checkOutDate: new Date(y, m, 12),
      checkInDateString: new Date(y, m, 10).toISOString().slice(0, 10),
      checkOutDateString: new Date(y, m, 12).toISOString().slice(0, 10),
      title: 'City Apartment',
      time: '2:00 PM – 12:00 PM',
      startHour: 14,
      endHour: 12,
      bookingId: 'mock-3',
      status: 'booked',
      totalAmount: 600,
      mainImageUrl: undefined,
      clientFirstName: 'Mike',
    },
    {
      date: new Date(y, m, 28),
      checkInDate: new Date(y, m, 28),
      checkOutDate: new Date(y, m + 1, 2),
      checkInDateString: new Date(y, m, 28).toISOString().slice(0, 10),
      checkOutDateString: new Date(y, m + 1, 2).toISOString().slice(0, 10),
      title: 'Beach House',
      time: '2:00 PM – 12:00 PM',
      startHour: 14,
      endHour: 12,
      bookingId: 'mock-4',
      status: 'pending',
      totalAmount: 1500,
      mainImageUrl: undefined,
      clientFirstName: 'Emma',
    },
  ];
}

function bookingToDrawerBooking(b: Booking): DrawerBooking {
  return {
    id: b.bookingId || '',
    status: b.status || 'pending',
    client: { first_name: b.clientFirstName || 'Guest', last_name: '' },
    agent: { fullname: 'Sample Agent' },
    listing: { title: b.title, location: 'Sample Location' },
    check_in_date: b.checkInDateString,
    check_out_date: b.checkOutDateString,
    total_amount: b.totalAmount,
    num_guests: 2,
  };
}

export interface CalendarViewProps {
  /** When true, calendar is embedded (e.g. in admin dashboard) with reduced padding and no min height */
  embedded?: boolean;
}

export function CalendarView({ embedded }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<DrawerBooking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalActive, setConfirmModalActive] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<DrawerBooking | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const toastRef = useRef<HTMLDivElement | null>(null);

  const [bookings, setBookings] = useState<Booking[]>(generateMockBookings);
  const [loading, setLoading] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [globalBlockedRanges, setGlobalBlockedRanges] = useState<BlockedDateRange[]>([]);

  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());
  const [timelineStartDate, setTimelineStartDate] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth() - 6, 1);
  });
  const [timelineEndDate, setTimelineEndDate] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth() + 7, 0);
  });
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledToToday = useRef(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date());
  const [headerAnimating, setHeaderAnimating] = useState(false);
  const headerAnimTimer = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setVisibleMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  }, [currentDate]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      setVisibleMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }
  }, [viewMode, currentDate]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Auto-scroll to today when switching to timeline view (once per switch)
  useEffect(() => {
    if (viewMode !== 'weekly' || hasAutoScrolledToToday.current) return;
    const scrollContainer = timelineScrollRef.current;
    if (!scrollContainer) return;
    const timer = setTimeout(() => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startDateStart = new Date(timelineStartDate.getFullYear(), timelineStartDate.getMonth(), timelineStartDate.getDate());
      const daysFromStart = Math.round((todayStart.getTime() - startDateStart.getTime()) / (1000 * 60 * 60 * 24));
      scrollContainer.scrollTo({ left: Math.max(0, daysFromStart * 120), behavior: 'smooth' });
      setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      hasAutoScrolledToToday.current = true;
    }, 300);
    return () => clearTimeout(timer);
  }, [viewMode, timelineStartDate]);

  useEffect(() => {
    return () => {
      if (headerAnimTimer.current) window.clearTimeout(headerAnimTimer.current);
    };
  }, []);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return globalBlockedRanges.some((range) => {
      const startDate = new Date(range.start_date);
      const endDate = new Date(range.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getBlockedDateTooltip = (date: Date): string => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    for (const range of globalBlockedRanges) {
      const startDate = new Date(range.start_date);
      const endDate = new Date(range.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (checkDate >= startDate && checkDate <= endDate) return range.reason || 'No reason provided';
    }
    return '';
  };

  const generateDateRange = (startDate: Date, numDays: number): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < numDays; i++) dates.push(addDays(startDate, i));
    return dates;
  };

  const getUniqueUnits = (): string[] => {
    const unitSet = new Set<string>();
    bookings.forEach((b) => { if (b.title) unitSet.add(b.title); });
    return Array.from(unitSet).sort();
  };

  const getBookingsForUnit = (unitTitle: string): Booking[] => bookings.filter((b) => b.title === unitTitle);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const days: { date: number; isCurrentMonth: boolean; isToday: boolean; fullDate: Date }[] = [];
    const prevMonthLast = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast.getDate() - i);
      days.push({ date: d.getDate(), isCurrentMonth: false, isToday: false, fullDate: d });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const full = new Date(year, month, d);
      days.push({ date: d, isCurrentMonth: true, isToday: full.toDateString() === new Date().toDateString(), fullDate: full });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const full = new Date(year, month + 1, d);
      days.push({ date: d, isCurrentMonth: false, isToday: false, fullDate: full });
    }
    return days;
  };

  const isDateInStay = (date: Date, booking: Booking) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = new Date(booking.checkInDate.getFullYear(), booking.checkInDate.getMonth(), booking.checkInDate.getDate());
    const end = new Date(booking.checkOutDate.getFullYear(), booking.checkOutDate.getMonth(), booking.checkOutDate.getDate());
    return d >= start && d < end;
  };

  const getBookingsForDate = (date: Date) => bookings.filter((b) => isDateInStay(date, b));

  const getBookingBarPosition = (booking: Booking, dateRange: Date[], dayWidth: number): { left: number; width: number; visible: boolean } => {
    if (dateRange.length === 0) return { left: 0, width: 0, visible: false };
    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];
    const bookingStart = new Date(booking.checkInDate.getFullYear(), booking.checkInDate.getMonth(), booking.checkInDate.getDate());
    const bookingEnd = new Date(booking.checkOutDate.getFullYear(), booking.checkOutDate.getMonth(), booking.checkOutDate.getDate());
    if (bookingEnd < rangeStart || bookingStart > rangeEnd) return { left: 0, width: 0, visible: false };
    let startIndex = 0;
    for (let i = 0; i < dateRange.length; i++) {
      const day = new Date(dateRange[i].getFullYear(), dateRange[i].getMonth(), dateRange[i].getDate());
      if (day >= bookingStart) { startIndex = i; break; }
    }
    let endIndex = dateRange.length;
    for (let i = dateRange.length - 1; i >= 0; i--) {
      const day = new Date(dateRange[i].getFullYear(), dateRange[i].getMonth(), dateRange[i].getDate());
      if (day < bookingEnd) { endIndex = i + 1; break; }
    }
    if (bookingStart < rangeStart) startIndex = 0;
    const left = startIndex * dayWidth;
    const width = Math.max((endIndex - startIndex) * dayWidth, dayWidth);
    return { left, width, visible: width > 0 };
  };

  const getStatusBgClass = (status?: string): string => {
    const s = (status || '').toLowerCase();
    if (s === 'pending' || s === 'pending-payment') return 'bg-pending';
    if (s === 'blocked') return 'bg-blocked';
    if (s === 'available') return 'bg-available';
    if (s === 'booked') return 'bg-booked';
    return 'bg-booked';
  };

  const formatStayRange = (checkIn: Date, checkOut: Date): string => {
    const startMonth = checkIn.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = checkOut.toLocaleDateString('en-US', { month: 'short' });
    const startDay = checkIn.getDate();
    const endDay = checkOut.getDate();
    return startMonth === endMonth ? `${startMonth} ${startDay} – ${endDay}` : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setHeaderAnimating(true);
    if (headerAnimTimer.current) window.clearTimeout(headerAnimTimer.current);
    headerAnimTimer.current = window.setTimeout(() => setHeaderAnimating(false), 280);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const newMonth = direction === 'prev' ? currentMonth - 1 : currentMonth + 1;
    const newDate = new Date(currentYear, newMonth, 1);
    setCurrentDate(newDate);
    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    const desiredDay = Math.min(focusedDate.getDate(), daysInNewMonth);
    setFocusedDate(new Date(newDate.getFullYear(), newDate.getMonth(), desiredDay));
  };

  const openSlideForDate = (date: Date) => {
    if (getBookingsForDate(date).length === 0) return;
    setSelectedDate(date);
    setIsSlideOpen(true);
  };

  const closeSlide = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsSlideOpen(false);
      setIsClosing(false);
      setSelectedDate(null);
    }, 300);
  };

  const handleTimelineBookingClick = (booking: Booking) => {
    setSelectedBooking(bookingToDrawerBooking(booking));
    setIsDrawerClosing(false);
    setIsDrawerOpen(true);
  };

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

  const closeDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
      setSelectedBooking(null);
    }, 300);
  };

  const openConfirmModal = (booking: DrawerBooking) => {
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

  const handleApprove = (booking: DrawerBooking) => {
    setIsProcessing(true);
    setBookings((prev) => prev.map((b) => (b.bookingId === booking.id ? { ...b, status: 'pending-payment' } : b)));
    if (isDrawerOpen && selectedBooking?.id === booking.id) setSelectedBooking({ ...booking, status: 'pending-payment' });
    showToast('Booking request approved successfully', 'success');
    setIsProcessing(false);
  };

  const handleDecline = () => {
    if (!pendingBooking) return;
    setIsProcessing(true);
    setBookings((prev) => prev.filter((b) => b.bookingId !== pendingBooking.id));
    closeConfirmModal();
    if (isDrawerOpen && selectedBooking?.id === pendingBooking.id) closeDrawer();
    showToast('Booking request declined', 'success');
    setIsProcessing(false);
  };

  const days = getDaysInMonth(currentDate);

  const CalendarLegend = () => {
    const items = [
      { label: 'Booked', className: 'bg-booked' },
      { label: 'Pending', className: 'bg-pending' },
      { label: 'Available', className: 'bg-available' },
      { label: 'Blocked', className: 'bg-blocked' },
    ];
    return (
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-white">
        <div className="flex flex-nowrap items-center justify-center sm:justify-start gap-2 sm:gap-4 overflow-x-auto" aria-label="Calendar legend">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span aria-hidden className={`inline-block rounded ${item.className}`} style={{ width: isMobile ? 12 : 14, height: isMobile ? 12 : 14 }} />
              <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} text-gray-700 whitespace-nowrap`} style={{ fontFamily: 'var(--font-poppins)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MobileMonth = ({ days: dayList, onDayPress }: { days: ReturnType<typeof getDaysInMonth>; onDayPress: (d: Date) => void }) => {
    const statusColorMap: Record<string, string> = {
      'bg-booked': '#B84C4C',
      'bg-pending': '#F6D658',
      'bg-available': '#558B8B',
      'bg-blocked': '#4D504E',
    };
    return (
      <div className="mobile-month">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="w-full flex items-center justify-center font-medium text-gray-700" style={{ fontSize: 'clamp(8px, 2.2vw, 10px)' }}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dayList.map((day, index) => {
            const bookingsForDay = getBookingsForDate(day.fullDate);
            const isBlocked = isDateBlocked(day.fullDate);
            const blockedTooltip = isBlocked ? getBlockedDateTooltip(day.fullDate) : '';
            const bgClass = isBlocked ? 'bg-blocked' : bookingsForDay.length > 0 ? getStatusBgClass(bookingsForDay[0].status) : 'bg-available';
            const visibleBookings = bookingsForDay.slice(0, 2);
            const remainingCount = bookingsForDay.length - 2;
            const dayCard = (
              <div
                key={index}
                className={`w-full aspect-square rounded-lg p-1 relative transition-all duration-200 overflow-hidden flex flex-col flex-shrink-0 ${day.isCurrentMonth ? `${bgClass} ${bookingsForDay.length > 0 && !isBlocked ? 'cursor-pointer' : ''}` : 'bg-gray-50/50'} hover:opacity-95`}
                onClick={() => bookingsForDay.length > 0 && day.isCurrentMonth && !isBlocked && onDayPress(day.fullDate)}
              >
                <div className={`text-[clamp(9px,2.5vw,11px)] font-semibold mb-0.5 flex-shrink-0 leading-tight ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.date}
                </div>
                {bookingsForDay.length > 0 && day.isCurrentMonth && (
                  <div className="flex flex-col gap-0.5 flex-1 overflow-hidden min-h-0">
                    {visibleBookings.map((booking, idx) => {
                      const accentColor = statusColorMap[getStatusBgClass(booking.status)] || '#B84C4C';
                      return (
                        <div key={idx} className="rounded border border-white/40 backdrop-blur-sm relative flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                          <div className="h-full w-1 absolute left-0 top-0 bottom-0 rounded-l" style={{ backgroundColor: accentColor }} />
                          <div className="flex-1 min-w-0 pl-2 pr-1 py-0.5 flex flex-col gap-0 relative">
                            <div className="text-[clamp(7px,2vw,9px)] font-semibold text-gray-900 truncate leading-tight">{booking.title || 'Unit'}</div>
                            <div className="text-[clamp(6px,1.8vw,8px)] font-medium text-gray-700 truncate leading-tight">{booking.clientFirstName || 'Guest'} | {formatStayRange(booking.checkInDate, booking.checkOutDate)}</div>
                          </div>
                        </div>
                      );
                    })}
                    {remainingCount > 0 && (
                      <div className="rounded border border-white/40 backdrop-blur-sm relative flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                        <div className="h-full w-1 bg-gray-400 absolute left-0 top-0 bottom-0 rounded-l" />
                        <div className="flex-1 min-w-0 pl-2 pr-1 py-0.5 flex flex-col gap-0 relative">
                          <div className="text-[clamp(6px,1.8vw,8px)] font-semibold text-gray-900 truncate leading-tight">+{remainingCount} more</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            return blockedTooltip ? <Tooltip key={index} content={blockedTooltip}>{dayCard}</Tooltip> : dayCard;
          })}
        </div>
      </div>
    );
  };

  const DAY_WIDTH = 120;
  const ROW_HEIGHT = 60;
  const UNIT_COL_WIDTH = isMobile ? 120 : 350;
  const numDays = Math.ceil((timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dateRange = generateDateRange(timelineStartDate, numDays);
  const units = getUniqueUnits();

  return (
    <div className={embedded ? 'bg-white rounded-lg' : 'min-h-screen bg-white'} style={{ ['--booking-color' as string]: '#E66E85' }}>
      <style>{`
        :root { --booking-color: #E66E85; }
        @keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-panel-in { animation: slideInFromRight 0.3s ease-out forwards; }
        @keyframes slideOutToRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        .animate-panel-out { animation: slideOutToRight 0.3s ease-in forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .animate-fade-out { animation: fadeOut 0.2s ease-in forwards; }
        .timeline-container::-webkit-scrollbar { display: none; }
        .timeline-container { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slide-out { from { transform: translateX(0); } to { transform: translateX(100%); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-slide-out { animation: slide-out 0.3s ease-out; }
        .toast-base { transform: translateX(100%); opacity: 0; transition: transform .28s ease-out, opacity .28s ease-out; }
        .toast--enter { transform: translateX(0); opacity: 1; }
        .toast--exit { transform: translateX(100%); opacity: 0; }
        .toggle-button { transition: background-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s; cursor: pointer; }
        .toggle-button:hover { transform: scale(1.05); opacity: 0.9; }
        .toggle-button:active { transform: scale(0.95); }
      `}</style>

      <div className={embedded ? 'pt-0' : 'pt-16'} style={embedded ? undefined : { minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className={`flex items-center ${isMobile ? 'justify-between w-full' : 'space-x-2 sm:space-x-4'}`}>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {viewMode !== 'weekly' && (
                  <>
                    <button onClick={() => navigateMonth('prev')} className="p-1.5 sm:p-2 hover-soft-teal rounded-full transition-colors cursor-pointer" aria-label="Prev month">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#0B5858]" fill="none" viewBox="0 0 24 24"><path stroke="#0B5858" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className={`text-lg sm:text-xl md:text-2xl font-bold text-black ${headerAnimating ? 'header-pop-enter' : ''}`} style={{ fontFamily: 'var(--font-poppins)' }}>
                      {`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                    </h1>
                    <button onClick={() => navigateMonth('next')} className="p-1.5 sm:p-2 hover-soft-teal rounded-full transition-colors cursor-pointer" aria-label="Next month">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#0B5858]" fill="none" viewBox="0 0 24 24"><path stroke="#0B5858" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}
                {viewMode === 'weekly' && (
                  <>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-black" style={{ fontFamily: 'var(--font-poppins)' }}>
                      {`${monthNames[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`}
                    </h1>
                    <button
                      onClick={() => {
                        const today = new Date();
                        setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        const scrollContainer = timelineScrollRef.current;
                        if (scrollContainer) {
                          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                          const startDateStart = new Date(timelineStartDate.getFullYear(), timelineStartDate.getMonth(), timelineStartDate.getDate());
                          const daysFromStart = Math.round((todayStart.getTime() - startDateStart.getTime()) / (1000 * 60 * 60 * 24));
                          scrollContainer.scrollTo({ left: Math.max(0, daysFromStart * DAY_WIDTH), behavior: 'smooth' });
                        }
                      }}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md text-white shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
                      style={{ fontFamily: 'var(--font-poppins)', backgroundColor: '#0B5858' }}
                    >
                      Today
                    </button>
                  </>
                )}
              </div>
              {isMobile && (
                <div className="flex gap-0.5 items-center bg-gray-100 p-0.5 rounded-lg ml-auto">
                  <button onClick={() => setViewMode('monthly')} className={`toggle-button px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} style={{ fontFamily: 'var(--font-poppins)' }}>Month</button>
                  <button onClick={() => { hasAutoScrolledToToday.current = false; setViewMode('weekly'); }} className={`toggle-button px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md ${viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} style={{ fontFamily: 'var(--font-poppins)' }}>Timeline</button>
                </div>
              )}
            </div>
            {!isMobile && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex gap-0.5 sm:gap-1 items-center bg-gray-100 p-0.5 sm:p-1 rounded-lg">
                  <button onClick={() => setViewMode('monthly')} className={`toggle-button px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} style={{ fontFamily: 'var(--font-poppins)' }}>Month</button>
                  <button onClick={() => { hasAutoScrolledToToday.current = false; setViewMode('weekly'); }} className={`toggle-button px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md ${viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} style={{ fontFamily: 'var(--font-poppins)' }}>Timeline</button>
                </div>
                <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" aria-label="Calendar settings" title="Calendar settings">
                  <svg className="w-6 h-6 text-gray-600 hover:text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
            {loading ? (
              <div className="flex items-center justify-center" style={{ minHeight: isMobile ? 'calc(100vh - 250px)' : 'calc(100vh - 300px)' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0B5858] mx-auto mb-4" />
                  <p className="text-lg text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>Loading Calendar...</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'monthly' ? (
                  isMobile ? (
                    <div className="p-2 sm:p-3">
                      <MobileMonth days={days} onDayPress={(d) => { setFocusedDate(d); openSlideForDate(d); }} />
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 md:p-6">
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
                        {dayNames.map((d) => (
                          <div key={d} className="text-center text-xs sm:text-sm font-medium text-gray-700 tracking-wide">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
                        {days.map((day, index) => {
                          const bookingsForDay = getBookingsForDate(day.fullDate);
                          const isBlocked = isDateBlocked(day.fullDate);
                          const blockedTooltip = isBlocked ? getBlockedDateTooltip(day.fullDate) : '';
                          const bgClass = isBlocked ? 'bg-blocked' : bookingsForDay.length > 0 ? getStatusBgClass(bookingsForDay[0].status) : 'bg-available';
                          const visibleBookings = bookingsForDay.slice(0, 2);
                          const remainingCount = bookingsForDay.length - 2;
                          const statusColorMap: Record<string, string> = { 'bg-booked': '#B84C4C', 'bg-pending': '#F6D658', 'bg-available': '#558B8B', 'bg-blocked': '#4D504E' };
                          const dayCard = (
                            <div
                              key={index}
                              className={`min-h-[80px] sm:min-h-[100px] md:min-h-[140px] max-h-[80px] sm:max-h-[100px] md:max-h-[140px] rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 relative transition-all duration-200 overflow-hidden flex flex-col ${day.isCurrentMonth ? `${bgClass} ${bookingsForDay.length > 0 && !isBlocked ? 'cursor-pointer' : ''}` : 'bg-gray-50/50'} hover:opacity-95`}
                              onClick={() => bookingsForDay.length > 0 && day.isCurrentMonth && !isBlocked && openSlideForDate(day.fullDate)}
                            >
                              <div className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>{day.date}</div>
                              {bookingsForDay.length > 0 && day.isCurrentMonth && (
                                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                                  {visibleBookings.map((booking, idx) => {
                                    const accentColor = statusColorMap[getStatusBgClass(booking.status)] || '#B84C4C';
                                    return (
                                      <div key={idx} className="rounded border border-white/40 backdrop-blur-sm relative" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                                        <div className="h-full w-1 absolute left-0 top-0 bottom-0 rounded-l" style={{ backgroundColor: accentColor }} aria-label={`${booking.status} booking`} />
                                        <div className="flex-1 min-w-0 pl-3 pr-2 py-1 flex flex-col gap-0 relative">
                                          <div className="text-[10px] font-semibold text-gray-900 truncate leading-tight">{booking.title || 'Unit'}</div>
                                          <div className="text-[9px] font-medium text-gray-700 truncate leading-tight">{booking.clientFirstName || 'Guest'} | {formatStayRange(booking.checkInDate, booking.checkOutDate)}</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {remainingCount > 0 && (
                                    <div className="rounded border border-white/40 backdrop-blur-sm relative" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                                      <div className="h-full w-1 bg-gray-400 absolute left-0 top-0 bottom-0 rounded-l" aria-label="More bookings indicator" />
                                      <div className="flex-1 min-w-0 pl-3 pr-2 py-1 flex flex-col gap-0 relative">
                                        <div className="text-[8px] font-semibold text-gray-900 truncate leading-tight">+{remainingCount} more</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                          return blockedTooltip ? <Tooltip key={index} content={blockedTooltip}>{dayCard}</Tooltip> : dayCard;
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  <div
                    ref={timelineScrollRef}
                    className="bg-white timeline-container"
                    style={{ height: isMobile ? 'calc(100vh - 250px)' : 'calc(100vh - 300px)', overflowX: 'auto', overflowY: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                    aria-label="Timeline schedule"
                  >
                    <div style={{ position: 'relative', minWidth: `${dateRange.length * DAY_WIDTH + UNIT_COL_WIDTH}px` }}>
                      <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#FFFFFF', borderBottom: '2px solid #E5E7EB' }}>
                        <div style={{ width: isMobile ? '120px' : '350px', minWidth: isMobile ? '120px' : '350px', borderRight: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', position: 'sticky', left: 0, zIndex: 21, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px 2px' : '8px 4px' }}>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-700`} style={{ fontFamily: 'var(--font-poppins)' }}>Unit</div>
                        </div>
                        {dateRange.map((date, idx) => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          const isInCurrentMonth = date.getMonth() === currentDate.getMonth();
                          const isLastColumn = idx === dateRange.length - 1;
                          const isBlocked = isDateBlocked(date);
                          const blockedTooltip = isBlocked ? getBlockedDateTooltip(date) : '';
                          const dateHeader = (
                            <div
                              key={idx}
                              style={{
                                width: `${DAY_WIDTH}px`,
                                minWidth: `${DAY_WIDTH}px`,
                                maxWidth: `${DAY_WIDTH}px`,
                                padding: '8px 4px',
                                borderRight: isLastColumn ? 'none' : '1px solid #E5E7EB',
                                textAlign: 'center',
                                backgroundColor: isBlocked ? 'rgba(77, 80, 78, 0.12)' : isToday ? '#E0F2F1' : '#FFFFFF',
                                boxSizing: 'border-box',
                                position: 'relative',
                              }}
                            >
                              <div className="text-xs font-medium" style={{ color: isToday ? '#0B5858' : '#6B7280', fontFamily: 'var(--font-poppins)', marginBottom: '2px' }}>{dayNames[date.getDay()].slice(0, 3)}</div>
                              <div className="text-sm font-semibold" style={{ color: isToday ? '#0B5858' : isInCurrentMonth ? '#111827' : '#9CA3AF', fontFamily: 'var(--font-poppins)' }}>{date.getDate()}</div>
                              {isBlocked && <div className="absolute top-1 right-1" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4D504E', opacity: 0.8 }} title="Blocked" />}
                            </div>
                          );
                          return blockedTooltip ? <Tooltip key={idx} content={blockedTooltip}>{dateHeader}</Tooltip> : dateHeader;
                        })}
                      </div>
                      {units.length > 0 ? (
                        units.map((unitTitle, unitIdx) => {
                          const unitBookings = getBookingsForUnit(unitTitle);
                          return (
                            <div key={unitIdx} style={{ display: 'flex', height: `${ROW_HEIGHT}px`, borderBottom: '1px solid #E5E7EB', position: 'relative' }}>
                              <div style={{ width: isMobile ? '120px' : '350px', minWidth: isMobile ? '120px' : '350px', padding: isMobile ? '12px 8px' : '12px 16px', borderRight: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', position: 'sticky', left: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {unitBookings.length > 0 && unitBookings[0].mainImageUrl && (
                                  <div className="flex-shrink-0" style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 6, overflow: 'hidden' }}>
                                    <img src={unitBookings[0].mainImageUrl} alt={unitTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                )}
                                <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-normal text-gray-900 truncate flex-1`} style={{ fontFamily: 'var(--font-poppins)' }}>{unitTitle}</div>
                              </div>
                              <div style={{ position: 'relative', width: `${dateRange.length * DAY_WIDTH}px`, height: '100%', boxSizing: 'border-box' }}>
                                {dateRange.map((date, dayIdx) => {
                                  if (!isDateBlocked(date)) return null;
                                  const blockedTooltip = getBlockedDateTooltip(date);
                                  return (
                                    <Tooltip key={`blocked-${dayIdx}`} content={blockedTooltip}>
                                      <div className="bg-blocked" style={{ position: 'absolute', left: `${dayIdx * DAY_WIDTH}px`, width: `${DAY_WIDTH}px`, height: '100%', opacity: 0.3, zIndex: 2, pointerEvents: 'auto' }} />
                                    </Tooltip>
                                  );
                                })}
                                {dateRange.map((_, dayIdx) => {
                                  if (dayIdx === dateRange.length - 1) return null;
                                  return <div key={dayIdx} style={{ position: 'absolute', left: `${(dayIdx + 1) * DAY_WIDTH - 0.5}px`, width: 1, height: '100%', backgroundColor: '#E5E7EB', zIndex: 1 }} />;
                                })}
                                {unitBookings.map((booking, bookingIdx) => {
                                  const position = getBookingBarPosition(booking, dateRange, DAY_WIDTH);
                                  if (!position.visible) return null;
                                  const statusClass = getStatusBgClass(booking.status);
                                  const borderColor = { 'bg-booked': '#B84C4C', 'bg-pending': '#F6D658', 'bg-available': '#558B8B', 'bg-blocked': '#4D504E' }[statusClass] || '#B84C4C';
                                  return (
                                    <div
                                      key={bookingIdx}
                                      className={`${statusClass} rounded-md cursor-pointer transition-all hover:opacity-90 hover:shadow-md`}
                                      style={{
                                        position: 'absolute',
                                        left: `${position.left + 2}px`,
                                        top: '8px',
                                        width: `${position.width - 4}px`,
                                        height: `${ROW_HEIGHT - 16}px`,
                                        borderLeft: `3px solid ${borderColor}`,
                                        padding: '6px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        zIndex: 5,
                                      }}
                                      onClick={() => handleTimelineBookingClick(booking)}
                                      title={`Check-in: ${booking.checkInDate.toLocaleDateString('en-US')}\nCheck-out: ${booking.checkOutDate.toLocaleDateString('en-US')}\nGuest: ${booking.clientFirstName || 'Guest'}`}
                                      aria-label={`${booking.clientFirstName || 'Guest'} - ${formatStayRange(booking.checkInDate, booking.checkOutDate)}`}
                                    >
                                      <div className="text-xs font-semibold text-gray-900 line-clamp-1" style={{ fontFamily: 'var(--font-poppins)' }}>{booking.clientFirstName || 'Guest'}</div>
                                      <div className="text-[10px] text-gray-700 line-clamp-1" style={{ fontFamily: 'var(--font-poppins)' }}>{formatStayRange(booking.checkInDate, booking.checkOutDate)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>No units found</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {!loading && <CalendarLegend />}
          </div>
        </div>
      </div>

      {/* Slide-over: This Day's Lineup */}
      {isSlideOpen && (
        <>
          <div className={`fixed inset-0 bg-black/30 z-[9998] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={closeSlide} />
          <div className={`fixed inset-y-0 right-0 ${isMobile ? 'inset-x-0' : 'w-full sm:w-[640px]'} bg-white shadow-xl z-[9999] flex flex-col ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`} role="dialog" aria-modal="true">
            <div className={`${isMobile ? 'px-4 py-4' : 'px-6 py-5'} border-b border-gray-200 flex items-center justify-between`}>
              <div className="flex-1 min-w-0 pr-2">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`} style={{ color: '#0B5858', fontFamily: 'var(--font-poppins)' }}>This Day&apos;s Lineup</div>
                <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} mt-1 text-gray-500 uppercase tracking-wide truncate`}>{selectedDate?.toDateString()}</div>
              </div>
              <button onClick={closeSlide} className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-full hover:bg-gray-100 flex-shrink-0`} aria-label="Close panel">
                <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-600`} fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'} ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
              {selectedDate && getBookingsForDate(selectedDate).map((b, idx) => (
                <div key={idx} className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isMobile ? 'p-0' : 'p-6'} transform transition-transform duration-200 ${!isMobile ? 'hover:-translate-y-1' : ''}`}>
                  {isMobile ? (
                    <div className="flex flex-col">
                      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {b.checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {b.checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="w-full">
                        <img src={b.mainImageUrl || '/heroimage.png'} alt={b.title} className="w-full h-48 object-cover rounded-lg" />
                      </div>
                      <div className="px-4 pt-4 pb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>{b.title}</h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>{b.clientFirstName ? `Booked by Client - ${b.clientFirstName}` : 'Booked by Client'}</span>
                          </div>
                          {b.bookingId && (
                            <div className="flex items-center text-gray-600">
                              <svg className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                              <span className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Transaction No. {b.bookingId}</span>
                            </div>
                          )}
                        </div>
                        <div className="mb-4">
                          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-poppins)', color: b.status === 'pending' || b.status === 'pending-payment' ? '#F6D658' : '#0B5858' }}>
                            {b.status === 'booked' ? 'Booked' : b.status === 'pending' || b.status === 'pending-payment' ? 'Pending' : b.status === 'ongoing' ? 'On-going' : b.status === 'completed' ? 'Completed' : b.status || 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Total Bill</p>
                            <p className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>₱ {b.totalAmount?.toLocaleString() || '0'}</p>
                          </div>
                          <Link href={`/booking-details/${b.bookingId || ''}`} className="bg-teal-900 text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-95 transition-colors text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>View</Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                      <div className="flex-shrink-0">
                        <img src={b.mainImageUrl || '/heroimage.png'} alt={b.title} className="w-40 h-28 object-cover rounded-lg" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>{b.title}</h3>
                        <p className="text-base text-gray-600 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {b.checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {b.checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Booked for Client</span>
                          </div>
                          {b.bookingId && (
                            <div className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                              <span className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Transaction No. {b.bookingId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="mb-3">
                          <span className="text-base font-medium text-orange-500" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {b.status === 'booked' ? 'Booked' : b.status === 'pending' || b.status === 'pending-payment' ? 'Pending' : b.status === 'ongoing' ? 'On-going' : b.status === 'completed' ? 'Completed' : b.status || 'Pending'}
                          </span>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Total Bill</p>
                          <p className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-poppins)' }}>₱ {b.totalAmount?.toLocaleString() || '0'}</p>
                        </div>
                        <Link href={`/booking-details/${b.bookingId || ''}`} className="px-6 py-2 bg-teal-900 text-white rounded-lg font-medium hover:opacity-95 transition-colors inline-block" style={{ fontFamily: 'var(--font-poppins)' }}>View</Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {selectedDate && getBookingsForDate(selectedDate).length === 0 && <div className="text-center text-gray-500 py-10">No bookings for this date.</div>}
            </div>
          </div>
        </>
      )}

      {/* Timeline Booking Details Drawer */}
      {isDrawerOpen && selectedBooking && (
        <>
          <div className="fixed inset-0 z-[9998] cursor-pointer" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.25)' }} onClick={closeDrawer} />
          <div className={`fixed inset-y-0 right-0 w-full sm:w-[640px] bg-white shadow-xl z-[9999] flex flex-col ${isDrawerClosing ? 'animate-slide-out' : 'animate-slide-in'}`} style={{ height: '100vh', maxHeight: '100vh', top: 0, bottom: 0, overflow: 'hidden' }}>
            <div className={`flex-shrink-0 ${isMobile ? 'px-4 py-4 pb-4' : 'px-6 py-6 pb-6'} border-b border-gray-200 bg-white`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`} style={{ fontFamily: 'var(--font-poppins)' }}>Booking Details</h2>
                <button onClick={closeDrawer} className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 cursor-pointer flex-shrink-0`}>
                  <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900`} style={{ fontFamily: 'var(--font-poppins)' }}>Status:</span>
                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900`} style={{ fontFamily: 'var(--font-poppins)' }}>
                    {selectedBooking.status === 'pending' || selectedBooking.status === 'pending-payment' ? 'Pending' : selectedBooking.status === 'booked' ? 'Booked' : selectedBooking.status === 'ongoing' ? 'On-going' : selectedBooking.status === 'completed' ? 'Completed' : selectedBooking.status === 'declined' || selectedBooking.status === 'cancelled' ? 'Declined' : selectedBooking.status}
                  </span>
                </div>
                {selectedBooking.status === 'pending' && (
                  <Link href={`/booking-details/${selectedBooking.id}`} className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-100 relative group`} style={{ fontFamily: 'var(--font-poppins)', color: '#0B5858' }}>
                    <span className="relative inline-block">[ View Full Details ]</span>
                  </Link>
                )}
              </div>
            </div>
            <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'p-4' : 'p-6'}`} style={{ minHeight: 0, height: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>Client Information</h3>
                  {selectedBooking.client ? (
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {`${selectedBooking.client.first_name.charAt(0)}${selectedBooking.client.last_name?.charAt(0) || ''}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>{`${selectedBooking.client.first_name} ${selectedBooking.client.last_name}`}</h4>
                        {selectedBooking.client.email && <p className="text-xs text-gray-900 truncate" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.client.email}</p>}
                        {selectedBooking.client.contact_number && <p className="text-xs text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.client.contact_number}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>No client information available</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>Assigned Agent</h3>
                  {selectedBooking.agent ? (
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {selectedBooking.agent.fullname ? selectedBooking.agent.fullname.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.agent.fullname || 'Unknown Agent'}</h4>
                        {selectedBooking.agent.email && <p className="text-xs text-gray-900 truncate" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.agent.email}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>No agent assigned</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>Booking Details</h3>
                <div className="space-y-0 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="flex items-start py-1">
                    <span className="text-xs font-medium text-gray-600 w-[30%]" style={{ fontFamily: 'var(--font-poppins)' }}>Unit</span>
                    <span className="text-xs text-gray-900 ml-4 flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.listing?.title || 'Unknown Unit'}</span>
                  </div>
                  <div className="flex items-start py-1">
                    <span className="text-xs font-medium text-gray-600 w-[30%]" style={{ fontFamily: 'var(--font-poppins)' }}>Location</span>
                    <span className="text-xs text-gray-900 ml-4 flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>{selectedBooking.listing?.location || 'N/A'}</span>
                  </div>
                  <div className="flex items-start py-1">
                    <span className="text-xs font-medium text-gray-600 w-[30%]" style={{ fontFamily: 'var(--font-poppins)' }}>Check-in</span>
                    <span className="text-xs text-gray-900 ml-4 flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>{new Date(selectedBooking.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-start py-1">
                    <span className="text-xs font-medium text-gray-600 w-[30%]" style={{ fontFamily: 'var(--font-poppins)' }}>Check-out</span>
                    <span className="text-xs text-gray-900 ml-4 flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>{new Date(selectedBooking.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-start py-1">
                    <span className="text-xs font-medium text-gray-600 w-[30%]" style={{ fontFamily: 'var(--font-poppins)' }}>Total Price</span>
                    <span className="text-xs text-gray-900 ml-4 flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>₱ {selectedBooking.total_amount?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`flex-shrink-0 ${isMobile ? 'px-4 py-4' : 'px-6 py-5'} border-t border-gray-200 bg-white flex gap-3`}>
              <button onClick={closeDrawer} disabled={isProcessing} className={`flex-1 ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3'} border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 cursor-pointer font-medium disabled:opacity-50`} style={{ fontFamily: 'var(--font-poppins)' }}>Close</button>
              {selectedBooking.status === 'pending' && (
                <>
                  <button onClick={() => openConfirmModal(selectedBooking)} disabled={isProcessing} className={`flex-1 ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3'} text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer font-medium disabled:opacity-50`} style={{ fontFamily: 'var(--font-poppins)', backgroundColor: '#B84C4C' }}>Decline</button>
                  <button onClick={() => handleApprove(selectedBooking)} disabled={isProcessing} className={`flex-1 ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3'} text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer font-medium disabled:opacity-50`} style={{ fontFamily: 'var(--font-poppins)', backgroundColor: '#05807E' }}>Approve</button>
                </>
              )}
              {selectedBooking.status !== 'pending' && (
                <Link href={`/booking-details/${selectedBooking.id}`} className={`flex-1 ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3'} text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer font-medium text-center inline-flex items-center justify-center`} style={{ fontFamily: 'var(--font-poppins)', backgroundColor: '#0B5858' }}>View Full Details</Link>
              )}
            </div>
          </div>
        </>
      )}

      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[200] pointer-events-none" style={{ fontFamily: 'var(--font-poppins)' }}>
          <div
            ref={toastRef}
            className="toast-base px-4 py-3 rounded-lg pointer-events-auto"
            style={{ background: '#FFFFFF', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', minWidth: '280px', maxWidth: '400px', borderLeft: `6px solid ${toast.type === 'success' ? '#0B5858' : '#B84C4C'}` }}
            onTransitionEnd={(e) => {
              if ((e.target as HTMLElement).classList.contains('toast--exit')) {
                setToast({ visible: false, message: '', type: 'success' });
                (e.target as HTMLElement).classList.remove('toast--exit');
              }
            }}
          >
            {toast.message}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000]" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.25)' }} onClick={closeConfirmModal}>
          <div className="max-w-md w-full mx-4" style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)', transform: confirmModalActive ? 'scale(1)' : 'scale(0.95)', opacity: confirmModalActive ? 1 : 0, transition: 'all 0.25s ease' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>Decline Booking Request</h3>
              <p className="text-gray-700 mb-5" style={{ fontFamily: 'var(--font-poppins)' }}>Are you sure you want to decline this booking request? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button onClick={closeConfirmModal} disabled={isProcessing} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50" style={{ fontFamily: 'var(--font-poppins)' }}>Cancel</button>
                <button onClick={handleDecline} disabled={isProcessing} className="px-4 py-2 text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50" style={{ backgroundColor: '#B84C4C', fontFamily: 'var(--font-poppins)' }}>{isProcessing ? 'Processing...' : 'Decline'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CalendarSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} unitId={null} showSpecialPricing={false} isGlobal />
    </div>
  );
}

export default function CalendarPage() {
  return <CalendarView />;
}
