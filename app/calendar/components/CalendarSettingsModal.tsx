'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';

type LocalBlockedDateRange = {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
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
  initialBlockedRanges?: LocalBlockedDateRange[];
  initialPricingRules?: LocalSpecialPricingRule[];
  onBlockedRangeAdded?: (range: LocalBlockedDateRange) => void;
  onBlockedRangeRemoved?: (id: string) => void;
  onPricingRuleAdded?: (rule: LocalSpecialPricingRule) => void;
  onPricingRuleRemoved?: (id: string) => void;
}

type TabId = 'blocked' | 'pricing';



function fmtDate(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function countDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  isOpen,
  onClose,
  unitId,
  showSpecialPricing = true,
  isGlobal = false,
  initialBlockedRanges = [],
  initialPricingRules = [],
  onBlockedRangeAdded,
  onBlockedRangeRemoved,
  onPricingRuleAdded,
  onPricingRuleRemoved,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('blocked');
  const [animateIn, setAnimateIn] = useState(false);

  // Blocked dates form
  const [blockedStart, setBlockedStart] = useState('');
  const [blockedEnd, setBlockedEnd] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedRanges, setBlockedRanges] = useState<LocalBlockedDateRange[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);

  // Pricing form
  const [pricingStart, setPricingStart] = useState('');
  const [pricingEnd, setPricingEnd] = useState('');
  const [pricingPrice, setPricingPrice] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [pricingRules, setPricingRules] = useState<LocalSpecialPricingRule[]>([]);
  const [showPricingForm, setShowPricingForm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isOpen) {
      setBlockedRanges(initialBlockedRanges);
      setPricingRules(initialPricingRules);
      setActiveTab('blocked');
      setShowBlockForm(false);
      setShowPricingForm(false);
      setBlockedStart(''); setBlockedEnd(''); setBlockedReason('');
      setPricingStart(''); setPricingEnd(''); setPricingPrice(''); setPricingNote('');
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
    } else {
      setAnimateIn(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialBlockedRanges, initialPricingRules]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const handleSaveBlockedRange = () => {
    if (!blockedStart || !blockedEnd) return;
    setIsSaving(true);
    const newRange: LocalBlockedDateRange = {
      id: `blocked-${Date.now()}`,
      startDate: blockedStart,
      endDate: blockedEnd,
      reason: blockedReason.trim() || undefined,
    };
    setBlockedRanges((prev) => [...prev, newRange]);
    setBlockedStart(''); setBlockedEnd(''); setBlockedReason('');
    setShowBlockForm(false);
    onBlockedRangeAdded?.(newRange);
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleRemoveBlockedRange = (id: string) => {
    setBlockedRanges((prev) => prev.filter((r) => r.id !== id));
    onBlockedRangeRemoved?.(id);
  };

  const handleSavePricingRule = () => {
    if (!pricingStart || !pricingEnd || !pricingPrice) return;
    const price = parseFloat(pricingPrice.replace(/[₱,]/g, ''));
    if (isNaN(price) || price <= 0) return;
    setIsSaving(true);
    const newRule: LocalSpecialPricingRule = {
      id: `pricing-${Date.now()}`,
      startDate: pricingStart,
      endDate: pricingEnd,
      price,
      note: pricingNote.trim() || undefined,
    };
    setPricingRules((prev) => [...prev, newRule]);
    setPricingStart(''); setPricingEnd(''); setPricingPrice(''); setPricingNote('');
    setShowPricingForm(false);
    onPricingRuleAdded?.(newRule);
    setTimeout(() => setIsSaving(false), 300);
  };

  const handleRemovePricingRule = (id: string) => {
    setPricingRules((prev) => prev.filter((r) => r.id !== id));
    onPricingRuleRemoved?.(id);
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'blocked', label: 'Blocked Dates', count: blockedRanges.length || undefined },
    ...(showSpecialPricing ? [{ id: 'pricing' as TabId, label: 'Special Pricing', count: pricingRules.length || undefined }] : []),
  ];

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto py-4"
      style={{
        zIndex: 99999,
        backgroundColor: animateIn ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
        backdropFilter: animateIn ? 'blur(6px)' : 'blur(0px)',
        WebkitBackdropFilter: animateIn ? 'blur(6px)' : 'blur(0px)',
        transition: 'background-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl w-full mx-4 my-auto shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxWidth: 640,
          maxHeight: '90vh',
          fontFamily: 'var(--font-poppins)',
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
          opacity: animateIn ? 1 : 0,
          transition: 'transform 0.25s ease, opacity 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-0 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
                {isGlobal ? 'Global Calendar Settings' : 'Calendar Settings'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                {isGlobal ? 'Applies to all units across your portfolio' : `Unit-specific settings${unitId ? '' : ''}`}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0 mt-0.5" aria-label="Close">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 mr-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id ? 'border-[#0B5858] text-[#0B5858]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-[#0B5858] text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

          {/* === BLOCKED DATES TAB === */}
          {activeTab === 'blocked' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {blockedRanges.length === 0 ? 'No blocked date ranges' : `${blockedRanges.length} range${blockedRanges.length !== 1 ? 's' : ''} blocked`}
                </div>
                <button
                  onClick={() => setShowBlockForm((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B5858] text-white rounded-lg text-xs font-semibold hover:bg-[#094848] transition-all cursor-pointer"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add Block
                </button>
              </div>

              {/* Inline form */}
              {showBlockForm && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>New Blocked Range</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Start Date</label>
                      <SingleDatePicker
                        value={blockedStart}
                        onChange={(date) => {
                          setBlockedStart(date);
                          if (blockedEnd && date && blockedEnd < date) setBlockedEnd('');
                        }}
                        placeholder="Select start"
                        calendarZIndex={200000}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>End Date</label>
                      <SingleDatePicker value={blockedEnd} onChange={setBlockedEnd} placeholder="Select end" calendarZIndex={200000} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Reason (optional)</label>
                    <input type="text" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="e.g., Airbnb booking, Maintenance, Private event" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)' }} />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowBlockForm(false)}
                      className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >Cancel</button>
                    <button
                      onClick={handleSaveBlockedRange}
                      disabled={!blockedStart || !blockedEnd || isSaving}
                      className="px-4 py-2 text-sm bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094848] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {isSaving ? 'Saving...' : 'Save Block'}
                    </button>
                  </div>
                </div>
              )}

              {/* Blocked ranges list */}
              {blockedRanges.length === 0 && !showBlockForm ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>No blocked dates</div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>Click &quot;Add Block&quot; to block a date range</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedRanges.map((range) => (
                    <div key={range.id} className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3.5 hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {fmtDate(range.startDate)} – {fmtDate(range.endDate)}
                          </span>
                          <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
                            · {countDays(range.startDate, range.endDate)} days
                          </span>
                        </div>
                        {range.reason && (
                          <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>{range.reason}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedRange(range.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer flex-shrink-0"
                        aria-label="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === SPECIAL PRICING TAB === */}
          {activeTab === 'pricing' && showSpecialPricing && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {pricingRules.length === 0 ? 'No special pricing rules' : `${pricingRules.length} rule${pricingRules.length !== 1 ? 's' : ''} active`}
                </div>
                <button
                  onClick={() => setShowPricingForm((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B5858] text-white rounded-lg text-xs font-semibold hover:bg-[#094848] transition-all cursor-pointer"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add Rule
                </button>
              </div>

              {showPricingForm && (
                <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>New Pricing Rule</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Start Date</label>
                      <SingleDatePicker
                        value={pricingStart}
                        onChange={(date) => {
                          setPricingStart(date);
                          if (pricingEnd && date && pricingEnd < date) setPricingEnd('');
                        }}
                        placeholder="Select start"
                        calendarZIndex={200000}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>End Date</label>
                      <SingleDatePicker value={pricingEnd} onChange={setPricingEnd} placeholder="Select end" calendarZIndex={200000} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Price per Night</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">₱</span>
                        <input
                          type="text"
                          value={pricingPrice}
                          onChange={(e) => setPricingPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Note (optional)</label>
                      <input type="text" value={pricingNote} onChange={(e) => setPricingNote(e.target.value)} placeholder="e.g., Holiday pricing" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)' }} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowPricingForm(false)} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-all cursor-pointer" style={{ fontFamily: 'var(--font-poppins)' }}>Cancel</button>
                    <button
                      onClick={handleSavePricingRule}
                      disabled={!pricingStart || !pricingEnd || !pricingPrice || isSaving}
                      className="px-4 py-2 text-sm bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094848] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {isSaving ? 'Saving...' : 'Save Rule'}
                    </button>
                  </div>
                </div>
              )}

              {pricingRules.length === 0 && !showPricingForm ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>No pricing rules</div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>Click &quot;Add Rule&quot; to set special pricing</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {pricingRules.map((rule) => (
                    <div key={rule.id} className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3.5 hover:shadow-sm transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)' }}>
                            ₱{rule.price.toLocaleString('en-US')}<span className="text-xs font-normal text-gray-500">/night</span>
                          </span>
                          <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
                            · {countDays(rule.startDate, rule.endDate)} days
                          </span>
                        </div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {fmtDate(rule.startDate)} – {fmtDate(rule.endDate)}
                        </div>
                        {rule.note && <div className="text-xs text-gray-400 italic mt-0.5" style={{ fontFamily: 'var(--font-poppins)' }}>{rule.note}</div>}
                      </div>
                      <button
                        onClick={() => handleRemovePricingRule(rule.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer flex-shrink-0"
                        aria-label="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-all cursor-pointer text-sm"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

export default CalendarSettingsModal;
