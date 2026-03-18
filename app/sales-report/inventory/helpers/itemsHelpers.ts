import type { InventoryDropdownOption } from '../components/InventoryDropdown';
import { getUnitCountForProduct, inventoryWarehouseDirectory, isWarehouseActive } from '../lib/inventoryDataStore';
import type { ReplenishmentItem } from '../types';

type WarehouseLike = { id: string; name: string; deletedAt?: string | null };
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
    .filter((w) => isWarehouseActive(w))
    .reduce((sum, w) => {
      const bal = w.inventoryBalances?.find((b) => b.productId === productId);
      return sum + (bal?.quantity ?? 0);
    }, 0);
};

/**
 * Reorder level for status calculation.
 * Warehouse: min threshold × number of units that have this item (so warehouse must cover all units).
 * Unit view uses item.minStock per unit; this is for main/warehouse inventory.
 */
export const getItemReorderForWarehouse = (
  item: ReplenishmentItem,
  _warehouseId: string | null
): number => {
  const min = item.minStock ?? 0;
  const unitCount = getUnitCountForProduct(item.id);
  return min * unitCount;
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
    .filter((warehouse) => isWarehouseActive(warehouse))
    .forEach((warehouse) => {
      options.push({ value: warehouse.id, label: warehouse.name });
    });

  return options;
};
