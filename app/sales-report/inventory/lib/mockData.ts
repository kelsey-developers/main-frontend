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

const deriveWarehousesFromDirectory = (): Warehouse[] => {
  return mockWarehouseDirectoryData.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    location: warehouse.location,
    createdAt: warehouse.stockMovements[0]?.date || new Date().toISOString().slice(0, 10),
  }));
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
export const mockUnits: InventoryUnit[] = [];
export const mockUnitStockMovements: UnitStockMovementRow[] = [];

let isDatasetLoaded = false;
let datasetLoadPromise: Promise<void> | null = null;

const applyDataset = (dataset: InventoryDatasetResponse) => {
  replaceArray(mockWarehouseDirectoryData, dataset.warehouseDirectoryData);
  replaceArray(mockSuppliers, dataset.suppliers);
  replaceArray(mockPurchaseOrders, dataset.purchaseOrders);
  replaceArray(mockPurchaseOrderLines, dataset.purchaseOrderLines);
  replaceArray(mockGoodsReceipts, dataset.goodsReceipts);
  replaceArray(mockStockMovements, dataset.stockMovements);
  replaceArray(mockDamageAdjustments, dataset.damageAdjustments);
  replaceArray(mockReplenishmentItems, dataset.replenishmentItems);
  replaceArray(mockUnits, dataset.units);
  replaceArray(mockUnitItems, dataset.unitItems);
  replaceArray(mockUnitStockMovements, dataset.unitStockMovements);

  if (dataset.warehouses && dataset.warehouses.length > 0) {
    replaceArray(mockWarehouses, dataset.warehouses);
  } else {
    replaceArray(mockWarehouses, deriveWarehousesFromDirectory());
  }

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

const fetchInventoryDataset = async (): Promise<InventoryDatasetResponse> => {
  try {
    return await apiClient.get<InventoryDatasetResponse>('/api/inventory/dataset');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Inventory dataset request failed, using local fallback data.', error);
    }
    return {};
  }
};

export const loadInventoryDataset = async (force = false): Promise<void> => {
  if (isDatasetLoaded && !force) return;
  if (datasetLoadPromise && !force) return datasetLoadPromise;

  datasetLoadPromise = (async () => {
    const dataset = await fetchInventoryDataset();
    applyDataset(dataset);
    isDatasetLoaded = true;
    emitInventoryDatasetUpdated();
  })()
    .catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load inventory dataset', error);
      }
      // Keep the inventory UI interactive even when API is temporarily unreachable.
      if (!isDatasetLoaded) {
        const fallbackSummary = deriveDashboardSummary();
        mockDashboardSummary.totalItems = fallbackSummary.totalItems;
        mockDashboardSummary.totalStocks = fallbackSummary.totalStocks;
        mockDashboardSummary.lowStockCount = fallbackSummary.lowStockCount;
        mockDashboardSummary.replenishmentNeeded = fallbackSummary.replenishmentNeeded;
      }
    })
    .finally(() => {
      datasetLoadPromise = null;
    });

  return datasetLoadPromise;
};

if (typeof window !== 'undefined') {
  void loadInventoryDataset().catch(() => {
    // Keep UI functional even when backend is temporarily unavailable.
  });
}

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

    const unit = mockUnits.find((entry) => entry.id === unitItem.assignedToUnit);
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

