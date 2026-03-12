type InventoryBalanceLike = { quantity: number };

type WarehouseLike = { inventoryBalances: InventoryBalanceLike[] };

/** Warehouse stats. Low stock = items at 0 quantity (out of stock); warehouses have no min thresholds like units. */
export const getWarehouseStats = (warehouse: WarehouseLike) => {
  const totalItems = warehouse.inventoryBalances.length;
  const totalStockUnits = warehouse.inventoryBalances.reduce((sum, row) => sum + row.quantity, 0);
  const lowStockItems = warehouse.inventoryBalances.filter((row) => row.quantity <= 0).length;

  return { totalItems, totalStockUnits, lowStockItems };
};
