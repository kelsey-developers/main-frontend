'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import type { ItemType, ItemCategory, ReplenishmentItem } from '../types';
import InventoryDropdown from './InventoryDropdown';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { 
  loadInventoryDataset,
  inventoryItems, 
  inventoryWarehouseDirectory,
  ITEM_CATEGORIES,
  ITEM_TYPES,
  ITEM_UNITS,
} from '../lib/inventoryDataStore';
import { createItemAndProcessStockIn, processStockIn } from '../lib/inventoryLedger';

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
// STOCK IN MODAL Component
// ═══════════════════════════════════════════════════════════════════
interface StockInModalProps {
  mode: 'new' | 'existing';
  onClose: () => void;
}

export default function StockInModal({ mode, onClose }: StockInModalProps) {
  const router = useRouter();
  const { toasts, removeToast, success, error } = useToast();
  const [mounted, setMounted] = useState(false);
  const [, setRefreshTick] = useState(0);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    itemType: '' as ItemType | '',
    unit: '',
    reorderLevel: '',
    isActive: true,
    warehouse: [] as string[],
    quantity: '',
    reason: '',
    notes: '',
    reference: '',
    existingItem: '',
    minStock: '',
  });
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        setRefreshTick((tick) => tick + 1);
      });

    const refresh = () => {
      setRefreshTick((tick) => tick + 1);
    };

    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Trap scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleWarehouse = (w: string) =>
    set(
      'warehouse',
      form.warehouse.includes(w)
        ? form.warehouse.filter((x: string) => x !== w)
        : [...form.warehouse, w]
    );

  const selectedItem = inventoryItems.find((i) => i.id === form.existingItem);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 220);
  };

  const handleSubmit = async () => {
    try {
      const quantity = Number(form.quantity || 0);
      if (quantity <= 0) {
        error('Quantity must be greater than zero.');
        return;
      }

      if (mode === 'existing') {
        if (!form.existingItem) {
          error('Select an existing item.');
          return;
        }
        if (!form.warehouse[0]) {
          error('Select a destination warehouse.');
          return;
        }

        await processStockIn({
          productId: form.existingItem,
          warehouseId: form.warehouse[0],
          quantity,
          reason: form.reason || 'Stock in',
          date: new Date().toISOString(),
          reference: form.reference || undefined,
          notes: form.notes || undefined,
        });
      } else {
        if (!form.sku || !form.name || !form.category || !form.itemType || !form.unit) {
          error('Please complete required item details (SKU, name, category, type, unit).');
          return;
        }
        if (!form.warehouse.length) {
          error('Select at least one warehouse.');
          return;
        }

        await createItemAndProcessStockIn({
          sku: form.sku,
          name: form.name,
          category: form.category as ItemCategory,
          itemType: form.itemType as ItemType,
          unit: form.unit,
          minStock: Number(form.minStock || form.reorderLevel || 0),
          isActive: form.isActive,
          initialStocks: form.warehouse.map((warehouseId) => ({
            warehouseId,
            quantity,
            reason: form.reason || 'Initial stock',
            date: new Date().toISOString(),
            reference: form.reference || undefined,
            notes: form.notes || undefined,
          })),
        });
      }

      success(mode === 'existing' ? 'Stock in recorded.' : 'Item created and stock added.');
      router.push('/sales-report/inventory/items');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Stock-in error:', err);
      }
      error('We couldn’t complete the stock-in. Please try again.');
    }
  };

  const warehouses = inventoryWarehouseDirectory.filter((wh) => wh.isActive);

  const stockInDropdownProps = {
    align: 'left' as const,
    fullWidth: true,
    minWidthClass: 'min-w-0',
    backdropZIndexClass: 'z-[10010]',
    menuZIndexClass: 'z-[10020]',
  };

  const stockInLeadingIcon = (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 4h9M2 6.5h9M2 9h9" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );

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
        background: 'rgba(17, 24, 39, 0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          background: C.white,
          borderRadius: 22,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
          transition: 'transform 0.24s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* ── Teal gradient header ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.darkTeal} 0%, ${C.teal} 100%)`,
            padding: '22px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.55)',
                marginBottom: 4,
                fontFamily: 'Poppins',
              }}
            >
              {mode === 'new' ? 'NEW PRODUCT · STOCK IN' : 'RESTOCK · STOCK IN'}
            </div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 20, fontFamily: 'Poppins' }}>
              {mode === 'new' ? 'Add New Item' : 'Add Stock to Existing Item'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '6px 12px',
                color: C.white,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Poppins',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {mode === 'new' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L14.5 9.5L20 10.5L16 14.5L17 20L12 17L7 20L8 14.5L4 10.5L9.5 9.5L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  NEW
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  RESTOCK
                </>
              )}
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
        </div>

        {/* ── Scrollable form body ── */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
          {/* ══ EXISTING ITEM FLOW ══ */}
          {mode === 'existing' && (
            <>
              <SectionLabel label="ITEM SELECTION" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <Field label="Item" required>
                  <InventoryDropdown
                    value={form.existingItem}
                    onChange={(value) => set('existingItem', value)}
                    options={[
                      { value: '', label: 'Search or select item...' },
                      ...inventoryItems.map((i) => ({
                        value: i.id,
                        label: `${i.sku} - ${i.name}`,
                      })),
                    ]}
                    placeholder="Search or select item..."
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                  />
                </Field>
                <Field label="Category">
                  <InventoryDropdown
                    value={selectedItem?.category || ''}
                    onChange={() => {
                      // Read-only category field mirrors selected item.
                    }}
                    options={[
                      { value: '', label: 'Select category' },
                      ...ITEM_CATEGORIES.map((c) => ({ value: c, label: c })),
                    ]}
                    placeholder="Select category"
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                    disabled={!selectedItem}
                  />
                </Field>
              </div>

              {/* Stock snapshot */}
              {selectedItem && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 10,
                    marginBottom: 22,
                  }}
                >
                  {[
                    { label: 'Current Stock', val: `${selectedItem.currentStock} ${selectedItem.unit}`, color: C.gold },
                    { label: 'Min Stock', val: `${selectedItem.minStock} ${selectedItem.unit}`, color: C.midGray },
                    {
                      label: 'Shortfall',
                      val: `${selectedItem.shortfall} ${selectedItem.unit}`,
                      color: selectedItem.shortfall > 0 ? C.red : C.green,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: C.bg,
                        borderRadius: 12,
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: C.midGray, marginBottom: 4, fontFamily: 'Poppins' }}>
                        {s.label}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 20, color: s.color, fontFamily: 'Poppins' }}>
                        {s.val}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '4px 0 22px' }} />
              <SectionLabel label="STOCK & LOCATION" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Quantity to Add" required>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Destination Warehouse" required>
                  <InventoryDropdown
                    value={form.warehouse[0] || ''}
                    onChange={(value) => set('warehouse', value ? [value] : [])}
                    options={[
                      { value: '', label: 'Select warehouse' },
                      ...warehouses.map((w) => ({ value: w.id, label: w.name })),
                    ]}
                    placeholder="Select warehouse"
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                  />
                </Field>
                <Field label="Reference No.">
                  <input placeholder="PO / GR #" style={inputStyle} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
                </Field>
              </div>
              <Field label="Reason">
                <input placeholder="e.g. Restock, delivery received" style={inputStyle} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
              </Field>
            </>
          )}

          {/* ══ NEW ITEM FLOW ══ */}
          {mode === 'new' && (
            <>
              <SectionLabel label="PRODUCT IDENTITY" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                <Field label="SKU" required hint="Auto or custom">
                  <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. TWL-001" style={inputStyle} />
                </Field>
                <Field label="Item Name" required>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Towels" style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Category" required>
                  <InventoryDropdown
                    value={form.category}
                    onChange={(value) => set('category', value)}
                    options={[
                      { value: '', label: 'Select category' },
                      ...ITEM_CATEGORIES.map((c) => ({ value: c, label: c })),
                    ]}
                    placeholder="Select category"
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                  />
                </Field>
                <Field label="Item Type" required>
                  <InventoryDropdown
                    value={form.itemType}
                    onChange={(value) => set('itemType', value as ItemType)}
                    options={[
                      { value: '', label: 'Select type' },
                      ...ITEM_TYPES.map((t) => ({
                        value: t,
                        label: t.charAt(0).toUpperCase() + t.slice(1),
                      })),
                    ]}
                    placeholder="Select type"
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                  />
                </Field>
                <Field label="Unit of Measure" required>
                  <InventoryDropdown
                    value={form.unit}
                    onChange={(value) => set('unit', value)}
                    options={[
                      { value: '', label: 'Select unit' },
                      ...ITEM_UNITS.map((u) => ({ value: u, label: u })),
                    ]}
                    placeholder="Select unit"
                    placeholderWhen=""
                    leadingIcon={stockInLeadingIcon}
                    {...stockInDropdownProps}
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                <Field label="Reorder Level" hint="Low-stock trigger">
                  <input
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) => set('reorderLevel', e.target.value)}
                    placeholder="e.g. 10"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Description">
                  <input
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Optional product notes"
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
                <span style={{ fontSize: 13, color: C.darkGray, fontFamily: 'Poppins' }}>
                  Active — available for stock movements
                </span>
              </div>

              <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '4px 0 22px' }} />
              <SectionLabel label="INITIAL STOCK & LOCATION" />

              <Field label="Assign to Warehouses" required hint="Select one or more" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {warehouses.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => toggleWarehouse(w.id)}
                      type="button"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${form.warehouse.includes(w.id) ? C.teal : C.lightGray}`,
                        background: form.warehouse.includes(w.id) ? `${C.teal}14` : C.white,
                        color: form.warehouse.includes(w.id) ? C.teal : C.darkGray,
                        fontWeight: form.warehouse.includes(w.id) ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: 13,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'Poppins',
                      }}
                    >
                      {form.warehouse.includes(w.id) && <span style={{ color: C.teal, fontSize: 11 }}>✓</span>}
                      {w.name}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Initial Quantity" required>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Min Stock Threshold">
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => set('minStock', e.target.value)}
                    placeholder="e.g. 5"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Reference No.">
                  <input placeholder="PO / GR #" style={inputStyle} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
                </Field>
              </div>
              <Field label="Reason">
                <input placeholder="e.g. Initial stocking" style={inputStyle} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
              </Field>
            </>
          )}

          {/* Shared notes */}
          <Field label="Notes" style={{ marginTop: 14 }}>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional remarks or context…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </div>

        {/* ── Sticky footer ── */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: `1px solid ${C.lightGray}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            background: C.white,
          }}
        >
          <span style={{ fontSize: 12, color: C.midGray, fontFamily: 'Poppins' }}>
            <span style={{ color: C.red }}>*</span> Required · Logged as <strong>Stock In</strong>
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleClose}
              type="button"
              style={{
                background: 'none',
                border: `1.5px solid ${C.lightGray}`,
                borderRadius: 10,
                padding: '10px 22px',
                cursor: 'pointer',
                color: C.darkGray,
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'Poppins',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              type="button"
              style={{
                background: C.darkTeal,
                border: 'none',
                borderRadius: 10,
                padding: '10px 26px',
                cursor: 'pointer',
                color: C.white,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'Poppins',
                boxShadow: `0 4px 16px rgba(11,88,88,0.35)`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.teal)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.darkTeal)}
            >
              {mode === 'new' ? 'Create Item & Add Stock' : 'Confirm Stock In'}
            </button>
          </div>
        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>,
    document.body
  );
}
