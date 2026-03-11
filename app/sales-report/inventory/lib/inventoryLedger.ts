import { apiClient } from '@/lib/api/client';
import type { ReplenishmentItem } from '../types';
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
