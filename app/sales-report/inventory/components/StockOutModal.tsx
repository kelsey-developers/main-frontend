'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReplenishmentItem } from '../types';
import InventoryDropdown from './InventoryDropdown';
import { 
  mockReplenishmentItems, 
  mockWarehouseDirectoryData,
  mockUnits,
} from '../lib/mockData';

// ─── Brand colors ────────────────────────────────────────────────
const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  gold: '#14b8a6',
  goldDark: '#0f766e',
  amber: '#0f766e',
  amberLight: '#0b5858',
  red: '#f10e3b',
  redSoft: '#fff0f3',
  green: '#28950e',
  greenBg: '#f0faf0',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
  // Warehouse mode
  whGrad1: '#0b5858',
  whGrad2: '#05807e',
  whAccent: '#05807e',
  whBtn: '#0b5858',
  // Unit mode
  unGrad1: '#0f766e',
  unGrad2: '#14b8a6',
  unAccent: '#0f766e',
  unBtn: '#0f766e',
  unBookingBg: '#ecfeff',
  unBookingBorder: '#0f766e',
  unBookingText: '#0b5858',
};

// ─── Mock data ───────────────────────────────────────────────────
const REASONS_WH = [
  'General Use',
  'Disposal / Expired',
  'Damaged / Write-off',
  'Inter-warehouse Transfer',
  'Event Use',
  'Staff Use',
  'Other',
];

const REASONS_UN = [
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

// ─── Stock pill ──────────────────────────────────────────────────
function StockPill({ available, reorder, unit }: { available: number; reorder: number; unit: string }) {
  const low = available <= reorder;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: low ? C.redSoft : C.greenBg,
        color: low ? C.red : C.green,
        fontFamily: 'Poppins',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: low ? C.red : C.green }} />
      {available} {unit}
      {low ? ' · Low' : ''}
    </span>
  );
}

// ─── Line item row ─────────────────────────────────────────────────
interface LineItem {
  productId: string;
  quantity: string;
}

function LineItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  sourceWarehouse,
}: {
  item: LineItem;
  index: number;
  onUpdate: (i: number, k: keyof LineItem, v: string) => void;
  onRemove: (i: number) => void;
  sourceWarehouse?: string;
}) {
  const product = mockReplenishmentItems.find((p) => p.id === item.productId);
  const avail = product ? product.currentStock : 0;
  const over = !!(product && item.quantity && parseInt(item.quantity) > avail);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 36px',
        gap: 10,
        alignItems: 'start',
        padding: '14px',
        background: index % 2 === 0 ? C.bg : C.white,
        borderRadius: 12,
        border: `1.5px solid ${over ? C.red + '60' : C.lightGray}`,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {index === 0 && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Item <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <select
          value={item.productId}
          onChange={(e) => onUpdate(index, 'productId', e.target.value)}
          style={inputStyle}
        >
          <option value="">Select item…</option>
          {mockReplenishmentItems.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </option>
          ))}
        </select>
        {product && <StockPill available={avail} reorder={product.minStock} unit={product.unit} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {index === 0 && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Qty <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          placeholder="0"
          style={{ ...inputStyle, borderColor: over ? C.red : C.lightGray }}
        />
        {over && (
          <span style={{ fontSize: 11, color: C.red, fontFamily: 'Poppins' }}>Exceeds stock</span>
        )}
      </div>
      <button
        onClick={() => onRemove(index)}
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
          marginTop: index === 0 ? 22 : 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Add item button ───────────────────────────────────────────────
function AddItemBtn({ onAdd, accent }: { onAdd: () => void; accent: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onAdd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%',
        padding: '11px',
        marginTop: 10,
        border: `2px dashed ${hov ? accent : C.lightGray}`,
        borderRadius: 10,
        background: 'none',
        cursor: 'pointer',
        color: hov ? accent : C.midGray,
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

// ═══════════════════════════════════════════════════════════════════
// WAREHOUSE FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════
function WarehouseForm() {
  const [confirmedBy, setConfirmedBy] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [reason, setReason] = useState('');
  const [isDamage, setIsDamage] = useState(false);
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '' }]);
  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));

  const warehouses = mockWarehouseDirectoryData.filter((wh) => wh.isActive);

  return (
    <>
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
            placeholder="e.g. Juan Dela Cruz"
            style={inputStyle}
          />
        </Field>
        <Field label="ID Number" required hint="Employee/Staff ID">
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="e.g. EMP-2025-001"
            style={inputStyle}
          />
        </Field>
      </div>
      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '14px 0 22px' }} />
      <SectionLabel label="SOURCE & REASON" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Source Warehouse" required>
          <InventoryDropdown
            value={warehouse}
            onChange={(value) => setWarehouse(value)}
            options={[
              { value: '', label: 'Select warehouse…' },
              ...warehouses.map((w) => ({ value: w.id, label: w.name })),
            ]}
            placeholder="Select warehouse…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
        <Field label="Reason" required>
          <InventoryDropdown
            value={reason}
            onChange={(value) => {
              setReason(value);
              setIsDamage(value === 'Damaged / Write-off');
            }}
            options={[
              { value: '', label: 'Select reason…' },
              ...REASONS_WH.map((r) => ({ value: r, label: r })),
            ]}
            placeholder="Select reason…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
        <Field label="Date" required>
          <input type="date" style={inputStyle} defaultValue="2025-03-08" />
        </Field>
        <Field label="Reference No." hint="Optional">
          <input placeholder="e.g. EVENT-001" style={inputStyle} />
        </Field>
      </div>

      {isDamage && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: C.redSoft,
            borderRadius: 12,
            borderLeft: `3px solid ${C.red}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 8, fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Damage Write-off
          </div>
          <Field label="Link Damage Incident Report" hint="Optional">
            <select style={inputStyle}>
              <option value="">Select incident…</option>
              <option>DI-2025-001 · Unit 101 · Mar 05</option>
              <option>DI-2025-002 · Unit 203 · Mar 07</option>
            </select>
          </Field>
        </div>
      )}

      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '8px 0 22px' }} />
      <SectionLabel label="ITEMS TO DEDUCT" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <LineItemRow
            key={i}
            item={it}
            index={i}
            onUpdate={upd}
            onRemove={rem}
            sourceWarehouse={warehouse}
          />
        ))}
      </div>
      <AddItemBtn
        onAdd={() => setItems((p) => [...p, { productId: '', quantity: '' }])}
        accent={C.whAccent}
      />

      <Field label="Notes" style={{ marginTop: 16 }}>
        <textarea
          rows={2}
          placeholder="Additional context or remarks…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// UNIT FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════
function UnitForm() {
  const [confirmedBy, setConfirmedBy] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [unit, setUnit] = useState('');
  const [booking, setBooking] = useState('');
  const [reason, setReason] = useState('');
  const [srcWarehouse, setSrcWarehouse] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '' }]);
  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));
  const bk = BOOKINGS.find((b) => b.id === booking);

  const warehouses = mockWarehouseDirectoryData.filter((wh) => wh.isActive);

  return (
    <>
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
      <SectionLabel label="UNIT & BOOKING" color={C.amberLight} />
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
            onChange={(value) => setUnit(value)}
            options={[
              { value: '', label: 'Select unit…' },
              ...mockUnits.map((u) => ({ value: u.id, label: u.name })),
            ]}
            placeholder="Select unit…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
        <Field label="Link to Booking" hint="Optional">
          <InventoryDropdown
            value={booking}
            onChange={(value) => setBooking(value)}
            options={[
              { value: '', label: 'Select booking…' },
              ...BOOKINGS.map((b) => ({ value: b.id, label: `${b.code} · ${b.guest}` })),
            ]}
            placeholder="Select booking…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
      </div>

      {/* Booking context card — teal-blue tinted */}
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
            onChange={(value) => setReason(value)}
            options={[
              { value: '', label: 'Select reason…' },
              ...REASONS_UN.map((r) => ({ value: r, label: r })),
            ]}
            placeholder="Select reason…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
        <Field label="Pull from Warehouse" required>
          <InventoryDropdown
            value={srcWarehouse}
            onChange={(value) => setSrcWarehouse(value)}
            options={[
              { value: '', label: 'Select warehouse…' },
              ...warehouses.map((w) => ({ value: w.id, label: w.name })),
            ]}
            placeholder="Select warehouse…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
          />
        </Field>
        <Field label="Date" required>
          <input type="date" style={inputStyle} defaultValue="2025-03-08" />
        </Field>
        <Field label="Reference No." hint="Optional">
          <input placeholder="e.g. BK-2025-001" style={inputStyle} />
        </Field>
      </div>

      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '8px 0 22px' }} />
      <SectionLabel label="ITEMS TO ALLOCATE TO UNIT" color={C.amberLight} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <LineItemRow
            key={i}
            item={it}
            index={i}
            onUpdate={upd}
            onRemove={rem}
            sourceWarehouse={srcWarehouse}
          />
        ))}
      </div>
      <AddItemBtn
        onAdd={() => setItems((p) => [...p, { productId: '', quantity: '' }])}
        accent={C.unBtn}
      />

      <Field label="Notes" style={{ marginTop: 16 }}>
        <textarea
          rows={2}
          placeholder="Additional remarks for this unit allocation…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STOCK OUT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface StockOutModalProps {
  mode: 'warehouse' | 'unit';
  onClose: () => void;
}

export default function StockOutModal({ mode, onClose }: StockOutModalProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Trap scroll
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

  const handleSubmit = () => {
    console.log('Stock Out logged!');
    // TODO: Backend integration
    alert('Stock Out logged successfully!');
    handleClose();
  };

  const isWH = mode === 'warehouse';

  // Palette tokens for each mode
  const grad = isWH
    ? `linear-gradient(135deg, ${C.whGrad1}, ${C.whGrad2})`
    : `linear-gradient(135deg, ${C.unGrad1}, ${C.unGrad2})`;
  const btnBg = isWH ? C.whBtn : C.unBtn;
  const btnSh = isWH ? 'rgba(11,88,88,0.35)' : 'rgba(15,118,110,0.35)';
  const tagText = isWH ? 'WAREHOUSE' : 'UNIT / ROOM';
  const title = isWH ? 'Warehouse Stock Out' : 'Unit Stock Out';
  const subtitle = isWH
    ? 'Deduct items from warehouse inventory'
    : 'Allocate items to a room or unit';

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(11,88,88,0.38)',
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
        {/* ── Gradient header ── */}
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
              STOCK OUT · {tagText}
            </div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 22, marginBottom: 3, fontFamily: 'Poppins' }}>
              {title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, fontFamily: 'Poppins' }}>
              {subtitle}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 8,
                padding: '7px 13px',
                color: C.white,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Poppins',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isWH ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21h18M3 7l9-4 9 4M5 21V10M19 21V10M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  WAREHOUSE
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  UNIT / ROOM
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
        </div>

        {/* ── Scrollable form body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
          {isWH ? <WarehouseForm /> : <UnitForm />}
        </div>

        {/* ── Sticky footer ── */}
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
              onClick={handleSubmit}
              style={{
                background: btnBg,
                border: 'none',
                borderRadius: 10,
                padding: '10px 26px',
                cursor: 'pointer',
                color: C.white,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'Poppins',
                boxShadow: `0 4px 16px ${btnSh}`,
                transition: 'filter 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
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
