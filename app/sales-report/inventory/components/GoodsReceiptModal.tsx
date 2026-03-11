'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PurchaseOrder, PurchaseOrderLine } from '../types';
import InventoryDropdown from './InventoryDropdown';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { inventoryPurchaseOrderLines, inventoryWarehouseDirectory, inventoryItems } from '../lib/inventoryDataStore';

const getTodayISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
  red: '#f10e3b',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1.5px solid ${C.lightGray}`,
  fontSize: 14,
  color: C.darkGray,
  background: C.white,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Poppins',
  transition: 'border-color 0.15s',
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.darkGray,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'Poppins',
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
        {hint && (
          <span style={{ fontWeight: 400, color: C.midGray, fontSize: 11 }}>· {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function GoodsReceiptModal({
  po,
  onClose,
  onSubmit,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const authState = useMockAuth();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [receivedBy, setReceivedBy] = useState(authState.userProfile?.fullname || '');
  const [receiptDate, setReceiptDate] = useState(getTodayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  const [receiptImages, setReceiptImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const poLines = inventoryPurchaseOrderLines.filter(line => line.poId === po.id);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [...receiptImages, ...files];
    setReceiptImages(newImages);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setReceiptImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const { toasts, removeToast, error, success } = useToast();

  const handleSubmit = () => {
    if (!warehouseId || !receivedBy || !receiptDate) {
      error('Please fill in all required fields');
      return;
    }

    onSubmit({
      warehouseId,
      receivedBy,
      receiptDate,
      notes,
      receiptImages,
    });
    handleClose();
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(17, 24, 39, 0.38)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: 20,
          width: 'min(680px, 92vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
          fontFamily: 'Poppins',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0b5858, #05807e)',
            padding: '24px 28px',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
              CREATE GOODS RECEIPT
            </div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 20 }}>
              PO {po.id.toUpperCase()}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: C.white,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {/* Warehouse Selection */}
          <div style={{ marginBottom: 20 }}>
            <Field label="Destination Warehouse" required>
              <InventoryDropdown
                value={warehouseId}
                onChange={setWarehouseId}
                options={[
                  { value: '', label: 'Select warehouse...' },
                  ...inventoryWarehouseDirectory
                    .filter(w => w.isActive)
                    .map(w => ({ value: w.id, label: w.name }))
                ]}
                placeholder="Select warehouse..."
                placeholderWhen=""
                hideIcon={true}
                fullWidth={true}
                align="left"
                backdropZIndexClass="z-[10005]"
                menuZIndexClass="z-[10010]"
              />
            </Field>
          </div>

          {/* Receiver Details */}
          <div
            style={{
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Field label="Received By" required>
              <input
                type="text"
                value={receivedBy}
                readOnly
                placeholder="Receiver name"
                style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
            </Field>
            <Field label="Receipt Date" required>
              <input
                type="date"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Order Items Preview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, marginBottom: 10, fontFamily: 'Poppins' }}>
              Purchase Order Items
            </div>
            <div style={{ border: `1.5px solid ${C.lightGray}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fbfb' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {poLines.map((line, idx) => {
                    const product = inventoryItems.find(p => p.id === line.productId);
                    return (
                      <tr key={idx} style={{ borderTop: `1px solid ${C.lightGray}` }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, fontFamily: 'Poppins' }}>
                          {product?.name || `Product #${line.productId}`}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, textAlign: 'right', fontFamily: 'Poppins' }}>
                          {line.quantity} {product?.unit || 'pcs'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, textAlign: 'right', fontFamily: 'Poppins' }}>
                          PHP {line.unitPrice.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <Field label="Receipt Evidence" required hint="Upload photos of the physical receipt">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px dashed ${C.lightGray}`,
                    background: '#f8fbfb',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.15s',
                    fontFamily: 'Poppins',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.teal;
                    e.currentTarget.style.background = '#e8f4f4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.lightGray;
                    e.currentTarget.style.background = '#f8fbfb';
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5m0 0L7 8m5-5v12" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.darkTeal }}>
                    Click to upload receipt images
                  </div>
                  <div style={{ fontSize: 11, color: C.midGray }}>
                    PNG, JPG up to 10MB each
                  </div>
                </button>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
                    {imagePreviews.map((preview, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: `1.5px solid ${C.lightGray}`,
                          aspectRatio: '1',
                        }}
                      >
                        <img
                          src={preview}
                          alt={`Receipt ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(241, 14, 59, 0.9)',
                            color: C.white,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 'bold',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <Field label="Notes" hint="Optional">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes about the delivery..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: 80,
                }}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 28px',
            borderTop: `1.5px solid ${C.lightGray}`,
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: `1.5px solid ${C.lightGray}`,
              background: C.white,
              color: C.darkGray,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'Poppins',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.white;
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '10px 28px',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
              color: C.white,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              boxShadow: '0 4px 14px rgba(11,88,88,0.3)',
              fontFamily: 'Poppins',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Create Receipt
          </button>
        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>,
    document.body
  );
}
