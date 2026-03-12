import { apiClient } from '@/lib/api/client';
import type {
  DamageAdjustment,
  GoodsReceipt,
  InventoryDashboardSummary,
  InventoryItem,
  InventoryUnit,
  ItemCategory,
  ItemType,
  PurchaseOrder,
  PurchaseOrderLine,
  ReplenishmentItem,
  StockMovement,
  Supplier,
  Warehouse,
} from '../types';

export const ITEM_CATEGORIES: ItemCategory[] = [
  'Cleaning',
  'Hygiene',
  'Food & Drinks',
  'Cooking',
  'Appliances',
  'furniture',
  'Cloth & Sheets',
  'Kitchenware',
  'Other',
];

export const ITEM_TYPES: ItemType[] = ['consumable', 'reusable'];

/**
 * Canonical product units. Backend may return aliases (e.g. "piece"); we normalize to these.
 * If the backend exposes a units enum (e.g. GET /api/product-units or GET /api/inventory/product-units),
 * consider fetching it on load and merging with this list for consistency.
 */
export const ITEM_UNITS = ['pcs', 'bars', 'btl', 'rolls', 'boxes', 'kg', 'L', 'packs'];

/** Map backend unit aliases to canonical form for consistency (e.g. piece -> pcs). */
const UNIT_ALIASES: Record<string, string> = {
  piece: 'pcs',
  pieces: 'pcs',
  pc: 'pcs',
  each: 'pcs',
  ea: 'pcs',
};

/** Normalize unit string to canonical form. Returns canonical or original if no alias. */
export const normalizeUnit = (unit: string | undefined): string => {
  if (!unit || typeof unit !== 'string') return 'pcs';
  const trimmed = unit.trim().toLowerCase();
  return UNIT_ALIASES[trimmed] ?? trimmed;
};

export interface WarehouseInventoryBalanceRow {
  productId: string;
  productName: string;
  quantity: number;
  reorderLevel: number;
}

export interface WarehouseMovementRow {
  id: string;
  type: 'in' | 'out' | 'transfer';
  productName: string;
  quantity: number;
  date: string;
  time: string;
  recordedAt: string;
  note: string;
}

export interface UnitStockMovementRow {
  id: string;
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  quantity: number;
  reason: string;
  referenceType: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';
  referenceId?: string;
  beforeQuantity: number;
  afterQuantity: number;
  recordedAt: string;
  recordedDate: string;
  recordedTime: string;
  createdBy: string;
}

export interface WarehouseDirectoryRecord {
  id: string;
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  inventoryBalances: WarehouseInventoryBalanceRow[];
  stockMovements: WarehouseMovementRow[];
}

export interface SupplierDirectoryRecord {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  activePOs: number;
  lastOrderDate: string;
  notes?: string;
  createdAt: string;
}

export interface WarehouseUnitAllocationItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface WarehouseUnitAllocationSummary {
  unitId: string;
  unitName: string;
  items: WarehouseUnitAllocationItem[];
}

interface InventoryDatasetResponse {
  dashboardSummary?: InventoryDashboardSummary;
  warehouses?: Warehouse[];
  suppliers?: Supplier[];
  supplierDirectoryData?: SupplierDirectoryRecord[];
  warehouseDirectoryData?: WarehouseDirectoryRecord[];
  stockMovements?: StockMovement[];
  damageAdjustments?: DamageAdjustment[];
  purchaseOrders?: PurchaseOrder[];
  purchaseOrderLines?: PurchaseOrderLine[];
  goodsReceipts?: GoodsReceipt[];
  replenishmentItems?: ReplenishmentItem[];
  units?: InventoryUnit[];
  unitItems?: InventoryItem[];
  unitStockMovements?: UnitStockMovementRow[];
}

interface ExternalUnitListing {
  id: string;
  title: string;
  property_type?: string;
  location?: string;
  city?: string;
  main_image_url?: string;
}

const replaceArray = <T>(target: T[], next: T[] | undefined) => {
  target.splice(0, target.length, ...(next ?? []));
};

const formatDateLabel = (raw: string) => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const deriveSupplierDirectory = (): SupplierDirectoryRecord[] => {
  return mockSuppliers.map((supplier) => {
    const supplierPOs = mockPurchaseOrders.filter((po) => po.supplierId === supplier.id && po.status !== 'cancelled');
    const lastOrderDate = supplierPOs.length > 0
      ? formatDateLabel(supplierPOs[0].orderDate)
      : '—';

    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      isActive: true,
      activePOs: supplierPOs.length,
      lastOrderDate,
      createdAt: formatDateLabel(supplier.createdAt),
      notes: '',
    };
  });
};

const deriveDashboardSummary = (): InventoryDashboardSummary => {
  const totalStocks = mockReplenishmentItems.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = mockReplenishmentItems.filter((item) => item.currentStock < item.minStock).length;
  const replenishmentNeeded = mockReplenishmentItems.reduce(
    (sum, item) => sum + Math.max(0, item.minStock - item.currentStock),
    0
  );

  return {
    totalItems: mockReplenishmentItems.length,
    totalStocks,
    lowStockCount,
    replenishmentNeeded,
  };
};

const emitInventoryDatasetUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('inventory:dataset-updated', {
      detail: { source: 'recompute' },
    })
  );
};

export const mockDashboardSummary: InventoryDashboardSummary = {
  totalItems: 0,
  totalStocks: 0,
  lowStockCount: 0,
  replenishmentNeeded: 0,
};

export const mockWarehouses: Warehouse[] = [];
export const mockSuppliers: Supplier[] = [];
export const mockWarehouseDirectoryData: WarehouseDirectoryRecord[] = [];
export const mockStockMovements: StockMovement[] = [];
export const mockDamageAdjustments: DamageAdjustment[] = [];
export const mockPurchaseOrders: PurchaseOrder[] = [];
export const mockPurchaseOrderLines: PurchaseOrderLine[] = [];
export const mockGoodsReceipts: GoodsReceipt[] = [];
export const mockSupplierDirectoryData: SupplierDirectoryRecord[] = [];
export const mockReplenishmentItems: ReplenishmentItem[] = [];
export const mockUnitItems: InventoryItem[] = [];
export const inventoryUnitsState: InventoryUnit[] = [];
export const mockUnitStockMovements: UnitStockMovementRow[] = [];

let isDatasetLoaded = false;
let datasetLoadPromise: Promise<void> | null = null;
let lastDatasetFailure = { message: '', at: 0 };

export const isInventoryDatasetLoaded = () => isDatasetLoaded;

const hasMeaningfulDataset = (dataset: InventoryDatasetResponse) => {
  if (dataset.dashboardSummary) return true;
  if (Array.isArray(dataset.replenishmentItems) && dataset.replenishmentItems.length > 0) return true;
  if (Array.isArray(dataset.purchaseOrders) && dataset.purchaseOrders.length > 0) return true;
  if (Array.isArray(dataset.warehouseDirectoryData) && dataset.warehouseDirectoryData.length > 0) return true;
  if (Array.isArray(dataset.stockMovements) && dataset.stockMovements.length > 0) return true;
  return false;
};

const applyDataset = (dataset: InventoryDatasetResponse) => {
  replaceArray(mockWarehouseDirectoryData, dataset.warehouseDirectoryData);
  replaceArray(mockSuppliers, dataset.suppliers);
  replaceArray(mockPurchaseOrders, dataset.purchaseOrders);
  replaceArray(mockPurchaseOrderLines, dataset.purchaseOrderLines);
  replaceArray(mockGoodsReceipts, dataset.goodsReceipts);
  replaceArray(mockStockMovements, dataset.stockMovements);
  replaceArray(mockDamageAdjustments, dataset.damageAdjustments);
  const replenishmentItems = Array.isArray(dataset.replenishmentItems) ? dataset.replenishmentItems : [];
  const normalizedItems = replenishmentItems.map((item) => {
    if (item && typeof item === 'object' && 'unit' in item) {
      const canonical = normalizeUnit((item as { unit?: string }).unit);
      if (canonical !== (item as { unit?: string }).unit) {
        return { ...item, unit: canonical };
      }
    }
    return item;
  });
  replaceArray(mockReplenishmentItems, normalizedItems);
  const unitItems = Array.isArray(dataset.unitItems) ? dataset.unitItems : [];
  const normalizedUnitItems = unitItems.map((item) => {
    if (item && typeof item === 'object' && 'unit' in item) {
      const canonical = normalizeUnit((item as { unit?: string }).unit);
      if (canonical !== (item as { unit?: string }).unit) {
        return { ...item, unit: canonical };
      }
    }
    return item;
  });
  replaceArray(mockUnitItems, normalizedUnitItems);
  replaceArray(mockUnitStockMovements, dataset.unitStockMovements);

  // Warehouses come from backend dataset only.
  replaceArray(mockWarehouses, dataset.warehouses ?? []);

  if (dataset.supplierDirectoryData && dataset.supplierDirectoryData.length > 0) {
    replaceArray(mockSupplierDirectoryData, dataset.supplierDirectoryData);
  } else {
    replaceArray(mockSupplierDirectoryData, deriveSupplierDirectory());
  }

  const summary = dataset.dashboardSummary ?? deriveDashboardSummary();
  mockDashboardSummary.totalItems = summary.totalItems;
  mockDashboardSummary.totalStocks = summary.totalStocks;
  mockDashboardSummary.lowStockCount = summary.lowStockCount;
  mockDashboardSummary.replenishmentNeeded = summary.replenishmentNeeded;
};

/** Fetches dataset from API. Returns data or a failure marker so we avoid unhandled rejections and console noise. */
const fetchInventoryDataset = async (): Promise<InventoryDatasetResponse & { _fetchFailed?: boolean; _message?: string }> => {
  try {
    return await apiClient.get<InventoryDatasetResponse>('/api/inventory/dataset');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    if (typeof window !== 'undefined') {
      const now = Date.now();
      const isSameMessage = lastDatasetFailure.message === message;
      const withinCooldown = now - lastDatasetFailure.at < 4000;
      if (!(isSameMessage && withinCooldown)) {
        lastDatasetFailure = { message, at: now };
        window.dispatchEvent(new CustomEvent('inventory:dataset-load-failed', { detail: { message } }));
      }
    }
    return { _fetchFailed: true, _message: message };
  }
};

const fetchExternalUnits = async (): Promise<ExternalUnitListing[] | null> => {
  try {
    return await apiClient.get<ExternalUnitListing[]>('/api/units?limit=200&offset=0');
  } catch (error) {
    const isAbortLike =
      error instanceof Error &&
      (error.name === 'AbortError' ||
        /aborted|abort|timed out|signal is aborted/i.test(error.message));
    if (process.env.NODE_ENV !== 'production') {
      if (!isAbortLike) {
        console.warn('External units request failed; inventory units list will stay empty.', error);
      }
    }
    return null;
  }
};

const syncUnitsFromExternalSource = (externalUnits: ExternalUnitListing[]) => {
  if (!Array.isArray(externalUnits) || externalUnits.length === 0) {
    replaceArray(inventoryUnitsState, []);
    return;
  }

  const itemCountByUnitId = new Map<string, number>();
  mockUnitItems.forEach((item) => {
    if (!item.assignedToUnit) return;
    const current = itemCountByUnitId.get(item.assignedToUnit) ?? 0;
    itemCountByUnitId.set(item.assignedToUnit, current + 1);
  });

  const mappedUnits: InventoryUnit[] = externalUnits
    .filter((listing) => Boolean(listing.id) && Boolean(listing.title))
    .map((listing) => ({
      id: listing.id,
      name: listing.title,
      type: listing.property_type || 'unit',
      location: listing.location || listing.city || '',
      itemCount: itemCountByUnitId.get(listing.id) ?? 0,
      imageUrl: listing.main_image_url || '/heroimage.png',
    }));

  replaceArray(inventoryUnitsState, mappedUnits);
};

export const loadInventoryDataset = async (force = false): Promise<void> => {
  if (isDatasetLoaded && !force) {
    const externalUnits = await fetchExternalUnits();
    if (externalUnits) {
      syncUnitsFromExternalSource(externalUnits);
    }
    // Do not clear units when fetch fails — preserve existing data so users don't see "no items"
    emitInventoryDatasetUpdated();
    return;
  }
  // Prevent request storms when multiple listeners trigger refresh at once.
  // Reuse any in-flight load (including force refresh callers).
  if (datasetLoadPromise) return datasetLoadPromise;

  datasetLoadPromise = (async () => {
    const dataset = await fetchInventoryDataset();
    if ((dataset as { _fetchFailed?: boolean })._fetchFailed) {
      isDatasetLoaded = false;
      emitInventoryDatasetUpdated();
      return;
    }
    applyDataset(dataset as InventoryDatasetResponse);
    const externalUnits = await fetchExternalUnits();
    if (externalUnits) {
      syncUnitsFromExternalSource(externalUnits);
    }
    // Do not clear units when fetch fails — preserve existing data
    isDatasetLoaded = hasMeaningfulDataset(dataset);
    emitInventoryDatasetUpdated();
  })()
    .finally(() => {
      datasetLoadPromise = null;
    });

  return datasetLoadPromise;
};

// Note: we intentionally do not auto-fetch on module import. Pages/components control when
// loading spinners should show, and tying fetch timing to import can cause confusing flashes.

const normalizeInventoryName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const buildWarehouseUnitAllocationMap = (): Record<string, WarehouseUnitAllocationSummary[]> => {
  const replenishmentByName = new Map(
    mockReplenishmentItems.map((item) => [normalizeInventoryName(item.name), item])
  );

  const byWarehouse = new Map<string, Map<string, WarehouseUnitAllocationSummary>>();

  mockUnitItems.forEach((unitItem) => {
    if (!unitItem.assignedToUnit || unitItem.currentStock <= 0) return;

    const replenishmentItem = replenishmentByName.get(normalizeInventoryName(unitItem.name));
    if (!replenishmentItem) return;

    const unit = inventoryUnitsState.find((entry) => entry.id === unitItem.assignedToUnit);
    if (!unit) return;

    if (!byWarehouse.has(replenishmentItem.warehouseId)) {
      byWarehouse.set(replenishmentItem.warehouseId, new Map<string, WarehouseUnitAllocationSummary>());
    }

    const byUnit = byWarehouse.get(replenishmentItem.warehouseId)!;
    if (!byUnit.has(unit.id)) {
      byUnit.set(unit.id, {
        unitId: unit.id,
        unitName: unit.name,
        items: [],
      });
    }

    const row = byUnit.get(unit.id)!;
    const existing = row.items.find((entry) => entry.productId === replenishmentItem.id);
    if (existing) {
      existing.quantity += unitItem.currentStock;
    } else {
      row.items.push({
        productId: replenishmentItem.id,
        productName: replenishmentItem.name,
        quantity: unitItem.currentStock,
      });
    }
  });

  const result: Record<string, WarehouseUnitAllocationSummary[]> = {};
  byWarehouse.forEach((unitMap, warehouseId) => {
    result[warehouseId] = Array.from(unitMap.values());
  });

  return result;
};

export const getWarehouseUnitAllocations = (warehouseId: string): WarehouseUnitAllocationSummary[] => {
  const map = buildWarehouseUnitAllocationMap();
  return map[warehouseId] ?? [];
};

/**
 * Returns inventory items that should appear in the list.
 * PO-ordered items do not reflect until a goods receipt exists (or they have stock).
 */
export const getDisplayableInventoryItems = (): ReplenishmentItem[] => {
  const receivedProductIds = new Set<string>();
  for (const gr of mockGoodsReceipts) {
    for (const gi of gr.items) {
      const line = mockPurchaseOrderLines.find((l) => l.id === gi.poItemId);
      if (line) receivedProductIds.add(line.productId);
    }
  }
  return mockReplenishmentItems.filter(
    (item) => item.currentStock > 0 || receivedProductIds.has(item.id)
  );
};

/**
 * Updates an inventory item in the mock store and syncs warehouse directory balances.
 * Dispatches inventory:movement-updated so listeners refresh.
 */
export const updateInventoryItem = (
  itemId: string,
  updates: Partial<ReplenishmentItem>
): boolean => {
  const idx = mockReplenishmentItems.findIndex((i) => i.id === itemId);
  if (idx < 0) return false;

  const existing = mockReplenishmentItems[idx];
  const warehouseId = updates.warehouseId ?? existing.warehouseId;
  const warehouse = mockWarehouseDirectoryData.find((wh) => wh.id === warehouseId);
  const supplierId = updates.currentsupplierId ?? existing.currentsupplierId;
  const supplier = mockSuppliers.find((s) => s.id === supplierId);
  const unit = updates.unit !== undefined ? normalizeUnit(updates.unit) : existing.unit;
  const merged: ReplenishmentItem = {
    ...existing,
    ...updates,
    id: itemId,
    unit,
    warehouseName: warehouse?.name ?? existing.warehouseName,
    supplierName: supplier?.name ?? existing.supplierName,
    totalValue: (updates.currentStock ?? existing.currentStock) * (updates.unitCost ?? existing.unitCost),
    shortfall: Math.max(0, (updates.minStock ?? existing.minStock) - (updates.currentStock ?? existing.currentStock)),
    updatedAt: new Date().toISOString(),
  };
  mockReplenishmentItems[idx] = merged;

  // Sync warehouse directory inventoryBalances for this product
  const productId = itemId;
  const quantity = merged.currentStock;
  const productName = merged.name;
  const reorderLevel = merged.minStock;
  const targetWarehouseId = merged.warehouseId;

  for (const wh of mockWarehouseDirectoryData) {
    const balanceIdx = wh.inventoryBalances.findIndex((b) => b.productId === productId);
    if (balanceIdx >= 0) {
      wh.inventoryBalances[balanceIdx] = {
        ...wh.inventoryBalances[balanceIdx],
        quantity,
        productName,
        reorderLevel,
      };
    } else if (wh.id === targetWarehouseId && quantity > 0) {
      wh.inventoryBalances.push({
        productId,
        productName,
        quantity,
        reorderLevel,
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inventory:movement-updated', { detail: { source: 'edit-item', itemId } }));
    // Persist supplier/warehouse to backend so dataset refetch returns updated data
    const payload: Record<string, unknown> = {};
    if (updates.currentsupplierId !== undefined) {
      payload.supplierId = merged.currentsupplierId;
      payload.currentSupplierId = merged.currentsupplierId; // some backends use this
    }
    if (updates.warehouseId !== undefined) payload.warehouseId = merged.warehouseId;
    if (updates.minStock !== undefined) payload.reorderLevel = merged.minStock;
    if (updates.unit !== undefined) payload.unit = merged.unit;
    if (Object.keys(payload).length > 0) {
      apiClient.patch(`/api/products/${itemId}`, payload).catch(() => {
        // Backend may not support PATCH; in-memory update is already applied
      });
    }
  }
  return true;
};

