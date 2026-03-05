'use client';

import React from 'react';

export type AddModalChoice = 'item' | 'stock';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (choice: AddModalChoice) => void;
}

const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        transition: 'background-color 0.25s ease',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="add-modal-title" className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Add
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={() => onSelect('item')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-gray-50/80 hover:border-[#0B5858]/40 hover:bg-teal-50/50 transition-colors text-left"
            style={{ fontFamily: 'Poppins' }}
          >
            <div className="w-12 h-12 rounded-xl bg-[#0B5858]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add new item</p>
              <p className="text-sm text-gray-500">Create a new inventory item</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSelect('stock')}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-gray-50/80 hover:border-green-500/40 hover:bg-green-50/50 transition-colors text-left"
            style={{ fontFamily: 'Poppins' }}
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add new stock</p>
              <p className="text-sm text-gray-500">Increase stock for an existing item</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddModal;
