'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  getAgentPointsBalance,
  getPointsHistory,
  POINTS_HISTORY_MAX_LIMIT,
} from '@/services/rewardsService';
import type { AgentPointsBalance, PointsTransaction, CashPaymentMethod } from '@/types/rewards';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import DateRangePicker from '@/components/DateRangePicker';
import SingleDatePicker from '@/components/SingleDatePicker';

/**
 * Rewards page - Agent point system.
 * Overview: balance, stats, transaction history, and Rewards Hub terms.
 * Redeem: reward options and redemption.
 * Balance and history come from rewardsService (mock data when backend not connected; API when connected).
 * Pending redemption added to local history on Confirm is frontend-only until redemption API exists.
 *
 * Font hierarchy (Poppins throughout):
 * - H1: page title (text-2xl sm:text-3xl, font-bold) — e.g. Rewards Hub
 * - H2: section/card-group title (text-lg, font-semibold) — e.g. Recent Activity, Rewards, Terms title, modal title
 * - H3: card or subsection title (text-base, font-semibold) — e.g. All-Time Stats, This Month, terms sections, reward card name
 * - Body: text-sm, gray-600 or black
 * - Small/caption: text-xs, gray-500 — labels, "X left", dates, support line
 * - Data emphasis: font-semibold or font-bold for numbers/values
 */
type TabId = 'overview' | 'redeem';

/** Reward option for Redeem tab: image, name, points, optional stock (backend can replace) */
interface RewardOption {
  id: string;
  name: string;
  pointsCost: number;
  /** Image path (under /public) or URL; optional — placeholder shown if missing */
  image?: string;
  /** When set, shows "X left" for limited items */
  stock?: number;
}

/** Mock reward catalog for Redeem tab (replace with API when ready).
 * Local images live under /public and are referenced by absolute paths, e.g. `/cash.png`.
 * Point costs are aligned with the official rewards table (see product spec).
 */
const REWARD_OPTIONS: RewardOption[] = [
  // Cash rewards use shared cash image
  { id: 'cash-500', name: '₱500 Cash', pointsCost: 1000, image: '/cash.png' },
  { id: 'cash-1000', name: '₱1,000 Cash', pointsCost: 2000, image: '/cash.png' },
  // Physical / experience rewards with their own images
  { id: 'tumbler', name: 'Tumbler', pointsCost: 2000, stock: 12, image: '/tumbler.png' },
  { id: 'rice', name: '1 sack of rice', pointsCost: 1000, stock: 5, image: '/rice.jpg' },
  { id: 'tshirt', name: 'Free 1 Night Staycation', pointsCost: 5000, stock: 8, image: '/staycation.jpg' },
];

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [balance, setBalance] = useState<AgentPointsBalance | null>(null);
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Controls the \"View all\" modal for full Recent Activity history; false when closed */
  const [showAllActivityModal, setShowAllActivityModal] = useState(false);
  /** Activity modal filter: All | Earned | Redeemed | Pending */
  const [activityFilter, setActivityFilter] = useState<'all' | 'earned' | 'redeemed' | 'pending'>('all');
  /** Activity modal date range (ISO date strings YYYY-MM-DD); used for filtering and date picker */
  const [activityDateStart, setActivityDateStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [activityDateEnd, setActivityDateEnd] = useState(() => new Date().toISOString().slice(0, 10));
  /** Reward selected for redemption confirmation; null when modal is closed */
  const [redeemConfirmReward, setRedeemConfirmReward] = useState<RewardOption | null>(null);
  /** Quantity selector for redemption modal; always reset to 1 when opening the modal */
  const [redeemQuantity, setRedeemQuantity] = useState<number>(1);
  /** After confirm: show success modal with this reward name (pending admin approval message); null when dismissed */
  const [redeemSuccessReward, setRedeemSuccessReward] = useState<RewardOption | null>(null);
  /** Cash redemption only: payment method (gcash, paymaya, bank transfer); reset when modal opens */
  const [redeemPaymentMethod, setRedeemPaymentMethod] = useState<CashPaymentMethod | ''>('');
  /** Cash redemption only: recipient mobile/account number; reset when modal opens */
  const [redeemRecipientNumber, setRedeemRecipientNumber] = useState('');
  /** Cash redemption only: recipient full name; reset when modal opens */
  const [redeemRecipientName, setRedeemRecipientName] = useState('');
  /** Staycation redemption only: preferred date (YYYY-MM-DD), single date; reset when modal opens */
  const [redeemPreferredDate, setRedeemPreferredDate] = useState('');
  /** Stats card period: This Week, This Month, or All Time */
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'all'>('month');
  /** Stats period dropdown open state; click outside to close */
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false);
  const statsDropdownRef = useRef<HTMLDivElement>(null);

  /** Refs for tab labels — used to position sliding underline */
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const overviewTabRef = useRef<HTMLSpanElement>(null);
  const redeemTabRef = useRef<HTMLSpanElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  /** Activity History modal tab refs and sliding underline */
  const activityTabContainerRef = useRef<HTMLDivElement>(null);
  const activityAllTabRef = useRef<HTMLSpanElement>(null);
  const activityEarnedTabRef = useRef<HTMLSpanElement>(null);
  const activityRedeemedTabRef = useRef<HTMLSpanElement>(null);
  const activityPendingTabRef = useRef<HTMLSpanElement>(null);
  const [activityIndicatorStyle, setActivityIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  /** Update sliding underline position when active tab or layout changes */
  useEffect(() => {
    const container = tabContainerRef.current;
    const activeEl = activeTab === 'overview' ? overviewTabRef.current : redeemTabRef.current;
    if (!container || !activeEl) return;
    const cRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - cRect.left,
      width: elRect.width,
    });
  }, [activeTab]);

  /** Update Activity History modal tab underline when filter or modal visibility changes */
  useEffect(() => {
    if (!showAllActivityModal) return;
    const container = activityTabContainerRef.current;
    const activeEl =
      activityFilter === 'all'
        ? activityAllTabRef.current
        : activityFilter === 'earned'
          ? activityEarnedTabRef.current
          : activityFilter === 'redeemed'
            ? activityRedeemedTabRef.current
            : activityPendingTabRef.current;
    if (!container || !activeEl) return;
    const cRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    /** Selector spans full tab (text) width */
    setActivityIndicatorStyle({
      left: elRect.left - cRect.left,
      width: elRect.width,
    });
  }, [showAllActivityModal, activityFilter]);

  /** Close redemption modal on Escape */
  useEffect(() => {
    if (!redeemConfirmReward) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRedeemConfirmReward(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [redeemConfirmReward]);

  /** Close stats period dropdown on click outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statsDropdownRef.current && !statsDropdownRef.current.contains(e.target as Node)) {
        setStatsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Load balance and history from API (or mock when backend not connected) */
  useEffect(() => {
    const agentId = 'mock-1'; // Replace with real agent id from auth when backend is connected
    Promise.all([
      getAgentPointsBalance(agentId),
      getPointsHistory(agentId, POINTS_HISTORY_MAX_LIMIT),
    ])
      .then(([bal, tx]) => {
        setBalance(bal);
        setHistory(tx);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      // Use navbar offset so loading spinner is never hidden behind fixed Navbar; light gray bg so layout matches loaded state
      <div className={`min-h-screen ${LAYOUT_NAVBAR_OFFSET} pb-12 bg-gray-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B5858]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      // Use navbar offset so error message is never hidden behind fixed Navbar; light gray bg so cards would pop similarly
      <div className={`min-h-screen ${LAYOUT_NAVBAR_OFFSET} pb-12 bg-gray-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Page wrapper uses a soft gray background so white cards stand out more against the layout
    <div className="min-h-screen pb-12 relative bg-gray-50">
      {/* Hero section – teal base + subtle yellow/amber tint overlay; z-0 so cards can sit on top */}
      <div className={`relative z-0 bg-gradient-to-br from-[#0d6b6b] via-[#0B5858] to-[#094848] ${LAYOUT_NAVBAR_OFFSET} overflow-hidden`}>
        {/* Warm yellow tint overlay – radial glow from upper-left and lower-right corners; does not affect interaction */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 100% at 15% 15%, rgba(253, 230, 138, 0.28), transparent 35%), radial-gradient(ellipse 80% 80% at 85% 85%, rgba(250, 204, 21, 0.18), transparent 50%)',
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero content row: left column = title/description/tabs; right column = points balance card centered to that group */}
          <div className="pt-10 pb-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Left column: title, description, and tabs grouped together */}
            <div className="flex-1 max-w-xl">
              <h1
                className="font-bold text-white mb-2 text-2xl sm:text-3xl"
                style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}
              >
                Rewards Hub
              </h1>
              <p
                className="text-sm sm:text-base text-white/80 max-w-xl"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Book. Earn. Redeem. Track your points from every confirmed booking and claim your rewards!
              </p>
              {/* Tabs inside hero — visually grouped under the title/description; extra space so layout can breathe; baseline spans half the tab width with soft fade to the right */}
              <div className="mt-10">
                <div ref={tabContainerRef} className="relative inline-flex gap-6 -mb-px pb-[1px] w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-0 pt-2.5 pb-2.5 text-left text-base sm:text-lg font-medium transition-colors cursor-pointer text-white/70 hover:text-white"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    <span
                      ref={overviewTabRef}
                      className={`inline-block ${activeTab === 'overview' ? 'text-white' : ''}`}
                    >
                      Overview
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('redeem')}
                    className="px-0 pt-2.5 pb-2.5 text-left text-base sm:text-lg font-medium transition-colors cursor-pointer text-white/70 hover:text-white"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    <span
                      ref={redeemTabRef}
                      className={`inline-block ${activeTab === 'redeem' ? 'text-white' : ''}`}
                    >
                      Redeem
                    </span>
                  </button>
                  {/* Static baseline: most of tab width visible, short soft fade at the end */}
                  <div
                    className="pointer-events-none absolute -bottom-px left-0 h-px w-[95%]"
                    style={{
                      background: 'linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 60%, rgba(255,255,255,0.25) 85%, transparent 100%)',
                    }}
                    aria-hidden
                  />
                  {/* Sliding underline — white on teal, aligned with active tab label; thicker for visibility */}
                  <div
                    className="absolute -bottom-px left-0 h-1 bg-white transition-all duration-300 ease-out"
                    style={{
                      left: indicatorStyle.left,
                      width: indicatorStyle.width,
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>

            {/* Right column: points balance card centered vertically against the left column group */}
            <div className="w-full md:w-auto flex justify-center md:justify-end md:items-center">
              {/* Points balance card – gradient border is the outer frame; subtle yellow stop for a warm hint */}
              <div
                className="relative rounded-3xl p-[2px] min-w-[280px] sm:min-w-[360px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]"
                style={{
                  background: 'linear-gradient(145deg, #18a2a2 0%, #0B5858 35%, #9a8b4a 55%, #052f2f 100%)',
                }}
              >
                <div
                  className="rounded-[calc(1.5rem-2px)] overflow-hidden h-full w-full"
                  style={{
                    fontFamily: 'var(--font-poppins)',
                    background: 'linear-gradient(145deg, #0a4d4d 0%, #063f3f 50%, #052f2f 100%)',
                  }}
                >
                  <div className="p-4 sm:p-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base sm:text-lg font-medium text-amber-100 m-0 leading-tight">Points balance</p>
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#FACC15] text-[#0B5858] text-xs font-semibold leading-tight shrink-0">
                        Available
                      </span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                      {(balance?.totalPoints ?? 0).toLocaleString()}{' '}
                      <span className="text-xl sm:text-2xl font-semibold text-amber-100/90">pts</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: negative top offset so cards sit a bit inside the hero (teal area) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-18 pt-8">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <>
        {/* Single Stats card with period dropdown: This Week, This Month, or All Time */}
        {(() => {
          const now = new Date();
          /** Start of current week (Sunday 00:00) */
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          /** Start of current month */
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const filteredHistory =
            statsPeriod === 'week'
              ? history.filter((tx) => new Date(tx.createdAt) >= startOfWeek)
              : statsPeriod === 'month'
                ? history.filter((tx) => new Date(tx.createdAt) >= startOfMonth)
                : history;
          const earned = filteredHistory.filter((tx) => tx.points > 0).reduce((sum, tx) => sum + tx.points, 0);
          const redeemed = Math.abs(filteredHistory.filter((tx) => tx.points < 0).reduce((sum, tx) => sum + tx.points, 0));
          const bookings = filteredHistory.filter((tx) => tx.type === 'booking').length;
          return (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-visible mb-8">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2
                    className="text-base sm:text-lg font-semibold text-black"
                    style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                  >
                    Stats
                  </h2>
                  <div className="relative" ref={statsDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setStatsDropdownOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-2.5 pr-2.5 py-1.5 text-sm font-medium text-gray-800 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors min-w-[125px] justify-between"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                      aria-expanded={statsDropdownOpen}
                      aria-haspopup="listbox"
                      aria-label="Stats time period"
                    >
                      <span>
                        {statsPeriod === 'week' ? 'This Week' : statsPeriod === 'month' ? 'This Month' : 'All Time'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${statsDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {statsDropdownOpen && (
                      <div className="absolute right-0 top-full pt-2 w-full min-w-[125px] z-50" role="listbox">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden px-3 py-1.5">
                          {(
                            [
                              { value: 'week' as const, label: 'This Week' },
                              { value: 'month' as const, label: 'This Month' },
                              { value: 'all' as const, label: 'All Time' },
                            ] as const
                          ).map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              role="option"
                              aria-selected={statsPeriod === value}
                              onClick={() => {
                                setStatsPeriod(value);
                                setStatsDropdownOpen(false);
                              }}
                              className={`block w-full text-left py-1 text-sm transition-opacity cursor-pointer ${
                                statsPeriod === value ? 'font-semibold opacity-100' : 'hover:opacity-70'
                              }`}
                              style={{
                                fontFamily: 'var(--font-poppins)',
                                color: statsPeriod === value ? '#0B5858' : 'black',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}>
                      {earned.toLocaleString()} <span className="text-base sm:text-lg font-semibold text-[#0B5858]">pts</span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Earned
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}>
                      {redeemed.toLocaleString()} <span className="text-base sm:text-lg font-semibold text-[#0B5858]">pts</span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Redeemed
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-[#0B5858]" style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}>
                      {bookings}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Bookings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Activity card – same padding as Stats card (p-4 sm:p-6) for consistency */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2
                className="text-base sm:text-lg font-semibold text-black"
                style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
              >
                Recent Activity
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  className="text-xs sm:text-sm font-medium text-black hover:opacity-70 transition-opacity cursor-pointer"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                  onClick={() => {
                      setActivityFilter('all');
                      const now = new Date();
                      setActivityDateStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
                      setActivityDateEnd(now.toISOString().slice(0, 10));
                      setShowAllActivityModal(true);
                    }}
                >
                  View all
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>
                No transactions yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 5).map((tx) => {
                  const isRejectedRedemption = tx.type === 'redemption' && tx.status === 'rejected';
                  // Rejected redemptions: points were refunded — show as positive (refund) in teal
                  const displayPoints = isRejectedRedemption ? Math.abs(tx.points) : tx.points;
                  const showAsRefund = isRejectedRedemption;
                  // Title: "Redeemed for [name]" for redemptions; "Points from booking ..." for bookings (description as-is)
                  const title =
                    tx.type === 'redemption'
                      ? 'Redeemed for ' + tx.description.replace(/^Redeemed for \s*/i, '')
                      : tx.description;
                  // Redemption subtitle: Pending approval | Approved | Issued | Rejected — points refunded
                  const redemptionStatusLabel =
                    tx.type === 'redemption' && tx.status
                      ? tx.status === 'pending'
                        ? 'Pending approval'
                        : tx.status === 'approved'
                          ? 'Approved'
                          : tx.status === 'issued'
                            ? 'Issued'
                            : tx.status === 'rejected'
                              ? 'Rejected — points refunded'
                              : null
                      : null;
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-gray-50/80 px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black truncate" style={{ fontFamily: 'var(--font-poppins)', fontWeight: 500 }}>
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          {redemptionStatusLabel && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span
                                className={
                                  tx.status === 'rejected'
                                    ? 'text-gray-600 font-medium'
                                    : 'font-medium'
                                }
                              >
                                {redemptionStatusLabel}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold shrink-0 ${displayPoints >= 0 || showAsRefund ? 'text-[#0B5858]' : 'text-gray-600'}`}
                        style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                      >
                        {showAsRefund ? '+' : displayPoints >= 0 ? '+' : '-'}
                        {Math.abs(displayPoints).toLocaleString()} pts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Activity modal – fixed size, date range picker, export icon, filter tabs (no brackets), list with status text only (no icons) */}
        {showAllActivityModal && (() => {
          const start = activityDateStart ? new Date(activityDateStart + 'T00:00:00') : null;
          const end = activityDateEnd ? new Date(activityDateEnd + 'T23:59:59') : null;
          const inDateRange = (tx: PointsTransaction) => {
            if (!start || !end) return true;
            const d = new Date(tx.createdAt);
            return d >= start && d <= end;
          };
          const filteredByDate = history.filter(inDateRange);
          const filteredByTab =
            activityFilter === 'earned'
              ? filteredByDate.filter((tx) => tx.points > 0)
              : activityFilter === 'redeemed'
                ? filteredByDate.filter((tx) => tx.type === 'redemption' && tx.points < 0 && tx.status !== 'pending')
                : activityFilter === 'pending'
                  ? filteredByDate.filter((tx) => tx.type === 'redemption' && tx.status === 'pending')
                  : filteredByDate;
          return createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-modal-title"
              onClick={(e) => e.target === e.currentTarget && setShowAllActivityModal(false)}
            >
              <div
                className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden"
                style={{ fontFamily: 'var(--font-poppins)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
                  <h2
                    id="activity-modal-title"
                    className="text-base sm:text-lg font-semibold text-black"
                    style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                  >
                    Activity History
                  </h2>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-black hover:opacity-70 transition-opacity cursor-pointer"
                    aria-label="Close"
                    onClick={() => setShowAllActivityModal(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-4 sm:px-6 py-3 shrink-0">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="relative min-w-0 flex-1">
                      <div ref={activityTabContainerRef} className="relative inline-flex gap-5 -mb-px pb-[1px]">
                        <button
                          type="button"
                          onClick={() => setActivityFilter('all')}
                          className="px-0 pt-2 pb-2 text-left text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <span ref={activityAllTabRef} className={`inline-block ${activityFilter === 'all' ? 'text-[#0B5858] font-semibold' : ''}`}>All</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityFilter('earned')}
                          className="px-0 pt-2 pb-2 text-left text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <span ref={activityEarnedTabRef} className={`inline-block ${activityFilter === 'earned' ? 'text-[#0B5858] font-semibold' : ''}`}>Earned</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityFilter('redeemed')}
                          className="px-0 pt-2 pb-2 text-left text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <span ref={activityRedeemedTabRef} className={`inline-block ${activityFilter === 'redeemed' ? 'text-[#0B5858] font-semibold' : ''}`}>Redeemed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityFilter('pending')}
                          className="px-0 pt-2 pb-2 text-left text-sm font-medium transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <span ref={activityPendingTabRef} className={`inline-block ${activityFilter === 'pending' ? 'text-[#0B5858] font-semibold' : ''}`}>Pending</span>
                        </button>
                      </div>
                      {/* Main line: slightly less than full width, hero-style fade to transparent on the right */}
                      <div
                        className="pointer-events-none absolute -bottom-px left-0 h-px w-[92%]"
                        style={{
                          background: 'linear-gradient(to right, rgba(209,213,219,1) 0%, rgba(209,213,219,0.7) 60%, rgba(209,213,219,0.25) 85%, transparent 100%)',
                        }}
                        aria-hidden
                      />
                      {/* Sliding selector: full tab (text) width, solid teal */}
                      <div
                        className="absolute -bottom-px left-0 h-0.5 bg-[#0B5858] transition-all duration-300 ease-out"
                        style={{ left: activityIndicatorStyle.left, width: activityIndicatorStyle.width }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <DateRangePicker
                        startDate={activityDateStart}
                        endDate={activityDateEnd}
                        onStartChange={(date) => {
                          setActivityDateStart(date);
                          if (activityDateEnd && date && activityDateEnd < date) setActivityDateEnd('');
                        }}
                        onEndChange={setActivityDateEnd}
                        placeholder="Select date range"
                      />
                      <button
                        type="button"
                        className="p-1.5 text-black hover:opacity-70 transition-opacity cursor-pointer"
                        aria-label="Export CSV"
                        onClick={() => {}}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0">
                  {filteredByTab.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      No transactions yet.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {filteredByTab.map((tx) => {
                        const isRejectedRedemption = tx.type === 'redemption' && tx.status === 'rejected';
                        const displayPoints = isRejectedRedemption ? Math.abs(tx.points) : tx.points;
                        const showAsRefund = isRejectedRedemption;
                        const title =
                          tx.type === 'redemption'
                            ? 'Redeemed for ' + tx.description.replace(/^Redeemed for \s*/i, '')
                            : tx.description;
                        const redemptionStatus = tx.type === 'redemption' ? tx.status : null;
                        const statusLabel = redemptionStatus === 'pending' ? 'Pending' : redemptionStatus === 'issued' ? 'Issued' : redemptionStatus === 'approved' ? 'Approved' : redemptionStatus === 'rejected' ? 'Rejected — points refunded' : null;
                        return (
                          <li
                            key={tx.id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-3 sm:px-4"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-black truncate" style={{ fontFamily: 'var(--font-poppins)', fontWeight: 500 }}>
                                {title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                {statusLabel != null && (
                                  <>
                                    <span className="text-gray-400">·</span>
                                    <span className={redemptionStatus === 'rejected' ? 'text-gray-600 font-medium' : 'font-medium'}>
                                      {statusLabel}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span
                              className={`text-sm font-semibold shrink-0 ${displayPoints >= 0 || showAsRefund ? 'text-[#0B5858]' : 'text-gray-700'}`}
                            >
                              {showAsRefund ? '+' : displayPoints >= 0 ? '+' : '-'}
                              {Math.abs(displayPoints).toLocaleString()} pts
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* Rewards Hub Terms & Conditions - full terms content (no card) */}
        <div className="mt-8">
          <h2
            className="text-xl sm:text-2xl font-semibold text-black mb-2"
            style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
          >
            Rewards Hub Terms &amp; Conditions
          </h2>
          <div className="text-sm text-gray-600 space-y-3 mt-2" style={{ fontFamily: 'var(--font-poppins)' }}>
            <section>
              <h3 className="text-base font-semibold text-black mb-1">1. Eligibility &amp; Registration</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Only registered and active agents of Kelsey&apos;s Homestay are eligible to earn and redeem points.</li>
                <li>Agents must maintain a verified account within the system to participate in the Rewards Hub.</li>
                <li>Sub-accounts or duplicate registrations are strictly prohibited. Any violation of this rule may lead to immediate disqualification and the forfeiture of all accumulated points.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">2. Earning Points</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Points are awarded exclusively for confirmed bookings. Pending, waitlisted, or cancelled bookings are not eligible for point accrual.</li>
                <li>Points are calculated based on the following structure:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>50 points per confirmed booking (Base)</li>
                    <li>25 points per night of stay (Bonus)</li>
                    <li><em>Example: A 3-night booking earns 50 + (25 × 3) = 125 points.</em></li>
                  </ul>
                </li>
                <li>Points are credited to the agent&apos;s balance once a booking is marked as &quot;Confirmed.&quot; Please allow up to 24 hours for processing.</li>
                <li>If a booking is cancelled or refunded after points have been issued, the corresponding points will be deducted from the agent&apos;s balance.</li>
                <li>Points are personal to the agent and are non-transferable.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">3. Point Validity</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Points do not expire as long as the agent&apos;s account remains active and in good standing.</li>
                <li>If an agent&apos;s account is deactivated or terminated, all unredeemed points will be automatically forfeited.</li>
                <li>Kelsey&apos;s Homestay reserves the right to modify the points policy or valuation with prior notice to all participants.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">4. Redeeming Rewards</h3>
              <p className="mb-1">All redemption requests are subject to admin approval. Status flow: Requested → Approved → Issued, or Requested → Rejected (with reason).</p>
              <div className="space-y-1.5 pl-2 mt-1">
                <p className="text-sm font-semibold text-black">1. Cash Rewards</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Can be redeemed for ₱500, ₱1,000, ₱2,000, and other fixed increments.</li>
                  <li>Disbursed via GCash, bank transfer, or other official methods determined by Kelsey&apos;s Homestay.</li>
                  <li>Processing time is 3–7 business days after administrative approval.</li>
                  <li>Agents must provide accurate payment details. Kelsey&apos;s Homestay is not responsible for failed transfers due to incorrect information.</li>
                </ul>
                <p className="text-sm font-semibold text-black pt-0.5">2. Free Night Stays</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Subject to unit availability and may include blackout dates (holidays, peak seasons).</li>
                  <li>Advance booking of at least 7 days is required.</li>
                  <li>Free stays are non-transferable and cannot be converted to cash.</li>
                  <li>No-shows or cancellations will result in forfeiture of the reward without a point refund.</li>
                </ul>
                <p className="text-sm font-semibold text-black pt-0.5">3. Merchandise</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Includes tumblers, T-shirts, and other branded items.</li>
                  <li>Subject to current stock availability.</li>
                </ul>
                <p className="text-sm font-semibold text-black pt-0.5">4. Goods</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Includes rice and other essential items.</li>
                  <li>Subject to current stock availability.</li>
                </ul>
              </div>
              <ul className="list-disc pl-5 space-y-1 mt-1.5">
                <li>Once a redemption is approved and issued, it cannot be reversed or refunded.</li>
                <li>Kelsey&apos;s Homestay may substitute rewards of equal value if the selected item is out of stock.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">5. Prohibited Activities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Any attempt to manipulate the Rewards Hub system will result in immediate account termination. Prohibited activities include:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>Creating fraudulent or &quot;ghost&quot; bookings.</li>
                    <li>Colluding with guests to artificially inflate point totals.</li>
                    <li>Exploiting system errors, glitches, or bugs.</li>
                    <li>Maintaining multiple accounts to bypass earning limits.</li>
                  </ul>
                </li>
                <li>Kelsey&apos;s Homestay reserves the right to revoke any points or rewards obtained through deceptive means.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">6. Changes to the Program</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kelsey&apos;s Homestay reserves the right to modify, suspend, or terminate the Rewards Hub program at any time.</li>
                <li>Any changes to point values, reward costs, or terms will be communicated via the platform or official agent channels.</li>
                <li>Continued participation after changes are announced constitutes acceptance of the updated terms.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">7. Limitation of Liability</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kelsey&apos;s Homestay is not liable for any losses or damages arising from participation in the program.</li>
                <li>All rewards are provided on an &quot;as is&quot; basis without warranties of any kind.</li>
                <li>We are not responsible for delays caused by third-party payment processors or external banking systems.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-black mb-1">8. Contact &amp; Disputes</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>For questions or disputes regarding point totals, please contact the admin via the platform support feature or official group chat.</li>
                <li>Dispute claims will be reviewed within 7 business days.</li>
                <li>The decision of Kelsey&apos;s Homestay administration on all reward-related matters is final.</li>
              </ul>
            </section>
          </div>
        </div>
          </>
        )}

        {/* Redeem tab - reward grid */}
        {activeTab === 'redeem' && (
          <div className="space-y-8">
            {/* Reward cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {REWARD_OPTIONS.map((reward) => {
                const canRedeem = (balance?.totalPoints ?? 0) >= reward.pointsCost;
                return (
                  // Reward card – image, reward meta, and CTA button; static card, no hover animation
                  <div
                    key={reward.id}
                    className="bg-white/95 rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative w-full aspect-[4/3] bg-gray-100 shrink-0">
                      {reward.image ? (
                        <Image
                          src={reward.image}
                          alt={reward.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-4xl text-gray-300"
                          aria-hidden
                        >
                          🎁
                        </div>
                      )}
                      {/* Soft bottom gradient for better text contrast when images are busy */}
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/30 to-transparent"
                        aria-hidden
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3
                        className="text-base font-semibold text-slate-900 mb-1.5"
                        style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                      >
                        {reward.name}
                      </h3>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className="text-sm font-semibold text-[#0B5858]"
                          style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                        >
                          {reward.pointsCost.toLocaleString()} pts
                        </p>
                        {reward.stock != null && (
                          <span
                            className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            {reward.stock} left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 pt-0">
                      <button
                        type="button"
                        disabled={!canRedeem}
                        className="w-full py-3 px-4 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#0B5858] text-white hover:bg-[#094848] disabled:hover:bg-[#0B5858]"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                        onClick={() => {
                          if (canRedeem) {
                            // Reset quantity and cash-redemption fields every time the confirmation modal opens
                            setRedeemQuantity(1);
                            setRedeemPaymentMethod('');
                            setRedeemRecipientNumber('');
                            setRedeemRecipientName('');
                            setRedeemPreferredDate('');
                            setRedeemConfirmReward(reward);
                          }
                        }}
                      >
                        {canRedeem ? 'Redeem' : 'Insufficient'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm Redemption modal — same visual style as rest of app (Poppins, teal, white card) */}
        {redeemConfirmReward && (() => {
          const currentBalance = balance?.totalPoints ?? 0;
          // Compute total points required based on quantity selector in the modal
          const perItemPoints = redeemConfirmReward.pointsCost;
          const totalPointsRequired = perItemPoints * redeemQuantity;
          const balanceAfter = currentBalance - totalPointsRequired;
          return createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="redeem-modal-title"
              onClick={(e) => e.target === e.currentTarget && setRedeemConfirmReward(null)}
            >
              <div
                className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm w-full max-w-md overflow-hidden"
                style={{ fontFamily: 'var(--font-poppins)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header: title + close */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
                  <h2
                    id="redeem-modal-title"
                    className="text-lg font-semibold text-black"
                    style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                  >
                    Confirm Redemption
                  </h2>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-black hover:opacity-70 transition-opacity cursor-pointer"
                    aria-label="Close"
                    onClick={() => setRedeemConfirmReward(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Reward preview card: image + name */}
                  <div className="flex justify-center">
                    <div className="rounded-xl border border-gray-200 overflow-hidden w-full max-w-[200px]">
                      <div className="relative w-full aspect-[4/3] bg-gray-100">
                        {redeemConfirmReward.image ? (
                          <Image
                            src={redeemConfirmReward.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                            🎁
                          </div>
                        )}
                      </div>
                      <p
                        className="text-center py-2 text-sm font-semibold text-black border-t border-gray-100"
                        style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                      >
                        {redeemConfirmReward.name}
                      </p>
                    </div>
                  </div>

                  {/* Quantity selector for this redemption (centered under preview; compact, premium pill) */}
                  <div className="flex justify-center" style={{ fontFamily: 'var(--font-poppins)' }}>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100/90 border border-gray-200 px-1.5 py-1 text-sm text-gray-800">
                      <button
                        type="button"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 border border-gray-200 cursor-pointer"
                        onClick={() => setRedeemQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="mx-1 min-w-[1.75rem] text-center text-sm font-semibold text-black">
                        {redeemQuantity}
                      </span>
                      <button
                        type="button"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 border border-gray-200 cursor-pointer"
                        onClick={() => setRedeemQuantity((q) => q + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cash redemption: payment method, recipient number, recipient name (required for cash only) */}
                  {redeemConfirmReward.id.startsWith('cash-') && (
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3" style={{ fontFamily: 'var(--font-poppins)' }}>
                      <p className="text-sm font-semibold text-black">Payment details</p>
                      <div>
                        <label htmlFor="redeem-payment-method" className="block text-xs text-gray-600 mb-1">Payment method</label>
                        <select
                          id="redeem-payment-method"
                          value={redeemPaymentMethod}
                          onChange={(e) => setRedeemPaymentMethod(e.target.value as CashPaymentMethod)}
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm text-black bg-white cursor-pointer"
                        >
                          <option value="">Select method</option>
                          <option value="gcash">GCash</option>
                          <option value="paymaya">PayMaya</option>
                          <option value="bank_transfer">Bank transfer</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="redeem-recipient-number" className="block text-xs text-gray-600 mb-1">Recipient number</label>
                        <input
                          id="redeem-recipient-number"
                          type="text"
                          placeholder={redeemPaymentMethod === 'bank_transfer' ? 'Account number' : 'Mobile number'}
                          value={redeemRecipientNumber}
                          onChange={(e) => setRedeemRecipientNumber(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm text-black bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="redeem-recipient-name" className="block text-xs text-gray-600 mb-1">Recipient name</label>
                        <input
                          id="redeem-recipient-name"
                          type="text"
                          placeholder="Full name"
                          value={redeemRecipientName}
                          onChange={(e) => setRedeemRecipientName(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-gray-300 text-sm text-black bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Staycation redemption: preferred date — single date picker dropdown */}
                  {redeemConfirmReward.id === 'tshirt' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3" style={{ fontFamily: 'var(--font-poppins)' }}>
                      <p className="text-sm font-semibold text-black mb-2">Preferred date</p>
                      <SingleDatePicker
                        value={redeemPreferredDate}
                        onChange={setRedeemPreferredDate}
                        placeholder="Select preferred date"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Points breakdown — body text */}
                  <div className="space-y-3 text-sm text-gray-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                    <div className="flex justify-between items-center">
                      <span>Points per item</span>
                      <span className="font-semibold text-black">{perItemPoints.toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total points required</span>
                      <span className="font-semibold text-black">
                        {totalPointsRequired.toLocaleString()} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Your Balance</span>
                      <span className="font-semibold text-black">{currentBalance.toLocaleString()} pts</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span>Balance After</span>
                        <span className="font-semibold text-[#0B5858]">{balanceAfter.toLocaleString()} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  {/* Warning — text only, no rectangle */}
                  <p
                    className="text-xs text-gray-500 flex items-center gap-1.5"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    <span className="text-[#0B5858] text-lg" aria-hidden>⚠</span>
                    This action cannot be undone.
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setRedeemConfirmReward(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#0B5858] text-white hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        (redeemConfirmReward.id.startsWith('cash-') &&
                          (!redeemPaymentMethod || !redeemRecipientNumber.trim() || !redeemRecipientName.trim())) ||
                        (redeemConfirmReward.id === 'tshirt' && !redeemPreferredDate)
                      }
                      onClick={() => {
                        // Cash redemptions require payment details; staycation requires preferred dates
                        const isCash = redeemConfirmReward.id.startsWith('cash-');
                        const isStaycation = redeemConfirmReward.id === 'tshirt';
                        if (isCash && (!redeemPaymentMethod || !redeemRecipientNumber.trim() || !redeemRecipientName.trim())) return;
                        if (isStaycation && !redeemPreferredDate) return;

                        // Frontend-only: append pending redemption to local state for Recent Activity until backend is connected.
                        // When API is wired: call redemption API with payment details or preferred dates, then refetch history.
                        const totalPointsRequired = redeemConfirmReward.pointsCost * redeemQuantity;
                        const baseTx: PointsTransaction = {
                          id: `pending-${Date.now()}`,
                          agentId: 'mock-1',
                          points: -totalPointsRequired,
                          type: 'redemption',
                          description: redeemConfirmReward.name,
                          createdAt: new Date().toISOString(),
                          status: 'pending',
                        };
                        if (isCash && redeemPaymentMethod) {
                          baseTx.paymentMethod = redeemPaymentMethod;
                          baseTx.recipientNumber = redeemRecipientNumber.trim();
                          baseTx.recipientName = redeemRecipientName.trim();
                        }
                        if (isStaycation && redeemPreferredDate) {
                          baseTx.preferredDates = redeemPreferredDate;
                        }
                        setHistory((prev) => [baseTx, ...prev]);
                        setRedeemSuccessReward(redeemConfirmReward);
                        setRedeemConfirmReward(null);
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* Success confirmation — shown after Confirm; user notified request is pending admin approval */}
        {redeemSuccessReward && createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="redeem-success-title"
            onClick={(e) => e.target === e.currentTarget && setRedeemSuccessReward(null)}
          >
            <div
              className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm w-full max-w-md overflow-hidden text-center"
              style={{ fontFamily: 'var(--font-poppins)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 sm:p-10">
                {/* Success checkmark icon — teal circle + check; generous space below for hierarchy */}
                <div className="flex justify-center mb-6" aria-hidden>
                  <svg
                    className="w-14 h-14 text-[#0B5858] shrink-0"
                    viewBox="0 0 56 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 28l8 8 16-18"
                    />
                  </svg>
                </div>
                {/* Primary heading — largest, boldest */}
                <h2
                  id="redeem-success-title"
                  className="text-xl font-semibold text-black mb-4 tracking-tight"
                  style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
                >
                  Redemption Submitted!
                </h2>
                {/* Main message — medium weight, darker for emphasis */}
                <p
                  className="text-sm font-medium text-gray-800 mb-1.5"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Your request for {redeemSuccessReward.name} is pending admin approval.
                </p>
                {/* Supporting copy — lighter weight and color */}
                <p
                  className="text-sm text-gray-600 mb-8"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  You&apos;ll be notified once it&apos;s approved and issued.
                </p>
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#0B5858] text-white hover:bg-[#094848] transition-colors cursor-pointer"
                  onClick={() => setRedeemSuccessReward(null)}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
