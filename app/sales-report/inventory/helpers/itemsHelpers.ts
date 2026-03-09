import type { InventoryDropdownOption } from '../components/InventoryDropdown';

type WarehouseLike = { id: string; name: string; isActive: boolean };
type ItemLike = { warehouseId: string };

export const filterItemsByWarehouse = <T extends ItemLike>(
  items: T[],
  activeWarehouseId: string | null
): T[] => {
  if (!activeWarehouseId) return items;
  return items.filter((item) => item.warehouseId === activeWarehouseId);
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
