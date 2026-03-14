'use client';

import React, { useRef } from 'react';

/**
 * GatePass — Displayed after a successful booking confirmation.
 * Shows a printable gate pass with booking reference, QR placeholder,
 * guest info, property details, and check-in/check-out dates.
 */
export interface GatePassProps {
  bookingReference: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  propertyTitle: string;
  propertyAddress?: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalGuests: number;
  /** Per-pax guest list (optional) */
  guests?: { name: string; classification: string }[];
  totalAmount?: number;
  onClose?: () => void;
}

/** Format HH:mm to 12-hour */
const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDate = (d: string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const GatePass: React.FC<GatePassProps> = ({
  bookingReference,
  guestName,
  guestEmail,
  guestPhone,
  propertyTitle,
  propertyAddress,
  checkInDate,
  checkOutDate,
  checkInTime,
  checkOutTime,
  totalGuests,
  guests,
  totalAmount,
  onClose,
}) => {
  const passRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="w-full max-w-lg">
        {/* Gate Pass Card */}
        <div ref={passRef} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 print:shadow-none print:border-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B5858] to-[#0a6b6b] px-6 py-5 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-4 w-20 h-20 border-2 border-white/30 rounded-full" />
              <div className="absolute bottom-1 right-6 w-14 h-14 border-2 border-white/20 rounded-full" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-white tracking-wide uppercase">Booking Confirmed</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Gate Pass</h1>
              <p className="text-sm text-white/70 mt-1">Present this pass at the property entrance</p>
            </div>
          </div>

          {/* QR Code / Reference */}
          <div className="flex flex-col items-center py-5 border-b border-dashed border-gray-300 bg-gray-50/50">
            {/* Mock QR code display — squares pattern */}
            <div className="w-28 h-28 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-3 relative">
              <div className="grid grid-cols-5 gap-[3px]">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-[2px]"
                    style={{
                      backgroundColor: [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,6,8,12,16,18].includes(i) ? '#0B5858' : '#e5e7eb',
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="text-lg font-bold text-[#0B5858] tracking-widest">{bookingReference}</p>
            <p className="text-xs text-gray-500 mt-0.5">Scan QR code or present this reference number</p>
          </div>

          {/* Guest Info */}
          <div className="px-6 py-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Guest Information</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#0B5858]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  <span className="text-sm font-medium text-gray-900">{guestName}</span>
                </div>
                {guestEmail && (
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-sm text-gray-700">{guestEmail}</span>
                  </div>
                )}
                {guestPhone && (
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-sm text-gray-700">{guestPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-[#0B5858]" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  <span className="text-sm text-gray-700">{totalGuests} guest{totalGuests !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Per-pax guest list */}
            {guests && guests.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Guest List</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {guests.map((g, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{g.name}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              g.classification === 'Senior' ? 'bg-purple-100 text-purple-700' :
                              g.classification === 'Child' ? 'bg-blue-100 text-blue-700' :
                              g.classification === 'Infant' ? 'bg-pink-100 text-pink-700' :
                              g.classification === 'PWD' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {g.classification}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Property & Schedule */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[#0B5858]/5 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Property</h3>
                <p className="text-sm font-semibold text-gray-900">{propertyTitle}</p>
                {propertyAddress && <p className="text-xs text-gray-600 mt-0.5">{propertyAddress}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Check-in</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(checkInDate)}</p>
                  {checkInTime && <p className="text-xs text-gray-600">{formatTime(checkInTime)}</p>}
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">Check-out</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(checkOutDate)}</p>
                  {checkOutTime && <p className="text-xs text-gray-600">{formatTime(checkOutTime)}</p>}
                </div>
              </div>
            </div>

            {totalAmount !== undefined && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">Total Amount</span>
                <span className="text-lg font-bold text-[#0B5858]">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-400">
              This gate pass is valid for the dates shown above. Please present a valid ID upon check-in.
            </p>
          </div>
        </div>

        {/* Action buttons — hidden in print */}
        <div className="flex items-center justify-center gap-3 mt-4 print:hidden">
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094b4b] transition-all duration-200 text-sm flex items-center gap-2 cursor-pointer"
            style={{ fontFamily: 'Poppins' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Gate Pass
          </button>
          <button
            onClick={() => {
              /* Copy reference to clipboard */
              navigator.clipboard?.writeText(bookingReference);
            }}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 text-sm flex items-center gap-2 cursor-pointer"
            style={{ fontFamily: 'Poppins' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            Copy Reference
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 text-sm cursor-pointer"
              style={{ fontFamily: 'Poppins' }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GatePass;
