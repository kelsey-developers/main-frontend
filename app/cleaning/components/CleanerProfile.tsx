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
    <div className="space-y-4 pb-8">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4f46e5] flex items-center justify-center shrink-0 shadow-md shadow-[#6366F1]/20">
            <span className="text-xl font-bold text-white">
              {cleaner.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{cleaner.name}</h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${sc.classes}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>
        </div>

        {/* Rating */}
        {cleaner.averageRating > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Average Rating</p>
            <StarRating rating={cleaner.averageRating} />
          </div>
        )}

        {/* Contact */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {cleaner.email}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {cleaner.phone}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Joined {new Date(cleaner.joinedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Jobs Done', value: cleaner.totalJobsCompleted, color: 'text-[#0B5858]' },
          { label: 'This Month', value: completedJobs, color: 'text-gray-900' },
          { label: 'Upcoming', value: scheduledJobs + inProgressJobs, color: 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Assigned properties */}
      {cleaner.assignedProperties.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Assigned Properties</p>
          <div className="flex flex-wrap gap-2">
            {cleaner.assignedProperties.map((p) => (
              <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0B5858]/5 text-[#0B5858] border border-[#0B5858]/10">
                {p.replace('prop-00', 'Property ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
