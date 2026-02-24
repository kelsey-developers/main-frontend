export type ItemType = 'consumable' | 'reusable';

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  unit: string;
  currentStock: number;
  minStock: number;
  assignedToUnit?: string;
}

/** Item that needs replenishment (currentStock below minStock) */
export interface ReplenishmentItem {
  id: string;
  name: string;
  type: ItemType;
  currentStock: number;
  minStock: number;
  shortfall: number;
}

export interface InventoryDashboardSummary {
  /** Number of item records (rows) in the table */
  totalItems: number;
  /** Sum of currentStock across all items */
  totalStocks: number;
  lowStockCount: number;
  replenishmentNeeded: number;
}

/** Unit (property) for assignment and search */
export interface InventoryUnit {
  id: string;
  name: string;
  type: string;
  location?: string;
  itemCount?: number;
  imageUrl?: string;
}
