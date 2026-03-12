type InventoryBalanceLike = { quantity: number };

type WarehouseLike = { inventoryBalances: InventoryBalanceLike[] };

/** Warehouse stats. Warehouses do not have minimum thresholds; low stock applies only to units. */
export const getWarehouseStats = (warehouse: WarehouseLike) => {
  const totalItems = warehouse.inventoryBalances.length;
  const totalStockUnits = warehouse.inventoryBalances.reduce((sum, row) => sum + row.quantity, 0);
  const lowStockItems = 0; // Warehouses track quantity only; thresholds apply to units

  return { totalItems, totalStockUnits, lowStockItems };
};
