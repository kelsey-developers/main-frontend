import type { InventoryDropdownOption } from '../components/InventoryDropdown';
import { mockWarehouseDirectoryData } from '../lib/mockData';

type WarehouseLike = { id: string; name: string; isActive: boolean };
type ItemLike = { id: string; warehouseId: string };

export const filterItemsByWarehouse = <T extends ItemLike>(
  items: T[],
  activeWarehouseId: string | null
): T[] => {
  if (!activeWarehouseId) return items;

  const targetWarehouse = mockWarehouseDirectoryData.find(
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
