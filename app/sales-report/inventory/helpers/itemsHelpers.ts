import type { InventoryDropdownOption } from '../components/InventoryDropdown';
import { inventoryWarehouseDirectory } from '../lib/inventoryDataStore';
import type { ReplenishmentItem } from '../types';

type WarehouseLike = { id: string; name: string; isActive: boolean };
type ItemLike = { id: string; warehouseId: string };

/** Quantity for a product in a warehouse context. When warehouseId is null, returns sum across all warehouses. */
export const getItemQuantityForWarehouse = (
  productId: string,
  warehouseId: string | null
): number => {
  if (warehouseId) {
    const wh = inventoryWarehouseDirectory.find((w) => w.id === warehouseId);
    const bal = wh?.inventoryBalances?.find((b) => b.productId === productId);
    return bal?.quantity ?? 0;
  }
  return inventoryWarehouseDirectory
    .filter((w) => w.isActive)
    .reduce((sum, w) => {
      const bal = w.inventoryBalances?.find((b) => b.productId === productId);
      return sum + (bal?.quantity ?? 0);
    }, 0);
};

/**
 * Reorder level for status calculation.
 * Warehouses do NOT have minimum thresholds - only units do.
 * Returns 0 for warehouse context (all or per-warehouse); use item.minStock only for unit view.
 */
export const getItemReorderForWarehouse = (
  item: ReplenishmentItem,
  warehouseId: string | null
): number => {
  // Warehouses: no threshold. Units: use item.minStock (unit items have their own minStock).
  return 0;
};

export const filterItemsByWarehouse = <T extends ItemLike>(
  items: T[],
  activeWarehouseId: string | null
): T[] => {
  if (!activeWarehouseId) return items;

  const targetWarehouse = inventoryWarehouseDirectory.find(
    (warehouse) => warehouse.id === activeWarehouseId
  );
  if (!targetWarehouse) return [];

  const productIds = new Set(
    targetWarehouse.inventoryBalances.map((balance) => balance.productId)
  );

  return items.filter((item) => productIds.has(item.id));
};

export const buildWarehouseOptions = (
  warehouses: WarehouseLike[]
): InventoryDropdownOption<string>[] => {
  const options: InventoryDropdownOption<string>[] = [{ value: 'all', label: 'All Warehouses' }];
  warehouses
    .filter((warehouse) => warehouse.isActive)
    .forEach((warehouse) => {
      options.push({ value: warehouse.id, label: warehouse.name });
    });

  return options;
};
