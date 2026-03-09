'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import InventoryDropdown, { type InventoryDropdownOption } from '../../components/InventoryDropdown';
import { mockSuppliers, mockReplenishmentItems } from '../../lib/mockData';

interface POLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

function CreatePurchaseOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePopItemId = searchParams.get('itemId');

  const [form, setForm] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
  });
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAddItemDropdown, setShowAddItemDropdown] = useState(false);

  // Pre-populate if itemId is in query params
  useEffect(() => {
    if (prePopItemId) {
      const item = mockReplenishmentItems.find((i) => i.id === prePopItemId);
      if (item) {
        // Pre-select supplier if available
        setForm((prev) => ({
          ...prev,
          supplierId: item.currentsupplierId || '',
        }));
        
        // Add item to line items with suggested quantity (shortfall)
        const newLine: POLineItem = {
          id: `line-${Date.now()}`,
          productId: item.id,
          productName: item.name,
          quantity: item.shortfall || item.minStock,
          unitPrice: item.unitCost,
          unit: item.unit,
        };
        setLineItems([newLine]);
      }
    }
  }, [prePopItemId]);

  const supplierOptions: InventoryDropdownOption<string>[] = mockSuppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const availableProducts = mockReplenishmentItems.filter(
    (item) => !lineItems.some((line) => line.productId === item.id)
  );

  const handleAddLineItem = (productId: string) => {
    const product = mockReplenishmentItems.find((i) => i.id === productId);
    if (!product) return;

    const newLine: POLineItem = {
      id: `line-${Date.now()}`,
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

  const handleUpdateLineItem = (lineId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setLineItems(
      lineItems.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line
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

  const handleSubmit = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // In real implementation, this would make an API call
    console.log('Creating PO:', {
      ...form,
      lineItems,
      totalAmount,
      status: 'pending',
    });

    // Redirect to PO directory
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
        .create-po-btn:hover {
          background: #0b5858 !important;
          color: #ffffff !important;
        }
        .cancel-btn:hover {
          background: #f1f5f9 !important;
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
            <InventoryDropdown
              value={form.supplierId}
              onChange={(value) => {
                setForm({ ...form, supplierId: value });
                setErrors({ ...errors, supplierId: '' });
              }}
              options={supplierOptions}
              placeholder="Select supplier"
              fullWidth
            />
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
            <input
              type="date"
              value={form.orderDate}
              onChange={(e) => {
                setForm({ ...form, orderDate: e.target.value });
                setErrors({ ...errors, orderDate: '' });
              }}
              className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-300 rounded-lg text-[13px]"
              style={{ fontFamily: 'Poppins' }}
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
            <input
              type="date"
              value={form.expectedDelivery}
              onChange={(e) => {
                setForm({ ...form, expectedDelivery: e.target.value });
                setErrors({ ...errors, expectedDelivery: '' });
              }}
              className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-300 rounded-lg text-[13px]"
              style={{ fontFamily: 'Poppins' }}
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
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddItemDropdown(!showAddItemDropdown)}
              disabled={availableProducts.length === 0}
              className="px-4 py-2 bg-white border-[1.5px] border-[#0B5858] text-[#0B5858] rounded-lg text-[13px] font-semibold hover:bg-[#e8f4f4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins' }}
            >
              + Add Item
            </button>

            {showAddItemDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddItemDropdown(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
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
              </>
            )}
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
              No items added yet. Click "Add Item" to start building your order.
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
                        onChange={(e) => handleUpdateLineItem(line.id, 'quantity', Number(e.target.value))}
                        min="1"
                        className="w-24 px-[12px] py-[10px] border-[1.5px] border-gray-200 rounded-[10px] text-[14px] text-gray-700 text-right outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                        style={{ fontFamily: 'Poppins' }}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => handleUpdateLineItem(line.id, 'unitPrice', Number(e.target.value))}
                        min="0"
                        step="0.01"
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
          className="cancel-btn px-6 py-2.5 bg-white border-[1.5px] border-gray-300 text-gray-700 rounded-lg text-[13px] font-semibold transition-colors"
          style={{ fontFamily: 'Poppins' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="create-po-btn px-6 py-2.5 bg-[#0B5858] text-white rounded-lg text-[13px] font-semibold transition-colors"
          style={{ fontFamily: 'Poppins' }}
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
