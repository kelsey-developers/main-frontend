'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BookingCommission } from '@/types/commission';

interface Props {
  commission: BookingCommission;
  onClose: () => void;
}

function fmt(n: number) {
  return `₱${n.toLocaleString()}`;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30',
  approved:  'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',
  available: 'bg-[#0B5858] text-white border border-[#0B5858]',
  paid:      'bg-gray-50 text-gray-600 border border-gray-200',
};

// L1 = own code (10%) · L2 = direct sub-agent's code (5%) · L3 = sub-sub-agent's code (2%)
const LEVEL_CONFIG: Record<1 | 2 | 3, { classes: string; label: string; sublabel: string }> = {
  1: { classes: 'bg-[#0B5858]/10 text-[#0B5858] border border-[#0B5858]/20',  label: 'L1',  sublabel: 'Your referral code · 10%' },
  2: { classes: 'bg-[#FACC15]/10 text-[#0B5858] border border-[#FACC15]/30',  label: 'L2',  sublabel: 'Sub-agent booking · 5%'    },
  3: { classes: 'bg-gray-100 text-gray-500 border border-gray-200',            label: 'L3',  sublabel: 'Deeper network · 2%'        },
};

export default function CommissionBreakdownModal({ commission: c, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-gray-900/40"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Commission</h2>
              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {c.status}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500">{c.bookingRef} &middot; {c.propertyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ml-4 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Booking Details Grid */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Booking Details</p>
            <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="col-span-2">
                <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Guest</span>
                <span className="block text-sm font-bold text-gray-900">{c.guestName}</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Check-in</span>
                <span className="block text-sm font-semibold text-gray-800">
                  {new Date(c.checkIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Check-out</span>
                <span className="block text-sm font-semibold text-gray-800">
                  {new Date(c.checkOut).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Agent Name</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="block text-sm font-semibold text-gray-800 truncate">{c.referralAgentName ?? 'Direct Booking'}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0 ${LEVEL_CONFIG[c.referralLevel].classes}`}>
                    {LEVEL_CONFIG[c.referralLevel].label}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-0.5">Agent ID</span>
                <span className="block text-sm font-mono font-semibold text-gray-800 truncate">{c.agentId}</span>
              </div>

              <div className="col-span-2 pt-2.5 mt-0.5 border-t border-gray-200/60 flex items-center justify-between text-xs font-medium text-gray-600">
                <span className="font-semibold text-gray-800">
                  {c.numberOfNights} night{c.numberOfNights !== 1 ? 's' : ''} · {c.numberOfGuests} pax
                </span>
                <span className="font-mono font-bold text-[#0B5858]">{c.referralCode}</span>
              </div>
            </div>
          </div>

          {/* Computation */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Computation</p>
            <div className="space-y-2.5 px-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Base Amount</span>
                <span className="text-sm font-semibold text-gray-900">{fmt(c.baseAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Extra Charges</span>
                <span className="text-sm font-semibold text-gray-900">{fmt(c.extraCharges)}</span>
              </div>
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">Total Booking</span>
                <span className="text-sm font-bold text-gray-900">{fmt(c.totalBookingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Commission Total Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0B5858] to-[#073A3A] rounded-xl p-4 text-white shadow-lg shadow-[#0B5858]/20">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-[#FACC15]/20 rounded-full blur-xl pointer-events-none"></div>

            <div className="relative">
              <p className="text-[#FACC15] text-[10px] font-bold uppercase tracking-widest mb-1.5">Your Commission</p>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-bold tracking-tight">{fmt(c.commissionAmount)}</span>
                <span className="text-[10px] font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-md">
                  {c.commissionRate}% Rate
                </span>
              </div>
              <p className="text-white/50 text-[10px] font-medium mt-1.5">
                {c.referralLevel === 1
                  ? 'Direct booking via your referral code'
                  : `L${c.referralLevel} commission · via ${c.referralAgentName}`}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 px-1">
            <div className="text-center">
              <span className="block text-gray-400 mb-0.5">Created</span>
              <span className="font-medium text-gray-700">{new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
            </div>
            {c.approvedAt && (
              <>
                <div className="flex-1 h-px bg-gray-200 mx-3"></div>
                <div className="text-center">
                  <span className="block text-gray-400 mb-0.5">Approved</span>
                  <span className="font-medium text-gray-700">{new Date(c.approvedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                </div>
              </>
            )}
            {c.paidAt && (
              <>
                <div className="flex-1 h-px bg-gray-200 mx-3"></div>
                <div className="text-center">
                  <span className="block text-gray-400 mb-0.5">Paid</span>
                  <span className="font-medium text-gray-700">{new Date(c.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                </div>
              </>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
