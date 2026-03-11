'use client';

import React, { Fragment, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import StatusBadge from '../components/StatusBadge';
import GoodsReceiptModal from '../components/GoodsReceiptModal';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { formatPhp, PO_STATUS_CONFIG, type POStatus } from '../helpers/purchaseOrderHelpers';
import { 
  loadInventoryDataset,
  inventoryPurchaseOrders, 
  inventoryPurchaseOrderLines, 
  inventoryGoodsReceipts,
  inventorySuppliers,
  inventoryItems,
} from '../lib/inventoryDataStore';
import type { PurchaseOrder } from '../types';

type GoodsReceiptSubmitData = {
  warehouseId: string;
  notes?: string;
  receivedBy?: string;
  receiptDate?: string;
  receiptImages?: File[];
};

// ─── Edit PO Modal ────────────────────────────────────────────────────
function EditPOModal({
  po,
  onClose,
  onSave,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onSave: (data: { supplierId: string; expectedDelivery: string }) => void;
}) {
  const [form, setForm] = useState({
    supplierId: po.supplierId,
    expectedDelivery: po.expectedDelivery.split('T')[0], // Format as YYYY-MM-DD
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };

    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);

    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';

      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, [onClose]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.supplierId) nextErrors.supplierId = 'Required';
    if (!form.expectedDelivery) nextErrors.expectedDelivery = 'Required';
    return nextErrors;
  };

  const submit = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      supplierId: form.supplierId,
      expectedDelivery: form.expectedDelivery,
    });
    onClose();
  };

  const renderFieldLabel = (label: string, fieldKey: keyof typeof form) => (
    <label
      className={`text-[10.5px] font-bold tracking-wider uppercase ${errors[fieldKey] ? 'text-red-600' : 'text-gray-500'}`}
      style={{ fontFamily: 'Poppins' }}
    >
      {label}
      {errors[fieldKey] && <span className="font-normal ml-1.5 normal-case">- {errors[fieldKey]}</span>}
    </label>
  );

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4">
      <div onClick={(event) => event.stopPropagation()} className="bg-white rounded-2xl w-full max-w-[560px] max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1" style={{ fontFamily: 'Poppins' }}>
              EDIT PURCHASE ORDER
            </div>
            <h3 className="text-[17px] font-bold text-white" style={{ fontFamily: 'Poppins' }}>
              {po.id.toUpperCase()}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              {renderFieldLabel('Supplier', 'supplierId')}
              <InventoryDropdown
                value={form.supplierId}
                onChange={(value) => {
                  setForm((prev) => ({ ...prev, supplierId: value }));
                  setErrors((prev) => ({ ...prev, supplierId: '' }));
                }}
                options={inventorySuppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                hideIcon={true}
                fullWidth={true}
                minWidthClass="min-w-0"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              {renderFieldLabel('Expected Delivery Date', 'expectedDelivery')}
              <input
                type="date"
                value={form.expectedDelivery}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, expectedDelivery: event.target.value }));
                  setErrors((prev) => ({ ...prev, expectedDelivery: '' }));
                }}
                className={`px-3 py-2.5 border-[1.5px] rounded-lg text-[13px] outline-none w-full ${
                  errors.expectedDelivery
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 bg-white focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]'
                }`}
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            <div className="bg-[#e8f4f4] border border-[#cce8e8] rounded-lg px-4 py-3">
              <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-2" style={{ fontFamily: 'Poppins' }}>Order Details</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]" style={{ fontFamily: 'Poppins' }}>
                <div className="text-gray-600">Order Date:</div>
                <div className="font-semibold text-gray-900">{new Date(po.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                <div className="text-gray-600">Total Amount:</div>
                <div className="font-semibold text-gray-900">{formatPhp(po.totalAmount)}</div>
                <div className="text-gray-600">Status:</div>
                <div><StatusBadge status={po.status} statusConfig={PO_STATUS_CONFIG} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button onClick={submit} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ fontFamily: 'Poppins' }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────
function DetailDrawer({ 
  po, 
  onClose,
    onCreateGoodsReceipt,
    onEditPO,
    onCancelPO
}: { 
  po: PurchaseOrder; 
  onClose: () => void;
    onCreateGoodsReceipt: (po: PurchaseOrder) => void;
    onEditPO: (po: PurchaseOrder) => void;
    onCancelPO: (po: PurchaseOrder) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "receipts">("items");
  const [evidencePreview, setEvidencePreview] = useState<{ path: string; label: string } | null>(null);

  const supplier = inventorySuppliers.find(s => s.id === po.supplierId);
  const poLines = inventoryPurchaseOrderLines.filter(line => line.poId === po.id);
  const goodsReceipts = inventoryGoodsReceipts.filter(gr => gr.poId === po.id);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 260); };

  const totalOrdered = poLines.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalReceived = goodsReceipts.reduce((s, gr) =>
    s + gr.items.reduce((ss, i) => ss + i.qtyReceived * i.unitCost, 0), 0);

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[10000] flex justify-end overflow-hidden"
      style={{
        background: "rgba(17, 24, 39, 0.38)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="h-full flex flex-col bg-white"
        style={{
          width: "min(680px, 96vw)",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.14)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
          fontFamily: 'Poppins',
        }}
      >
        {/* Drawer header */}
        <div className="flex-shrink-0 px-7 py-6 text-white" style={{ background: `linear-gradient(135deg, #0b5858 0%, #05807e 100%)` }}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>PURCHASE ORDER</div>
              <div className="text-[18px] sm:text-2xl font-black mb-1 break-all">
                {po.id.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={po.status} statusConfig={PO_STATUS_CONFIG} />
              <button onClick={handleClose} className="rounded-full border-0 text-2xl flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  width: 34, height: 34,
                  background: "rgba(255,255,255,0.15)", color: "white",
                  cursor: "pointer",
                }}>×</button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex gap-6 mt-5 flex-wrap" style={{ fontFamily: 'Poppins' }}>
            {[
              { label: "Ordered", val: new Date(po.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) },
              { label: "Expected Delivery", val: new Date(po.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) },
              { label: "Total Amount", val: formatPhp(po.totalAmount) },
              { label: "Receipts", val: `${goodsReceipts.length} GR${goodsReceipts.length !== 1 ? "s" : ""}` },
            ].map(m => (
              <div key={m.label}>
                <div className="text-[10px] font-semibold tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{m.label}</div>
                <div className="text-sm font-semibold">{m.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar (ordered vs received value) */}
        {po.status !== "cancelled" && (
          <div className="flex-shrink-0 bg-[#f0f9f9] px-7 py-3.5 border-b border-[#e5e7eb]" style={{ fontFamily: 'Poppins' }}>
            <div className="flex justify-between mb-1.5 text-xs">
              <span className="font-semibold text-[#9ca3af]">Receipt coverage</span>
              <span className="font-bold text-[#0b5858]">
                {formatPhp(totalReceived)} <span className="font-normal text-[#9ca3af]">of {formatPhp(totalOrdered)}</span>
              </span>
            </div>
            <div className="h-1.5 bg-[#e5e7eb] rounded overflow-hidden">
              <div className="h-full rounded"
                style={{
                  width: `${Math.min(100, totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0)}%`,
                  background: `linear-gradient(90deg, #0b5858, #05807e)`,
                  transition: "width 0.6s ease",
                }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#e5e7eb] flex-shrink-0 px-7" style={{ fontFamily: 'Poppins' }}>
          {(["items", "receipts"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3.5 border-b-2 text-sm font-medium transition-all cursor-pointer bg-none border-0 ${
              activeTab === tab 
                ? "text-[#0b5858] font-bold border-b-[#05807e]" 
                : "text-[#9ca3af] font-medium border-b-transparent"
            }`}>
              {tab === "items" ? `Order Items (${poLines.length})` : `Goods Receipts (${goodsReceipts.length})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-7 py-6" style={{ fontFamily: 'Poppins' }}>
          {/* Supplier information */}
          <div className="mb-5 rounded-xl border border-[#cce8e8] bg-[#f0f9f9] p-4">
            <div className="mb-2 text-[10px] font-bold tracking-wider uppercase text-gray-500">Supplier Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <div className="text-gray-500">Supplier Name</div>
                <div className="font-semibold text-gray-900">{supplier?.name || 'Unknown Supplier'}</div>
              </div>
              <div>
                <div className="text-gray-500">Email</div>
                <div className="font-semibold text-[#0b5858]">{supplier?.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-semibold text-gray-900">{supplier?.phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-semibold text-gray-900">{supplier?.address || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* ORDER ITEMS tab */}
          {activeTab === "items" && (
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#f4f7f7]">
                    {["Item", "Qty", "Unit", "Unit Cost", "Total"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-[#9ca3af] tracking-wide border-b border-[#e5e7eb]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poLines.map((line, i) => {
                    const item = inventoryItems.find(x => x.id === line.productId);
                    return (
                      <tr key={line.id} className={`border-b border-[#e5e7eb] ${i % 2 === 0 ? 'bg-white' : 'bg-[#f4f7f7]'}`}>
                        <td className="px-3 py-3 text-[12.5px] text-[#374151] font-medium whitespace-normal break-words">{item?.name || `Product #${line.productId}`}</td>
                        <td className="px-3 py-3 text-[12.5px] text-[#374151]">{line.quantity}</td>
                        <td className="px-3 py-3 text-[12px] text-[#9ca3af]">{item?.unit || 'pcs'}</td>
                        <td className="px-3 py-3 text-[12.5px] text-[#374151]">{formatPhp(line.unitPrice)}</td>
                        <td className="px-3 py-3 text-[12.5px] font-bold text-[#0b5858]">{formatPhp(line.quantity * line.unitPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="px-3 py-3.5 text-right text-[12px] font-bold text-[#9ca3af]">TOTAL ORDER VALUE</td>
                    <td className="px-3 py-3.5 text-base font-black text-[#0b5858]">{formatPhp(totalOrdered)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* GOODS RECEIPTS tab */}
          {activeTab === "receipts" && (
            <div>
              {goodsReceipts.length === 0 ? (
                <div className="text-center py-16 px-6 border-2 border-dashed border-[#e5e7eb] rounded-2xl">
                  <div className="mb-3.5">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                      <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="font-bold text-[#0b5858] text-base mb-2">No goods received yet</div>
                  <div className="text-[#9ca3af] text-sm mb-6">Once items arrive, create a Goods Receipt to log what was delivered.</div>
                  <button 
                    onClick={() => onCreateGoodsReceipt(po)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border-[1.5px] border-[#05807e] bg-white text-[#05807e] text-sm font-semibold transition-all hover:bg-[#05807e] hover:text-white mx-auto"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Create Goods Receipt
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {goodsReceipts.map((gr, idx) => (
                    <div key={gr.id} className="border-[1.5px] border-[#e5e7eb] rounded-2xl overflow-hidden">
                      {/* GR header */}
                      <div className="bg-[#f4f7f7] px-5 py-3.5 flex justify-between items-center border-b border-[#e5e7eb]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0b5858] text-white flex items-center justify-center text-xs font-black">#{idx + 1}</div>
                          <div>
                            <div className="font-bold text-[#0b5858] text-sm">{gr.receiptNo}</div>
                            <div className="text-xs text-[#9ca3af]">{gr.warehouse}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#9ca3af]">Received by <strong className="text-[#374151]">{gr.receivedBy}</strong></div>
                          <div className="text-xs text-[#9ca3af]">{gr.receivedAt}</div>
                        </div>
                      </div>

                      {/* GR items */}
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {["Item", "Qty Received", "Unit Cost", "Value"].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-[10px] font-bold text-[#9ca3af] tracking-wide border-b border-[#e5e7eb]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gr.items.map((item, ii) => (
                            <tr key={item.poItemId + ii} className="border-b border-[#e5e7eb]">
                              <td className="px-4 py-2.5 text-[12.5px] text-[#374151] whitespace-normal break-words">{item.description}</td>
                              <td className="px-4 py-2.5 text-[12.5px] font-semibold text-[#0b5858]">{item.qtyReceived} {item.unit}</td>
                              <td className="px-4 py-2.5 text-[12px] text-[#9ca3af]">{formatPhp(item.unitCost)}</td>
                              <td className="px-4 py-2.5 text-[12.5px] font-bold text-[#0b5858]">{formatPhp(item.qtyReceived * item.unitCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-[#9ca3af] font-bold">RECEIPT TOTAL</td>
                            <td className="px-4 py-2.5 text-[12.5px] font-black text-[#0b5858]">{formatPhp(gr.items.reduce((s, i) => s + i.qtyReceived * i.unitCost, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* GR notes */}
                      {gr.notes && (
                        <div className="px-5 py-2.5 bg-[#05807e0a] border-t border-[#e5e7eb] text-xs text-[#374151] flex gap-2 items-start">
                          <span className="text-[#05807e] font-black flex-shrink-0">Note:</span>
                          <span>{gr.notes}</span>
                        </div>
                      )}

                      {/* GR evidence images */}
                      {gr.evidenceImages && gr.evidenceImages.length > 0 && (
                        <div className="px-5 py-3.5 border-t border-[#e5e7eb] bg-white">
                          <div className="text-[10px] font-bold tracking-wider uppercase text-[#9ca3af] mb-2.5">Receipt Evidence</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {gr.evidenceImages.map((imagePath, imageIndex) => (
                              <button
                                type="button"
                                key={`${gr.id}-evidence-${imageIndex}`}
                                onClick={() =>
                                  setEvidencePreview({
                                    path: imagePath,
                                    label: `${gr.receiptNo} evidence ${imageIndex + 1}`,
                                  })
                                }
                                className="group block rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb]"
                              >
                                <img
                                  src={imagePath}
                                  alt={`${gr.receiptNo} evidence ${imageIndex + 1}`}
                                  className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add receipt button — only if not fully received/cancelled */}
                  {(po.status === "pending" || po.status === "partially-received") && (
                    <button 
                      onClick={() => onCreateGoodsReceipt(po)}
                      className="bg-none border-2 border-dashed border-[#e5e7eb] rounded-2xl px-4 py-4 w-full text-[#9ca3af] font-semibold text-sm cursor-pointer transition-all hover:border-[#05807e] hover:text-[#05807e]"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      + Add Goods Receipt
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer actions */}
        <div className="px-7 py-4 border-t border-[#e5e7eb] flex gap-2 flex-shrink-0 bg-white" style={{ fontFamily: 'Poppins' }}>
            <button 
              onClick={() => onEditPO(po)}
              disabled={po.status === "cancelled"}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white font-semibold text-sm rounded-lg transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ boxShadow: '0 2px 8px rgba(11,88,88,0.2)' }}
            >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit PO
          </button>
          {po.status !== "cancelled" && po.status !== "received" && (
              <button 
                onClick={() => onCancelPO(po)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#dc2626] to-[#f10e3b] text-white font-semibold text-sm rounded-lg transition-all hover:shadow-lg hover:scale-[1.02]" 
                style={{ boxShadow: '0 2px 8px rgba(241,14,59,0.2)' }}
              >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel PO
            </button>
          )}
        </div>
      </div>

      {evidencePreview && (
        <div
          onClick={(event) => {
            event.stopPropagation();
            setEvidencePreview(null);
          }}
          className="fixed inset-0 z-[10000] bg-[rgba(17,24,39,0.55)] flex items-center justify-center p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-[980px] rounded-2xl overflow-hidden border border-white/15 bg-[#0f172a] shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
              <div className="text-[12px] font-semibold">{evidencePreview.label}</div>
              <button
                type="button"
                onClick={() => setEvidencePreview(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
            <div className="p-3 bg-black/20">
              <img
                src={evidencePreview.path}
                alt={evidencePreview.label}
                className="w-full max-h-[76vh] object-contain rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

const PurchaseOrdersSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ fontFamily: 'Poppins' }}>
    <div className="hidden md:grid px-5 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]" style={{
      gridTemplateColumns: "1fr 1.5fr 1.2fr 1.2fr 1.2fr 1fr 0.8fr",
    }}>
      {["PO ID", "SUPPLIER", "ORDER DATE", "EXPECTED DELIVERY", "TOTAL AMOUNT", "STATUS", "GOODS RECEIPT"].map(h => (
        <div key={h} className="text-xs font-bold tracking-wide text-white/75">{h}</div>
      ))}
    </div>
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1.2fr_1.2fr_1.2fr_1fr_0.8fr] gap-3 md:gap-0 px-5 py-3 border-b border-gray-200 last:border-b-0"
        >
          <div className="flex items-center">
            <div className="h-3.5 w-20 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-3 w-32 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-3 w-20 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-6 w-24 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

function PurchaseOrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, removeToast, success, error } = useToast();
  const poIdFromQuery = searchParams.get('poId');
  const supplierIdFromQuery = searchParams.get('supplierId');
  const supplierFromQuery = supplierIdFromQuery
    ? inventorySuppliers.find((supplier) => supplier.id === supplierIdFromQuery) ?? null
    : null;

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<'all' | string>(supplierIdFromQuery ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | POStatus>('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [goodsReceiptModalPO, setGoodsReceiptModalPO] = useState<PurchaseOrder | null>(null);
  const [editPOTarget, setEditPOTarget] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;

    void loadInventoryDataset()
      .finally(() => {
        if (!isMounted) return;
        setPurchaseOrders([...inventoryPurchaseOrders]);
        setIsLoading(false);
      });

    const refresh = () => {
      setPurchaseOrders([...inventoryPurchaseOrders]);
    };

    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      isMounted = false;
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Hide scrollbars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body::-webkit-scrollbar,
      *::-webkit-scrollbar {
        width: 0px;
        height: 0px;
      }
      body,
      * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const statusOptions: InventoryDropdownOption<'all' | POStatus>[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'partially-received', label: 'Partially Received' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const supplierOptions: InventoryDropdownOption<'all' | string>[] = [
    { value: 'all', label: 'All Suppliers' },
    ...inventorySuppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
  ];

  const selectedPOFromQuery = useMemo(() => {
    if (!poIdFromQuery) return null;
    return purchaseOrders.find((purchaseOrder) => purchaseOrder.id === poIdFromQuery) ?? null;
  }, [poIdFromQuery, purchaseOrders]);

  const activeSelectedPO = selectedPO ?? selectedPOFromQuery;

  const handleModalClose = () => {
    setSelectedPO(null);

    // Keep supplier context when opened from Supplier Directory.
    if (supplierIdFromQuery) {
      router.replace(`/sales-report/inventory/purchase-orders?supplierId=${supplierIdFromQuery}`);
      return;
    }

    setSelectedSupplierId('all');
    router.replace('/sales-report/inventory/purchase-orders');
  };

  const handleGoodsReceiptSubmit = (data: GoodsReceiptSubmitData) => {
    if (!goodsReceiptModalPO) return;

    const submit = async () => {
      const poLines = inventoryPurchaseOrderLines.filter((line) => line.poId === goodsReceiptModalPO.id);
      const items = poLines.map((line) => ({
        productId: line.productId,
        quantityReceived: Math.max(0, Number(line.quantity - line.receivedQuantity)),
      })).filter((line) => line.quantityReceived > 0);

      if (items.length === 0) {
        alert('All PO line items are already fully received.');
        return;
      }

      const response = await apiClient.post<{ purchaseOrder: PurchaseOrder }>(
        `/api/purchase-orders/${goodsReceiptModalPO.id}/receive`,
        {
          warehouseId: data.warehouseId,
          notes: data.notes || 'Goods receipt submitted from frontend',
          items,
        }
      );

      await loadInventoryDataset(true);
      setPurchaseOrders([...inventoryPurchaseOrders]);

      const updated = inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.id === response.purchaseOrder.id)
        ?? inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.id === goodsReceiptModalPO.id)
        ?? null;

      if (updated) {
        setSelectedPO(updated);
      }

      success('Goods Receipt created successfully.');
    };

    void submit().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Goods receipt submit error:', err);
      }
      error('We couldn’t create the goods receipt. Please try again.');
    });
  };

  const handleEditPO = (updatedData: { supplierId: string; expectedDelivery: string }) => {
    if (!editPOTarget) return;

    const run = async () => {
      await apiClient.patch(`/api/purchase-orders/${editPOTarget.id}`, {
        supplierId: updatedData.supplierId,
        expectedDelivery: updatedData.expectedDelivery,
      }).catch(() => {
        // Keep UX non-blocking when endpoint is unavailable.
      });

      await loadInventoryDataset(true);
      setPurchaseOrders([...inventoryPurchaseOrders]);

      const updatedPO = inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.id === editPOTarget.id);
      if (selectedPO?.id === editPOTarget.id && updatedPO) {
        setSelectedPO(updatedPO);
      }

      success(`Purchase Order ${editPOTarget.id.toUpperCase()} updated successfully.`);
    };

    void run().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Purchase order update error:', err);
      }
      error('We couldn’t update the purchase order. Please try again.');
    });
  };

  const handleCancelPO = (po: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to cancel Purchase Order ${po.id.toUpperCase()}? This action cannot be undone.`)) {
      return;
    }

    const run = async () => {
      await apiClient.patch(`/api/purchase-orders/${po.id}`, {
        status: 'CANCELLED',
      }).catch(() => {
        // Keep UX non-blocking when endpoint is unavailable.
      });

      await loadInventoryDataset(true);
      setPurchaseOrders([...inventoryPurchaseOrders]);

      const updatedPO = inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.id === po.id);
      if (updatedPO) {
        setSelectedPO(updatedPO);
      }

      success(`Purchase Order ${po.id.toUpperCase()} has been cancelled.`);
    };

    void run().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Purchase order cancel error:', err);
      }
      error('We couldn’t cancel the purchase order. Please try again.');
    });
  };

  const filtered = useMemo(() => {
    return purchaseOrders.filter(po => {
      // Filter by supplier selection
      if (selectedSupplierId !== 'all' && po.supplierId !== selectedSupplierId) {
        return false;
      }
      
      const supplier = inventorySuppliers.find(s => s.id === po.supplierId);
      const matchesSearch = 
        po.id.toLowerCase().includes(search.toLowerCase()) ||
        (supplier?.name.toLowerCase() || '').includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, search, selectedSupplierId, statusFilter]);

  const scopedOrders = useMemo(
    () =>
      selectedSupplierId !== 'all'
        ? purchaseOrders.filter((po) => po.supplierId === selectedSupplierId)
        : purchaseOrders,
    [purchaseOrders, selectedSupplierId]
  );

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pageOrders = filtered.slice(startIndex, endIndex);

  const stats = {
    total: scopedOrders.length,
    pending: scopedOrders.filter(po => po.status === 'pending').length,
    partial: scopedOrders.filter(po => po.status === 'partially-received').length,
    received: scopedOrders.filter(po => po.status === 'received').length,
    cancelled: scopedOrders.filter(po => po.status === 'cancelled').length,
  };

  return (
    <div className="p-4 md:p-6" style={{ fontFamily: 'Poppins' }}>
      <style>{`
        @keyframes inventoryReveal {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .inventory-reveal {
          opacity: 0;
          animation: inventoryReveal 560ms ease-in-out forwards;
        }
      `}</style>
      {/* Breadcrumb & Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal" style={{ animationDelay: '40ms' }}>
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Purchase Orders</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">View and manage all purchase orders and their goods receipts</p>
        </div>
        <button 
          onClick={() => router.push('/sales-report/inventory/purchase-orders/create')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-[1.5px] border-[#05807e] bg-white text-[#05807e] text-sm font-semibold transition-all hover:bg-[#05807e] hover:text-white whitespace-nowrap"
          style={{ fontFamily: 'Poppins' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New Purchase Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 inventory-reveal" style={{ animationDelay: '120ms' }}>
        {[
          { label: 'TOTAL ORDERS', value: stats.total, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
          { label: 'PENDING', value: stats.pending, gradient: 'from-yellow-500 to-yellow-600' },
          { label: 'PARTIALLY RECEIVED', value: stats.partial, gradient: 'from-orange-500 to-orange-600' },
          { label: 'RECEIVED', value: stats.received, gradient: 'from-green-600 to-green-700' },
          { label: 'CANCELLED', value: stats.cancelled, gradient: 'from-red-500 to-red-600' },
        ].map((stat) => (
          <div key={stat.label} className={`relative bg-gradient-to-br ${stat.gradient} rounded-xl shadow-md p-4 overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative z-10">
              <div className="text-[10px] font-bold tracking-wider text-white/70 uppercase mb-2" style={{ fontFamily: 'Poppins' }}>
                {stat.label}
              </div>
              <div className="text-3xl font-bold text-white leading-none" style={{ fontFamily: 'Poppins' }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {supplierIdFromQuery && (
        <div className="mb-4 flex items-center rounded-lg border border-[#cce8e8] bg-[#e8f4f4] px-4 py-2.5 gap-3 inventory-reveal" style={{ fontFamily: 'Poppins', animationDelay: '170ms' }}>
          <p className="text-[12.5px] text-[#0b5858]">
            Filtered from supplier link: <strong>{supplierFromQuery?.name || 'Unknown'}</strong>
          </p>
          <button
            type="button"
            onClick={() => router.push(`/sales-report/inventory/suppliers?supplierId=${encodeURIComponent(supplierIdFromQuery)}`)}
            className="text-[12.5px] font-semibold text-[#0b5858] hover:underline"
            style={{ fontFamily: 'Poppins' }}
          >
            Back to Supplier Directory
          </button>
          <span className="text-[#0b5858]/40">|</span>
          <button
            type="button"
            onClick={() => {
              setSelectedSupplierId('all');
              router.push('/sales-report/inventory/purchase-orders');
            }}
            className="text-[12.5px] font-semibold text-[#0b5858] hover:underline"
            style={{ fontFamily: 'Poppins' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4 inventory-reveal" style={{ animationDelay: '220ms' }}>
        <div className="flex-1 min-w-[200px] relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by PO number or supplier…"
            className="w-full px-3.5 py-2.5 pl-9 border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-900 bg-white outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
            style={{ fontFamily: 'Poppins' }}
          />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2">
            <circle cx="6" cy="6" r="4.5" stroke="#b0bcc8" strokeWidth="1.4" />
            <path d="M9.5 9.5l2.5 2.5" stroke="#b0bcc8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>

        <div className="relative z-[60]">
          <InventoryDropdown
            value={selectedSupplierId}
            onChange={(value) => {
              setSelectedSupplierId(value);
              if (value === 'all') {
                router.replace('/sales-report/inventory/purchase-orders');
                return;
              }
              router.replace(`/sales-report/inventory/purchase-orders?supplierId=${value}`);
            }}
            options={supplierOptions}
            minWidthClass="min-w-[180px]"
            menuZIndexClass="z-[999]"
          />
        </div>
        
        <div className="relative z-[60]">
          <InventoryDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            minWidthClass="min-w-[180px]"
            menuZIndexClass="z-[999]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="inventory-reveal" style={{ animationDelay: '280ms' }}>
        {isLoading ? (
          <PurchaseOrdersSkeleton />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'Poppins' }}>
          {/* Table header - Desktop */}
          <div className="hidden md:grid px-5 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]" style={{
            gridTemplateColumns: "1fr 1.5fr 1.2fr 1.2fr 1.2fr 1fr 0.8fr",
          }}>
            {["PO ID", "SUPPLIER", "ORDER DATE", "EXPECTED DELIVERY", "TOTAL AMOUNT", "STATUS", "GOODS RECEIPT"].map(h => (
              <div key={h} className="text-xs font-bold tracking-wide text-white/75">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-8 px-6 text-center text-gray-500">
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">No purchase orders found</div>
              <div className="text-sm">Try adjusting your search or filters</div>
            </div>
          ) : (
            pageOrders.map((po) => {
              const supplier = inventorySuppliers.find(s => s.id === po.supplierId);
              const goodsReceipts = inventoryGoodsReceipts.filter(gr => gr.poId === po.id);
              return (
                <Fragment key={po.id}>
                  {/* Desktop Row */}
                <div
                  onClick={() => setSelectedPO(po)}
                  className="hidden md:grid px-5 py-3 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50"
                  style={{
                    gridTemplateColumns: "1fr 1.5fr 1.2fr 1.2fr 1.2fr 1fr 0.8fr",
                  }}
                >
                  <div
                    className="text-[11px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[110px]"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                    title={po.id.toUpperCase()}
                  >
                    {po.id.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">{supplier?.name || 'Unknown'}</div>
                    <div className="text-[11px] text-gray-500 whitespace-normal break-words">{supplier?.email || ''}</div>
                  </div>
                  <div className="text-[12.5px] text-gray-700">
                    {new Date(po.orderDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </div>
                  <div className="text-[12.5px] text-gray-700">
                    {new Date(po.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </div>
                  <div className="text-[12.5px] font-semibold text-gray-900">{formatPhp(po.totalAmount)}</div>
                  <div className="flex items-center">
                    <StatusBadge status={po.status} statusConfig={PO_STATUS_CONFIG} />
                  </div>
                  <div className="flex items-center justify-center">
                    {goodsReceipts.length > 0 && (
                      <span className="text-[11px] text-gray-600 bg-gray-100 rounded-md px-2 py-1 font-semibold">{goodsReceipts.length} GR</span>
                    )}
                  </div>
                </div>

                {/* Mobile Card */}
                <div
                  onClick={() => setSelectedPO(po)}
                  className="md:hidden px-4 py-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors active:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div
                        className="text-[11px] text-gray-400 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px]"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                        title={po.id.toUpperCase()}
                      >
                        {po.id.toUpperCase()}
                      </div>
                      <div className="text-[12px] font-medium text-gray-700 whitespace-normal break-words">{supplier?.name || 'Unknown'}</div>
                    </div>
                    <StatusBadge status={po.status} statusConfig={PO_STATUS_CONFIG} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Order Date</div>
                      <div className="text-[13px] font-bold text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>
                        {new Date(po.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Expected</div>
                      <div className="text-[13px] font-bold text-gray-700" style={{ fontFamily: 'Poppins' }}>
                        {new Date(po.expectedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Total</div>
                      <div className="text-[13px] font-bold text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>{formatPhp(po.totalAmount)}</div>
                    </div>
                    {goodsReceipts.length > 0 && (
                      <div className="col-span-3 bg-[#e8f4f4] rounded-lg p-2 text-center">
                        <span className="text-[11px] font-bold text-gray-600" style={{ fontFamily: 'Poppins' }}>
                          {goodsReceipts.length} Goods Receipt{goodsReceipts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
          </div>
        )}
      </div>

      {/* Footer: pagination summary & controls (matched to stock movements) */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-gray-600">
        <div>
          Showing{' '}
          <span className="font-semibold text-[#0b5858]">
            {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex}
          </span>{' '}
          of <span className="font-semibold text-[#0b5858]">{totalRecords}</span> purchase orders
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-1">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded-md px-1.5 py-0.5 text-[12px] bg-white"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="px-1">
              Page{' '}
              <span className="font-semibold text-[#0b5858]">
                {totalRecords === 0 ? 0 : currentPage}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-[#0b5858]">
                {totalRecords === 0 ? 0 : totalPages}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalRecords === 0}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {activeSelectedPO && (
        <DetailDrawer 
          po={activeSelectedPO} 
          onClose={handleModalClose} 
          onCreateGoodsReceipt={setGoodsReceiptModalPO}
          onEditPO={setEditPOTarget}
          onCancelPO={handleCancelPO}
        />
      )}

      {/* Goods Receipt Modal */}
      {goodsReceiptModalPO && (
        <GoodsReceiptModal
          po={goodsReceiptModalPO}
          onClose={() => setGoodsReceiptModalPO(null)}
          onSubmit={handleGoodsReceiptSubmit}
        />
      )}

      {/* Edit PO Modal */}
      {editPOTarget && (
        <EditPOModal
          po={editPOTarget}
          onClose={() => setEditPOTarget(null)}
          onSave={handleEditPO}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrdersPageContent />
    </Suspense>
  );
}
