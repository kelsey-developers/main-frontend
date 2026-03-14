'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';

type LocalBlockedDateRange = {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  /** Source of external booking that caused the block */
  externalSource?: string;
  /** Guest name from external booking platform */
  externalGuestName?: string;
};

type LocalSpecialPricingRule = {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  note?: string;
};

interface CalendarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId?: string | null;
  showSpecialPricing?: boolean;
  isGlobal?: boolean;
}

/**
 * Calendar Settings Modal — UI only, mock data.
 * No Supabase/API; all changes are local state only.
 */
const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  isOpen,
  onClose,
  showSpecialPricing = true,
  isGlobal = false,
}) => {
  const [blockedStartDate, setBlockedStartDate] = useState('');
  const [blockedEndDate, setBlockedEndDate] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedRanges, setBlockedRanges] = useState<LocalBlockedDateRange[]>([]);
  /** Whether the blocked date is from an external booking site */
  const [isExternalBooking, setIsExternalBooking] = useState(false);
  const [externalSource, setExternalSource] = useState('');
  const [externalGuestName, setExternalGuestName] = useState('');

  const [pricingStartDate, setPricingStartDate] = useState('');
  const [pricingEndDate, setPricingEndDate] = useState('');
  const [pricingPrice, setPricingPrice] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [pricingRules, setPricingRules] = useState<LocalSpecialPricingRule[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBlockedRange = () => {
    if (!blockedStartDate || !blockedEndDate) return;
    setIsSaving(true);
    const autoReason = isExternalBooking
      ? `Booked via ${externalSource || 'External Site'}${externalGuestName ? ` — Guest: ${externalGuestName}` : ''}`
      : blockedReason.trim() || undefined;
    const newRange: LocalBlockedDateRange = {
      id: `blocked-${Date.now()}`,
      startDate: blockedStartDate,
      endDate: blockedEndDate,
      reason: typeof autoReason === 'string' ? autoReason : undefined,
      externalSource: isExternalBooking ? (externalSource || 'Other') : undefined,
      externalGuestName: isExternalBooking ? (externalGuestName || undefined) : undefined,
    };
    setBlockedRanges((prev) => [...prev, newRange]);
    setBlockedStartDate('');
    setBlockedEndDate('');
    setBlockedReason('');
    setIsExternalBooking(false);
    setExternalSource('');
    setExternalGuestName('');
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleRemoveBlockedRange = (id: string) => {
    setBlockedRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSavePricingRule = () => {
    if (!pricingStartDate || !pricingEndDate || !pricingPrice || !showSpecialPricing) return;
    const price = parseFloat(pricingPrice.replace(/[₱,]/g, ''));
    if (isNaN(price) || price <= 0) return;
    setIsSaving(true);
    const newRule: LocalSpecialPricingRule = {
      id: `pricing-${Date.now()}`,
      startDate: pricingStartDate,
      endDate: pricingEndDate,
      price,
      note: pricingNote.trim() || undefined,
    };
    setPricingRules((prev) => [...prev, newRule]);
    setPricingStartDate('');
    setPricingEndDate('');
    setPricingPrice('');
    setPricingNote('');
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleRemovePricingRule = (id: string) => {
    setPricingRules((prev) => prev.filter((r) => r.id !== id));
  };

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /** Portal to document.body so overlay covers the entire viewport (avoids clipping/stacking context from calendar container or admin layout). */
  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-settings-modal-title"
      style={{
        zIndex: 99999,
        overflow: 'auto',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="bg-white rounded-xl max-w-6xl w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          height: '80vh',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="calendar-settings-modal-title" className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
            {isGlobal ? 'Global Calendar Settings' : 'Unit Calendar Settings'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1 cursor-pointer hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="px-6 py-4"
          style={{ flex: '1 1 0%', overflow: 'hidden', minHeight: 0 }}
        >
          <div className="flex gap-6 h-full">
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="space-y-4 pr-2">
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Blocked Dates
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3.5 mb-3 space-y-2.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                          Start Date
                        </label>
                        <SingleDatePicker
                          value={blockedStartDate}
                          onChange={(date) => {
                            setBlockedStartDate(date);
                            if (blockedEndDate && date && blockedEndDate < date) setBlockedEndDate('');
                          }}
                          placeholder="Select start date"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                          End Date
                        </label>
                        <SingleDatePicker value={blockedEndDate} onChange={setBlockedEndDate} placeholder="Select end date" />
                      </div>
                    </div>
                    {/* Toggle: external booking vs manual block */}
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isExternalBooking}
                          onChange={(e) => setIsExternalBooking(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0B5858] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B5858]"></div>
                      </label>
                      <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Booked via another platform
                      </span>
                    </div>

                    {isExternalBooking ? (
                      <div className="space-y-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Booking Source
                          </label>
                          <select
                            value={externalSource}
                            onChange={(e) => setExternalSource(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent transition-all bg-white"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            <option value="">Select platform...</option>
                            <option value="Airbnb">Airbnb</option>
                            <option value="Booking.com">Booking.com</option>
                            <option value="Agoda">Agoda</option>
                            <option value="Expedia">Expedia</option>
                            <option value="VRBO">VRBO</option>
                            <option value="Walk-in">Walk-in / Direct</option>
                            <option value="Phone">Phone Reservation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Guest Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={externalGuestName}
                            onChange={(e) => setExternalGuestName(e.target.value)}
                            placeholder="e.g., John Doe"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent transition-all"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                          Reason (Optional)
                        </label>
                        <input
                          type="text"
                          value={blockedReason}
                          onChange={(e) => setBlockedReason(e.target.value)}
                          placeholder="e.g., Private event, Maintenance"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent transition-all"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSaveBlockedRange}
                      disabled={!blockedStartDate || !blockedEndDate || isSaving}
                      className="px-4 py-1.5 text-sm bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094b4b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-md active:scale-95"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {isSaving ? 'Saving...' : isExternalBooking ? 'Block for External Booking' : 'Save Blocked Range'}
                    </button>
                  </div>
                </section>

                {showSpecialPricing && (
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Special Pricing
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3.5 mb-3 space-y-2.5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Start Date
                          </label>
                          <SingleDatePicker
                            value={pricingStartDate}
                            onChange={(date) => {
                              setPricingStartDate(date);
                              if (pricingEndDate && date && pricingEndDate < date) setPricingEndDate('');
                            }}
                            placeholder="Select start date"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            End Date
                          </label>
                          <SingleDatePicker value={pricingEndDate} onChange={setPricingEndDate} placeholder="Select end date" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Price
                          </label>
                          <input
                            type="text"
                            value={pricingPrice}
                            onChange={(e) => setPricingPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="₱"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent transition-all"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={pricingNote}
                            onChange={(e) => setPricingNote(e.target.value)}
                            placeholder="e.g., Holiday pricing, Peak season"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent transition-all"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSavePricingRule}
                        disabled={!pricingStartDate || !pricingEndDate || !pricingPrice || isSaving}
                        className="px-4 py-1.5 text-sm bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094b4b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-md active:scale-95"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {isSaving ? 'Saving...' : 'Save Pricing Rule'}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </div>

            <div
              className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto overflow-x-hidden"
              style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
            >
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Blocked Dates
                  </h3>
                  {blockedRanges.length > 0 ? (
                    <div className="space-y-1.5">
                      {blockedRanges.map((range) => (
                        <div key={range.id} className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {formatDateDisplay(range.startDate)} – {formatDateDisplay(range.endDate)}
                              </div>
                              {range.externalSource && (
                                <div className="mb-0.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800" style={{ fontFamily: 'var(--font-poppins)' }}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    {range.externalSource}
                                  </span>
                                </div>
                              )}
                              {range.externalGuestName && (
                                <div className="text-[11px] text-gray-700 leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  Guest: {range.externalGuestName}
                                </div>
                              )}
                              {range.reason && (
                                <div className="text-[11px] text-gray-600 leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {range.reason}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveBlockedRange(range.id)}
                              className="transition-all duration-200 p-1 flex-shrink-0 cursor-pointer hover:scale-110 active:scale-95 rounded text-[#B84C4C] hover:bg-[#B84C4C]/10"
                              aria-label="Remove blocked range"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic" style={{ fontFamily: 'var(--font-poppins)' }}>
                      No blocked dates
                    </div>
                  )}
                </div>

                {showSpecialPricing && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Special Pricing
                    </h3>
                    {pricingRules.length > 0 ? (
                      <div className="space-y-1.5">
                        {pricingRules.map((rule) => (
                          <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {formatDateDisplay(rule.startDate)} – {formatDateDisplay(rule.endDate)}
                                </div>
                                <div className="text-sm font-semibold text-[#0B5858] mb-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {formatCurrency(rule.price)}
                                </div>
                                {rule.note && (
                                  <div className="text-[11px] text-gray-600 leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                                    {rule.note}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemovePricingRule(rule.id)}
                                className="transition-all duration-200 p-1 flex-shrink-0 cursor-pointer hover:scale-110 active:scale-95 rounded text-[#B84C4C] hover:bg-[#B84C4C]/10"
                                aria-label="Remove pricing rule"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic" style={{ fontFamily: 'var(--font-poppins)' }}>
                        No special pricing rules
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-6 px-6 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-sm active:scale-95"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2 bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094b4b] transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default CalendarSettingsModal;
