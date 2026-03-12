import { apiClient } from '@/lib/api/client';
import type { ReplenishmentItem } from '../types';
import {
  loadInventoryDataset,
  inventoryDashboardSummary,
  inventoryItems,
  inventoryWarehouseDirectory,
  getWarehouseUnitAllocations,
} from './inventoryDataStore';

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

const getAvailableQuantity = (productId: string, warehouseId: string): number => {
  const wh = inventoryWarehouseDirectory.find((w) => w.id === warehouseId);
  const bal = wh?.inventoryBalances?.find((b) => b.productId === productId);
  if (bal != null) return bal.quantity;
  const item = inventoryItems.find((p) => p.id === productId);
  return item?.warehouseId === warehouseId ? (item?.currentStock ?? 0) : 0;
};

const buildLedgerResult = (productId: string, movementIds: string[]): LedgerResult => {
  const item = inventoryItems.find((entry) => entry.id === productId);
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
  overrides?: Partial<{ warehouseId: string; referenceId: string; notes: string; unitId?: string }>
) => {
  const payload: Record<string, unknown> = {
    productId: input.productId,
    warehouseId: overrides?.warehouseId ?? input.warehouseId,
    type,
    quantity: input.quantity,
    reason: input.reason,
    referenceType: mapReferenceType(input.referenceType, input.reference),
    referenceId: overrides?.referenceId ?? input.reference,
    notes: overrides?.notes ?? input.notes,
  };
  if (overrides?.unitId) payload.unitId = overrides.unitId;

  const response = await apiClient.post<InventoryMovementResponse>('/api/inventory/movements', payload);
  return response.movement.id;
};

/** Input for manual stock adjustments (cycle count, corrections). Quantity: positive = add, negative = remove. */
export type StockAdjustmentInput = LedgerMovementInput;

/**
 * Manual adjustments are sent as IN (add) or OUT (remove) with referenceType 'manual_adjustment'
 * for backend compatibility. Many backends only support IN/OUT with positive quantities and
 * do not handle ADJUSTMENT type or negative quantities. The frontend normalizes these to
 * display as "adjustment" in the UI based on referenceType.
 */
export const processStockAdjustment = async (input: StockAdjustmentInput): Promise<LedgerResult> => {
  if (input.quantity === 0) {
    throw new Error('Adjustment quantity cannot be zero.');
  }

  const isAdd = input.quantity > 0;
  if (!isAdd) {
    const absQty = Math.abs(input.quantity);
    const avail = getAvailableQuantity(input.productId, input.warehouseId);
    if (avail < absQty) {
      throw new Error(
        `Remove quantity (${absQty}) exceeds available stock (${avail}) in this warehouse. Cannot go negative.`
      );
    }
  }

  const absQty = Math.abs(input.quantity);
  const movementId = await postMovement(
    { ...input, quantity: absQty, referenceType: 'MANUAL' },
    isAdd ? 'IN' : 'OUT',
    undefined
  );

  await loadInventoryDataset(true);
  const result = buildLedgerResult(input.productId, [movementId]);

  emitInventoryMovementUpdated({
    source: 'stock-out',
    movementIds: [movementId],
    productId: input.productId,
  });

  return result;
};

export type WriteOffType = 'warehouse' | 'unit';

export interface UnitWriteOffInput {
  warehouseId: string;
  unitId: string;
  productId: string;
  quantity: number;
  reason: string;
  date: string;
  notes?: string;
  createdBy?: string;
}

export const processUnitWriteOff = async (input: UnitWriteOffInput): Promise<LedgerResult> => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const allocations = getWarehouseUnitAllocations(input.warehouseId);
  const unitAlloc = allocations.find((a) => a.unitId === input.unitId);
  const itemAlloc = unitAlloc?.items.find((i) => i.productId === input.productId);
  const allocated = itemAlloc?.quantity ?? 0;

  if (allocated < input.quantity) {
    throw new Error(
      `Quantity (${input.quantity}) exceeds allocated stock (${allocated}) in this unit. Cannot go negative.`
    );
  }

  await apiClient.post('/api/inventory/allocations', {
    productId: input.productId,
    unitId: input.unitId,
    quantityDelta: -input.quantity,
  });

  const movementId = await postMovement(
    {
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      reason: input.reason,
      date: input.date,
      referenceType: 'DAMAGE',
      notes: input.notes,
    },
    'OUT',
    { referenceId: input.unitId, unitId: input.unitId }
  );

  await loadInventoryDataset(true);

  const result = buildLedgerResult(input.productId, [movementId]);

  emitInventoryMovementUpdated({
    source: 'stock-out',
    movementIds: [movementId],
    productId: input.productId,
  });

  return result;
};

export const processStockOut = async (input: StockOutInput): Promise<LedgerResult> => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const avail = getAvailableQuantity(input.productId, input.warehouseId);
  if (avail < input.quantity) {
    throw new Error(
      `Quantity (${input.quantity}) exceeds available stock (${avail}) in this warehouse. Cannot go negative.`
    );
  }

  const movementIds: string[] = [];
  const outMovementId = await postMovement(input, 'OUT', {
    referenceId: input.reference || input.unitId,
  });
  movementIds.push(outMovementId);

  if (input.transferToWarehouseId) {
    const transferInId = await postMovement(
      { ...input, referenceType: 'MANUAL' },
      'IN',
      {
        warehouseId: input.transferToWarehouseId,
        notes: [input.notes, `Transfer from ${input.warehouseId}`].filter(Boolean).join(' | '),
      }
    );
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
  inventoryDashboardSummary.totalItems = inventoryItems.length;
  inventoryDashboardSummary.totalStocks = inventoryItems.reduce(
    (sum, item) => sum + item.currentStock,
    0
  );
  inventoryDashboardSummary.lowStockCount = inventoryItems.filter(
    (item) => item.currentStock < item.minStock
  ).length;
  inventoryDashboardSummary.replenishmentNeeded = inventoryItems.reduce(
    (sum, item) => sum + Math.max(0, item.minStock - item.currentStock),
    0
  );

  emitInventoryMovementUpdated({ source: 'recompute' });
};
