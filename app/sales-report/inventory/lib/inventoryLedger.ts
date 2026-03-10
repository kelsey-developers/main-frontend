import { apiClient } from '@/lib/api/client';
import type { ItemCategory, ItemType, ReplenishmentItem } from '../types';
import { loadInventoryDataset, mockDashboardSummary, mockReplenishmentItems } from './mockData';

type BackendReferenceType = 'purchase_order' | 'goods_receipt' | 'booking' | 'damage_incident' | 'manual_adjustment';

export interface LedgerMovementInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  date: string;
  reference?: string;
  referenceType?: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';
  notes?: string;
  createdBy?: string;
}

export interface StockOutInput extends LedgerMovementInput {
  unitId?: string;
  transferToWarehouseId?: string;
}

export interface NewItemStockInInput {
  sku: string;
  name: string;
  category: ItemCategory;
  itemType: ItemType;
  unit: string;
  minStock: number;
  unitCost?: number;
  isActive?: boolean;
  supplierId?: string;
  supplierName?: string;
  createdBy?: string;
  initialStocks: Array<{
    warehouseId: string;
    quantity: number;
    reason: string;
    date: string;
    reference?: string;
    notes?: string;
  }>;
}

export interface LedgerResult {
  movementIds: string[];
  item: ReplenishmentItem;
  lowStock: boolean;
  shortfall: number;
  totalStock: number;
}

interface InventoryMovementResponse {
  movement: { id: string };
}

const mapReferenceType = (
  explicitType?: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL',
  reference?: string
): BackendReferenceType => {
  if (explicitType === 'PO') return 'purchase_order';
  if (explicitType === 'BOOKING') return 'booking';
  if (explicitType === 'DAMAGE') return 'damage_incident';
  if (explicitType === 'MANUAL') return 'manual_adjustment';

  const normalized = String(reference ?? '').toUpperCase();
  if (normalized.startsWith('PO') || normalized.startsWith('GR')) return 'purchase_order';
  if (normalized.startsWith('BK')) return 'booking';
  if (normalized.startsWith('DI')) return 'damage_incident';
  return 'manual_adjustment';
};

const emitInventoryMovementUpdated = (detail: {
  source: 'stock-in' | 'stock-out' | 'recompute';
  movementIds?: string[];
  productId?: string;
}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('inventory:movement-updated', { detail }));
};

const buildLedgerResult = (productId: string, movementIds: string[]): LedgerResult => {
  const item = mockReplenishmentItems.find((entry) => entry.id === productId);
  if (!item) {
    throw new Error('Item not found after refreshing inventory dataset.');
  }

  return {
    movementIds,
    item,
    lowStock: item.currentStock < item.minStock,
    shortfall: Math.max(0, item.minStock - item.currentStock),
    totalStock: item.currentStock,
  };
};

const postMovement = async (
  input: LedgerMovementInput,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  overrides?: Partial<{ warehouseId: string; referenceId: string; notes: string }>
) => {
  const payload = {
    productId: input.productId,
    warehouseId: overrides?.warehouseId ?? input.warehouseId,
    type,
    quantity: input.quantity,
    reason: input.reason,
    referenceType: mapReferenceType(input.referenceType, input.reference),
    referenceId: overrides?.referenceId ?? input.reference,
    notes: overrides?.notes ?? input.notes,
  };

  const response = await apiClient.post<InventoryMovementResponse>('/api/inventory/movements', payload);
  return response.movement.id;
};

const toCategoryCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'OTHER';

const ensureCategoryId = async (categoryName: ItemCategory): Promise<string> => {
  const { categories } = await apiClient.get<{ categories: Array<{ id: string; name: string; code: string }> }>(
    '/api/product-categories'
  );

  const normalizedName = categoryName.toLowerCase();
  const code = toCategoryCode(categoryName);
  const existing = categories.find(
    (category) => category.name.toLowerCase() === normalizedName || category.code === code
  );
  if (existing) return existing.id;

  const created = await apiClient.post<{ id: string }>('/api/product-categories', {
    code,
    name: categoryName,
    description: `Auto-created for category ${categoryName}`,
  });

  return created.id;
};

export const processStockIn = async (input: LedgerMovementInput): Promise<LedgerResult> => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const movementId = await postMovement(input, 'IN');
  await loadInventoryDataset(true);

  const result = buildLedgerResult(input.productId, [movementId]);
  emitInventoryMovementUpdated({
    source: 'stock-in',
    movementIds: [movementId],
    productId: input.productId,
  });

  return result;
};

export const createItemAndProcessStockIn = async (
  input: NewItemStockInInput
): Promise<{ item: ReplenishmentItem; movementIds: string[] }> => {
  if (!input.name.trim()) throw new Error('Item name is required.');
  if (!input.sku.trim()) throw new Error('SKU is required.');
  if (!input.initialStocks.length) throw new Error('At least one warehouse stock line is required.');

  const categoryId = await ensureCategoryId(input.category);

  const product = await apiClient.post<{ id: string }>('/api/products', {
    sku: input.sku,
    name: input.name,
    unit: input.unit,
    itemType: input.itemType === 'consumable' ? 'consumable' : 'non_consumable',
    reorderLevel: Math.max(0, input.minStock),
    supplierId: input.supplierId || undefined,
    categoryId,
  });

  const movementIds: string[] = [];
  for (const stockLine of input.initialStocks) {
    const movementId = await apiClient.post<InventoryMovementResponse>('/api/inventory/movements', {
      productId: product.id,
      warehouseId: stockLine.warehouseId,
      type: 'IN',
      quantity: stockLine.quantity,
      reason: stockLine.reason,
      referenceType: mapReferenceType(undefined, stockLine.reference),
      referenceId: stockLine.reference,
      notes: stockLine.notes,
    });
    movementIds.push(movementId.movement.id);
  }

  await loadInventoryDataset(true);
  const createdItem = mockReplenishmentItems.find((entry) => entry.id === product.id);
  if (!createdItem) {
    throw new Error('Product was created but could not be loaded into inventory list.');
  }

  emitInventoryMovementUpdated({
    source: 'stock-in',
    movementIds,
    productId: product.id,
  });

  return { item: createdItem, movementIds };
};

export const processStockOut = async (input: StockOutInput): Promise<LedgerResult> => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const movementIds: string[] = [];
  const outMovementId = await postMovement(input, 'OUT', {
    referenceId: input.reference || input.unitId,
  });
  movementIds.push(outMovementId);

  if (input.transferToWarehouseId) {
    const transferInId = await postMovement(input, 'IN', {
      warehouseId: input.transferToWarehouseId,
      notes: [input.notes, `Transfer from ${input.warehouseId}`].filter(Boolean).join(' | '),
    });
    movementIds.push(transferInId);
  }

  if (input.unitId) {
    await apiClient.post('/api/inventory/allocations', {
      productId: input.productId,
      unitId: input.unitId,
      quantityDelta: input.quantity,
    });
  }

  await loadInventoryDataset(true);
  const result = buildLedgerResult(input.productId, movementIds);

  emitInventoryMovementUpdated({
    source: 'stock-out',
    movementIds,
    productId: input.productId,
  });

  return result;
};

export const recomputeAllInventoryDerivedValues = async () => {
  await loadInventoryDataset(true);

  // Keep summary aligned in case other parts mutate the arrays client-side.
  mockDashboardSummary.totalItems = mockReplenishmentItems.length;
  mockDashboardSummary.totalStocks = mockReplenishmentItems.reduce(
    (sum, item) => sum + item.currentStock,
    0
  );
  mockDashboardSummary.lowStockCount = mockReplenishmentItems.filter(
    (item) => item.currentStock < item.minStock
  ).length;
  mockDashboardSummary.replenishmentNeeded = mockReplenishmentItems.reduce(
    (sum, item) => sum + Math.max(0, item.minStock - item.currentStock),
    0
  );

  emitInventoryMovementUpdated({ source: 'recompute' });
};
