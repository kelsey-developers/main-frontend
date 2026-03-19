import { apiClient } from '@/lib/api/client';
import type {
  DamageAdjustment,
  GoodsReceipt,
  InventoryDashboardSummary,
  InventoryUnit,
  ItemAllocation,
  ItemCategory,
  ItemType,
  PurchaseOrder,
  PurchaseOrderLine,
  ReplenishmentItem,
  StockMovement,
  Supplier,
  UnitItemDisplay,
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
  type: 'in' | 'out' | 'adjustment';
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
  /** Soft deletion: when set, warehouse is considered inactive/deleted. No isActive in ERD. */
  deletedAt?: string | null;
  inventoryBalances: WarehouseInventoryBalanceRow[];
  stockMovements: WarehouseMovementRow[];
}

/** Warehouse status: supports deletedAt (soft delete) or isActive from backend. */
export const isWarehouseActive = (wh: { deletedAt?: string | null; isActive?: boolean }): boolean =>
  wh.isActive !== undefined ? wh.isActive : !wh.deletedAt;

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
  /** Inventory threshold (product-level), not per unit. */
  minStock?: number;
}

export interface WarehouseUnitAllocationSummary {
  unitId: string;
  unitName: string;
  items: WarehouseUnitAllocationItem[];
}

/** Allocations grouped by unit. Min stock = product-level inventory threshold. */
export const getUnitAllocationsForDisplay = (): WarehouseUnitAllocationSummary[] => {
  const productById = new Map(mockReplenishmentItems.map((p) => [p.id, p]));
  const byUnit = new Map<string, WarehouseUnitAllocationSummary>();

  mockUnitAllocations.forEach((a) => {
    const unit = inventoryUnitsState.find((u) => u.id === a.unitId);
    if (!unit || a.quantity <= 0) return;

    const product = productById.get(a.productId);
    const productName = product?.name ?? a.productId;
    const minStock = product?.minStock ?? 0;

    if (!byUnit.has(unit.id)) {
      byUnit.set(unit.id, { unitId: unit.id, unitName: unit.name, items: [] });
    }
    const row = byUnit.get(unit.id)!;
    const existing = row.items.find((i) => i.productId === a.productId);
    if (existing) {
      existing.quantity += a.quantity;
    } else {
      row.items.push({ productId: a.productId, productName, quantity: a.quantity, minStock });
    }
  });

  return Array.from(byUnit.values());
};

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
  /** Raw unitItems from API – normalized to ItemAllocation (ERD) in applyDataset */
  unitItems?: unknown[];
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
/** Item allocations (ERD): id, productId, unitId, quantity, minStock, updatedAt */
export const mockUnitAllocations: ItemAllocation[] = [];
/** Display cache: joins allocations with product info. Refreshed in applyDataset and updateProductMinStock. */
export const mockUnitItems: UnitItemDisplay[] = [];
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

/** Normalize raw API unitItem to ItemAllocation (ERD). Supports ERD shape and legacy (name, assignedToUnit, currentStock). */
const normalizeUnitItemToAllocation = (
  item: unknown,
  existingAllocations: ItemAllocation[]
): ItemAllocation | null => {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;

  const productId = obj.productId != null ? String(obj.productId) : obj.id != null ? String(obj.id) : null;
  const unitId = obj.unitId != null ? String(obj.unitId) : obj.assignedToUnit != null ? String(obj.assignedToUnit) : null;
  const allocationId = obj.id != null ? String(obj.id) : productId && unitId ? `${productId}::${unitId}` : null;

  if (!allocationId || !productId || !unitId) return null;

  const quantity = typeof obj.quantity === 'number' ? obj.quantity : Number(obj.currentStock) || 0;
  let minStock = typeof obj.minStock === 'number' ? obj.minStock : Number(obj.minStock) || 0;

  if (minStock === 0) {
    const existing = existingAllocations.find((a) => a.id === allocationId);
    if (existing && existing.minStock > 0) minStock = existing.minStock;
  }

  const updatedAt = obj.updatedAt != null ? String(obj.updatedAt) : undefined;

  return { id: allocationId, productId, unitId, quantity, minStock, updatedAt };
};

/** Builds mockUnitItems from allocations + products for display. Min stock = product-level inventory threshold. */
const refreshUnitItemsDisplay = () => {
  const productById = new Map(mockReplenishmentItems.map((p) => [p.id, p]));
  const display: UnitItemDisplay[] = mockUnitAllocations.map((a) => {
    const product = productById.get(a.productId);
    const name = product?.name ?? a.productId;
    const unit = product ? normalizeUnit(product.unit) : 'pcs';
    return {
      id: a.id,
      productId: a.productId,
      unitId: a.unitId,
      name,
      unit,
      currentStock: a.quantity,
      minStock: product?.minStock ?? 0,
      assignedToUnit: a.unitId,
    };
  });
  replaceArray(mockUnitItems, display);
};

/** Number of units that have this product allocated. Used for warehouse reorder = minThreshold × unit count. */
export const getUnitCountForProduct = (productId: string): number => {
  const unitIds = new Set<string>();
  for (const row of mockUnitItems) {
    const pid = row.productId ?? (row as { id?: string }).id;
    const uid = row.unitId ?? row.assignedToUnit;
    if (pid === productId && uid) unitIds.add(uid);
  }
  return unitIds.size;
};

const normalizeWarehouseRecord = (wh: Record<string, unknown>): WarehouseDirectoryRecord => {
  const { isActive, is_active, deletedAt, deleted_at, ...rest } = wh;
  // Backend has no isActive; use deletedAt/deleted_at for soft deletion. Legacy isActive/is_active → deletedAt.
  const rawDeleted = deletedAt ?? deleted_at;
  const legacyInactive = isActive === false || is_active === false;
  const effectiveDeletedAt =
    rawDeleted != null && rawDeleted !== ''
      ? String(rawDeleted)
      : legacyInactive
        ? '1970-01-01T00:00:00Z' // legacy: treat inactive as soft-deleted
        : undefined;
  return { ...rest, deletedAt: effectiveDeletedAt } as WarehouseDirectoryRecord;
};

const applyDataset = (dataset: InventoryDatasetResponse) => {
  const rawWarehouses = Array.isArray(dataset.warehouseDirectoryData) ? dataset.warehouseDirectoryData : [];
  const normalizedWarehouses = rawWarehouses.map((wh) =>
    wh && typeof wh === 'object' ? normalizeWarehouseRecord(wh as unknown as Record<string, unknown>) : wh
  ) as WarehouseDirectoryRecord[];
  replaceArray(mockWarehouseDirectoryData, normalizedWarehouses);
  replaceArray(mockSuppliers, dataset.suppliers);
  replaceArray(mockPurchaseOrders, dataset.purchaseOrders);
  replaceArray(mockPurchaseOrderLines, dataset.purchaseOrderLines);
  replaceArray(mockGoodsReceipts, dataset.goodsReceipts);
  const stockMovements = Array.isArray(dataset.stockMovements) ? dataset.stockMovements : [];
  const normalizedStockMovements = stockMovements.map((m) => {
    if (!m || typeof m !== 'object') return m;
    const obj = m as { type?: string; referenceType?: string; quantity?: number };
    const rawType = String(obj.type ?? '').toLowerCase();
    const refType = String(obj.referenceType ?? '').toLowerCase();

    // Backend may return type 'ADJUSTMENT' or convert to IN/OUT with referenceType 'manual_adjustment'
    const isAdjustment =
      rawType === 'adjustment' ||
      refType === 'manual_adjustment';

    if (isAdjustment) {
      const qty = typeof obj.quantity === 'number' ? obj.quantity : 0;
      // Backend may store ADJUSTMENT as IN/OUT; convert to signed quantity for adjustment display
      const signedQty =
        rawType === 'adjustment'
          ? qty
          : rawType === 'out' && refType === 'manual_adjustment'
            ? -Math.abs(qty)
            : Math.abs(qty);
      return { ...m, type: 'adjustment' as const, quantity: signedQty };
    }

    const canonical = rawType === 'in' ? 'in' : 'out';
    if (canonical !== obj.type) {
      return { ...m, type: canonical };
    }
    return m;
  });
  replaceArray(mockStockMovements, normalizedStockMovements);
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
  const normalizedAllocations = unitItems
    .map((item: unknown) => normalizeUnitItemToAllocation(item, mockUnitAllocations))
    .filter((a): a is ItemAllocation => a != null);
  replaceArray(mockUnitAllocations, normalizedAllocations);
  refreshUnitItemsDisplay();
  replaceArray(mockUnitStockMovements, dataset.unitStockMovements ?? []);

  // Units from dataset (backend includes id, name, type, location, itemCount, imageUrl)
  const rawUnits = Array.isArray(dataset.units) ? dataset.units : [];
  const normalizedUnits = rawUnits
    .filter((u) => u != null && typeof u === 'object')
    .map((u) => {
      const o = u as unknown as Record<string, unknown>;
      return {
        id: String(o.id ?? ''),
        name: String(o.name ?? o.title ?? ''),
        type: String(o.type ?? o.property_type ?? 'unit'),
        location: String(o.location ?? o.city ?? ''),
        itemCount: typeof o.itemCount === 'number' ? o.itemCount : 0,
        imageUrl: String(o.imageUrl ?? o.main_image_url ?? '/heroimage.png'),
      };
    })
    .filter((u) => u.id);
  replaceArray(inventoryUnitsState, normalizedUnits);

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
  mockUnitAllocations.forEach((a) => {
    const current = itemCountByUnitId.get(a.unitId) ?? 0;
    itemCountByUnitId.set(a.unitId, current + 1);
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
    // Avoid replacing dataset-backed units with /api/units fallback results on routine refreshes.
    // /api/units can be a reduced subset (e.g. availability filtered), which can hide units in inventory views.
    if (inventoryUnitsState.length === 0) {
      const externalUnits = await fetchExternalUnits();
      if (externalUnits) {
        syncUnitsFromExternalSource(externalUnits);
      }
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
    // Fallback: if dataset had no units, fetch from /api/units (e.g. external listings)
    const hasUnitsFromDataset = Array.isArray((dataset as InventoryDatasetResponse).units) && (dataset as InventoryDatasetResponse).units!.length > 0;
    if (!hasUnitsFromDataset) {
      const externalUnits = await fetchExternalUnits();
      if (externalUnits) {
        syncUnitsFromExternalSource(externalUnits);
      }
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

/** Returns allocated quantity for a product in a unit (from ItemAllocation). Used for write-off validation. */
export const getAllocatedQuantityForUnit = (productId: string, unitId: string): number => {
  const a = mockUnitAllocations.find((x) => x.productId === productId && x.unitId === unitId);
  return a?.quantity ?? 0;
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
  // reorderLevel: only set when creating NEW balance (use product.minStock as default).
  // Existing balances keep their warehouse-specific reorderLevel (not overwritten).
  const productId = itemId;
  const quantity = merged.currentStock;
  const productName = merged.name;
  const defaultReorderLevel = merged.minStock;
  const targetWarehouseId = merged.warehouseId;

  for (const wh of mockWarehouseDirectoryData) {
    const balanceIdx = wh.inventoryBalances.findIndex((b) => b.productId === productId);
    if (balanceIdx >= 0) {
      wh.inventoryBalances[balanceIdx] = {
        ...wh.inventoryBalances[balanceIdx],
        quantity,
        productName,
        // Preserve existing warehouse-specific reorderLevel; do not overwrite
      };
    } else if (wh.id === targetWarehouseId && quantity > 0) {
      wh.inventoryBalances.push({
        productId,
        productName,
        quantity,
        reorderLevel: defaultReorderLevel,
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
    if (updates.unitCost !== undefined) payload.unitCost = merged.unitCost;
    if (Object.keys(payload).length > 0) {
      apiClient.patch(`/api/products/${itemId}`, payload).catch(() => {
        // Backend may not support PATCH; in-memory update is already applied
      });
    }
  }
  return true;
};

/**
 * Updates the inventory threshold (product-level min stock). Not per unit/warehouse.
 * Uses updateInventoryItem which PATCHes /api/products/:productId { reorderLevel }.
 */
export const updateProductMinStock = async (productId: string, minStock: number): Promise<boolean> => {
  const idx = mockReplenishmentItems.findIndex((i) => i.id === productId);
  if (idx < 0) return false;

  const safeValue = Math.max(0, minStock);
  updateInventoryItem(productId, { minStock: safeValue });
  refreshUnitItemsDisplay();
  return true;
};
