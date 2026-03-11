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

export const ITEM_UNITS = ['pcs', 'bars', 'btl', 'rolls', 'boxes', 'kg', 'L', 'packs'];

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
    new CustomEvent('inventory:movement-updated', {
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
  replaceArray(mockReplenishmentItems, dataset.replenishmentItems);
  replaceArray(mockUnitItems, dataset.unitItems);
  replaceArray(mockUnitStockMovements, dataset.unitStockMovements);

  // Warehouses must always reflect exactly what the backend sends.
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

/** Fetches dataset from API. Throws on network/4xx/5xx so caller can avoid applying empty data. */
const fetchInventoryDataset = async (): Promise<InventoryDatasetResponse> => {
  return await apiClient.get<InventoryDatasetResponse>('/api/inventory/dataset');
};

const fetchExternalUnits = async (): Promise<ExternalUnitListing[] | null> => {
  try {
    return await apiClient.get<ExternalUnitListing[]>('/api/units?limit=200&offset=0');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('External units request failed; inventory units list will stay empty.', error);
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
    } else {
      replaceArray(inventoryUnitsState, []);
    }
    emitInventoryDatasetUpdated();
    return;
  }
  if (datasetLoadPromise && !force) return datasetLoadPromise;

  datasetLoadPromise = (async () => {
    let dataset: InventoryDatasetResponse;
    try {
      dataset = await fetchInventoryDataset();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load inventory dataset', error);
      }
      // Do NOT apply empty dataset — that wipes all items and breaks the UI.
      // Leave existing data as-is and mark not loaded so UI can show error/retry.
      isDatasetLoaded = false;
      emitInventoryDatasetUpdated();
      throw error;
    }
    applyDataset(dataset);
    const externalUnits = await fetchExternalUnits();
    if (externalUnits) {
      syncUnitsFromExternalSource(externalUnits);
    } else {
      replaceArray(inventoryUnitsState, []);
    }
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

