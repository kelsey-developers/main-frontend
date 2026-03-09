'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { addCleaner } from '@/services/cleaningService';
import type { Cleaner } from '@/types/cleaning';

interface Props {
  onClose: () => void;
  onCreated: (cleaner: Cleaner) => void;
}

const MOCK_PROPERTIES = [
  { id: 'prop-001', name: 'Villa Rosa' },
  { id: 'prop-002', name: 'Casa Blanca' },
  { id: 'prop-003', name: 'Bayside Suites' },
];

export default function AddCleanerModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    assignedProperties: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | string[]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleProp = (id: string) => {
    setForm((f) => ({
      ...f,
      assignedProperties: f.assignedProperties.includes(id)
        ? f.assignedProperties.filter((p) => p !== id)
        : [...f.assignedProperties, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.phone.trim()) { setError('Phone number is required.'); return; }

    setLoading(true);
    setError('');
    try {
      const cleaner = await addCleaner({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: 'available',
        assignedProperties: form.assignedProperties,
      });
      onCreated(cleaner);
    } catch {
      setError('Failed to add cleaner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Add New Cleaner</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
              placeholder="e.g. Maria Santos"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
              placeholder="cleaner@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
              placeholder="+63 9XX XXX XXXX"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>

          {/* Assigned Properties */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Assigned Properties
            </label>
            <div className="space-y-2">
              {MOCK_PROPERTIES.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${
                      form.assignedProperties.includes(p.id)
                        ? 'bg-[#0B5858] border-[#0B5858]'
                        : 'border-gray-300 group-hover:border-[#0B5858]'
                    }`}
                    onClick={() => toggleProp(p.id)}
                  >
                    {form.assignedProperties.includes(p.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm text-gray-700"
                    onClick={() => toggleProp(p.id)}
                  >
                    {p.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Cleaner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
