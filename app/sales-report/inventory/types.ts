export type ItemType = 'consumable' | 'reusable';
export type ItemCategory = 'Cleaning' | 'Hygiene' | 'Food & Drinks' | 'Cooking' | 'Appliances' | 'furniture' | 'Cloth & Sheets' | 'Kitchenware' | 'Other';
export type StockMovementType = 'in' | 'out';
export type DamageStatus = 'open' | 'in-review' | 'resolved' | 'rejected';
export type StockStatus = 'out' | 'critical' | 'low' | 'ok';

// Warehouse Interface
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity?: number;
  createdAt: string;
}

// Supplier Interface
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

// Stock Movement (Audit Trail)
export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  warehouseId?: string;
  unitId?: string;
  unitName?: string;
  reason?: string;
  referenceType?: 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';
  beforeQuantity?: number;
  afterQuantity?: number;
  movementDateTime?: string;
  notes?: string;
  referenceId?: string; // Links to booking, damage, PO, etc.
  createdAt: string;
  createdBy?: string;
}

// Damage Adjustment
export interface DamageAdjustment {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  severity: 'low' | 'medium' | 'high';
  reportedAt: string;
  reportedBy: string;
  status: DamageStatus;
  notes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'pending' | 'partially-received' | 'received' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

// Purchase Order Item
export interface PurchaseOrderLine {
  id: string;
  poId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

// Goods Receipt
export interface GoodsReceiptItem {
  poItemId: string;
  description: string;
  qtyReceived: number;
  unit: string;
  unitCost: number;
}

export interface GoodsReceipt {
  id: string;
  poId: string;
  receiptNo: string;
  warehouseId: string;
  warehouse: string;
  receivedBy: string;
  receivedAt: string;
  notes: string;
  items: GoodsReceiptItem[];
  evidenceImages?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  category: ItemCategory;
  unit: string;
  currentStock: number;
  minStock: number;
  assignedToUnit?: string;
}

/** Item that needs replenishment (currentStock below minStock) with full audit trail */
export interface ReplenishmentItem {
  id: string;
  sku: string;
  name: string;
  type: ItemType;
  category: ItemCategory;
  unit: string;
  currentStock: number;
  minStock: number;
  shortfall: number;
  isLowStock?: boolean;
  
  // Audit & Financial
  unitCost: number;
  totalValue: number;
  /** Primary/default warehouse for this item. Used to auto-fill forms (goods receipt, stock out). Items may have stock in multiple warehouses; this is the preferred one for quick operations. */
  warehouseId: string;
  warehouseName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string;
  
  /** Primary/default supplier. Used to auto-fill PO creation. Items may have multiple suppliers; this is the preferred one for quick operations. */
  currentsupplierId: string;
  supplierName: string;
  
  // Audit History (populated from backend)
  stockMovements?: StockMovement[];
  damageAdjustments?: DamageAdjustment[];
  lastPurchaseOrder?: PurchaseOrder;
  auditNotes?: string;
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

export interface InventoryFeatureLink {
  href: string;
  title: string;
  icon: 'items' | 'suppliers' | 'warehouses' | 'purchaseOrders' | 'stockMovements';
}