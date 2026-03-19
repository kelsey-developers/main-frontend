'use client';

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';

type ModalUnit = { id: string; title: string; imageUrl?: string };

const BLOCK_TYPES: { id: string; label: string; description: string; icon: ReactNode }[] = [
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Repairs, cleaning, or general upkeep',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'personal',
    label: 'Personal Use',
    description: 'Owner stay or personal reservation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'external',
    label: 'External Booking',
    description: 'Booked via Airbnb, Booking.com, etc.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    ),
  },
  {
    id: 'renovation',
    label: 'Renovation',
    description: 'Major upgrades or construction',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Provide a custom reason',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
];

const EXTERNAL_SOURCES = ['Airbnb', 'Booking.com', 'Agoda', 'Expedia', 'VRBO', 'Walk-in / Direct', 'Phone Reservation', 'Other'];

type BlockedDateRange = { id: string; start_date: string; end_date: string; reason?: string; unit_ids?: string[] };

type EditingBlockedRange = {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  source?: string;
  guest_name?: string;
  scope?: 'global' | 'unit';
  unit_ids?: string[];
};

interface BlockDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onSave: (range: Omit<BlockedDateRange, 'id'> & { source?: string; guest_name?: string }) => void;
  preselectedUnitIds?: string[];
  editingRange?: EditingBlockedRange | null;
  onRemove?: (id: string) => void;
  units?: ModalUnit[];
}

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function countDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function fmt(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const BlockDateRangeModal: React.FC<BlockDateRangeModalProps> = ({ isOpen, onClose, startDate, endDate, onSave, preselectedUnitIds, editingRange, onRemove, units = [] }) => {
  const modalUnits: ModalUnit[] = units.length > 0 ? units : [];
  const [step, setStep] = useState<1 | 2>(1);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [blockType, setBlockType] = useState('maintenance');
  const [reason, setReason] = useState('');
  const [externalSource, setExternalSource] = useState('');
  const [externalGuestName, setExternalGuestName] = useState('');
  const [scope, setScope] = useState<'all' | 'specific'>('all');
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isOpen) {
      setStep(1);

      if (editingRange) {
        setLocalStart(editingRange.start_date);
        setLocalEnd(editingRange.end_date);

        // Reverse-map reason to block type
        const reason = editingRange.reason || '';
        if (editingRange.source && editingRange.source !== 'manual') {
          setBlockType('external');
          setExternalSource(editingRange.source === 'airbnb' ? 'Airbnb' : editingRange.source === 'booking.com' ? 'Booking.com' : editingRange.source);
          setExternalGuestName(editingRange.guest_name || '');
          setReason('');
        } else if (reason.toLowerCase().includes('maintenance') || reason === 'Maintenance') {
          setBlockType('maintenance');
          setReason('');
          setExternalSource('');
          setExternalGuestName('');
        } else if (reason.toLowerCase().includes('personal')) {
          setBlockType('personal');
          setReason('');
          setExternalSource('');
          setExternalGuestName('');
        } else if (reason.toLowerCase().includes('renovation')) {
          setBlockType('renovation');
          setReason('');
          setExternalSource('');
          setExternalGuestName('');
        } else {
          setBlockType('other');
          setReason(reason);
          setExternalSource('');
          setExternalGuestName('');
        }

        const hasUnits = editingRange.unit_ids && editingRange.unit_ids.length > 0;
        setScope(hasUnits ? 'specific' : 'all');
        setSelectedUnitIds(hasUnits ? new Set(editingRange.unit_ids) : new Set());
      } else {
        setLocalStart(startDate);
        setLocalEnd(endDate);
        setBlockType('maintenance');
        setReason('');
        setExternalSource('');
        setExternalGuestName('');
        const hasPreselected = preselectedUnitIds && preselectedUnitIds.length > 0;
        setScope(hasPreselected ? 'specific' : 'all');
        setSelectedUnitIds(hasPreselected ? new Set(preselectedUnitIds) : new Set());
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, startDate, endDate, preselectedUnitIds, editingRange]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const dayCount = countDays(localStart, localEnd);
  const canProceed = !!localStart && !!localEnd && localStart <= localEnd;

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!localStart || !localEnd) return;
    const [s, e] = [localStart, localEnd].sort();
    let finalReason = '';
    let source: string | undefined = 'manual';
    let guestName: string | undefined;
    if (blockType === 'external') {
      finalReason = `Booked via ${externalSource || 'External Platform'}${externalGuestName ? ` — Guest: ${externalGuestName}` : ''}`;
      source = externalSource ? externalSource.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : 'other';
      if (source === 'airbnb') source = 'airbnb';
      else if (source === 'bookingcom') source = 'booking.com';
      else if (source === 'agoda') source = 'agoda';
      else if (source === 'expedia') source = 'expedia';
      else if (source === 'vrbo') source = 'vrbo';
      else if (source === 'walk_in' || source === 'walk-in' || source === 'direct') source = 'walk_in';
      else if (source === 'phone') source = 'phone';
      else if (!['airbnb', 'booking.com', 'agoda', 'expedia', 'vrbo', 'walk_in', 'phone'].includes(source)) source = 'other';
      guestName = externalGuestName.trim() || undefined;
    } else if (blockType === 'other') {
      finalReason = reason.trim();
    } else {
      finalReason = BLOCK_TYPES.find((t) => t.id === blockType)?.label || '';
    }
    const unitIds = scope === 'specific' && selectedUnitIds.size > 0 ? Array.from(selectedUnitIds) : undefined;
    onSave({ start_date: s, end_date: e, reason: finalReason || undefined, unit_ids: unitIds, source, guest_name: guestName });
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up flex flex-col"
        style={{ maxHeight: '90vh', fontFamily: 'var(--font-poppins)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 1 ? 'bg-[#0B5858] text-white' : 'bg-[#0B5858]/15 text-[#0B5858]'}`}>1</div>
              <span className="text-xs text-gray-400">Date &amp; Reason</span>
              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 2 ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
              <span className="text-xs text-gray-400">Apply to Units</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{step === 1 ? 'Block Dates' : 'Apply to Units'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? 'Set the date range and reason for blocking availability' : 'Choose which units to apply this block to'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Date range */}
              <div>
                <label className={labelClass}>Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <SingleDatePicker
                      value={localStart}
                      onChange={(date: string) => { setLocalStart(date); if (localEnd && date && localEnd < date) setLocalEnd(''); }}
                      placeholder="Start date"
                      calendarZIndex={200000}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">To</p>
                    <SingleDatePicker
                      value={localEnd}
                      onChange={(date: string) => setLocalEnd(date)}
                      minDate={localStart || undefined}
                      placeholder="End date"
                      calendarZIndex={200000}
                    />
                  </div>
                </div>
                {dayCount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl border border-[#0B5858]/10">
                    <svg className="w-4 h-4 text-[#0B5858]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-sm font-semibold text-[#0B5858]">{dayCount} day{dayCount !== 1 ? 's' : ''} will be blocked</span>
                  </div>
                )}
              </div>

              {/* Block type */}
              <div>
                <label className={labelClass}>Reason for Blocking</label>
                <div className="space-y-2">
                  {BLOCK_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setBlockType(type.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer ${blockType === type.id ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <span className={`flex-shrink-0 ${blockType === type.id ? 'text-[#0B5858]' : 'text-gray-400'}`}>{type.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${blockType === type.id ? 'border-[#0B5858] bg-[#0B5858]' : 'border-gray-300'}`}>
                        {blockType === type.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* External booking details */}
              {blockType === 'external' && (
                <div className="space-y-3 p-4 bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 border border-[#0B5858]/10 rounded-xl">
                  <p className="text-xs font-bold text-[#0B5858] uppercase tracking-widest">External Booking Details</p>
                  <div>
                    <label className={labelClass}>Booking Platform</label>
                    <div className="flex flex-wrap gap-2">
                      {EXTERNAL_SOURCES.map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setExternalSource(src)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${externalSource === src ? 'border-[#0B5858] bg-[#0B5858] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-[#0B5858]/30'}`}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Guest Name <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={externalGuestName} onChange={(e) => setExternalGuestName(e.target.value)} placeholder="e.g., John Doe" className={inputClass} />
                  </div>
                </div>
              )}

              {/* Custom reason */}
              {blockType === 'other' && (
                <div>
                  <label className={labelClass}>Custom Reason</label>
                  <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe why these dates are being blocked..." className={inputClass} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scope selector */}
              <div>
                <label className={labelClass}>Apply to</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all cursor-pointer ${scope === 'all' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <svg className={`w-6 h-6 ${scope === 'all' ? 'text-[#0B5858]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <div className={`text-sm font-semibold ${scope === 'all' ? 'text-[#0B5858]' : 'text-gray-700'}`}>All Units</div>
                      <div className="text-xs text-gray-500">Block all {modalUnits.length} units</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('specific')}
                    className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all cursor-pointer ${scope === 'specific' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <svg className={`w-6 h-6 ${scope === 'specific' ? 'text-[#0B5858]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <div>
                      <div className={`text-sm font-semibold ${scope === 'specific' ? 'text-[#0B5858]' : 'text-gray-700'}`}>Specific Units</div>
                      <div className="text-xs text-gray-500">Choose which units</div>
                    </div>
                  </button>
                </div>
              </div>

              {scope === 'specific' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass + ' mb-0'}>Select Units</label>
                    <button
                      type="button"
                      onClick={() => setSelectedUnitIds(selectedUnitIds.size === modalUnits.length ? new Set() : new Set(modalUnits.map((u) => u.id)))}
                      className="text-xs font-medium text-[#0B5858] hover:underline cursor-pointer"
                    >
                      {selectedUnitIds.size === modalUnits.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {modalUnits.map((unit) => {
                      const isSelected = selectedUnitIds.has(unit.id);
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => toggleUnit(unit.id)}
                          className={`flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left cursor-pointer ${isSelected ? 'border-[#0B5858] ring-2 ring-[#0B5858]/20 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="aspect-[4/3] bg-gray-100 relative">
                            {unit.imageUrl ? (
                              <img src={unit.imageUrl} alt={unit.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-base font-bold text-gray-500">{unit.title.charAt(0)}</div>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0B5858] flex items-center justify-center shadow">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-semibold text-gray-900 truncate">{unit.title}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedUnitIds.size > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">{selectedUnitIds.size} of {modalUnits.length} units selected</p>
                  )}
                </div>
              )}

              {/* Summary card */}
              <div className="bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl p-4 border border-[#0B5858]/10">
                <p className="text-[10px] font-bold text-[#0B5858] uppercase tracking-widest mb-3">Block Summary</p>
                <div className="space-y-2">
                  {[
                    { label: 'Date range', value: localStart && localEnd ? `${fmt(localStart)} – ${fmt(localEnd)}` : '—' },
                    { label: 'Duration', value: `${dayCount} day${dayCount !== 1 ? 's' : ''}` },
                    { label: 'Reason', value: BLOCK_TYPES.find((t) => t.id === blockType)?.label || 'Other' },
                    { label: 'Applies to', value: scope === 'all' ? `All ${modalUnits.length} units` : selectedUnitIds.size > 0 ? `${selectedUnitIds.size} unit${selectedUnitIds.size !== 1 ? 's' : ''}` : 'None selected' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{row.label}</span>
                      <span className="text-xs font-semibold text-gray-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          ) : (
            <>
              {editingRange && onRemove && (
                <button
                  type="button"
                  onClick={() => { onRemove(editingRange.id); onClose(); }}
                  className="py-2.5 px-4 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={scope === 'specific' && selectedUnitIds.size === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50"
              >
                {editingRange ? 'Save Changes' : 'Confirm Block'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

export default BlockDateRangeModal;
