'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import InventoryDropdown from './InventoryDropdown';
import SingleDatePicker from '@/components/SingleDatePicker';
import { useToast } from '../hooks/useToast';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { processStockAdjustment, processUnitAllocationAdjustment } from '../lib/inventoryLedger';
import { inventoryItems, inventoryWarehouseDirectory, inventoryUnits, isWarehouseActive } from '../lib/inventoryDataStore';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';
import { fetchFinanceBookings } from '@/app/sales-report/finance/lib/financeDataService';

const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
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
};

function Field({ label, required, children, style }: { label: string; required?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
    </div>
  );
}

type InOut = 'in' | 'out';

interface LineItem {
  productId: string;
  quantity: string;
  direction: InOut;
}

type CycleCountMode = 'warehouse' | 'unit';

interface CycleCountModalProps {
  onClose: () => void;
  returnTo?: string;
  warehousePrefill?: string;
  /** When set, open in unit cycle count mode. */
  unitPrefill?: string;
  /** When true, only unit cycle count is shown (no warehouse mode / no mode toggle). Used for housekeeping. */
  unitOnly?: boolean;
}

export default function CycleCountModal({ onClose, returnTo = '/sales-report/inventory/items', warehousePrefill, unitPrefill, unitOnly = false }: CycleCountModalProps) {
  const router = useRouter();
  const { error } = useToast();
  const authState = useMockAuth();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [cycleCountMode, setCycleCountMode] = useState<CycleCountMode>(unitOnly || unitPrefill ? 'unit' : 'warehouse');
  const [confirmedBy, setConfirmedBy] = useState(authState.userProfile?.fullname || '');
  const [warehouse, setWarehouse] = useState(warehousePrefill || '');
  const [unitId, setUnitId] = useState(unitPrefill || '');
  const [bookingId, setBookingId] = useState('');
  const [date, setDate] = useState(getTodayInPhilippineTime());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '', direction: 'in' }]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookings, setBookings] = useState<{ bookingId: string; unit: string; checkIn: string; checkOut: string }[]>([]);

  useEffect(() => setMounted(true), []);
  useEffect(() => setVisible(true), []);
  useEffect(() => {
    if (warehousePrefill && !warehouse) setWarehouse(warehousePrefill);
  }, [warehousePrefill, warehouse]);
  useEffect(() => {
    if (unitPrefill && !unitId) setUnitId(unitPrefill);
    if (unitPrefill || unitOnly) setCycleCountMode('unit');
  }, [unitPrefill, unitOnly, unitId]);

  useEffect(() => {
    void fetchFinanceBookings().then((rows) => {
      setBookings(rows.map((r) => ({ bookingId: r.bookingId, unit: r.unit, checkIn: r.checkIn, checkOut: r.checkOut })));
    });
  }, []);

  const warehouses = inventoryWarehouseDirectory.filter((w) => isWarehouseActive(w));
  const unitOptions = inventoryUnits.map((u) => ({ value: u.id, label: u.name }));
  const bookingOptions = [
    { value: '', label: 'None — not from a booking' },
    ...bookings.map((b) => ({
      value: b.bookingId,
      label: `${b.bookingId} — ${b.unit} (${b.checkIn} to ${b.checkOut})`,
    })),
  ];
  const itemOptions = inventoryItems.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }));

  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose();
      if (returnTo) router.push(returnTo);
    }, 230);
  };

  const handleSubmit = async () => {
    if (!date) {
      error('Please select date.');
      return;
    }
    const validItems = items.filter((e) => e.productId && e.quantity !== '' && Number(e.quantity) > 0);
    if (!validItems.length) {
      error('Add at least one item with a quantity greater than 0.');
      return;
    }

    if (cycleCountMode === 'warehouse') {
      if (!warehouse) {
        error('Please select warehouse.');
        return;
      }
    } else {
      if (!unitId) {
        error('Please select unit.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const refId = bookingId || reference || undefined;
      const refType = bookingId ? ('BOOKING' as const) : undefined;
      if (cycleCountMode === 'unit') {
        for (const entry of validItems) {
          const qty = entry.direction === 'out' ? -Number(entry.quantity) : Number(entry.quantity);
          await processUnitAllocationAdjustment({
            productId: entry.productId,
            unitId,
            quantity: qty,
            reason: 'Unit Cycle Count / Manual Adjustment',
            date,
            reference: refId,
            referenceType: refType,
            notes: notes || undefined,
            createdBy: confirmedBy || undefined,
          });
        }
      } else {
        for (const entry of validItems) {
          const qty = entry.direction === 'out' ? -Number(entry.quantity) : Number(entry.quantity);
          await processStockAdjustment({
            productId: entry.productId,
            warehouseId: warehouse,
            quantity: qty,
            reason: 'Cycle Count / Manual Adjustment',
            date,
            reference: reference || undefined,
            notes: notes || undefined,
            createdBy: confirmedBy || undefined,
          });
        }
      }
      setShowSuccess(true);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(err);
      error(err instanceof Error ? err.message : 'Could not complete adjustment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  if (!mounted) return null;

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
            maxWidth: showSuccess ? 448 : 720,
            maxHeight: '92vh',
            background: C.white,
            borderRadius: 22,
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
            transition: 'transform 0.26s cubic-bezier(0.34,1.4,0.64,1)',
            opacity: visible ? 1 : 0,
          }}
        >
          {showSuccess ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f4f4', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.darkGray, marginBottom: 8, fontFamily: 'Poppins' }}>
                Adjustment recorded
              </h3>
              <p style={{ fontSize: 14, color: C.midGray, marginBottom: 24, fontFamily: 'Poppins' }}>
                Inventory has been updated.
              </p>
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: 'none',
                  background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
                  color: C.white,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: C.white, margin: 0, fontFamily: 'Poppins' }}>
                    Cycle Count / Inventory Adjustment
                  </h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontFamily: 'Poppins' }}>
                    {cycleCountMode === 'unit' ? 'Adjust stock in a unit (room). Choose IN (add) or OUT (remove), then enter quantity.' : 'Add or remove stock to match physical count. Choose IN or OUT per item, then enter quantity.'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 36, height: 36, color: C.white, cursor: 'pointer', fontSize: 20 }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                {/* Mode: Warehouse vs Unit (hidden when unitOnly, e.g. housekeeping) */}
                {!unitOnly && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins', display: 'block', marginBottom: 8 }}>Adjust</label>
                  <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
                    <button
                      type="button"
                      onClick={() => setCycleCountMode('warehouse')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Poppins',
                        background: cycleCountMode === 'warehouse' ? C.white : 'transparent',
                        color: cycleCountMode === 'warehouse' ? C.darkTeal : C.midGray,
                        boxShadow: cycleCountMode === 'warehouse' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      Warehouse stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycleCountMode('unit')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Poppins',
                        background: cycleCountMode === 'unit' ? C.white : 'transparent',
                        color: cycleCountMode === 'unit' ? C.darkTeal : C.midGray,
                        boxShadow: cycleCountMode === 'unit' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      Unit (room) stock
                    </button>
                  </div>
                </div>
                )}

                <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: 12, borderLeft: '3px solid #0369a1', marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: '#475569', margin: 0, fontFamily: 'Poppins', lineHeight: 1.45 }}>
                    {cycleCountMode === 'unit' ? (
                      <>Correct unit (room) inventory: choose <strong>IN</strong> (add) or <strong>OUT</strong> (remove) per item, then enter quantity. Changes are saved to allocations and stock movements. Do not use for receiving goods — use Goods Receipt from Purchase Order.</>
                    ) : (
                      <>Use for cycle count corrections: choose <strong>IN</strong> (add stock) or <strong>OUT</strong> (remove stock) per item, then enter quantity. Link to the booking if transferred from checkout. Do not use for receiving goods — create a Goods Receipt from the Purchase Order instead.</>
                    )}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <Field label="Confirmed By" required>
                    <input type="text" value={confirmedBy} readOnly style={{ ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed' }} />
                  </Field>
                  {cycleCountMode === 'unit' ? (
                    <>
                      <Field label="Unit" required>
                        <InventoryDropdown
                          value={unitId}
                          onChange={setUnitId}
                          options={[
                            { value: '', label: unitOptions.length === 0 ? 'No units' : 'Select unit…' },
                            ...unitOptions,
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
                      <Field label="Transferred from booking">
                        <InventoryDropdown
                          value={bookingId}
                          onChange={setBookingId}
                          options={bookingOptions}
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
                    </>
                  ) : (
                    <Field label="Warehouse" required>
                      <InventoryDropdown
                        value={warehouse}
                        onChange={setWarehouse}
                        options={[{ value: '', label: 'Select warehouse…' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
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
                  )}
                  <Field label="Date" required>
                    <SingleDatePicker value={date} onChange={setDate} placeholder="Select date" calendarZIndex={10020} />
                  </Field>
                  <Field label="Reference No.">
                    <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" style={inputStyle} />
                  </Field>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: C.midGray, letterSpacing: 1.8, marginBottom: 14, fontFamily: 'Poppins' }}>
                  ITEMS (ADD OR REMOVE)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 90px 90px 36px',
                        gap: 10,
                        alignItems: 'start',
                        padding: 14,
                        background: i % 2 === 0 ? '#f8f8f8' : C.white,
                        borderRadius: 12,
                        border: `1.5px solid ${C.lightGray}`,
                      }}
                    >
                      <div>
                        {i === 0 && <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>Item <span style={{ color: C.red }}>*</span></label>}
                        <InventoryDropdown
                          value={it.productId}
                          onChange={(v) => upd(i, 'productId', v)}
                          options={[
                            { value: '', label: !warehouse ? 'Select warehouse first' : itemOptions.length === 0 ? 'No items' : 'Select item…' },
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
                      </div>
                      <div>
                        {i === 0 && <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>Action</label>}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={it.direction === 'out'}
                          onClick={() => upd(i, 'direction', it.direction === 'in' ? 'out' : 'in')}
                          title={it.direction === 'in' ? 'Add stock (IN). Click to switch to OUT.' : 'Remove stock (OUT). Click to switch to IN.'}
                          style={{
                            marginTop: i === 0 ? 0 : 22,
                            width: '100%',
                            height: 34,
                            borderRadius: 17,
                            border: '1.5px solid #e2e8f0',
                            background: '#e2e8f0',
                            cursor: 'pointer',
                            padding: 3,
                            position: 'relative',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              left: it.direction === 'in' ? 2 : 'calc(50% + 1px)',
                              width: 'calc(50% - 4px)',
                              height: 26,
                              borderRadius: 13,
                              background: it.direction === 'in' ? `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})` : 'linear-gradient(135deg, #b91c1c, #dc2626)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                              transition: 'left 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: C.white,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: 'Poppins',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {it.direction === 'in' ? 'IN' : 'OUT'}
                          </span>
                        </button>
                      </div>
                      <div>
                        {i === 0 && <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>Qty <span style={{ color: C.red }}>*</span></label>}
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => upd(i, 'quantity', e.target.value)}
                          placeholder="0"
                          style={inputStyle}
                        />
                      </div>
                      <button
                        onClick={() => rem(i)}
                        style={{
                          width: 36,
                          height: 38,
                          borderRadius: 8,
                          border: `1.5px solid ${C.lightGray}`,
                          background: 'none',
                          color: C.midGray,
                          cursor: 'pointer',
                          fontSize: 18,
                          marginTop: i === 0 ? 22 : 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setItems((p) => [...p, { productId: '', quantity: '', direction: 'in' as InOut }])}
                  style={{
                    width: '100%',
                    padding: 11,
                    marginTop: 10,
                    border: `2px dashed ${C.lightGray}`,
                    borderRadius: 10,
                    background: 'none',
                    cursor: 'pointer',
                    color: C.midGray,
                    fontWeight: 600,
                    fontSize: 13,
                    fontFamily: 'Poppins',
                  }}
                >
                  + Add Another Item
                </button>

                <Field label="Notes" style={{ marginTop: 16 }}>
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional context…" />
                </Field>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                  <button type="button" onClick={handleClose} style={{ padding: '10px 24px', borderRadius: 10, border: `1.5px solid ${C.lightGray}`, background: C.white, color: C.darkGray, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins' }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      padding: '10px 28px',
                      borderRadius: 10,
                      border: 'none',
                      background: `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
                      color: C.white,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      fontFamily: 'Poppins',
                    }}
                  >
                    {isSubmitting ? 'Recording…' : 'Record Adjustment'}
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
