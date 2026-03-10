'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';
import { apiClient } from '@/lib/api/client';
import { type InventoryDropdownOption } from '../../components/InventoryDropdown';
import { loadInventoryDataset, mockSuppliers, mockReplenishmentItems } from '../../lib/mockData';

interface POLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

const getLineItemId = (productId: string) => `line-${productId}`;

function CreatePurchaseOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePopItemId = searchParams.get('itemId');
  const [, setRefreshTick] = useState(0);

  const [form, setForm] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
  });
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddItemDropdown, setShowAddItemDropdown] = useState(false);
  const addItemButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierButtonRef = useRef<HTMLButtonElement>(null);
  const [supplierDropdownPosition, setSupplierDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const hasPrepopulatedRef = useRef(false);
  const isClient = typeof window !== 'undefined';

  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        if (prePopItemId && !hasPrepopulatedRef.current) {
          const item = mockReplenishmentItems.find((candidate) => candidate.id === prePopItemId);
          if (item) {
            setForm((prev) => ({
              ...prev,
              supplierId: item.currentsupplierId || '',
            }));

            setLineItems([
              {
                id: getLineItemId(item.id),
                productId: item.id,
                productName: item.name,
                quantity: item.shortfall || item.minStock,
                unitPrice: item.unitCost,
                unit: item.unit,
              },
            ]);

            hasPrepopulatedRef.current = true;
          }
        }

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
  }, [prePopItemId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (showAddItemDropdown) {
      const handleClick = () => setShowAddItemDropdown(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showAddItemDropdown]);

  // Keep fixed dropdowns aligned with triggers on scroll/resize
  const updateDropdownPositions = () => {
    if (supplierButtonRef.current && showSupplierDropdown) {
      const rect = supplierButtonRef.current.getBoundingClientRect();
      setSupplierDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    }
    if (addItemButtonRef.current && showAddItemDropdown) {
      const rect = addItemButtonRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom, left: Math.max(8, rect.right - 320) });
    }
  };
  useEffect(() => {
    window.addEventListener('scroll', updateDropdownPositions, true);
    window.addEventListener('resize', updateDropdownPositions);
    return () => {
      window.removeEventListener('scroll', updateDropdownPositions, true);
      window.removeEventListener('resize', updateDropdownPositions);
    };
  }, [showSupplierDropdown, showAddItemDropdown]);

  const supplierOptions: InventoryDropdownOption<string>[] = [
    { value: '', label: 'Select supplier', disabled: true },
    ...mockSuppliers.map((s) => ({
      value: s.id,
      label: s.name,
    })),
  ];

  const availableProducts = mockReplenishmentItems.filter(
    (item) => !lineItems.some((line) => line.productId === item.id)
  );

  const handleAddLineItem = (productId: string) => {
    const product = mockReplenishmentItems.find((i) => i.id === productId);
    if (!product) return;

    const newLine: POLineItem = {
      id: getLineItemId(product.id),
      productId: product.id,
      productName: product.name,
      quantity: product.shortfall || 1,
      unitPrice: product.unitCost,
      unit: product.unit,
    };
    setLineItems([...lineItems, newLine]);
    setShowAddItemDropdown(false);
  };

  const handleRemoveLineItem = (lineId: string) => {
    setLineItems(lineItems.filter((line) => line.id !== lineId));
  };

  const handleUpdateLineItem = (lineId: string, field: 'quantity' | 'unitPrice', rawValue: number | string) => {
    const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    let clean = Number.isFinite(numeric) ? numeric : 0;

    if (field === 'quantity') {
      clean = Math.max(1, Math.floor(clean || 0)); // minimum 1, whole number
    } else {
      clean = Math.max(0, clean || 0); // unit price can't be negative
    }

    setLineItems((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, [field]: clean } : line
      )
    );
  };

  const totalAmount = lineItems.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.supplierId) nextErrors.supplierId = 'Supplier is required';
    if (!form.orderDate) nextErrors.orderDate = 'Order date is required';
    if (!form.expectedDelivery) nextErrors.expectedDelivery = 'Expected delivery is required';
    if (lineItems.length === 0) nextErrors.lineItems = 'At least one item is required';
    
    // Validate that expected delivery is after order date
    if (form.orderDate && form.expectedDelivery && form.expectedDelivery <= form.orderDate) {
      nextErrors.expectedDelivery = 'Expected delivery must be after order date';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await apiClient.post('/api/purchase-orders', {
      supplierId: form.supplierId,
      notes: `Ordered: ${form.orderDate} | Expected: ${form.expectedDelivery}`,
      items: lineItems.map((line) => ({
        productId: line.productId,
        quantityOrdered: line.quantity,
        unitCost: line.unitPrice,
      })),
    });

    await loadInventoryDataset(true);

    router.push('/sales-report/inventory/purchase-orders');
  };

  return (
    <>
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
        .remove-btn:hover {
          background: #fef2f2 !important;
          color: #f10e3b !important;
        }
      `}</style>

      <div className="mb-6 inventory-reveal" style={{ animationDelay: '40ms' }}>
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
          <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/sales-report/inventory/purchase-orders" className="text-[#0B5858] hover:underline">
            Purchase Orders
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Create New Order</span>
        </nav>
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          Create Purchase Order
        </h1>
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
          Fill in the details below to create a new purchase order
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 inventory-reveal" style={{ animationDelay: '120ms' }}>
        {/* Basic Information */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Poppins' }}>
          Order Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Supplier */}
          <div>
            <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2" style={{ fontFamily: 'Poppins' }}>
              Supplier {errors.supplierId && <span className="text-red-600">*</span>}
            </label>
            <button
              ref={supplierButtonRef}
              type="button"
              onClick={() => {
                if (!showSupplierDropdown && supplierButtonRef.current) {
                  const rect = supplierButtonRef.current.getBoundingClientRect();
                  setSupplierDropdownPosition({
                    top: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                  });
                }
                setShowSupplierDropdown(!showSupplierDropdown);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white text-[13px] outline-none transition-all text-left flex items-center justify-between"
              style={{
                borderColor: showSupplierDropdown ? '#0B5858' : '#e5e7eb',
                boxShadow: showSupplierDropdown ? '0 0 0 2px rgba(0, 0, 0, 0.06), 0 0 0 3px #cce8e8' : 'none',
                fontFamily: 'Poppins',
              }}
            >
              <span style={{ color: form.supplierId ? '#111827' : '#9ca3af', fontWeight: form.supplierId ? 500 : 400 }}>
                {form.supplierId ? supplierOptions.find(o => o.value === form.supplierId)?.label : 'Select supplier'}
              </span>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ transform: showSupplierDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} aria-hidden="true">
                <path d="M1.5 3.5l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isClient && showSupplierDropdown && createPortal(
              <div
                className="fixed bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl z-[10000] max-h-[260px] overflow-y-auto"
                style={{
                  top: `${supplierDropdownPosition.top + 8}px`,
                  left: `${supplierDropdownPosition.left}px`,
                  width: supplierDropdownPosition.width ? `${supplierDropdownPosition.width}px` : 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {supplierOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      setForm({ ...form, supplierId: option.value });
                      setErrors({ ...errors, supplierId: '' });
                      setShowSupplierDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] transition-colors"
                    style={{
                      borderBottom: index < supplierOptions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      backgroundColor: option.value === form.supplierId ? '#e8f4f4' : '#ffffff',
                      color: option.value === form.supplierId ? '#0b5858' : '#374151',
                      fontWeight: option.value === form.supplierId ? 600 : 400,
                      opacity: option.disabled ? 0.5 : 1,
                      cursor: option.disabled ? 'not-allowed' : 'pointer',
                      fontFamily: 'Poppins',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {option.value === form.supplierId && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      <span>{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            , document.body)}

            {errors.supplierId && (
              <p className="text-xs text-red-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                {errors.supplierId}
              </p>
            )}
          </div>

          {/* Order Date */}
          <div>
            <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2" style={{ fontFamily: 'Poppins' }}>
              Order Date {errors.orderDate && <span className="text-red-600">*</span>}
            </label>
            <SingleDatePicker
              value={form.orderDate}
              onChange={(value) => {
                setForm({ ...form, orderDate: value });
                setErrors({ ...errors, orderDate: '' });
              }}
              placeholder="Order date"
              className="w-full"
            />
            {errors.orderDate && (
              <p className="text-xs text-red-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                {errors.orderDate}
              </p>
            )}
          </div>

          {/* Expected Delivery */}
          <div>
            <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2" style={{ fontFamily: 'Poppins' }}>
              Expected Delivery {errors.expectedDelivery && <span className="text-red-600">*</span>}
            </label>
            <SingleDatePicker
              value={form.expectedDelivery}
              onChange={(value) => {
                setForm({ ...form, expectedDelivery: value });
                setErrors({ ...errors, expectedDelivery: '' });
              }}
              placeholder="Expected delivery"
              className="w-full"
            />
            {errors.expectedDelivery && (
              <p className="text-xs text-red-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                {errors.expectedDelivery}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 inventory-reveal" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Order Items {errors.lineItems && <span className="text-red-600 text-sm">*</span>}
          </h2>
          <div className="relative z-[100]">
            <button
              ref={addItemButtonRef}
              type="button"
              onClick={() => {
                if (!showAddItemDropdown && addItemButtonRef.current) {
                  const rect = addItemButtonRef.current.getBoundingClientRect();
                  setDropdownPosition({
                    top: rect.bottom,
                    left: Math.max(8, rect.right - 320),
                  });
                }
                setShowAddItemDropdown(!showAddItemDropdown);
              }}
              disabled={availableProducts.length === 0}
              className="px-4 py-2 bg-white border-[1.5px] border-[#0B5858] text-[#0B5858] rounded-lg text-[13px] font-semibold hover:bg-[#e8f4f4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins' }}
            >
              + Add Item
            </button>

            {isClient && showAddItemDropdown && createPortal(
              <div
                className="fixed bg-white border-[1.5px] border-gray-200 rounded-lg shadow-lg z-[10000] max-h-64 overflow-y-auto w-80"
                style={{
                  top: `${dropdownPosition.top + 8}px`,
                  left: `${dropdownPosition.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                  {availableProducts.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      All items added
                    </div>
                  ) : (
                    availableProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddLineItem(product.id)}
                        className="w-full px-4 py-2.5 text-left hover:bg-[#e8f4f4] transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>
                              {product.name}
                            </p>
                            <p className="text-[11px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                              Current: {product.currentStock} {product.unit} • Min: {product.minStock} {product.unit}
                            </p>
                          </div>
                          <span className="text-[12px] text-[#0B5858] font-semibold" style={{ fontFamily: 'Poppins' }}>
                            PHP {product.unitCost}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
            , document.body)}
          </div>
        </div>

        {errors.lineItems && (
          <p className="text-xs text-red-600 mb-3" style={{ fontFamily: 'Poppins' }}>
            {errors.lineItems}
          </p>
        )}

        {lineItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm" style={{ fontFamily: 'Poppins' }}>
              No items added yet. Click &quot;Add Item&quot; to start building your order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Product
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Quantity
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Unit Price
                  </th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Subtotal
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>
                        {line.productName}
                      </p>
                      <p className="text-[11px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                        Unit: {line.unit}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={line.quantity}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (line.quantity === 0 && /^\d$/.test(e.key)) {
                            e.currentTarget.select();
                          }
                        }}
                        onChange={(e) => handleUpdateLineItem(line.id, 'quantity', e.target.value)}
                        min="1"
                        className="w-24 px-[12px] py-[10px] border-[1.5px] border-gray-200 rounded-[10px] text-[14px] text-gray-700 text-right outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                        style={{ fontFamily: 'Poppins' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={line.unitPrice}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (line.unitPrice === 0 && /^\d$/.test(e.key)) {
                            e.currentTarget.select();
                          }
                        }}
                        onChange={(e) => handleUpdateLineItem(line.id, 'unitPrice', e.target.value)}
                        min="0"
                        step="1"
                        className="w-32 px-[12px] py-[10px] border-[1.5px] border-gray-200 rounded-[10px] text-[14px] text-gray-700 text-right outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                        style={{ fontFamily: 'Poppins' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                        PHP {(line.quantity * line.unitPrice).toLocaleString('en-PH')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(line.id)}
                        className="remove-btn p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-4 text-right">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                      Total Amount:
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-lg font-bold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                      PHP {totalAmount.toLocaleString('en-PH')}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 inventory-reveal" style={{ animationDelay: '280ms' }}>
        <button
          type="button"
          onClick={() => router.push('/sales-report/inventory/purchase-orders')}
          className="cancel-btn px-6 py-2.5 bg-white border-[1.5px] border-[#0B5858] text-[#0B5858] rounded-lg text-[13px] font-semibold transition-all duration-150 hover:bg-[#e8f4f4] hover:text-[#0B5858] hover:shadow-sm hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B5858]"
          style={{ fontFamily: 'Poppins' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="create-po-btn flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white rounded-lg text-[13px] font-semibold transition-all hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B5858]"
          style={{ fontFamily: 'Poppins', boxShadow: '0 2px 8px rgba(11,88,88,0.2)' }}
        >
          Create Purchase Order
        </button>
      </div>
    </>
  );
}

export default function CreatePurchaseOrderPage() {
  return (
    <Suspense fallback={null}>
      <CreatePurchaseOrderPageContent />
    </Suspense>
  );
}
