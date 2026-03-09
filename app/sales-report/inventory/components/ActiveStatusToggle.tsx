'use client';

import { useState, useEffect } from 'react';

interface ActiveStatusToggleProps {
  isActive: boolean;
  onToggle: (newStatus: boolean) => void;
  entityType: 'supplier' | 'warehouse';
  description?: string;
  disabled?: boolean;
}

export default function ActiveStatusToggle({
  isActive,
  onToggle,
  entityType,
  description,
  disabled = false,
}: ActiveStatusToggleProps) {
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null);

  const defaultDescriptions = {
    supplier: 'Inactive suppliers are hidden from new purchase orders',
    warehouse: 'Inactive warehouses cannot receive new stock movements',
  };

  const confirmationMessages = {
    supplier: {
      activate: 'This supplier will become available for new purchase orders.',
      deactivate: 'This supplier will be hidden from new purchase orders.',
    },
    warehouse: {
      activate: 'This warehouse can receive and track new stock movements again.',
      deactivate: 'This warehouse will no longer receive new stock movements.',
    },
  };

  const requestStatusToggle = () => {
    setPendingStatus(!isActive);
    setStatusConfirmOpen(true);
  };

  const confirmStatusToggle = () => {
    if (pendingStatus === null) return;
    onToggle(pendingStatus);
    setStatusConfirmOpen(false);
    setPendingStatus(null);
  };

  const cancelStatusToggle = () => {
    setStatusConfirmOpen(false);
    setPendingStatus(null);
  };

  useEffect(() => {
    if (!statusConfirmOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelStatusToggle();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [statusConfirmOpen]);

  const displayDescription = description ?? defaultDescriptions[entityType];
  const confirmMessage = pendingStatus
    ? confirmationMessages[entityType].activate
    : confirmationMessages[entityType].deactivate;

  return (
    <>
      <div className="flex items-center justify-between gap-3 p-3.5 bg-[#e8f4f4] rounded-xl border border-[#cce8e8]">
        <div>
          <div className="text-[13px] font-semibold text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>
            {entityType === 'supplier' ? 'Supplier' : 'Warehouse'} Status
          </div>
          <div className="text-[11.5px] text-gray-600 mt-0.5" style={{ fontFamily: 'Poppins' }}>
            {displayDescription}
          </div>
        </div>
        <button
          onClick={requestStatusToggle}
          disabled={disabled}
          aria-label="Toggle status"
          className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${isActive ? 'bg-[#05807e]' : 'bg-gray-300'}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
              isActive ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {statusConfirmOpen && pendingStatus !== null && (
        <div
          onClick={cancelStatusToggle}
          className="fixed inset-0 z-[1100] bg-black/25 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl border border-[#cce8e8] overflow-hidden"
            style={{ fontFamily: 'Poppins' }}
          >
            <div className="px-5 py-4 border-b border-[#e8f4f4] bg-[#f4fbfb]">
              <div className="text-[10px] font-bold tracking-widest text-[#0b5858]/60 mb-1">
                CONFIRM STATUS CHANGE
              </div>
              <h4 className="text-[16px] font-bold text-[#0b5858]">
                {pendingStatus
                  ? `Reactivate ${entityType}?`
                  : `Deactivate ${entityType}?`}
              </h4>
            </div>
            <div className="px-5 py-4 text-[13px] text-gray-700" style={{ fontFamily: 'Poppins' }}>
              {confirmMessage}
            </div>
            <div className="px-5 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5">
              <button
                onClick={cancelStatusToggle}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-[12.5px] font-medium hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'Poppins' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusToggle}
                className={`px-4 py-2 rounded-lg text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90 ${
                  pendingStatus
                    ? 'bg-gradient-to-r from-[#0b5858] to-[#05807e]'
                    : 'bg-gradient-to-r from-[#7f1d1d] to-[#b91c1c]'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {pendingStatus ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
