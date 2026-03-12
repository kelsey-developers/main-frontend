'use client';

import React, { useState, useEffect } from 'react';
import type { ReplenishmentItem } from '../types';
import { updateProductMinStock } from '../lib/inventoryDataStore';
import { useToast } from '../hooks/useToast';

interface EditUnitThresholdModalProps {
  item: ReplenishmentItem | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditUnitThresholdModal({
  item,
  onClose,
  onSaved,
}: EditUnitThresholdModalProps) {
  const { error, success } = useToast();
  const [minStock, setMinStock] = useState<string>('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setMinStock(String(item.minStock ?? 0));
  }, [item]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.max(0, Math.floor(Number(minStock) || 0));
    if (value === (item.minStock ?? 0)) {
      error('No changes were made. Cancel or close to exit.');
      return;
    }
    setSaving(true);
    try {
      const productId = (item as ReplenishmentItem & { productId?: string }).productId ?? item.id;
      const ok = await updateProductMinStock(productId, value);
      if (ok) {
        success(`Minimum threshold set to ${value} ${item.unit}`);
        onSaved?.();
        onClose();
      } else {
        error('Could not update threshold');
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save threshold.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Edit minimum threshold
          </h3>
          <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            {item.name}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <label className="block text-[12px] font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Poppins' }}>
            Minimum stock ({item.unit})
          </label>
          <input
            type="number"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] focus:border-[#0B5858] focus:ring-2 focus:ring-[#cce8e8] outline-none"
            style={{ fontFamily: 'Poppins' }}
          />
          <p className="text-[11px] text-gray-500 mt-1.5" style={{ fontFamily: 'Poppins' }}>
            Inventory threshold applies to all units. Stock below this level triggers low-stock alerts.
          </p>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#0b5858] text-white font-semibold hover:bg-[#0a4a4a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
