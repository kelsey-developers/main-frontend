type InventoryBalanceLike = { quantity: number; reorderLevel: number };

type WarehouseLike = { inventoryBalances: InventoryBalanceLike[] };

export const getWarehouseStats = (warehouse: WarehouseLike) => {
  const totalItems = warehouse.inventoryBalances.length;
  const totalStockUnits = warehouse.inventoryBalances.reduce((sum, row) => sum + row.quantity, 0);
  const lowStockItems = warehouse.inventoryBalances.filter((row) => row.quantity < row.reorderLevel).length;

  return { totalItems, totalStockUnits, lowStockItems };
};
