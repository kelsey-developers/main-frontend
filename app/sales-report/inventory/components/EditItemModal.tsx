'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ItemType, ItemCategory, ReplenishmentItem } from '../types';
import InventoryDropdown from './InventoryDropdown';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { 
  inventoryWarehouseDirectory,
  ITEM_CATEGORIES,
  ITEM_TYPES,
  ITEM_UNITS,
} from '../lib/inventoryDataStore';

// ─── Brand colors ────────────────────────────────────────────────
const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  gold: '#f1c40f',
  red: '#f10e3b',
  green: '#3db91f',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
};

// ─── Shared input style ───────────────────────────────────────────
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

// ─── Field wrapper ────────────────────────────────────────────────
function Field({
  label,
  required,
  hint,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
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

// ─── Section divider ──────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: C.midGray,
        letterSpacing: 1.8,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'Poppins',
      }}
    >
      <span>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.lightGray }} />
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 23,
        borderRadius: 12,
        cursor: 'pointer',
        background: checked ? C.teal : '#d1d5db',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 17,
          height: 17,
          borderRadius: '50%',
          background: C.white,
          position: 'absolute',
          top: 3,
          left: checked ? 22 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDIT ITEM MODAL Component
// ═══════════════════════════════════════════════════════════════════
interface EditItemModalProps {
  item: ReplenishmentItem | null;
  onClose: () => void;
  onSave?: (updatedItem: Partial<ReplenishmentItem>) => void;
}

export default function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const { toasts, removeToast, success, error } = useToast();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    type: 'consumable' as ItemType,
    unit: '',
    currentStock: 0,
    minStock: 0,
    unitCost: 0,
    warehouseId: '',
    isActive: true,
  });

  // Initialize form with item data when item changes
  useEffect(() => {
    setMounted(true);

    if (item) {
      setForm({
        sku: item.sku || '',
        name: item.name || '',
        category: item.category || '',
        type: item.type || 'consumable',
        unit: item.unit || '',
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        unitCost: item.unitCost || 0,
        warehouseId: item.warehouseId || '',
        isActive: item.isActive ?? true,
      });
    }
  }, [item]);

  useEffect(() => {
    if (!item) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';

      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, [item, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      error('Item name is required');
      return;
    }
    if (!form.category) {
      error('Category is required');
      return;
    }
    if (!form.unit) {
      error('Unit is required');
      return;
    }
    if (form.minStock < 0) {
      error('Minimum stock cannot be negative');
      return;
    }
    if (form.currentStock < 0) {
      error('Current stock cannot be negative');
      return;
    }
    if (form.unitCost < 0) {
      error('Unit cost cannot be negative');
      return;
    }

    const updatedData: Partial<ReplenishmentItem> = {
      ...form,
      category: form.category as ItemCategory,
      totalValue: form.currentStock * form.unitCost,
      shortfall: Math.max(0, form.minStock - form.currentStock),
      updatedAt: new Date().toISOString(),
    };

    if (onSave) {
      onSave(updatedData);
    }

    success(`Item "${form.name}" updated successfully`);
    onClose();
  };

  if (!item || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: C.white,
          borderRadius: 18,
          width: '90%',
          maxWidth: 720,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          zIndex: 10001,
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
            padding: '20px 24px',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                color: C.white,
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                fontFamily: 'Poppins',
              }}
            >
              Edit Item
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 12,
                margin: '4px 0 0',
                fontFamily: 'Poppins',
              }}
            >
              Update item details and inventory information
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              color: C.white,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 24px 20px' }}>
          <SectionLabel label="BASIC INFORMATION" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
            <Field label="SKU" hint="auto-generated">
              <input
                type="text"
                value={form.sku}
                readOnly
                style={{ ...inputStyle, background: '#f9fafb', cursor: 'not-allowed' }}
              />
            </Field>

            <Field label="Item Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter item name..."
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.teal;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.lightGray;
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Field label="Category" required>
              <InventoryDropdown
                value={form.category}
                onChange={(value) => setForm({ ...form, category: value })}
                options={[
                  { value: '', label: 'Select...' },
                  ...ITEM_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
                ]}
                placeholder="Select..."
                placeholderWhen=""
                hideIcon={true}
                fullWidth={true}
                minWidthClass="min-w-0"
                align="left"
                backdropZIndexClass="z-[10005]"
                menuZIndexClass="z-[10010]"
              />
            </Field>

            <Field label="Type" required>
              <InventoryDropdown
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value as ItemType })}
                options={ITEM_TYPES.map((type) => ({
                  value: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                }))}
                hideIcon={true}
                fullWidth={true}
                minWidthClass="min-w-0"
                align="left"
                backdropZIndexClass="z-[10005]"
                menuZIndexClass="z-[10010]"
              />
            </Field>

            <Field label="Unit" required>
              <InventoryDropdown
                value={form.unit}
                onChange={(value) => setForm({ ...form, unit: value })}
                options={[
                  { value: '', label: 'Select...' },
                  ...ITEM_UNITS.map((unit) => ({ value: unit, label: unit })),
                ]}
                placeholder="Select..."
                placeholderWhen=""
                hideIcon={true}
                fullWidth={true}
                minWidthClass="min-w-0"
                align="left"
                backdropZIndexClass="z-[10005]"
                menuZIndexClass="z-[10010]"
              />
            </Field>
          </div>

          <SectionLabel label="INVENTORY" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Field label="Current Stock" required>
              <input
                type="number"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: parseInt(e.target.value) || 0 })}
                min="0"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.teal;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.lightGray;
                }}
              />
            </Field>

            <Field label="Minimum Stock" required hint="alert threshold">
              <input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
                min="0"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.teal;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.lightGray;
                }}
              />
            </Field>
          </div>

          <SectionLabel label="WAREHOUSE & PRICING" />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            <Field label="Warehouse" required>
              <InventoryDropdown
                value={form.warehouseId}
                onChange={(value) => setForm({ ...form, warehouseId: value })}
                options={[
                  { value: '', label: 'Select warehouse...' },
                  ...inventoryWarehouseDirectory.map((wh) => ({
                    value: wh.id,
                    label: `${wh.name} - ${wh.location}`,
                  })),
                ]}
                placeholder="Select warehouse..."
                placeholderWhen=""
                fullWidth={true}
                minWidthClass="min-w-0"
                align="left"
                backdropZIndexClass="z-[10005]"
                menuZIndexClass="z-[10010]"
              />
            </Field>

            <Field label="Unit Cost (PHP)" required>
              <input
                type="number"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="1"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.teal;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.lightGray;
                }}
              />
            </Field>
          </div>

          {/* Status Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: form.isActive ? '#e8f4f4' : '#f9fafb',
              border: `1.5px solid ${form.isActive ? C.teal : C.lightGray}`,
              borderRadius: 10,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
                Item Status
              </div>
              <div style={{ fontSize: 11, color: C.midGray, marginTop: 2, fontFamily: 'Poppins' }}>
                {form.isActive ? 'Active - Available for use' : 'Inactive - Hidden from inventory'}
              </div>
            </div>
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>

          {/* Calculated Info */}
          {form.currentStock > 0 && form.unitCost > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e', fontFamily: 'Poppins' }}>
                  Total Inventory Value:
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#b45309', fontFamily: 'Poppins' }}>
                  PHP {(form.currentStock * form.unitCost).toLocaleString()}
                </span>
              </div>
              {form.currentStock < form.minStock && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#b45309', fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Stock is below minimum threshold (shortfall: {form.minStock - form.currentStock} {form.unit})
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
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
              type="submit"
              style={{
                padding: '10px 28px',
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
                color: C.white,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.15s',
                fontFamily: 'Poppins',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>,
    document.body
  );
}
