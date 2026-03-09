import type { ItemCategory, ItemType, ReplenishmentItem, StockMovement } from '../types';
import {
  mockDashboardSummary,
  mockReplenishmentItems,
  mockStockMovements,
  mockUnitStockMovements,
  mockUnitItems,
  mockUnits,
  mockWarehouseDirectoryData,
} from './mockData';

type MovementKind = 'IN' | 'OUT';

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

const MOCK_LOGGED_IN_USER_NAME = 'Admin User';

const nowIsoDate = () => new Date().toISOString();

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatMovementDateTime = (value?: string) => {
  if (!value) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value} 00:00`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  }

  return value;
};

const splitMovementDateTime = (value?: string) => {
  const formatted = formatMovementDateTime(value);
  const [date = '', time = '00:00'] = formatted.split(' ');
  return { date, time, recordedAt: `${date} ${time}`.trim() };
};

const resolveCreatedBy = (createdBy?: string) => {
  if (!createdBy || createdBy.includes('Modal')) {
    return MOCK_LOGGED_IN_USER_NAME;
  }
  return createdBy;
};

const normalizeInventoryName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const toStockMovementType = (kind: MovementKind): StockMovement['type'] =>
  kind === 'IN' ? 'in' : 'out';

const inferReferenceType = (
  reference?: string,
  explicitType?: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL'
): 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL' => {
  if (explicitType) return explicitType;
  if (!reference) return 'MANUAL';

  const normalized = reference.toUpperCase();
  if (normalized.startsWith('PO') || normalized.startsWith('GR')) return 'PO';
  if (normalized.startsWith('BK')) return 'BOOKING';
  if (normalized.startsWith('DI') || normalized.includes('DAMAGE')) return 'DAMAGE';
  return 'MANUAL';
};

const findItem = (productId: string): ReplenishmentItem => {
  const item = mockReplenishmentItems.find((entry) => entry.id === productId);
  if (!item) {
    throw new Error(`Unknown item/product: ${productId}`);
  }
  return item;
};

const findWarehouse = (warehouseId: string) => {
  const warehouse = mockWarehouseDirectoryData.find((entry) => entry.id === warehouseId);
  if (!warehouse) {
    throw new Error(`Unknown warehouse: ${warehouseId}`);
  }
  return warehouse;
};

const upsertWarehouseBalance = (
  warehouseId: string,
  productId: string,
  productName: string,
  reorderLevel: number,
  delta: number
): { before: number; after: number } => {
  const warehouse = findWarehouse(warehouseId);
  const row = warehouse.inventoryBalances.find((entry) => entry.productId === productId);

  if (!row) {
    if (delta < 0) {
      throw new Error(`Insufficient stock in warehouse ${warehouse.name}`);
    }

    warehouse.inventoryBalances.push({
      productId,
      productName,
      quantity: delta,
      reorderLevel,
    });
    return { before: 0, after: delta };
  }

  const before = row.quantity;
  const nextQty = row.quantity + delta;
  if (nextQty < 0) {
    throw new Error(`Insufficient stock in warehouse ${warehouse.name}`);
  }

  row.quantity = nextQty;
  row.reorderLevel = reorderLevel;
  return { before, after: nextQty };
};

const appendWarehouseMovement = (
  warehouseId: string,
  args: {
    id: string;
    productName: string;
    quantity: number;
    recordedAt: string;
    note: string;
    type: 'in' | 'out' | 'transfer';
  }
) => {
  const warehouse = findWarehouse(warehouseId);
  const timestamp = splitMovementDateTime(args.recordedAt);
  warehouse.stockMovements.unshift({
    id: args.id,
    type: args.type,
    productName: args.productName,
    quantity: args.quantity,
    date: timestamp.date,
    time: timestamp.time,
    recordedAt: timestamp.recordedAt,
    note: args.note,
  });
};

const appendUnitMovement = (
  input: StockOutInput,
  args: {
    productName: string;
    quantity: number;
    createdBy?: string;
    beforeQuantity: number;
    afterQuantity: number;
  }
) => {
  if (!input.unitId) return;

  const unit = mockUnits.find((entry) => entry.id === input.unitId);
  if (!unit) {
    throw new Error(`Unknown unit: ${input.unitId}`);
  }

  const sourceWarehouse = findWarehouse(input.warehouseId);
  const timestamp = splitMovementDateTime(input.date);

  mockUnitStockMovements.unshift({
    id: generateMovementId('UM'),
    productId: input.productId,
    productName: args.productName,
    unitId: unit.id,
    unitName: unit.name,
    sourceWarehouseId: sourceWarehouse.id,
    sourceWarehouseName: sourceWarehouse.name,
    quantity: args.quantity,
    reason: input.reason,
    referenceType: inferReferenceType(input.reference, input.referenceType),
    referenceId: input.reference,
    beforeQuantity: args.beforeQuantity,
    afterQuantity: args.afterQuantity,
    recordedAt: timestamp.recordedAt,
    recordedDate: timestamp.date,
    recordedTime: timestamp.time,
    createdBy: resolveCreatedBy(args.createdBy),
  });
};

const appendGlobalMovement = (
  kind: MovementKind,
  input: LedgerMovementInput | StockOutInput,
  id: string,
  qtySnapshot: { before: number; after: number }
) => {
  const movementDateTime = formatMovementDateTime(input.date);
  const destinationUnitId = 'unitId' in input ? input.unitId : undefined;
  const destinationUnitName = destinationUnitId
    ? mockUnits.find((unit) => unit.id === destinationUnitId)?.name
    : undefined;

  const movement: StockMovement = {
    id,
    productId: input.productId,
    warehouseId: input.warehouseId,
    unitId: destinationUnitId,
    unitName: destinationUnitName,
    type: toStockMovementType(kind),
    quantity: input.quantity,
    reason: input.reason,
    referenceType: inferReferenceType(input.reference, input.referenceType),
    beforeQuantity: qtySnapshot.before,
    afterQuantity: qtySnapshot.after,
    movementDateTime,
    notes: [input.reason, input.notes].filter(Boolean).join(' | '),
    referenceId: input.reference,
    createdAt: movementDateTime,
    createdBy: resolveCreatedBy(input.createdBy),
  };

  mockStockMovements.unshift(movement);

  const item = findItem(input.productId);
  item.stockMovements = [movement, ...(item.stockMovements ?? [])];
};

const recomputeItemDerived = (productId: string) => {
  const item = findItem(productId);
  const totalStock = mockWarehouseDirectoryData.reduce((sum, warehouse) => {
    const row = warehouse.inventoryBalances.find((entry) => entry.productId === productId);
    return sum + (row?.quantity ?? 0);
  }, 0);

  item.currentStock = totalStock;
  item.shortfall = Math.max(0, item.minStock - item.currentStock);
  item.isLowStock = item.currentStock < item.minStock;
  item.totalValue = item.currentStock * item.unitCost;
  item.updatedAt = nowIsoDate();

  return {
    item,
    totalStock,
    shortfall: item.shortfall,
    lowStock: item.isLowStock,
  };
};

const recomputeDashboardSummary = () => {
  mockDashboardSummary.totalItems = mockReplenishmentItems.length;
  mockDashboardSummary.totalStocks = mockReplenishmentItems.reduce(
    (sum, entry) => sum + entry.currentStock,
    0
  );
  mockDashboardSummary.lowStockCount = mockReplenishmentItems.filter(
    (entry) => entry.currentStock < entry.minStock
  ).length;
  mockDashboardSummary.replenishmentNeeded = mockReplenishmentItems.reduce(
    (sum, entry) => sum + Math.max(0, entry.minStock - entry.currentStock),
    0
  );
};

const addToUnitAllocation = (productId: string, unitId: string, quantity: number) => {
  if (quantity <= 0) return;

  const item = findItem(productId);
  const unit = mockUnits.find((entry) => entry.id === unitId);
  if (!unit) {
    throw new Error(`Unknown unit: ${unitId}`);
  }

  const normalized = normalizeInventoryName(item.name);
  const unitRow = mockUnitItems.find(
    (entry) =>
      entry.assignedToUnit === unitId &&
      normalizeInventoryName(entry.name) === normalized
  );

  if (unitRow) {
    unitRow.currentStock += quantity;
  } else {
    mockUnitItems.push({
      id: `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: item.name,
      type: item.type,
      category: item.category,
      unit: item.unit,
      currentStock: quantity,
      minStock: Math.max(1, item.minStock),
      assignedToUnit: unitId,
    });
  }

  unit.itemCount = (unit.itemCount ?? 0) + 1;
};

const generateMovementId = (prefix: 'SM' | 'WM' | 'UM') =>
  (() => {
    if (prefix === 'SM') {
      const maxExisting = mockStockMovements.reduce((max, movement) => {
        const matched = movement.id.match(/^SM-(\d+)$/i);
        if (!matched) return max;
        return Math.max(max, Number(matched[1]));
      }, 0);
      return `SM-${String(maxExisting + 1).padStart(3, '0')}`;
    }

    if (prefix === 'UM') {
      const maxUnitMovement = mockUnitStockMovements.reduce((max, movement) => {
        const matched = movement.id.match(/^UM-(\d+)$/i);
        if (!matched) return max;
        return Math.max(max, Number(matched[1]));
      }, 0);
      return `UM-${String(maxUnitMovement + 1).padStart(3, '0')}`;
    }

    const maxWarehouseMovement = mockWarehouseDirectoryData.reduce((max, warehouse) => {
      const warehouseMax = warehouse.stockMovements.reduce((innerMax, movement) => {
        const matched = movement.id.match(/^WM-(\d+)$/i);
        if (!matched) return innerMax;
        return Math.max(innerMax, Number(matched[1]));
      }, 0);
      return Math.max(max, warehouseMax);
    }, 0);

    return `WM-${String(maxWarehouseMovement + 1).padStart(3, '0')}`;
  })();

const emitInventoryMovementUpdated = (detail: {
  source: 'stock-in' | 'stock-out' | 'recompute';
  movementIds?: string[];
  productId?: string;
}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('inventory:movement-updated', { detail }));
};

export const processStockIn = (input: LedgerMovementInput): LedgerResult => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const item = findItem(input.productId);
  findWarehouse(input.warehouseId);

  const qtySnapshot = upsertWarehouseBalance(
    input.warehouseId,
    item.id,
    item.name,
    item.minStock,
    input.quantity
  );

  const globalMovementId = generateMovementId('SM');
  appendGlobalMovement('IN', input, globalMovementId, qtySnapshot);
  appendWarehouseMovement(input.warehouseId, {
    id: generateMovementId('WM'),
    type: 'in',
    productName: item.name,
    quantity: input.quantity,
    recordedAt: input.date,
    note: [input.reason, input.reference].filter(Boolean).join(' · '),
  });

  const derived = recomputeItemDerived(item.id);
  recomputeDashboardSummary();
  emitInventoryMovementUpdated({
    source: 'stock-in',
    movementIds: [globalMovementId],
    productId: item.id,
  });

  return {
    movementIds: [globalMovementId],
    item: derived.item,
    lowStock: derived.lowStock,
    shortfall: derived.shortfall,
    totalStock: derived.totalStock,
  };
};

export const createItemAndProcessStockIn = (
  input: NewItemStockInInput
): { item: ReplenishmentItem; movementIds: string[] } => {
  if (!input.name.trim()) {
    throw new Error('Item name is required.');
  }
  if (!input.sku.trim()) {
    throw new Error('SKU is required.');
  }
  if (!input.initialStocks.length) {
    throw new Error('At least one warehouse stock line is required.');
  }

  const productId = `itm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const primaryWarehouse = findWarehouse(input.initialStocks[0].warehouseId);
  const now = nowIsoDate();

  const newItem: ReplenishmentItem = {
    id: productId,
    sku: input.sku,
    name: input.name,
    type: input.itemType,
    category: input.category,
    unit: input.unit,
    currentStock: 0,
    minStock: Math.max(0, input.minStock),
    shortfall: 0,
    isLowStock: false,
    unitCost: input.unitCost ?? 0,
    totalValue: 0,
    warehouseId: primaryWarehouse.id,
    warehouseName: primaryWarehouse.name,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: input.createdBy || 'System',
    currentsupplierId: input.supplierId || '',
    supplierName: input.supplierName || '',
    stockMovements: [],
    damageAdjustments: [],
  };

  mockReplenishmentItems.unshift(newItem);

  const movementIds: string[] = [];
  input.initialStocks.forEach((stockLine) => {
    const result = processStockIn({
      productId,
      warehouseId: stockLine.warehouseId,
      quantity: stockLine.quantity,
      reason: stockLine.reason,
      date: stockLine.date,
      reference: stockLine.reference,
      notes: stockLine.notes,
      createdBy: input.createdBy,
    });
    movementIds.push(...result.movementIds);
  });

  const { item } = recomputeItemDerived(productId);
  recomputeDashboardSummary();
  emitInventoryMovementUpdated({
    source: 'stock-in',
    movementIds,
    productId,
  });

  return {
    item,
    movementIds,
  };
};

export const processStockOut = (input: StockOutInput): LedgerResult => {
  if (input.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const item = findItem(input.productId);

  const sourceWarehouse = findWarehouse(input.warehouseId);
  const sourceBalance = sourceWarehouse.inventoryBalances.find(
    (entry) => entry.productId === input.productId
  );
  const available = sourceBalance?.quantity ?? 0;

  if (available < input.quantity) {
    throw new Error(
      `Insufficient stock for ${item.name}. Available: ${available}, requested: ${input.quantity}.`
    );
  }

  const sourceQtySnapshot = upsertWarehouseBalance(
    input.warehouseId,
    item.id,
    item.name,
    item.minStock,
    -input.quantity
  );

  const movementIds: string[] = [];
  const globalMovementId = generateMovementId('SM');
  appendGlobalMovement('OUT', input, globalMovementId, sourceQtySnapshot);
  movementIds.push(globalMovementId);

  appendWarehouseMovement(input.warehouseId, {
    id: generateMovementId('WM'),
    type: input.transferToWarehouseId ? 'transfer' : 'out',
    productName: item.name,
    quantity: input.quantity,
    recordedAt: input.date,
    note: [input.reason, input.reference].filter(Boolean).join(' · '),
  });

  if (input.transferToWarehouseId) {
    const destinationQtySnapshot = upsertWarehouseBalance(
      input.transferToWarehouseId,
      item.id,
      item.name,
      item.minStock,
      input.quantity
    );

    const transferInId = generateMovementId('SM');
    appendGlobalMovement(
      'IN',
      {
        ...input,
        warehouseId: input.transferToWarehouseId,
        notes: [input.notes, `Transfer from ${sourceWarehouse.name}`].filter(Boolean).join(' | '),
      },
      transferInId,
      destinationQtySnapshot
    );
    movementIds.push(transferInId);

    appendWarehouseMovement(input.transferToWarehouseId, {
      id: generateMovementId('WM'),
      type: 'in',
      productName: item.name,
      quantity: input.quantity,
      recordedAt: input.date,
      note: `Transfer in · ${sourceWarehouse.name}`,
    });
  }

  if (input.unitId) {
    addToUnitAllocation(item.id, input.unitId, input.quantity);
    appendUnitMovement(input, {
      productName: item.name,
      quantity: input.quantity,
      createdBy: input.createdBy,
      beforeQuantity: sourceQtySnapshot.before,
      afterQuantity: sourceQtySnapshot.after,
    });
  }

  const derived = recomputeItemDerived(item.id);
  recomputeDashboardSummary();
  emitInventoryMovementUpdated({
    source: 'stock-out',
    movementIds,
    productId: item.id,
  });

  return {
    movementIds,
    item: derived.item,
    lowStock: derived.lowStock,
    shortfall: derived.shortfall,
    totalStock: derived.totalStock,
  };
};

export const recomputeAllInventoryDerivedValues = () => {
  mockReplenishmentItems.forEach((item) => {
    recomputeItemDerived(item.id);
  });
  recomputeDashboardSummary();
  emitInventoryMovementUpdated({ source: 'recompute' });
};
