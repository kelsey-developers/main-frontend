'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';
import { apiClient } from '@/lib/api/client';
import InventoryDropdown, { type InventoryDropdownOption } from '../../components/InventoryDropdown';
import { ITEM_CATEGORIES, ITEM_UNITS, loadInventoryDataset, inventorySuppliers, inventoryItems, inventoryPurchaseOrders, inventoryPurchaseOrderLines, updateInventoryItem } from '../../lib/inventoryDataStore';
import { useProductDetails, useAllProducts } from '../../hooks/useProductNames';
import type { ItemCategory, ReplenishmentItem } from '../../types';
import { getLastUnitPriceForProduct } from '../../helpers/purchaseOrderHelpers';
import { useToast } from '../../hooks/useToast';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';

interface POLineItem {
  id: string;
  productId: string; // empty string means "unselected row"
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

const getLineItemId = (productId: string) => `line-${productId}`;
const getDraftLineItemId = () => `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const createEmptyLine = (): POLineItem => ({
  id: getDraftLineItemId(),
  productId: '',
  productName: '',
  quantity: 1,
  unitPrice: 0,
  unit: 'pcs',
});

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

function CreatePurchaseOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePopItemId = searchParams.get('itemId');
  const { success, error } = useToast();
  const [refreshTick, setRefreshTick] = useState(0);
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [createItemTargetLineId, setCreateItemTargetLineId] = useState<string | null>(null);
  const [createItemForm, setCreateItemForm] = useState<{
    name: string;
    sku: string;
    unit: string;
    category: ItemCategory | '__create_new__';
    itemType: 'consumable' | 'reusable';
    reorderLevel: string;
    unitCost: string;
    customCategoryName: string;
  }>({
    name: '',
    sku: '',
    unit: 'pcs',
    category: (ITEM_CATEGORIES[0] ?? 'Other') as ItemCategory,
    itemType: 'consumable',
    reorderLevel: '0',
    unitCost: '0',
    customCategoryName: '',
  });

  const [form, setForm] = useState({
    supplierId: '',
    orderDate: getTodayInPhilippineTime(),
    expectedDelivery: '',
  });
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPoId, setCreatedPoId] = useState<string | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierButtonRef = useRef<HTMLButtonElement>(null);
  const [supplierDropdownPosition, setSupplierDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const hasPrepopulatedRef = useRef(false);
  const lineItemsRef = useRef<POLineItem[]>([]);
  const isClient = typeof window !== 'undefined';
  const [activeItemPickerLineId, setActiveItemPickerLineId] = useState<string | null>(null);
  const [itemPickerQuery, setItemPickerQuery] = useState('');
  const [itemPickerPosition, setItemPickerPosition] = useState({ top: 0, left: 0, width: 420 });
  const [editingCell, setEditingCell] = useState<{ lineId: string; field: 'quantity' | 'unitPrice'; rawValue: string } | null>(null);

  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        if (prePopItemId && !hasPrepopulatedRef.current) {
          let item = inventoryItems.find((candidate) => candidate.id === prePopItemId);
          if (!item) {
            const line = inventoryPurchaseOrderLines.find((l) => l.productId === prePopItemId);
            if (line) {
              item = {
                id: line.productId,
                sku: line.productId,
                name: line.productName || `Product #${line.productId}`,
                unit: 'pcs',
                minStock: 0,
                shortfall: 0,
                unitCost: line.unitPrice ?? 0,
                currentsupplierId: '',
              } as ReplenishmentItem;
            }
          }
          if (item) {
            setForm((prev) => ({
              ...prev,
              supplierId: item.currentsupplierId || '',
            }));

            const lastPrice = getLastUnitPriceForProduct(item.id, inventoryPurchaseOrders, inventoryPurchaseOrderLines);
            const defaultPrice = lastPrice > 0 ? lastPrice : item.unitCost;
            setLineItems([
              {
                id: getLineItemId(item.id),
                productId: item.id,
                productName: item.name,
                quantity: item.shortfall || item.minStock,
                unitPrice: defaultPrice,
                unit: item.unit,
              },
              createEmptyLine(),
            ]);

            hasPrepopulatedRef.current = true;
          }
        }

        setRefreshTick((tick) => tick + 1);
      });

    const onMovementUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ source?: string; itemId?: string }>).detail;
      if (detail?.source === 'edit-item') {
        // Store was updated in-place; sync form if the edited item is our prepop or first line
        const itemId = detail.itemId;
        if (itemId) {
          const item = inventoryItems.find((i) => i.id === itemId);
          if (item?.currentsupplierId) {
            setForm((prev) => {
              if (prePopItemId === itemId || lineItemsRef.current.some((l) => l.productId === itemId)) {
                return { ...prev, supplierId: item.currentsupplierId };
              }
              return prev;
            });
          }
        }
        setRefreshTick((tick) => tick + 1);
      } else {
        void loadInventoryDataset(true).finally(() => setRefreshTick((tick) => tick + 1));
      }
    };

    const onFocus = () => {
      void loadInventoryDataset(true).finally(() => setRefreshTick((tick) => tick + 1));
    };

    window.addEventListener('inventory:movement-updated', onMovementUpdated);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('inventory:movement-updated', onMovementUpdated);
      window.removeEventListener('focus', onFocus);
    };
  }, [prePopItemId]);

  const productIdsToFetch = useMemo(() => {
    const inventoryIds = new Set(inventoryItems.map((i) => i.id));
    return [...new Set(
      inventoryPurchaseOrderLines
        .filter((l) => l.productId && !inventoryIds.has(l.productId) && !l.productName)
        .map((l) => l.productId!)
    )];
  }, [inventoryItems, inventoryPurchaseOrderLines, refreshTick]);
  const fetchedProductDetails = useProductDetails(productIdsToFetch);
  const allProductsFromApi = useAllProducts(refreshTick);

  // Sync line item productNames when we fetch names for placeholder products.
  useEffect(() => {
    setLineItems((items) => {
      const needsUpdate = items.some(
        (l) => l.productId && fetchedProductDetails[l.productId] && l.productName?.startsWith('Product #')
      );
      if (!needsUpdate) return items;
      return items.map((line) =>
        line.productId && fetchedProductDetails[line.productId] && line.productName?.startsWith('Product #')
          ? { ...line, productName: fetchedProductDetails[line.productId].name }
          : line
      );
    });
  }, [fetchedProductDetails]);

  lineItemsRef.current = lineItems;

  // Keep the item picker popover anchored to the active row input while scrolling/resizing.
  useEffect(() => {
    if (!activeItemPickerLineId) return;

    const updatePosition = () => {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-item-picker-line="${activeItemPickerLineId}"]`
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setItemPickerPosition({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(320, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeItemPickerLineId]);

  // Always keep at least one editable empty row (Excel-like).
  useEffect(() => {
    if (lineItems.length === 0) {
      setLineItems([createEmptyLine()]);
    }
  }, [lineItems.length]);

  // Keep fixed dropdowns aligned with triggers on scroll/resize
  const updateDropdownPositions = () => {
    if (supplierButtonRef.current && showSupplierDropdown) {
      const rect = supplierButtonRef.current.getBoundingClientRect();
      setSupplierDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };
  useEffect(() => {
    window.addEventListener('scroll', updateDropdownPositions, true);
    window.addEventListener('resize', updateDropdownPositions);
    return () => {
      window.removeEventListener('scroll', updateDropdownPositions, true);
      window.removeEventListener('resize', updateDropdownPositions);
    };
  }, [showSupplierDropdown]);

  const supplierOptions: InventoryDropdownOption<string>[] = [
    { value: '', label: 'Select supplier', disabled: true },
    ...inventorySuppliers.map((s) => ({
      value: s.id,
      label: s.name,
    })),
  ];

  const usedProductIds = new Set(lineItems.map((line) => line.productId).filter(Boolean));

  // Include products from PO lines that may not be in replenishmentItems (e.g. new items with no stock yet),
  // so users can still access them if an ongoing order was not confirmed.
  // Also include products from the API that exist in the DB but aren't in replenishment (e.g. newly created
  // items with no stock, or items from cancelled POs like Betadine).
  const poCreateProductCandidates = useMemo((): ReplenishmentItem[] => {
    const inventoryIds = new Set(inventoryItems.map((i) => i.id));
    const fromPOLines: ReplenishmentItem[] = [];
    const seen = new Set<string>();
    for (const line of inventoryPurchaseOrderLines) {
      if (!line.productId || inventoryIds.has(line.productId) || seen.has(line.productId)) continue;
      seen.add(line.productId);
      const fetched = fetchedProductDetails[line.productId];
      fromPOLines.push({
        id: line.productId,
        sku: fetched?.sku ?? line.productId,
        name: fetched?.name || line.productName || `Product #${line.productId}`,
        type: 'consumable',
        category: 'Other',
        unit: 'pcs',
        currentStock: 0,
        minStock: 0,
        shortfall: 0,
        unitCost: line.unitPrice ?? 0,
        totalValue: 0,
        warehouseId: '',
        warehouseName: '',
        isActive: true,
        createdAt: '',
        updatedAt: '',
        currentsupplierId: '',
        supplierName: '',
      } as ReplenishmentItem);
    }
    const fromApi: ReplenishmentItem[] = [];
    for (const p of allProductsFromApi) {
      if (inventoryIds.has(p.id) || seen.has(p.id)) continue;
      seen.add(p.id);
      const lastPrice = getLastUnitPriceForProduct(p.id, inventoryPurchaseOrders, inventoryPurchaseOrderLines);
      fromApi.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        type: 'consumable',
        category: 'Other',
        unit: p.unit,
        currentStock: 0,
        minStock: p.minStock,
        shortfall: 0,
        unitCost: lastPrice > 0 ? lastPrice : p.unitCost,
        totalValue: 0,
        warehouseId: '',
        warehouseName: '',
        isActive: true,
        createdAt: '',
        updatedAt: '',
        currentsupplierId: '',
        supplierName: '',
      } as ReplenishmentItem);
    }
    return [...inventoryItems, ...fromPOLines, ...fromApi];
  }, [inventoryItems, inventoryPurchaseOrderLines, fetchedProductDetails, allProductsFromApi, refreshTick]);

  const resetCreateItemForm = () => {
    setCreateItemForm({
      name: '',
      sku: '',
      unit: 'pcs',
      category: (ITEM_CATEGORIES[0] ?? 'Other') as ItemCategory,
      itemType: 'consumable',
      reorderLevel: '0',
      unitCost: '0',
      customCategoryName: '',
    });
  };

  const handleCreateNewItem = async () => {
    if (!createItemForm.name.trim()) return;
    const effectiveCategory =
      createItemForm.category === '__create_new__'
        ? createItemForm.customCategoryName.trim()
        : createItemForm.category;
    if (!effectiveCategory) {
      error('Please select a category or enter a new category name.');
      return;
    }
    const normalized = createItemForm.name.trim().toLowerCase();
    const isDuplicate = inventoryItems.some(
      (item) => (item.name ?? '').trim().toLowerCase() === normalized
    );
    if (isDuplicate) {
      error('An item with this name already exists. Product names must be unique (case-insensitive).');
      return;
    }
    setIsCreatingItem(true);
    try {
      const { categories } = await apiClient.get<{ categories: Array<{ id: string; name: string; code: string }> }>(
        '/api/product-categories'
      );
      const catNormalized = effectiveCategory.toLowerCase();
      const existing = categories.find((c) => c.name.toLowerCase() === catNormalized);
      const categoryId =
        existing?.id ??
        (await apiClient.post<{ id: string }>('/api/product-categories', {
          code: effectiveCategory.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
          name: effectiveCategory,
          description: `Auto-created for category ${effectiveCategory}`,
        })).id;

      const skuValue = createItemForm.sku.trim() || `SKU-${Date.now()}`;
      const reorderLevel = Math.max(0, Math.floor(Number(createItemForm.reorderLevel || 0)));
      const unitCost = Math.max(0, Number(createItemForm.unitCost || 0));

      const created = await apiClient.post<{ id: string }>('/api/products', {
        sku: skuValue,
        name: createItemForm.name.trim(),
        unit: createItemForm.unit.trim() || 'pcs',
        itemType: createItemForm.itemType === 'consumable' ? 'consumable' : 'non_consumable',
        reorderLevel,
        categoryId,
      });

      await loadInventoryDataset(true);

      const newRow: POLineItem = {
        id: getLineItemId(created.id),
        productId: created.id,
        productName: createItemForm.name.trim(),
        quantity: 1,
        unitPrice: Number.isFinite(unitCost) ? unitCost : 0,
        unit: createItemForm.unit.trim() || 'pcs',
      };

      setLineItems((prev) => {
        const targetId = createItemTargetLineId;
        if (targetId) {
          return prev.map((line) => (line.id === targetId ? newRow : line));
        }
        return [...prev, newRow, createEmptyLine()];
      });

      setShowCreateItemModal(false);
      setCreateItemTargetLineId(null);
      resetCreateItemForm();
      success('Item created and added to order.');
    } finally {
      setIsCreatingItem(false);
    }
  };

  const ensureTrailingEmptyRow = () => {
    setLineItems((prev) => {
      const hasEmpty = prev.some((line) => !line.productId);
      return hasEmpty ? prev : [...prev, createEmptyLine()];
    });
  };

  const handleRemoveLineItem = (lineId: string) => {
    setEditingCell((prev) => (prev?.lineId === lineId ? null : prev));
    setLineItems(lineItems.filter((line) => line.id !== lineId));
  };

  const handleSelectProductForLine = (lineId: string, productId: string) => {
    const product = poCreateProductCandidates.find((entry) => entry.id === productId);
    if (!product) return;

    // Use item's default supplier for PO when supplier not yet set
    if (product.currentsupplierId && !form.supplierId) {
      setForm((prev) => ({ ...prev, supplierId: product.currentsupplierId }));
    }

    setEditingCell((prev) => (prev?.lineId === lineId ? null : prev));
    setLineItems((prev) => {
      const existingIndex = prev.findIndex((line) => line.productId === product.id && line.id !== lineId);
      const targetIndex = prev.findIndex((line) => line.id === lineId);
      if (targetIndex === -1) return prev;

      // If already exists in another row, merge quantities into the existing row.
      if (existingIndex !== -1) {
        const targetQty = prev[targetIndex].quantity || 1;
        return prev
          .map((line, idx) =>
            idx === existingIndex ? { ...line, quantity: Math.max(1, line.quantity) + Math.max(1, targetQty) } : line
          )
          .map((line, idx) => (idx === targetIndex ? { ...createEmptyLine(), id: prev[targetIndex].id } : line));
      }

      const lastPrice = getLastUnitPriceForProduct(product.id, inventoryPurchaseOrders, inventoryPurchaseOrderLines);
      const defaultPrice = lastPrice > 0 ? lastPrice : Math.max(0, Number(product.unitCost || 0));
      return prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              unitPrice: defaultPrice,
              quantity: Math.max(1, line.quantity || 1),
            }
          : line
      );
    });

    setActiveItemPickerLineId(null);
    setItemPickerQuery('');
    ensureTrailingEmptyRow();
  };

  const handleCellFocus = (lineId: string, field: 'quantity' | 'unitPrice', currentValue: number) => {
    setEditingCell({
      lineId,
      field,
      rawValue: currentValue === 0 && field === 'unitPrice' ? '' : String(currentValue),
    });
  };

  const handleCellChange = (lineId: string, field: 'quantity' | 'unitPrice', rawInput: string) => {
    const digits = String(rawInput).replace(/\D/g, '');
    const normalized = digits.replace(/^0+(?=\d)/, '') || digits;
    setEditingCell((prev) =>
      prev && prev.lineId === lineId && prev.field === field
        ? { ...prev, rawValue: normalized }
        : { lineId, field, rawValue: normalized }
    );
  };

  const handleCellBlur = (lineId: string, field: 'quantity' | 'unitPrice') => {
    setEditingCell((prev) => {
      if (!prev || prev.lineId !== lineId || prev.field !== field) return prev;
      const digits = prev.rawValue.replace(/\D/g, '');
      const normalized = digits.replace(/^0+(?=\d)/, '') || digits;
      const numeric = normalized === '' ? 0 : parseInt(normalized, 10);
      const value = Number.isFinite(numeric) ? numeric : 0;
      const clean = field === 'quantity'
        ? Math.max(1, Math.floor(value || 0))
        : Math.max(0, Math.floor(value || 0));

      setLineItems((items) =>
        items.map((l) => (l.id === lineId ? { ...l, [field]: clean } : l))
      );
      return null;
    });
  };

  const getCellDisplayValue = (line: POLineItem, field: 'quantity' | 'unitPrice'): string => {
    const isEditing = editingCell?.lineId === line.id && editingCell?.field === field;
    if (isEditing) return editingCell.rawValue;
    return String(line[field]);
  };

  const totalAmount = lineItems.reduce((sum, line) => sum + (line.productId ? line.quantity * line.unitPrice : 0), 0);

  // Keep the order items table height stable (Notion-like).
  const ORDER_ITEMS_MIN_ROWS = 7;
  const realRows = lineItems.filter((line) => line.productId);
  const fillerRowCount = Math.max(0, ORDER_ITEMS_MIN_ROWS - realRows.length);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.supplierId) nextErrors.supplierId = 'Supplier is required';
    if (!form.expectedDelivery) nextErrors.expectedDelivery = 'Expected delivery is required';
    if (realRows.length === 0) nextErrors.lineItems = 'At least one item is required';
    
    // Validate that expected delivery is after order date
    if (form.orderDate && form.expectedDelivery && form.expectedDelivery <= form.orderDate) {
      nextErrors.expectedDelivery = 'Expected delivery must be after order date';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const created = await apiClient.post<{ id: string }>('/api/purchase-orders', {
        supplierId: form.supplierId,
        notes: `Ordered: ${form.orderDate} | Expected: ${form.expectedDelivery}`,
        items: realRows.map((line) => ({
          productId: line.productId,
          productName: line.productName || undefined,
          quantityOrdered: line.quantity,
          // Backend requires unitCost (if provided) to be positive. Omit when unknown/zero.
          ...(line.unitPrice > 0 ? { unitCost: line.unitPrice } : {}),
        })),
      });

      // When PO provides a new unit price for an existing item (different from previous), update the item's unitCost
      for (const line of realRows) {
        if (!line.productId || line.unitPrice <= 0) continue;
        const item = inventoryItems.find((i) => i.id === line.productId);
        if (item && line.unitPrice !== (item.unitCost ?? 0)) {
          updateInventoryItem(line.productId, { unitCost: line.unitPrice });
        }
      }

      await loadInventoryDataset(true);
      setCreatedPoId(created.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'We couldn’t create the purchase order. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
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
              Order Date
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-gray-50 text-[13px] text-gray-700 flex items-center justify-between">
              <span style={{ fontFamily: 'Poppins' }}>
                {new Date(form.orderDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
              Set automatically when you create the purchase order.
            </p>
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
              minDate={form.orderDate}
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
        </div>

        {errors.lineItems && (
          <p className="text-xs text-red-600 mb-3" style={{ fontFamily: 'Poppins' }}>
            {errors.lineItems}
          </p>
        )}
        {submitError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] text-red-700" style={{ fontFamily: 'Poppins' }}>
            {submitError}
          </div>
        )}

        {lineItems.length === 0 ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f8fbfb] border-b border-gray-200">
                    <th className="w-10 text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      #
                    </th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Item name
                    </th>
                    <th className="w-24 text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Unit
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Unit price
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Quantity
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Subtotal
                    </th>
                    <th className="w-12 text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Act
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td colSpan={7} className="px-3 py-3">
                      <div className="text-[12px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                        Click the <strong className="text-gray-700">Item name</strong> cell below and start typing to search. Press <strong className="text-gray-700">Enter</strong> to add rows like Excel.
                      </div>
                    </td>
                  </tr>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`empty-row-${idx}`} className="border-b border-gray-100">
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-6 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-40 rounded bg-gray-100" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-12 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-20 rounded bg-gray-100" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-14 rounded bg-gray-100" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-24 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-7 w-7 rounded bg-gray-50" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white">
                    <td colSpan={5} className="px-3 py-3 text-right">
                      <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                        Grand total
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[16px] font-black text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                        PHP 0
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f8fbfb] border-b border-gray-200">
                    <th className="w-10 text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      #
                    </th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Item name
                    </th>
                    <th className="w-24 text-left px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Unit
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Unit price
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Quantity
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Subtotal
                    </th>
                    <th className="w-12 text-right px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-gray-500" style={{ fontFamily: 'Poppins' }}>
                      Act
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, rowIndex) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-[#f8fbfb]">
                      <td className="px-3 py-2.5">
                        <span className="text-[12px] text-gray-400" style={{ fontFamily: 'Poppins' }}>
                          {line.productId ? rowIndex + 1 : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          value={activeItemPickerLineId === line.id ? itemPickerQuery : (line.productName || '')}
                          data-item-picker-line={line.id}
                          onChange={(e) => {
                            setActiveItemPickerLineId(line.id);
                            setItemPickerQuery(e.target.value);
                            setLineItems((prev) =>
                              prev.map((row) => (row.id === line.id ? { ...row, productName: e.target.value } : row))
                            );
                          }}
                          onFocus={(e) => {
                            setActiveItemPickerLineId(line.id);
                            setItemPickerQuery(line.productName || '');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              // Excel-like: ensure there's always an empty row at the bottom.
                              e.preventDefault();
                              ensureTrailingEmptyRow();
                            }
                          }}
                          placeholder="Type to search item…"
                          className="w-full bg-transparent px-2 py-1.5 rounded-md text-[13px] text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#cce8e8] focus:border focus:border-[#05807e]"
                          style={{ fontFamily: 'Poppins' }}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[12px] text-gray-600" style={{ fontFamily: 'Poppins' }}>
                          {line.productId ? line.unit : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={getCellDisplayValue(line, 'unitPrice')}
                          onFocus={(e) => {
                            e.target.select();
                            handleCellFocus(line.id, 'unitPrice', line.unitPrice);
                          }}
                          onChange={(e) => handleCellChange(line.id, 'unitPrice', e.target.value)}
                          onBlur={() => handleCellBlur(line.id, 'unitPrice')}
                          className="w-28 bg-transparent px-2 py-1.5 rounded-md text-[13px] text-gray-700 text-right outline-none focus:bg-white focus:ring-2 focus:ring-[#cce8e8] focus:border focus:border-[#05807e] disabled:opacity-50"
                          style={{ fontFamily: 'Poppins' }}
                          disabled={!line.productId}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={getCellDisplayValue(line, 'quantity')}
                          onFocus={(e) => {
                            e.target.select();
                            handleCellFocus(line.id, 'quantity', line.quantity);
                          }}
                          onChange={(e) => handleCellChange(line.id, 'quantity', e.target.value)}
                          onBlur={() => handleCellBlur(line.id, 'quantity')}
                          className="w-20 bg-transparent px-2 py-1.5 rounded-md text-[13px] text-gray-700 text-right outline-none focus:bg-white focus:ring-2 focus:ring-[#cce8e8] focus:border focus:border-[#05807e] disabled:opacity-50"
                          style={{ fontFamily: 'Poppins' }}
                          disabled={!line.productId}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-[13px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                          {line.productId ? `PHP ${(line.quantity * line.unitPrice).toLocaleString('en-PH')}` : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(line.id)}
                          className="remove-btn p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove item"
                          disabled={!line.productId && lineItems.filter((row) => !row.productId).length <= 1}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Filler rows to keep table height stable */}
                  {Array.from({ length: fillerRowCount }).map((_, idx) => (
                    <tr key={`filler-row-${idx}`} className="border-b border-gray-100">
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-6 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-40 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="h-3 w-12 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-20 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-14 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-3 w-24 rounded bg-gray-50" />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="ml-auto h-7 w-7 rounded bg-gray-50" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white">
                    <td colSpan={5} className="px-3 py-3 text-right">
                      <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                        Grand total
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[16px] font-black text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                        PHP {totalAmount.toLocaleString('en-PH')}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create new item modal */}
      {isClient && showCreateItemModal && createPortal(
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center p-4"
          style={{ background: 'rgba(17, 24, 39, 0.38)', fontFamily: 'Poppins' }}
          onClick={() => {
            if (isCreatingItem) return;
            setShowCreateItemModal(false);
            setCreateItemTargetLineId(null);
            resetCreateItemForm();
          }}
        >
          <div
            className="w-full max-w-[640px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-5 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #0b5858 0%, #05807e 100%)' }}
            >
              <div>
                <div className="text-[10px] font-bold tracking-widest text-white/55">NEW PRODUCT</div>
                <div className="text-[18px] font-black">Create item for this PO</div>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                onClick={() => {
                  if (isCreatingItem) return;
                  setShowCreateItemModal(false);
                  setCreateItemTargetLineId(null);
                  resetCreateItemForm();
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Item name *</label>
                  <input
                    value={createItemForm.name}
                    onChange={(e) => setCreateItemForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Towels"
                    className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">SKU (optional)</label>
                  <input
                    value={createItemForm.sku}
                    onChange={(e) => setCreateItemForm((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Unit</label>
                  <InventoryDropdown
                    value={createItemForm.unit}
                    onChange={(value) => setCreateItemForm((p) => ({ ...p, unit: value }))}
                    options={ITEM_UNITS.map((u) => ({ value: u, label: u }))}
                    fullWidth={true}
                    minWidthClass="min-w-0"
                    align="left"
                    backdropZIndexClass="z-[10025]"
                    menuZIndexClass="z-[10030]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Category</label>
                  <InventoryDropdown
                    value={createItemForm.category}
                    onChange={(value) => setCreateItemForm((p) => ({ ...p, category: value }))}
                    options={[
                      ...ITEM_CATEGORIES.map((c) => ({ value: c, label: c })),
                      { value: '__create_new__', label: '+ Create new category...' },
                    ]}
                    fullWidth={true}
                    minWidthClass="min-w-0"
                    align="left"
                    backdropZIndexClass="z-[10025]"
                    menuZIndexClass="z-[10030]"
                  />
                  {createItemForm.category === '__create_new__' && (
                    <input
                      type="text"
                      value={createItemForm.customCategoryName}
                      onChange={(e) => setCreateItemForm((p) => ({ ...p, customCategoryName: e.target.value }))}
                      placeholder="Enter new category name"
                      className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8] mt-2"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Type</label>
                  <InventoryDropdown
                    value={createItemForm.itemType}
                    onChange={(value) => setCreateItemForm((p) => ({ ...p, itemType: value as 'consumable' | 'reusable' }))}
                    options={[
                      { value: 'consumable', label: 'Consumable' },
                      { value: 'reusable', label: 'Reusable' },
                    ]}
                    fullWidth={true}
                    minWidthClass="min-w-0"
                    align="left"
                    backdropZIndexClass="z-[10025]"
                    menuZIndexClass="z-[10030]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Min stock</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={createItemForm.reorderLevel}
                    onChange={(e) => setCreateItemForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 mb-2">Unit price (for this PO)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={createItemForm.unitCost}
                    onChange={(e) => setCreateItemForm((p) => ({ ...p, unitCost: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none focus:border-[#05807e] focus:ring-2 focus:ring-[#cce8e8]"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-900">
                Creating an item here does <strong>not</strong> add stock. Stock-in happens only via <strong>Goods Receipt</strong>.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isCreatingItem}
                className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => {
                  if (isCreatingItem) return;
                  setShowCreateItemModal(false);
                  resetCreateItemForm();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isCreatingItem ||
                  !createItemForm.name.trim() ||
                  (createItemForm.category === '__create_new__' ? !createItemForm.customCategoryName.trim() : false)
                }
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => void handleCreateNewItem()}
              >
                {isCreatingItem ? 'Creating…' : 'Create & add to order'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Item picker popover (Excel-like autocomplete) */}
      {isClient && activeItemPickerLineId && createPortal(
        <div
          className="fixed inset-0 z-[10015]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setActiveItemPickerLineId(null);
              setItemPickerQuery('');
            }
          }}
        >
          <div
            className="absolute bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            style={{
              top: `${itemPickerPosition.top + 6}px`,
              left: `${itemPickerPosition.left}px`,
              width: `${itemPickerPosition.width}px`,
              maxHeight: '320px',
            }}
          >
            {(() => {
              const query = normalizeSearch(itemPickerQuery);
              const activeLine = lineItems.find((l) => l.id === activeItemPickerLineId);
              const activeProductId = activeLine?.productId || '';

              const candidates = poCreateProductCandidates
                .filter((item) => {
                  if (!query) return true;
                  const hay = normalizeSearch(`${item.name} ${item.sku}`);
                  return hay.includes(query);
                })
                .filter((item) => !usedProductIds.has(item.id) || item.id === activeProductId)
                .slice(0, 30);

              const canCreate = Boolean(query) && candidates.length === 0;

              return (
                <div>
                  <div className="px-3 py-2 border-b border-gray-100 bg-[#f8fbfb] text-[11px] text-gray-600" style={{ fontFamily: 'Poppins' }}>
                    {query ? `Results for "${itemPickerQuery}"` : 'Start typing to search…'}
                  </div>
                  <div className="max-h-[280px] overflow-auto">
                    {candidates.length === 0 && !canCreate ? (
                      <div className="px-3 py-3 text-[12px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                        No matches.
                      </div>
                    ) : (
                      candidates.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectProductForLine(activeItemPickerLineId, item.id);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#e8f4f4] border-b border-gray-50 last:border-b-0"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-gray-900 truncate">{item.name}</div>
                              <div className="text-[11px] text-gray-500 truncate">{item.sku} · {item.unit} · min {item.minStock}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-[#0B5858] whitespace-nowrap">
                              PHP {item.unitCost}
                            </div>
                          </div>
                        </button>
                      ))
                    )}

                    {canCreate && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCreateItemTargetLineId(activeItemPickerLineId);
                          setCreateItemForm((p) => ({ ...p, name: itemPickerQuery, unitCost: '0' }));
                          setShowCreateItemModal(true);
                          setActiveItemPickerLineId(null);
                          setItemPickerQuery('');
                        }}
                        className="w-full text-left px-3 py-3 hover:bg-[#e8f4f4]"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        <div className="text-[13px] font-semibold text-gray-900">+ Create “{itemPickerQuery}”</div>
                        <div className="text-[11px] text-gray-500">Create a new product and add it to this row</div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Global submitting overlay */}
      {isSubmitting && !createdPoId && (
        <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/20">
          <div className="rounded-2xl bg-white px-5 py-4 shadow-xl border border-white/20 flex items-center gap-3" style={{ fontFamily: 'Poppins' }}>
            <div className="w-5 h-5 border-2 border-[#0B5858]/30 border-t-[#0B5858] rounded-full animate-spin" />
            <div className="text-sm text-gray-800 font-medium">
              Creating purchase order…
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {createdPoId && (
        <div className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-white/20 p-6" style={{ fontFamily: 'Poppins' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  Purchase order submitted
                </h2>
                <p className="text-[12px] text-gray-600 mt-0.5">
                  Reference ID: <span className="font-mono text-gray-800">{createdPoId}</span>
                </p>
              </div>
            </div>
            <p className="text-[13px] text-gray-700 mb-5">
              You can review receipts and status in the Purchase Orders list.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-[13px] rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setCreatedPoId(null);
                }}
              >
                Stay here
              </button>
              <button
                type="button"
                className="px-4 py-2 text-[13px] rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white font-semibold hover:opacity-95"
                onClick={() => router.push('/sales-report/inventory/purchase-orders')}
              >
                Go to Purchase Orders
              </button>
            </div>
          </div>
        </div>
      )}

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
          disabled={isSubmitting}
          className="create-po-btn flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white rounded-lg text-[13px] font-semibold transition-all hover:shadow-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B5858] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Poppins', boxShadow: '0 2px 8px rgba(11,88,88,0.2)' }}
        >
          {isSubmitting ? 'Creating…' : 'Create Purchase Order'}
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
