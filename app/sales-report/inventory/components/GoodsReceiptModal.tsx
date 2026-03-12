'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';
import type { PurchaseOrder, PurchaseOrderLine } from '../types';
import InventoryDropdown from './InventoryDropdown';
import { useToast } from '../hooks/useToast';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { inventoryPurchaseOrderLines, inventoryWarehouseDirectory, inventoryItems } from '../lib/inventoryDataStore';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';

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
  const poLines = inventoryPurchaseOrderLines.filter(line => line.poId === po.id);

  // Auto-fill warehouse from PO line items' stored warehouse (most common among products)
  const defaultWarehouseId = (() => {
    const counts = new Map<string, number>();
    for (const line of poLines) {
      const item = inventoryItems.find((i) => i.id === line.productId);
      if (item?.warehouseId) {
        counts.set(item.warehouseId, (counts.get(item.warehouseId) ?? 0) + 1);
      }
    }
    let best = '';
    let max = 0;
    for (const [whId, n] of counts) {
      if (n > max) {
        max = n;
        best = whId;
      }
    }
    return best;
  })();

  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [receivedBy, setReceivedBy] = useState(authState.userProfile?.fullname || 'Staff');
  const [receiptDate, setReceiptDate] = useState(getTodayInPhilippineTime());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setWarehouseId((prev) => (prev ? prev : defaultWarehouseId));
  }, [defaultWarehouseId]);

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

  const getRemaining = (line: PurchaseOrderLine) =>
    Math.max(0, Number(line.quantity - (line.receivedQuantity ?? 0)));

  const [lineQuantities, setLineQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    poLines.forEach((line) => {
      init[line.id] = getRemaining(line);
    });
    return init;
  });

  const poLinesKey = poLines.map((l) => `${l.id}:${l.quantity}:${l.receivedQuantity}`).join('|');
  useEffect(() => {
    const next: Record<string, number> = {};
    poLines.forEach((line) => {
      next[line.id] = getRemaining(line);
    });
    setLineQuantities(next);
  }, [poLinesKey]);

  const setLineQty = (lineId: string, value: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, Math.round(value)));
    setLineQuantities((prev) => ({ ...prev, [lineId]: clamped }));
  };

  const reviewItems = poLines
    .map((line) => {
      const qty = lineQuantities[line.id] ?? getRemaining(line);
      return { line, qty };
    })
    .filter(({ qty }) => qty > 0);

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

  const MAX_FILE_SIZE_MB = 2;
  const MAX_TOTAL_MB = 8;
  const MAX_FILES = 5;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const maxTotalBytes = MAX_TOTAL_MB * 1024 * 1024;
    const currentTotal = receiptImages.reduce((sum, f) => sum + f.size, 0);
    const validFiles: File[] = [];
    let skippedOversized = false;

    for (const file of files) {
      if (validFiles.length >= MAX_FILES) break;
      if (file.size > maxBytes) {
        skippedOversized = true;
        continue;
      }
      if (currentTotal + validFiles.reduce((s, f) => s + f.size, 0) + file.size > maxTotalBytes) {
        skippedOversized = true;
        break;
      }
      validFiles.push(file);
    }

    if (skippedOversized) {
      error(`Some images were skipped. Max ${MAX_FILE_SIZE_MB}MB per file, ${MAX_TOTAL_MB}MB total, ${MAX_FILES} files.`);
    }

    const newImages = [...receiptImages, ...validFiles];
    setReceiptImages(newImages);

    validFiles.forEach(file => {
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
    if (!warehouseId || !receiptDate) {
      error('Please select a warehouse and receipt date.');
      return;
    }
    if (reviewItems.length === 0) {
      error('Enter at least one quantity to receive.');
      return;
    }

    onSubmit({
      warehouseId,
      receivedBy: (receivedBy || 'Staff').trim(),
      receiptDate,
      notes,
      receiptImages,
      items: reviewItems.map(({ line, qty }) => ({ productId: line.productId, quantityReceived: qty })),
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
            <Field label="Received By" hint="Optional until login is enabled. Default: Staff">
              <input
                type="text"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                placeholder="e.g. Staff or your name"
                style={inputStyle}
              />
            </Field>
            <Field label="Receipt Date" required>
              <SingleDatePicker
                value={receiptDate}
                onChange={setReceiptDate}
                placeholder="Select receipt date"
                calendarZIndex={10020}
                className="w-full"
              />
            </Field>
          </div>

          {/* Order Items – Partial Receipt Quantities */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, marginBottom: 10, fontFamily: 'Poppins' }}>
              Purchase Order Items
            </div>
            <div style={{ fontSize: 11, color: C.midGray, marginBottom: 8 }}>
              Enter qty to receive per line. Max per line = remaining (ordered − received).
            </div>
            <div style={{ border: `1.5px solid ${C.lightGray}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fbfb' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Item</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Ordered</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Received</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Remaining</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Qty to receive</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {poLines.map((line) => {
                    const product = inventoryItems.find(p => p.id === line.productId);
                    const received = line.receivedQuantity ?? 0;
                    const remaining = getRemaining(line);
                    const qty = lineQuantities[line.id] ?? remaining;
                    const unit = product?.unit || 'pcs';
                    return (
                      <tr key={line.id} style={{ borderTop: `1px solid ${C.lightGray}` }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, fontFamily: 'Poppins' }}>
                          {product?.name || `Product #${line.productId}`}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, textAlign: 'right', fontFamily: 'Poppins' }}>
                          {line.quantity} {unit}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, textAlign: 'right', fontFamily: 'Poppins' }}>
                          {received} {unit}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: C.darkGray, textAlign: 'right', fontFamily: 'Poppins' }}>
                          {remaining} {unit}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'Poppins' }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              if (raw === '') {
                                setLineQty(line.id, 0, remaining);
                                return;
                              }
                              const v = parseInt(raw, 10);
                              setLineQty(line.id, Number.isNaN(v) ? 0 : v, remaining);
                            }}
                            style={{
                              ...inputStyle,
                              width: 72,
                              padding: '6px 8px',
                              textAlign: 'right',
                            }}
                          />
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
                    PNG, JPG up to {MAX_FILE_SIZE_MB}MB each, max {MAX_FILES} files
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

          {/* Review Before Submit */}
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 12,
              background: '#f0f9f9',
              border: `1.5px solid ${C.teal}33`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: C.darkTeal, marginBottom: 10, fontFamily: 'Poppins' }}>
              Review before submit
            </div>
            {reviewItems.length === 0 ? (
              <div style={{ fontSize: 13, color: C.midGray, fontFamily: 'Poppins' }}>
                No quantities entered. Add qty to receive above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reviewItems.map(({ line, qty }) => {
                  const product = inventoryItems.find(p => p.id === line.productId);
                  const unit = product?.unit || 'pcs';
                  const remaining = getRemaining(line);
                  return (
                    <div
                      key={line.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                        color: C.darkGray,
                        fontFamily: 'Poppins',
                      }}
                    >
                      <span>{product?.name || `Product #${line.productId}`}</span>
                      <span style={{ fontWeight: 600 }}>
                        {qty} {unit} of {remaining} remaining
                      </span>
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${C.lightGray}`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.darkTeal,
                    fontFamily: 'Poppins',
                  }}
                >
                  Total: {reviewItems.reduce((s, { qty }) => s + qty, 0)} units across {reviewItems.length} item{reviewItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
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
            disabled={reviewItems.length === 0}
            style={{
              padding: '10px 28px',
              borderRadius: 10,
              border: 'none',
              background: reviewItems.length === 0 ? C.midGray : `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
              color: C.white,
              fontSize: 14,
              fontWeight: 700,
              cursor: reviewItems.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              boxShadow: reviewItems.length === 0 ? 'none' : '0 4px 14px rgba(11,88,88,0.3)',
              fontFamily: 'Poppins',
              opacity: reviewItems.length === 0 ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (reviewItems.length > 0) e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              if (reviewItems.length > 0) e.currentTarget.style.opacity = '1';
            }}
          >
            Create Receipt
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
}
