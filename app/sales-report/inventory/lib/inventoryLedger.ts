import { apiClient } from '@/lib/api/client';
import type { ReplenishmentItem } from '../types';
import {
  loadInventoryDataset,
  inventoryDashboardSummary,
  inventoryItems,
  inventoryWarehouseDirectory,
  getAllocatedQuantityForUnit,
  isWarehouseActive,
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

  // type ('IN' | 'OUT') is the action recorded for the stock movement in the database.
  const response = await apiClient.post<InventoryMovementResponse>('/api/inventory/movements', payload);
  return response.movement.id;
};

/** Input for manual stock adjustments (cycle count). Quantity > 0 = add (IN), quantity < 0 = remove (OUT). */
export type StockAdjustmentInput = LedgerMovementInput & { unitId?: string };

/**
 * Manual adjustments for cycle count: positive quantity = add stock (IN), negative = remove stock (OUT).
 * Persists via POST /api/inventory/movements (proxied to backend → database).
 * Use referenceType 'BOOKING' and referenceId when items are transferred from a booking.
 * For removals, warehouse must have sufficient stock.
 */
export const processStockAdjustment = async (input: StockAdjustmentInput): Promise<LedgerResult> => {
  if (input.quantity === 0) {
    throw new Error('Adjustment quantity cannot be zero.');
  }

  const overrides: Partial<{ warehouseId: string; referenceId: string; notes: string; unitId?: string }> = {};
  if (input.unitId) overrides.unitId = input.unitId;

  const isRemoval = input.quantity < 0;
  const absQty = Math.abs(input.quantity);

  if (isRemoval) {
    const available = getAvailableQuantity(input.productId, input.warehouseId);
    if (available < absQty) {
      throw new Error(
        `Cannot remove ${absQty}: only ${available} available in this warehouse.`
      );
    }
  }

  const movementId = await postMovement(
    { ...input, quantity: absQty, referenceType: input.referenceType ?? 'MANUAL' },
    isRemoval ? 'OUT' : 'IN',
    Object.keys(overrides).length > 0 ? overrides : undefined
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

/** Input for unit cycle count: adjust allocation in a unit. Quantity > 0 = add to unit, < 0 = remove from unit. */
export interface UnitAllocationAdjustmentInput {
  productId: string;
  unitId: string;
  /** Optional: for movement record. If omitted, first active warehouse is used so the movement is still persisted. */
  warehouseId?: string;
  quantity: number;
  reason: string;
  date: string;
  reference?: string;
  referenceType?: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';
  notes?: string;
  createdBy?: string;
}

/**
 * Unit cycle count: adjust stock allocated to a unit. Positive quantity = add to unit, negative = remove.
 * For removals, allocated quantity in the unit must be at least abs(quantity).
 * Persists via POST /api/inventory/allocations and POST /api/inventory/movements (proxied to backend → database).
 */
export const processUnitAllocationAdjustment = async (
  input: UnitAllocationAdjustmentInput
): Promise<LedgerResult> => {
  if (input.quantity === 0) {
    throw new Error('Adjustment quantity cannot be zero.');
  }

  const allocated = getAllocatedQuantityForUnit(input.productId, input.unitId);
  if (input.quantity < 0 && allocated < Math.abs(input.quantity)) {
    throw new Error(
      `Cannot remove ${Math.abs(input.quantity)}: only ${allocated} allocated in this unit.`
    );
  }

  await apiClient.post('/api/inventory/allocations', {
    productId: input.productId,
    unitId: input.unitId,
    quantityDelta: input.quantity,
  });

  const activeWarehouses = inventoryWarehouseDirectory.filter((w) => isWarehouseActive(w));
  const warehouseIdForMovement = input.warehouseId ?? activeWarehouses[0]?.id;
  if (!warehouseIdForMovement) {
    throw new Error('No active warehouse available. Movement could not be recorded.');
  }

  const movementId = await postMovement(
    {
      productId: input.productId,
      warehouseId: warehouseIdForMovement,
      quantity: Math.abs(input.quantity),
      reason: input.reason,
      date: input.date,
      reference: input.reference,
      referenceType: input.referenceType ?? 'MANUAL',
      notes: input.notes,
      createdBy: input.createdBy,
    },
    input.quantity > 0 ? 'IN' : 'OUT',
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

  const allocated = getAllocatedQuantityForUnit(input.productId, input.unitId);

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
