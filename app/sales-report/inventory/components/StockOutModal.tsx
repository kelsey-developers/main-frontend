'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { ReplenishmentItem } from '../types';
import InventoryDropdown from './InventoryDropdown';
import SingleDatePicker from '@/components/SingleDatePicker';
import { useToast } from '../hooks/useToast';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { processStockOut } from '../lib/inventoryLedger';
import { 
  loadInventoryDataset,
  inventoryItems, 
  inventoryWarehouseDirectory,
  inventoryUnits,
  isWarehouseActive,
} from '../lib/inventoryDataStore';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';
import { listDamageIncidents, createDamageIncident } from '@/lib/api/damageIncidents';

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

// ─── Static form options ─────────────────────────────────────────
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
const CREATE_DAMAGE_INCIDENT_OPTION = '__create__';

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
  const low = reorder > 0 && available < reorder;
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
  const product = inventoryItems.find((p) => p.id === item.productId);
  const wh = sourceWarehouse
    ? inventoryWarehouseDirectory.find((w) => w.id === sourceWarehouse)
    : undefined;
  const balances = wh?.inventoryBalances ?? [];
  const whBalance = balances.find((b) => b.productId === item.productId);
  // Use warehouse-specific balance when available; avoid product.currentStock when no warehouse balance exists (it may be from another warehouse)
  const avail = sourceWarehouse
    ? (whBalance?.quantity ?? (product?.warehouseId === sourceWarehouse ? (product?.currentStock ?? 0) : 0))
    : (product?.currentStock ?? 0);
  const over = !!(item.quantity && parseInt(item.quantity) > avail);

  // Warehouse stock-out: only show items that have stock in the selected warehouse
  const itemOptions = (() => {
    if (!sourceWarehouse) {
      return []; // Must select warehouse first
    }
    if (!wh) {
      return []; // Warehouse not found in directory
    }
    const fromBalances = (balances as Array<{ productId: string; productName: string; quantity: number }>)
      .filter((b) => b.quantity > 0)
      .map((b) => {
        const p = inventoryItems.find((i) => i.id === b.productId);
        return { value: b.productId, label: `${p?.sku ?? b.productId} — ${b.productName}` };
      });
    if (fromBalances.length > 0) return fromBalances;
    // Fallback: replenishment items whose default warehouse matches and have stock
    return inventoryItems
      .filter((p) => p.warehouseId === sourceWarehouse && (p.currentStock ?? 0) > 0)
      .map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }));
  })();

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
        <InventoryDropdown
          value={item.productId || ''}
          onChange={(value) => onUpdate(index, 'productId', value)}
          options={[
            {
              value: '',
              label: !sourceWarehouse
                ? 'Select warehouse first'
                : itemOptions.length === 0
                  ? 'No items in this warehouse'
                  : 'Select item…',
            },
            ...itemOptions,
          ]}
          placeholder="Select item…"
          placeholderWhen=""
          hideIcon={true}
          fullWidth={true}
          minWidthClass="min-w-0"
          align="left"
          backdropZIndexClass="z-[10005]"
          menuZIndexClass="z-[10010]"
          useFixedPosition={true}
        />
        {item.productId && itemOptions.some((opt) => opt.value === item.productId) && (
          <StockPill
            available={avail}
            reorder={sourceWarehouse ? 1 : (product?.minStock ?? 0)}
            unit={product?.unit ?? 'pcs'}
          />
        )}
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
interface WarehouseFormProps {
  prefill?: { warehouseId: string };
  onDraftChange: (draft: WarehouseDraft) => void;
  /** When set, reason is fixed to damage write-off; reference on submit is damage receipt id only */
  lockedReason?: 'Damaged / Write-off';
}

interface WarehouseDraft {
  confirmedBy: string;
  idNumber: string;
  warehouse: string;
  reason: string;
  toWarehouse: string;
  date: string;
  reference: string;
  damageIncidentId: string;
  notes: string;
  items: LineItem[];
}

const DAMAGE_WRITE_OFF = 'Damaged / Write-off';

function WarehouseForm({ prefill, onDraftChange, lockedReason }: WarehouseFormProps) {
  const authState = useMockAuth();
  const isDamageOnly = lockedReason === DAMAGE_WRITE_OFF;
  const [confirmedBy, setConfirmedBy] = useState(authState.userProfile?.fullname || '');
  const [idNumber, setIdNumber] = useState(authState.user?.id || '');
  const [warehouse, setWarehouse] = useState(prefill?.warehouseId || '');
  const [reason, setReason] = useState(isDamageOnly ? DAMAGE_WRITE_OFF : '');
  const [toWarehouse, setToWarehouse] = useState('');
  const [date, setDate] = useState(getTodayInPhilippineTime());
  const [reference, setReference] = useState('');
  const [damageIncidentId, setDamageIncidentId] = useState('');
  const [notes, setNotes] = useState('');
  const [isDamage, setIsDamage] = useState(isDamageOnly);
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '' }]);
  const [damageIncidents, setDamageIncidents] = useState<Array<{ id: string; description?: string; reportDate?: string; warehouseId?: string }>>([]);

  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));

  useEffect(() => {
    if (prefill?.warehouseId && !warehouse) {
      setWarehouse(prefill.warehouseId);
    }
  }, [prefill?.warehouseId, warehouse]);

  useEffect(() => {
    void listDamageIncidents().then((list) => {
      setDamageIncidents(
        list.map((d) => ({
          id: d.id,
          description: d.description,
          reportDate: d.reportDate ?? d.dateReported ?? d.createdAt,
          warehouseId: d.warehouseId,
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (!isDamageOnly) setDamageIncidentId('');
  }, [reason, isDamageOnly]);

  const warehouseDamageIncidents = warehouse
    ? damageIncidents.filter((d) => d.warehouseId === warehouse)
    : [];
  const warehouseIncidentOptions = warehouseDamageIncidents.length > 0 ? warehouseDamageIncidents : damageIncidents;

  useEffect(() => {
    onDraftChange({
      confirmedBy,
      idNumber,
      warehouse,
      reason,
      toWarehouse,
      date,
      reference,
      damageIncidentId,
      notes,
      items,
    });
  }, [confirmedBy, idNumber, warehouse, reason, toWarehouse, date, reference, damageIncidentId, notes, items, onDraftChange]);

  const warehouses = inventoryWarehouseDirectory.filter((wh) => isWarehouseActive(wh));
  const isTransfer = !isDamageOnly && reason === 'Inter-warehouse Transfer';

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
            readOnly
            placeholder="e.g. Juan Dela Cruz"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </Field>
        <Field label="ID Number" required hint="Employee/Staff ID">
          <input
            type="text"
            value={idNumber}
            readOnly
            placeholder="e.g. EMP-2025-001"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </Field>
      </div>
      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '14px 0 22px' }} />
      <SectionLabel label={isDamageOnly ? 'SOURCE & DAMAGE RECEIPT' : 'SOURCE & REASON'} />
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
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        {!isDamageOnly && (
        <Field label="Reason" required>
          <InventoryDropdown
            value={reason}
            onChange={(value) => {
              setReason(value);
              setIsDamage(value === DAMAGE_WRITE_OFF);
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
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        )}
        {isDamageOnly && (
        <Field label="Reason" required hint="Fixed">
          <input
            readOnly
            value={DAMAGE_WRITE_OFF}
            style={{ ...inputStyle, backgroundColor: '#fff5f7', borderColor: 'rgba(241,14,59,0.25)', cursor: 'default' }}
          />
        </Field>
        )}
        <Field label="Date" required>
          <SingleDatePicker
            value={date}
            onChange={setDate}
            placeholder="Select date"
            calendarZIndex={10020}
          />
        </Field>
        <Field label="Reference No." hint="Optional">
          <input 
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. EVENT-001" 
            style={inputStyle} 
          />
        </Field>
      </div>

      {isTransfer && (
        <div style={{ marginBottom: 14 }}>
          <Field label="Destination Warehouse" required>
            <InventoryDropdown
              value={toWarehouse}
              onChange={(value) => setToWarehouse(value)}
              options={[
                { value: '', label: 'Select destination warehouse…' },
                ...warehouses.filter(w => w.id !== warehouse).map((w) => ({ value: w.id, label: w.name })),
              ]}
              placeholder="Select destination warehouse…"
              placeholderWhen=""
              hideIcon={true}
              fullWidth={true}
              minWidthClass="min-w-0"
              align="left"
              backdropZIndexClass="z-[10005]"
              menuZIndexClass="z-[10010]"
              useFixedPosition={true}
            />
          </Field>
        </div>
      )}

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
          <Field label="Damage receipt ID" required hint="Stock reference = this ID">
            <InventoryDropdown
              value={damageIncidentId}
              onChange={setDamageIncidentId}
              options={[
                { value: '', label: damageIncidents.length === 0 ? 'Loading…' : 'Select or create…' },
                { value: CREATE_DAMAGE_INCIDENT_OPTION, label: '+ Create new warehouse damage incident' },
                ...warehouseIncidentOptions.map((d) => {
                  const desc = d.description ? ` · ${d.description.slice(0, 40)}${d.description.length > 40 ? '…' : ''}` : '';
                  const datePart = d.reportDate ? ` · ${String(d.reportDate).split('T')[0]}` : '';
                  return { value: d.id, label: `${d.id}${desc}${datePart}` };
                }),
              ]}
              placeholder="Select incident…"
              placeholderWhen=""
              hideIcon={true}
              fullWidth={true}
              minWidthClass="min-w-0"
              align="left"
              backdropZIndexClass="z-[10005]"
              menuZIndexClass="z-[10010]"
              useFixedPosition={true}
            />
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
interface UnitFormProps {
  prefill?: {
    unitId: string;
    confirmedBy: string;
    idNumber: string;
    itemId: string;
  };
  onDraftChange: (draft: UnitDraft) => void;
}

interface UnitDraft {
  confirmedBy: string;
  idNumber: string;
  unit: string;
  booking: string;
  reason: string;
  srcWarehouse: string;
  date: string;
  reference: string;
  damageIncidentId: string;
  notes: string;
  items: LineItem[];
}

function UnitForm({ prefill, onDraftChange }: UnitFormProps) {
  const authState = useMockAuth();
  const itemFromPrefill = prefill?.itemId
    ? inventoryItems.find((i) => i.id === prefill.itemId)
    : undefined;
  const [confirmedBy, setConfirmedBy] = useState(prefill?.confirmedBy || authState.userProfile?.fullname || '');
  const [idNumber, setIdNumber] = useState(prefill?.idNumber || authState.user?.id || '');
  const [unit, setUnit] = useState(prefill?.unitId || '');
  const [booking, setBooking] = useState('');
  const [reason, setReason] = useState('');
  const [srcWarehouse, setSrcWarehouse] = useState(itemFromPrefill?.warehouseId || '');
  const [date, setDate] = useState(getTodayInPhilippineTime());
  const [reference, setReference] = useState('');
  const [damageIncidentId, setDamageIncidentId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>(
    prefill?.itemId ? [{ productId: prefill.itemId, quantity: '1' }] : [{ productId: '', quantity: '' }]
  );
  const [damageIncidents, setDamageIncidents] = useState<Array<{ id: string; description?: string; reportDate?: string; unitId?: string }>>([]);

  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));
  const bk = BOOKINGS.find((b) => b.id === booking);

  // Auto-fill warehouse from item when prefill.itemId is set and data loads
  useEffect(() => {
    if (prefill?.itemId) {
      const item = inventoryItems.find((i) => i.id === prefill.itemId);
      if (item?.warehouseId) {
        setSrcWarehouse((prev) => (prev ? prev : item.warehouseId));
      }
    }
  }, [prefill?.itemId, inventoryItems]);

  useEffect(() => {
    setDamageIncidentId('');
  }, [reason]);

  useEffect(() => {
    void listDamageIncidents().then((list) => {
      setDamageIncidents(
        list.map((d) => ({
          id: d.id,
          description: d.description,
          reportDate: d.reportDate ?? d.dateReported ?? d.createdAt,
          unitId: d.unitId,
        }))
      );
    });
  }, []);

  useEffect(() => {
    onDraftChange({
      confirmedBy,
      idNumber,
      unit,
      booking,
      reason,
      srcWarehouse,
      date,
      reference,
      damageIncidentId,
      notes,
      items,
    });
  }, [confirmedBy, idNumber, unit, booking, reason, srcWarehouse, date, reference, damageIncidentId, notes, items, onDraftChange]);

  const isDamageReplacement = reason === 'Damage Replacement';
  const unitDamageIncidents = unit
    ? damageIncidents.filter((d) => d.unitId === unit)
    : [];
  const damageIncidentOptions = unitDamageIncidents.length > 0 ? unitDamageIncidents : damageIncidents;

  const warehouses = inventoryWarehouseDirectory.filter((wh) => isWarehouseActive(wh));

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
            readOnly
            placeholder="e.g. Maria Santos"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </Field>
        <Field label="ID Number" required hint="Employee/Staff ID">
          <input
            type="text"
            value={idNumber}
            readOnly
            placeholder="e.g. EMP-2025-002"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
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
              ...inventoryUnits.map((u) => ({ value: u.id, label: u.name })),
            ]}
            placeholder="Select unit…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
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
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
      </div>

      {isDamageReplacement && (
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
            Damage Replacement
          </div>
          <Field label="Unit Damage Incident" required hint="Select the incident this replacement links to">
            <InventoryDropdown
              value={damageIncidentId}
              onChange={setDamageIncidentId}
              options={[
                { value: '', label: !unit ? 'Select unit first' : damageIncidentOptions.length === 0 ? 'No incidents found' : 'Select damage incident…' },
                ...damageIncidentOptions.map((d) => {
                  const desc = d.description ? ` · ${d.description.slice(0, 40)}${d.description.length > 40 ? '…' : ''}` : '';
                  const datePart = d.reportDate ? ` · ${String(d.reportDate).split('T')[0]}` : '';
                  return { value: d.id, label: `${d.id}${desc}${datePart}` };
                }),
              ]}
              placeholder="Select incident…"
              placeholderWhen=""
              hideIcon={true}
              fullWidth={true}
              minWidthClass="min-w-0"
              align="left"
              backdropZIndexClass="z-[10005]"
              menuZIndexClass="z-[10010]"
              useFixedPosition={true}
            />
          </Field>
        </div>
      )}

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
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
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
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        <Field label="Date" required>
          <SingleDatePicker
            value={date}
            onChange={setDate}
            placeholder="Select date"
            calendarZIndex={10020}
          />
        </Field>
        <Field label="Reference No." hint="Optional">
          <input 
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. BK-2025-001" 
            style={inputStyle} 
          />
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
  /** 'damage' = warehouse flow locked to damage write-off; stock reference = damage receipt id only */
  mode: 'warehouse' | 'unit' | 'damage';
  onClose: () => void;
  returnTo?: string;
  unitPrefill?: {
    unitId: string;
    confirmedBy: string;
    idNumber: string;
    itemId: string;
  };
  warehousePrefill?: {
    warehouseId: string;
  };
}

export default function StockOutModal({ mode, onClose, returnTo, unitPrefill, warehousePrefill }: StockOutModalProps) {
  const router = useRouter();
  const authState = useMockAuth();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, setRefreshTick] = useState(0);
  const { error } = useToast();
  const [warehouseDraft, setWarehouseDraft] = useState<WarehouseDraft | null>(null);
  const [unitDraft, setUnitDraft] = useState<UnitDraft | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recordedItemsCount, setRecordedItemsCount] = useState(0);
  const [wasAdjustment, setWasAdjustment] = useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        setRefreshTick((tick) => tick + 1);
      });

    const refresh = () => {
      void loadInventoryDataset(true).finally(() => {
        setRefreshTick((tick) => tick + 1);
      });
    };

    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('inventory:dataset-updated', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('inventory:dataset-updated', refresh);
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

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 230);
  };

  const handleSubmit = async () => {
    try {
      const isWH = mode === 'warehouse' || mode === 'damage';
      
      if (isWH) {
        if (!warehouseDraft) {
          error('Form is still loading. Please try again.');
          return;
        }
        if (!warehouseDraft.warehouse || !warehouseDraft.reason || !warehouseDraft.date) {
          error('Please fill warehouse, reason, and date.');
          return;
        }
        if (warehouseDraft.reason === 'Inter-warehouse Transfer' && !warehouseDraft.toWarehouse) {
          error('Please select destination warehouse for transfer.');
          return;
        }
        if (warehouseDraft.reason === 'Damaged / Write-off' && !warehouseDraft.damageIncidentId) {
          error('Please select or create a damage incident for damage write-off.');
          return;
        }
        const validItems = warehouseDraft.items.filter(
          (entry) => entry.productId && Number(entry.quantity) > 0
        );
        if (!validItems.length) {
          error('Add at least one item with quantity.');
          return;
        }

        // Validate quantities do not exceed warehouse stock
        {
          const wh = inventoryWarehouseDirectory.find((w) => w.id === warehouseDraft.warehouse);
          const balances = wh?.inventoryBalances ?? [];
          for (const entry of validItems) {
            const bal = balances.find((b) => b.productId === entry.productId);
            const avail = bal?.quantity ?? inventoryItems.find((p) => p.id === entry.productId)?.currentStock ?? 0;
            if (avail < Number(entry.quantity)) {
              const name = inventoryItems.find((p) => p.id === entry.productId)?.name ?? entry.productId;
              error(`Quantity for ${name} exceeds available stock (${avail}) in this warehouse.`);
              return;
            }
          }
        }
        let effectiveDamageIncidentId = warehouseDraft.damageIncidentId;
        if (warehouseDraft.reason === 'Damaged / Write-off' && warehouseDraft.damageIncidentId === CREATE_DAMAGE_INCIDENT_OPTION) {
          // No reportedByUserId in body — dropped in createDamageIncident; reporter via X-Reporter-User-Id when set
          const created = await createDamageIncident(
            {
              warehouseId: warehouseDraft.warehouse,
              description: `Warehouse write-off - Stock Out ${warehouseDraft.date}`,
              reportedAt: new Date(`${warehouseDraft.date}T12:00:00.000Z`).toISOString(),
              status: 'open',
              cost: 0,
              chargedToGuest: 0,
              absorbedAmount: 0,
            },
            authState.user?.id != null
              ? { reporterUserId: String(authState.user.id) }
              : undefined
          );
          effectiveDamageIncidentId = created.id;
        }

        for (const entry of validItems) {
          const qty = Number(entry.quantity);
          const isDamageWriteOff = warehouseDraft.reason === 'Damaged / Write-off';
          await processStockOut({
              productId: entry.productId,
              warehouseId: warehouseDraft.warehouse,
              quantity: qty,
              reason: warehouseDraft.reason,
              date: warehouseDraft.date,
              reference: isDamageWriteOff ? effectiveDamageIncidentId : (warehouseDraft.reference || undefined),
              referenceType: isDamageWriteOff ? 'DAMAGE' : undefined,
              notes: warehouseDraft.notes || undefined,
              createdBy: warehouseDraft.confirmedBy || undefined,
              transferToWarehouseId:
                warehouseDraft.reason === 'Inter-warehouse Transfer'
                  ? warehouseDraft.toWarehouse
                  : undefined,
            });
        }
      } else {
        if (!unitDraft) {
          error('Form is still loading. Please try again.');
          return;
        }
        if (!unitDraft.unit || !unitDraft.srcWarehouse || !unitDraft.reason || !unitDraft.date) {
          error('Please fill unit, source warehouse, reason, and date.');
          return;
        }
        if (unitDraft.reason === 'Damage Replacement' && !unitDraft.damageIncidentId) {
          error('Please select a unit damage incident for damage replacement.');
          return;
        }

        const validItems = unitDraft.items.filter(
          (entry) => entry.productId && Number(entry.quantity) > 0
        );
        if (!validItems.length) {
          error('Add at least one item with quantity.');
          return;
        }

        // Validate quantities do not exceed warehouse stock (prevent negative stock)
        const wh = inventoryWarehouseDirectory.find((w) => w.id === unitDraft.srcWarehouse);
        const balances = wh?.inventoryBalances ?? [];
        for (const entry of validItems) {
          const bal = balances.find((b) => b.productId === entry.productId);
          const avail = bal?.quantity ?? inventoryItems.find((p) => p.id === entry.productId)?.currentStock ?? 0;
          if (avail < Number(entry.quantity)) {
            const name = inventoryItems.find((p) => p.id === entry.productId)?.name ?? entry.productId;
            error(`Quantity for ${name} exceeds available stock (${avail}) in this warehouse.`);
            return;
          }
        }

        const isDamageReplacement = unitDraft.reason === 'Damage Replacement';
        for (const entry of validItems) {
          await processStockOut({
            productId: entry.productId,
            warehouseId: unitDraft.srcWarehouse,
            quantity: Number(entry.quantity),
            reason: unitDraft.reason,
            date: unitDraft.date,
            reference: isDamageReplacement ? unitDraft.damageIncidentId : (unitDraft.reference || unitDraft.booking || undefined),
            referenceType: isDamageReplacement ? 'DAMAGE' : undefined,
            notes: unitDraft.notes || undefined,
            createdBy: unitDraft.confirmedBy || undefined,
            unitId: unitDraft.unit,
          });
        }
      }

      setRecordedItemsCount(
        isWH ? warehouseDraft!.items.filter((e) => e.productId && Number(e.quantity) > 0).length : unitDraft!.items.filter((e) => e.productId && Number(e.quantity) > 0).length
      );
      setWasAdjustment(false);
      setShowSuccessModal(true);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Stock-out error:', err);
      }
      error('We couldn’t complete the stock-out. Please try again.');
      handleClose();
    }
  };

  const isDamageMode = mode === 'damage';
  const isWH = mode === 'warehouse' || isDamageMode;

  // Palette tokens for each mode
  const grad = isDamageMode
    ? `linear-gradient(135deg, #7f1d1d, #b91c1c)`
    : isWH
      ? `linear-gradient(135deg, ${C.whGrad1}, ${C.whGrad2})`
      : `linear-gradient(135deg, ${C.unGrad1}, ${C.unGrad2})`;
  const btnBg = isDamageMode ? '#b91c1c' : isWH ? C.whBtn : C.unBtn;
  const btnSh = isDamageMode
    ? 'rgba(185,28,28,0.35)'
    : isWH
      ? 'rgba(11,88,88,0.35)'
      : 'rgba(15,118,110,0.35)';
  const tagText = isDamageMode ? 'DAMAGE / WRITE-OFF' : isWH ? 'WAREHOUSE' : 'UNIT / ROOM';
  const title = isDamageMode
    ? 'Damage / Write-off'
    : isWH
      ? 'Warehouse Stock Out'
      : 'Unit Stock Out';
  const subtitle = isDamageMode
    ? 'Deduct stock against a damage receipt — reference is the damage incident ID'
    : isWH
      ? 'Deduct items from warehouse inventory'
      : 'Allocate items to a room or unit';

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
          maxWidth: showSuccessModal ? 448 : 720,
          maxHeight: showSuccessModal ? 'auto' : '92vh',
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
        {!showSuccessModal && (
        /* ── Gradient header ── */
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
              {isDamageMode ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  DAMAGE
                </>
              ) : isWH ? (
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
        )}

        {showSuccessModal ? (
          /* Success modal (same style as Purchase Order success) */
          <div className="p-6" style={{ fontFamily: 'Poppins' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  {wasAdjustment ? 'Adjustment recorded successfully' : 'Stock out logged successfully'}
                </h2>
                <p className="text-[12px] text-gray-600 mt-0.5">
                  {recordedItemsCount} item{recordedItemsCount !== 1 ? 's' : ''}{' '}
                  {wasAdjustment ? 'adjusted (POSTed to backend)' : 'deducted from inventory'}
                </p>
              </div>
            </div>
            <p className="text-[13px] text-gray-700 mb-5">
              You can review movements in the Stock Movement History.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-[13px] rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowSuccessModal(false);
                  handleClose();
                }}
              >
                Stay here
              </button>
              <button
                type="button"
                className="px-4 py-2 text-[13px] rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white font-semibold hover:opacity-95"
                onClick={() => {
                  router.push(returnTo || '/sales-report/inventory/items');
                  handleClose();
                }}
              >
                Go to Inventory Items
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Scrollable form body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
              {isWH ? (
                <WarehouseForm
                  prefill={warehousePrefill}
                  onDraftChange={setWarehouseDraft}
                  lockedReason={isDamageMode ? DAMAGE_WRITE_OFF : undefined}
                />
              ) : (
                <UnitForm prefill={unitPrefill} onDraftChange={setUnitDraft} />
              )}
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
                <span style={{ color: C.red }}>*</span> Required · Logged as{' '}
                <strong>{warehouseDraft?.reason === 'Cycle Count / Manual Adjustment (corrections only)' ? 'Adjustment (POST)' : 'Stock Out'}</strong>
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
          </>
        )}
      </div>
    </div>
    </>,
    document.body
  );
}
