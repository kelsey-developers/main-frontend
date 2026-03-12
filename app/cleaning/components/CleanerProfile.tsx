'use client';

import React from 'react';
import { CLEANER_STATUS_CONFIG } from '@/types/cleaning';
import type { Cleaner, CleaningJob } from '@/types/cleaning';

interface Props {
  cleaner: Cleaner;
  jobs: CleaningJob[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-[#FACC15]' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-bold text-gray-700">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function CleanerProfile({ cleaner, jobs }: Props) {
  const sc = CLEANER_STATUS_CONFIG[cleaner.status];
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'verified').length;
  const inProgressJobs = jobs.filter((j) => j.status === 'in_progress').length;
  const scheduledJobs = jobs.filter((j) => j.status === 'scheduled').length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Profile card - same structure as agent hub ProfileHeader content: white card, p-4 sm:p-6 */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0B5858] to-[#073A3A] flex items-center justify-center shrink-0 shadow-md shadow-[#0B5858]/20">
              <span className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>
                {cleaner.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-1" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{cleaner.name}</h2>
              <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>Cleaning team member</p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium chip-shadow" style={{ fontFamily: 'Poppins', ...sc.chipStyle }}>
                {sc.label}
              </span>
            </div>
          </div>

          {cleaner.averageRating > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Poppins' }}>Average Rating</p>
              <StarRating rating={cleaner.averageRating} />
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{cleaner.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{cleaner.phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>Joined {new Date(cleaner.joinedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - same grid gap as agent hub cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          { label: 'Jobs Done', value: cleaner.totalJobsCompleted, color: 'text-[#0B5858]' },
          { label: 'This Month', value: completedJobs, color: 'text-black' },
          { label: 'Upcoming', value: scheduledJobs + inProgressJobs, color: 'text-black' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-lg p-4 sm:p-5">
            <p className={`text-2xl sm:text-3xl font-bold ${color}`} style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1" style={{ fontFamily: 'Poppins' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Assigned properties - same card treatment */}
      {cleaner.assignedProperties.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4" style={{ fontFamily: 'Poppins' }}>Assigned Properties</p>
            <div className="flex flex-wrap gap-2">
              {cleaner.assignedProperties.map((p) => (
                <span key={p} className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100" style={{ fontFamily: 'Poppins' }}>
                  {p.replace('prop-00', 'Property ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
