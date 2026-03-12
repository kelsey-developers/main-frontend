'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createCleaningJob, getCleaners } from '@/services/cleaningService';
import { JOB_TYPE_CONFIG, CLEANER_STATUS_CONFIG, makeChecklist } from '@/types/cleaning';
import type { CleaningJob, CleaningJobType, Cleaner } from '@/types/cleaning';

interface Props {
  prefillDate?: string;
  prefillPropertyId?: string;
  prefillPropertyName?: string;
  onClose: () => void;
  onCreated: (job: CleaningJob) => void;
}

const PROPERTIES = [
  { id: 'prop-001', name: 'Villa Rosa' },
  { id: 'prop-002', name: 'Casa Blanca' },
  { id: 'prop-003', name: 'Bayside Suites' },
];

const JOB_TYPES = Object.keys(JOB_TYPE_CONFIG) as CleaningJobType[];

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function ScheduleJobModal({ prefillDate, prefillPropertyId, prefillPropertyName, onClose, onCreated }: Props) {
  const [propertyId, setPropertyId] = useState(prefillPropertyId ?? '');
  const [propertyName, setPropertyName] = useState(prefillPropertyName ?? '');
  const [unitName, setUnitName] = useState('');
  const [jobType, setJobType] = useState<CleaningJobType>('checkout');
  const [date, setDate] = useState(prefillDate ?? new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('120');
  const [cleanerId, setCleanerId] = useState('');
  const [cleanerName, setCleanerName] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    getCleaners().then(setCleaners);
    return () => { document.body.style.overflow = ''; };
  }, []);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!propertyId) err.property = 'Select a property';
    if (!date) err.date = 'Select a date';
    if (!time) err.time = 'Set a time';
    if (!duration || parseInt(duration) < 15) err.duration = 'Min 15 minutes';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handlePropertyChange = (pid: string) => {
    setPropertyId(pid);
    const p = PROPERTIES.find((p) => p.id === pid);
    setPropertyName(p?.name ?? '');
    setErrors((e) => { const n = { ...e }; delete n.property; return n; });
  };

  const handleCleanerChange = (cid: string) => {
    setCleanerId(cid);
    const c = cleaners.find((c) => c.id === cid);
    setCleanerName(c?.name ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const job = await createCleaningJob({
        propertyId,
        propertyName,
        unitName: unitName || undefined,
        jobType,
        status: 'scheduled',
        scheduledDate: date,
        scheduledTime: time,
        estimatedDuration: parseInt(duration),
        assignedCleanerId: cleanerId || undefined,
        assignedCleanerName: cleanerName || undefined,
        requestedBy: 'Admin',
        notes: notes || undefined,
        linkedBookingId: bookingId || undefined,
        checklistItems: makeChecklist(),
      });
      onCreated(job);
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - design system typography */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Schedule Cleaning Job</h2>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>Assign a cleaning task to a property and cleaner</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Property + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Property</label>
              <select
                className={`${inputClass} ${errors.property ? 'border-red-300' : ''}`}
                value={propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
              >
                <option value="">Select property…</option>
                {PROPERTIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.property && <p className="text-xs text-red-500 mt-1">{errors.property}</p>}
            </div>
            <div>
              <label className={labelClass}>Unit / Room <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" className={inputClass} placeholder="e.g. Unit 2B, Room 101" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
            </div>
          </div>

          {/* Job Type */}
          <div>
            <label className={labelClass}>Job Type</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((t) => {
                const tc = JOB_TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setJobType(t)}
                    className="inline-flex px-2 py-1 rounded-full text-xs font-medium transition-all cursor-pointer chip-shadow"
                    style={jobType === t ? tc.chipStyle : { backgroundColor: '#f5f5f4', color: '#57534e' }}
                  >
                    {tc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={`${inputClass} ${errors.date ? 'border-red-300' : ''}`}
                value={date}
                onChange={(e) => { setDate(e.target.value); setErrors((er) => { const n = { ...er }; delete n.date; return n; }); }}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input
                type="time"
                className={`${inputClass} ${errors.time ? 'border-red-300' : ''}`}
                value={time}
                onChange={(e) => { setTime(e.target.value); setErrors((er) => { const n = { ...er }; delete n.time; return n; }); }}
              />
            </div>
            <div>
              <label className={labelClass}>Est. Duration (min)</label>
              <input
                type="number"
                className={`${inputClass} ${errors.duration ? 'border-red-300' : ''}`}
                placeholder="120"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); setErrors((er) => { const n = { ...er }; delete n.duration; return n; }); }}
              />
              {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
            </div>
          </div>

          {/* Assign Cleaner */}
          <div>
            <label className={labelClass}>Assign Cleaner <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className={inputClass} value={cleanerId} onChange={(e) => handleCleanerChange(e.target.value)}>
              <option value="">Unassigned</option>
              {cleaners.map((c) => {
                const sc = CLEANER_STATUS_CONFIG[c.status];
                return (
                  <option key={c.id} value={c.id} disabled={c.status === 'inactive'}>
                    {c.name} — {sc.label}{c.status === 'inactive' ? ' (inactive)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Admin Notes */}
          <div>
            <label className={labelClass}>Admin Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Special instructions for the cleaner…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Link to booking */}
          <div>
            <label className={labelClass}>Link to Booking <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. BKG-2026-0310-001"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
              {submitting ? 'Scheduling…' : 'Schedule Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
