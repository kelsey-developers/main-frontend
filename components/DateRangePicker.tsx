'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * DateRangePicker Component
 *
 * Custom date range picker matching the oop-dev design system.
 * Opens a dropdown with two side-by-side calendar panels (From | To).
 * Uses the same dropdown styling as SingleDatePicker: rounded-xl, shadow, #0B5858 accent.
 */
export interface DateRangePickerProps {
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  /** End date (YYYY-MM-DD) */
  endDate: string;
  /** Called when start date changes */
  onStartChange: (date: string) => void;
  /** Called when end date changes */
  onEndChange: (date: string) => void;
  /** Placeholder when range is empty */
  placeholder?: string;
  /** Optional className for the trigger wrapper */
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format Date to YYYY-MM-DD */
function formatDate(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format for display (e.g. "Feb 1, 2026") */
function formatDisplayDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build 42-day grid for a given month (includes prev/next month fillers) */
function getDaysInMonth(monthStart: Date): Date[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const startDay = first.getDay();

  const days: Date[] = [];
  const prevLast = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevLast.getDate() - i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push(new Date(year, month + 1, d));
  }
  return days;
}

function isToday(date: Date): boolean {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  placeholder = 'Select date range',
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** Left calendar month (for "From") */
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    if (startDate) {
      const d = new Date(startDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  /** Right calendar month (for "To") */
  const [rightMonth, setRightMonth] = useState<Date>(() => {
    if (endDate) {
      const d = new Date(endDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth() + 1, 1);
  });

  // Sync calendar months when values change externally
  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      setLeftMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [startDate]);
  useEffect(() => {
    if (endDate) {
      const d = new Date(endDate);
      setRightMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [endDate]);

  /** Position dropdown below trigger, right-aligned with trigger; open upward if not enough space below */
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.offsetHeight || 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    /** Right-align: use right so dropdown right edge matches trigger right edge (no width measurement needed) */
    const rightPx = window.innerWidth - rect.right;

    if (shouldOpenUpward) {
      dropdownRef.current.style.top = 'auto';
      dropdownRef.current.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      dropdownRef.current.style.left = 'auto';
      dropdownRef.current.style.right = `${rightPx}px`;
    } else {
      dropdownRef.current.style.top = `${rect.bottom + 8}px`;
      dropdownRef.current.style.bottom = 'auto';
      dropdownRef.current.style.left = 'auto';
      dropdownRef.current.style.right = `${rightPx}px`;
    }
  }, [isOpen, leftMonth, rightMonth]);

  /** Close on outside click */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePicker = pickerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insidePicker && !insideDropdown) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const navigateLeft = (dir: 'prev' | 'next') => {
    const next = new Date(leftMonth);
    next.setMonth(leftMonth.getMonth() + (dir === 'next' ? 1 : -1));
    setLeftMonth(next);
  };

  const navigateRight = (dir: 'prev' | 'next') => {
    const next = new Date(rightMonth);
    next.setMonth(rightMonth.getMonth() + (dir === 'next' ? 1 : -1));
    setRightMonth(next);
  };

  const handleToday = () => {
    const today = formatDate(new Date());
    onStartChange(today);
    onEndChange(today);
    setIsOpen(false);
  };

  const handleClear = () => {
    onStartChange('');
    onEndChange('');
    setIsOpen(false);
  };

  const displayText = startDate && endDate
    ? `${formatDisplayDate(new Date(startDate))} – ${formatDisplayDate(new Date(endDate))}`
    : placeholder;

  /** Single calendar panel (reused for From and To) */
  const renderCalendar = (
    title: string,
    monthStart: Date,
    navigate: (dir: 'prev' | 'next') => void,
    selectedDate: string,
    onSelect: (date: string) => void,
    minDate?: string
  ) => {
    const days = getDaysInMonth(monthStart);
    const displayMonth = monthStart.getMonth();

    const isDisabled = (date: Date) => {
      if (minDate) return formatDate(date) < minDate;
      return false;
    };

    const isSelected = (date: Date) => formatDate(date) === selectedDate;

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            aria-label={`Previous ${title} month`}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
            {MONTH_NAMES[displayMonth]} {monthStart.getFullYear()}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate('next'); }}
            className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            aria-label={`Next ${title} month`}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="text-[10px] font-medium text-gray-500 text-center py-0.5"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-2">
          {days.map((day, index) => {
            const currentMonth = day.getMonth() === displayMonth;
            const selected = isSelected(day);
            const today = isToday(day);
            const disabled = isDisabled(day);
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) {
                    const next = formatDate(day);
                    if (title === 'From') {
                      onSelect(next);
                      if (endDate && next > endDate) onEndChange('');
                    } else {
                      if (startDate && next < startDate) {
                        onStartChange(next);
                        onEndChange(startDate);
                      } else {
                        onSelect(next);
                      }
                    }
                  }
                }}
                disabled={disabled}
                className={`
                  h-6 w-6 rounded-lg text-xs transition-all
                  ${!currentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${selected ? 'bg-[#0B5858] text-white font-semibold' : ''}
                  ${today && !selected ? 'border-2 border-[#0B5858]' : ''}
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                `}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Trigger: same container style as Activity modal date row */}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen((o) => !o); } }}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-2.5 pr-2.5 py-1.5 text-sm font-medium text-gray-800 focus-within:ring-2 focus-within:ring-[#0B5858]/30 focus-within:border-[#0B5858] transition-colors hover:bg-gray-50/80 cursor-pointer"
        style={{ fontFamily: 'var(--font-poppins)' }}
        aria-label="Select date range"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={startDate && endDate ? 'text-gray-800' : 'text-gray-500'}>{displayText}</span>
      </div>

      {/* Dropdown: custom design from oop-dev (portal, rounded-xl, shadow, two calendars) */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(90vw, 560px)',
            zIndex: 10000,
          }}
        >
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                From
              </div>
              {renderCalendar('From', leftMonth, navigateLeft, startDate, onStartChange)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                To
              </div>
              {renderCalendar('To', rightMonth, navigateRight, endDate, onEndChange, startDate || undefined)}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-gray-200 mt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToday(); }}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Today
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
