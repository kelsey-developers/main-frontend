'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * SingleDatePicker — pick one date via dropdown calendar.
 * Matches app design: rounded-lg to align with container, shadow, #0B5858 accent. One calendar panel only (no range).
 */
export interface SingleDatePickerProps {
  /** Selected date (YYYY-MM-DD); empty string when none */
  value: string;
  /** Called when date changes */
  onChange: (date: string) => void;
  /** Placeholder when no date selected */
  placeholder?: string;
  /** Optional className for the trigger wrapper */
  className?: string;
  /** z-index for the calendar portal (default 10000) */
  calendarZIndex?: number;
  /** Optional minimum selectable date (YYYY-MM-DD). Days before this are disabled. */
  minDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

export default function SingleDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  calendarZIndex = 10000,
  minDate,
}: SingleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [monthStart, setMonthStart] = useState<Date>(() => {
    if (value) {
      const d = new Date(value);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setMonthStart(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.offsetHeight || 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    if (shouldOpenUpward) {
      dropdownRef.current.style.top = 'auto';
      dropdownRef.current.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      dropdownRef.current.style.left = `${rect.left}px`;
      dropdownRef.current.style.right = 'auto';
    } else {
      dropdownRef.current.style.top = `${rect.bottom + 8}px`;
      dropdownRef.current.style.bottom = 'auto';
      dropdownRef.current.style.left = `${rect.left}px`;
      dropdownRef.current.style.right = 'auto';
    }
  }, [isOpen, monthStart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!pickerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const navigate = (dir: 'prev' | 'next') => {
    const next = new Date(monthStart);
    next.setMonth(monthStart.getMonth() + (dir === 'next' ? 1 : -1));
    setMonthStart(next);
  };

  const handleToday = () => {
    onChange(formatDate(new Date()));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const days = getDaysInMonth(monthStart);
  const displayMonth = monthStart.getMonth();
  const isSelected = (date: Date) => formatDate(date) === value;
  const minDateObj = minDate ? new Date(minDate) : null;
  if (minDateObj) {
    minDateObj.setHours(0, 0, 0, 0);
  }

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen((o) => !o); } }}
        className="inline-flex items-center gap-2 justify-start rounded-lg border border-gray-200 bg-white pl-2.5 pr-2.5 py-1.5 text-sm font-medium text-gray-800 focus-within:ring-2 focus-within:ring-[#0B5858]/30 focus-within:border-[#0B5858] transition-colors hover:bg-gray-50/80 cursor-pointer w-full text-left"
        style={{ fontFamily: 'var(--font-poppins)' }}
        aria-label="Select date"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={value ? 'text-gray-800' : 'text-gray-500'}>{value ? formatDisplayDate(new Date(value)) : placeholder}</span>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-2.5 flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(90vw, 280px)', zIndex: calendarZIndex }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              aria-label="Previous month"
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
              aria-label="Next month"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-[10px] font-medium text-gray-500 text-center py-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {days.map((day, index) => {
              const currentMonth = day.getMonth() === displayMonth;
              const selected = isSelected(day);
              const today = isToday(day);
              const isBeforeMin = minDateObj ? day < minDateObj : false;
              const disabled = !currentMonth || isBeforeMin;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    if (disabled) return;
                    e.stopPropagation();
                    onChange(formatDate(day));
                    setIsOpen(false);
                  }}
                  disabled={disabled}
                  className={`
                    h-6 w-6 rounded-lg text-xs transition-all
                    ${!currentMonth ? 'text-gray-300' : 'text-gray-900'}
                    ${selected ? 'bg-[#0B5858] text-white font-semibold' : ''}
                    ${today && !selected ? 'border-2 border-[#0B5858]' : ''}
                    ${disabled ? 'cursor-not-allowed hover:bg-transparent' : 'hover:bg-gray-100 cursor-pointer'}
                  `}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {day.getDate()}
                </button>
              );
            })}
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
            {value && (
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
