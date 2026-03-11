'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import InventoryDropdown from '@/app/sales-report/inventory/components/InventoryDropdown';
import {
  inventoryItems,
  inventoryWarehouseDirectory,
  inventoryUnits,
  loadInventoryDataset,
} from '@/app/sales-report/inventory/lib/inventoryDataStore';

const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  red: '#f10e3b',
  redSoft: '#fff0f3',
  green: '#28950e',
  greenBg: '#f0faf0',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
  unGrad1: '#0f766e',
  unGrad2: '#14b8a6',
  unBtn: '#0f766e',
  unBookingBg: '#ecfeff',
  unBookingBorder: '#0f766e',
  unBookingText: '#0b5858',
};

const REASONS = [
  'Guest Booking',
  'Room Preparation',
  'Damage Replacement',
  'Room Restocking',
  'Checkout Replenishment',
  'Other',
];

const BOOKINGS = [
  { id: 'b1', code: 'BK-2025-001', guest: 'Juan dela Cruz', checkIn: 'Mar 08', checkOut: 'Mar 12', unit: 'Unit 101' },
  { id: 'b2', code: 'BK-2025-002', guest: 'Maria Santos', checkIn: 'Mar 09', checkOut: 'Mar 11', unit: 'Unit 201' },
  { id: 'b3', code: 'BK-2025-003', guest: 'Robert Kim', checkIn: 'Mar 10', checkOut: 'Mar 14', unit: 'Unit 301' },
];

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

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: color ?? C.midGray,
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

interface LineItem {
  id: string;
  productId: string;
  quantity: string;
}

function LineItemRow({
  item,
  rowIndex,
  onUpdate,
  onRemove,
  isFirst,
  itemSelectOptions,
}: {
  item: LineItem;
  rowIndex: number;
  onUpdate: (id: string, k: keyof LineItem, v: string) => void;
  onRemove: (id: string) => void;
  isFirst: boolean;
  itemSelectOptions: Array<{ value: string; label: string }>;
}) {
  const product = inventoryItems.find((p) => p.id === item.productId);
  const over = !!(product && item.quantity && parseInt(item.quantity, 10) > product.currentStock);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 36px',
        gap: 10,
        alignItems: 'start',
        padding: '14px',
        background: rowIndex % 2 === 0 ? C.bg : C.white,
        borderRadius: 12,
        border: `1.5px solid ${over ? C.red + '60' : C.lightGray}`,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isFirst && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Item <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <InventoryDropdown
          value={item.productId}
          onChange={(v) => onUpdate(item.id, 'productId', v)}
          options={itemSelectOptions}
          placeholder="Select item…"
          placeholderWhen=""
          hideIcon
          fullWidth
          minWidthClass="min-w-0"
        />
        {product && (
          <span style={{ fontSize: 11, color: C.midGray, fontFamily: 'Poppins' }}>
            Available: {product.currentStock} {product.unit}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isFirst && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Qty <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
          placeholder="0"
          style={{ ...inputStyle, borderColor: over ? C.red : C.lightGray }}
        />
        {over && (
          <span style={{ fontSize: 11, color: C.red, fontFamily: 'Poppins' }}>Exceeds stock</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        style={{
          width: 36,
          height: 38,
          borderRadius: 8,
          border: `1.5px solid ${C.lightGray}`,
          background: 'none',
          color: C.midGray,
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: isFirst ? 22 : 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddItemBtn({ onAdd }: { onAdd: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onAdd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%',
        padding: '11px',
        marginTop: 10,
        border: `2px dashed ${hov ? C.unBtn : C.lightGray}`,
        borderRadius: 10,
        background: 'none',
        cursor: 'pointer',
        color: hov ? C.unBtn : C.midGray,
        fontWeight: 600,
        fontSize: 13,
        fontFamily: 'Poppins',
        transition: 'all 0.15s',
      }}
    >
      + Add Another Item
    </button>
  );
}

interface HousekeepingStockOutModalProps {
  onClose: () => void;
}

export default function HousekeepingStockOutModal({ onClose }: HousekeepingStockOutModalProps) {
  const [visible, setVisible] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmedBy, setConfirmedBy] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [unit, setUnit] = useState('');
  const [booking, setBooking] = useState('');
  const [reason, setReason] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>(() => [
    { id: crypto.randomUUID(), productId: '', quantity: '' },
  ]);

  const itemSelectOptions = useMemo(
    () => [
      { value: '', label: 'Select item…' },
      ...inventoryItems.map((p) => ({
        value: p.id,
        label: `${p.sku} — ${p.name} (${p.currentStock} ${p.unit} available)`,
      })),
    ],
    [refreshTick]
  );

  const unitOptions = useMemo(
    () => [
      { value: '', label: 'Select unit…' },
      ...inventoryUnits.map((u) => ({ value: u.id, label: u.name })),
    ],
    [refreshTick]
  );

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'Select warehouse…' },
      ...inventoryWarehouseDirectory
        .filter((wh) => wh.isActive)
        .map((w) => ({ value: w.id, label: w.name })),
    ],
    [refreshTick]
  );

  useEffect(() => {
    void loadInventoryDataset();
    const onUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener('inventory:movement-updated', onUpdate);
    return () => window.removeEventListener('inventory:movement-updated', onUpdate);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 230);
  };

  const updateItem = (id: string, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it) => (it.id === id ? { ...it, [k]: v } : it)));
  const removeItem = (id: string) =>
    setItems((p) => (p.length > 1 ? p.filter((it) => it.id !== id) : p));

  const canSubmit =
    confirmedBy &&
    idNumber &&
    unit &&
    reason &&
    warehouse &&
    items.some((r) => r.productId && r.quantity && parseInt(r.quantity, 10) > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: Backend integration
    handleClose();
  };

  const bk = BOOKINGS.find((b) => b.id === booking);
  const grad = `linear-gradient(135deg, ${C.unGrad1}, ${C.unGrad2})`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="housekeeping-stock-out-title"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          background: C.white,
          borderRadius: 22,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
          transition: 'transform 0.26s cubic-bezier(0.34,1.4,0.64,1), opacity 0.22s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          style={{
            background: grad,
            padding: '22px 28px',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.52)',
                marginBottom: 5,
                fontFamily: 'Poppins',
              }}
            >
              HOUSEKEEPING · UNIT / ROOM
            </div>
            <div
              id="housekeeping-stock-out-title"
              style={{
                color: C.white,
                fontWeight: 800,
                fontSize: 22,
                marginBottom: 3,
                fontFamily: 'Poppins',
              }}
            >
              Housekeeping Stock Out
            </div>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, fontFamily: 'Poppins' }}>
              Allocate items to a room or unit
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              color: C.white,
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="Confirmed By" required hint="Your name">
              <input
                type="text"
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                placeholder="e.g. Maria Santos"
                style={inputStyle}
              />
            </Field>
            <Field label="ID Number" required hint="Employee/Staff ID">
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. EMP-2025-002"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '14px 0 22px' }} />
          <SectionLabel label="UNIT & BOOKING" color={C.darkTeal} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="Unit / Room" required>
              <InventoryDropdown
                value={unit}
                onChange={setUnit}
                options={unitOptions}
                placeholder="Select unit…"
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
              />
            </Field>
            <Field label="Link to Booking" hint="Optional">
              <InventoryDropdown
                value={booking}
                onChange={setBooking}
                options={[
                  { value: '', label: 'Select booking…' },
                  ...BOOKINGS.map((b) => ({ value: b.id, label: `${b.code} · ${b.guest}` })),
                ]}
                placeholder="Select booking…"
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
              />
            </Field>
          </div>

          {bk && (
            <div
              style={{
                marginBottom: 16,
                padding: '14px 18px',
                background: C.unBookingBg,
                borderRadius: 12,
                borderLeft: `3px solid ${C.unBookingBorder}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12,
              }}
            >
              {[
                { l: 'Guest', v: bk.guest },
                { l: 'Stay', v: `${bk.checkIn} → ${bk.checkOut}` },
                { l: 'Unit', v: bk.unit },
              ].map((m) => (
                <div key={m.l}>
                  <div
                    style={{
                      fontSize: 10,
                      color: C.unBookingText,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      marginBottom: 3,
                      fontFamily: 'Poppins',
                    }}
                  >
                    {m.l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.unBtn, fontFamily: 'Poppins' }}>
                    {m.v}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Link
                  href={`/sales-report/finance/bookings/${bk.id}`}
                  style={{ fontSize: 12, fontWeight: 600, color: C.darkTeal, fontFamily: 'Poppins' }}
                >
                  View booking →
                </Link>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <Field label="Reason" required>
              <InventoryDropdown
                value={reason}
                onChange={setReason}
                options={[
                  { value: '', label: 'Select reason…' },
                  ...REASONS.map((r) => ({ value: r, label: r })),
                ]}
                placeholder="Select reason…"
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
              />
            </Field>
            <Field label="Pull from Warehouse" required>
              <InventoryDropdown
                value={warehouse}
                onChange={setWarehouse}
                options={warehouseOptions}
                placeholder="Select warehouse…"
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
              />
            </Field>
            <Field label="Date" required>
              <input
                type="date"
                style={inputStyle}
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <Field label="Reference No." hint="Optional">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. BK-2025-001"
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '8px 0 22px' }} />
          <SectionLabel label="ITEMS TO ALLOCATE TO UNIT" color={C.darkTeal} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it, i) => (
              <LineItemRow
                key={it.id}
                item={it}
                rowIndex={i}
                onUpdate={updateItem}
                onRemove={removeItem}
                isFirst={i === 0}
                itemSelectOptions={itemSelectOptions}
              />
            ))}
          </div>
          <AddItemBtn
            onAdd={() =>
              setItems((p) => [...p, { id: crypto.randomUUID(), productId: '', quantity: '' }])
            }
          />

          <Field label="Notes" style={{ marginTop: 16 }}>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks for this unit allocation…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </div>

        <div
          style={{
            padding: '16px 28px',
            borderTop: `1px solid ${C.lightGray}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            background: C.white,
          }}
        >
          <span style={{ fontSize: 12, color: C.midGray, fontFamily: 'Poppins' }}>
            <span style={{ color: C.red }}>*</span> Required · Logged as <strong>Stock Out</strong>
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleClose}
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
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                background: canSubmit ? C.unBtn : C.lightGray,
                border: 'none',
                borderRadius: 10,
                padding: '10px 26px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                color: C.white,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'Poppins',
                boxShadow: canSubmit ? '0 4px 16px rgba(15,118,110,0.35)' : 'none',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={(e) => canSubmit && (e.currentTarget.style.filter = 'brightness(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              Confirm Stock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
