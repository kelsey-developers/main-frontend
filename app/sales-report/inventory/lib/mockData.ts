import type { InventoryDashboardSummary, ReplenishmentItem, InventoryUnit, InventoryItem, Warehouse, Supplier, StockMovement, DamageAdjustment, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, ItemType, ItemCategory } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────
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

// ─── Mock Data ───────────────────────────────────────────────────────────
export const mockDashboardSummary: InventoryDashboardSummary = {
  totalItems: 15,
  totalStocks: 58,
  lowStockCount: 15,
  replenishmentNeeded: 15,
};

// Mock Warehouses
export const mockWarehouses: Warehouse[] = [
  { id: 'wh1', name: 'Main Storage', location: 'Building A - Ground Floor', capacity: 10000, createdAt: '2025-01-01' },
  { id: 'wh2', name: 'Utility Room', location: '2nd Floor - East Wing', capacity: 5000, createdAt: '2025-02-01' },
  { id: 'wh3', name: 'Kitchen Stockroom', location: 'Building B - Pantry', capacity: 3000, createdAt: '2025-02-15' },
  { id: 'wh4', name: 'Archive Shelf', location: 'Basement - Room 3', capacity: 2000, createdAt: '2025-01-20' },
];

// Mock Suppliers
export const mockSuppliers: Supplier[] = [
  { id: 's1', name: 'Clean & Co', email: 'sales@cleanco.ph', phone: '+63-88-123-4567', address: 'Davao City', createdAt: '2025-01-01', updatedAt: '2025-03-01' },
  { id: 's2', name: 'Premium Supply Inc', email: 'order@premium.ph', phone: '+63-88-765-4321', address: 'Cebu City', createdAt: '2025-01-15', updatedAt: '2025-02-28' },
  { id: 's3', name: 'Eco Supplies Ltd', email: 'info@ecosupply.ph', phone: '+63-88-456-7890', address: 'Manila', createdAt: '2025-02-01', updatedAt: '2025-03-05' },
];

// Supplier Directory page seed data.
// Replace this export with API response mapping when backend endpoint is ready.
const supplierDirectorySeedData = [
  {
    id: 's1', name: 'Clean & Co', contactName: 'Maria Santos',
    email: 'maria@cleanandco.ph', phone: '+63 917 234 5678',
    address: '123 Bonifacio St, Davao City',
    isActive: true, activePOs: 3, lastOrderDate: 'Mar 01, 2025',
    notes: 'Preferred supplier for hygiene consumables. Net-30 terms.',
    createdAt: 'Jan 10, 2024',
  },
  {
    id: 's2', name: 'Premium Supply Inc', contactName: 'Ramon Garcia',
    email: 'ramon@premium.ph', phone: '+63 88 765 4321',
    address: 'Cebu Business Park, Cebu City',
    isActive: true, activePOs: 2, lastOrderDate: 'Mar 02, 2025',
    notes: 'Premium supplier for toiletries and supplies.',
    createdAt: 'Feb 05, 2024',
  },
  {
    id: 's3', name: 'Eco Supplies Ltd', contactName: 'Lisa Fernandez',
    email: 'lisa@ecosupply.ph', phone: '+63 88 456 7890',
    address: 'Makati Avenue, Manila',
    isActive: true, activePOs: 1, lastOrderDate: 'Mar 05, 2025',
    notes: 'Eco-friendly products. Competitive pricing.',
    createdAt: 'Apr 12, 2024',
  },
  {
    id: 's4', name: 'ProClean Davao', contactName: 'Jose Reyes',
    email: 'jose@proclean.ph', phone: '+63 918 567 8901',
    address: '45 Diversion Rd, Davao City',
    isActive: true, activePOs: 2, lastOrderDate: 'Feb 28, 2025',
    notes: 'Bulk discounts on orders over PHP 5,000.',
    createdAt: 'Mar 05, 2024',
  },
  {
    id: 's5', name: 'LinenCo PH', contactName: 'Ana Cruz',
    email: 'ana@linenco.ph', phone: '+63 919 345 6789',
    address: '78 CM Recto, Davao City',
    isActive: true, activePOs: 1, lastOrderDate: 'Feb 15, 2025',
    createdAt: 'Jun 20, 2024',
  },
  {
    id: 's6', name: 'Brew Direct PH', contactName: 'Carlos Tan',
    email: 'carlos@brewdirect.ph', phone: '+63 920 678 9012',
    address: '22 Magsaysay Ave, Davao City',
    isActive: true, activePOs: 1, lastOrderDate: 'Mar 04, 2025',
    notes: 'Specialty coffee pods - 2-week lead time.',
    createdAt: 'Sep 12, 2024',
  },
  {
    id: 's7', name: 'OldStock Supply', contactName: 'Ben Lim',
    email: 'ben@oldstock.ph', phone: '+63 921 890 1234',
    address: '56 Gen. Malvar, Davao City',
    isActive: false, activePOs: 0, lastOrderDate: 'Oct 12, 2024',
    notes: 'Deactivated - quality issues reported Q4 2024.',
    createdAt: 'Feb 14, 2023',
  },
];

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

// Warehouse Directory page mock data.
// Replace this export with API response mapping when backend endpoint is ready.
export const mockWarehouseDirectoryData: WarehouseDirectoryRecord[] = [
  {
    id: 'wh1',
    name: 'Main Storage',
    location: 'Building A - Ground Floor',
    description: 'Primary storage for daily consumables.',
    isActive: true,
    inventoryBalances: [
      { productId: '1', productName: 'Towels', quantity: 8, reorderLevel: 20 },
      { productId: '2', productName: 'Soap (bars)', quantity: 5, reorderLevel: 15 },
      { productId: '3', productName: 'Shampoo (bottles)', quantity: 3, reorderLevel: 12 },
      { productId: '5', productName: 'Tissue (boxes)', quantity: 4, reorderLevel: 12 },
      { productId: '6', productName: 'Toilet paper (rolls)', quantity: 6, reorderLevel: 24 },
      { productId: '7', productName: 'Dish soap', quantity: 2, reorderLevel: 8 },
      { productId: '8', productName: 'Coffee pods', quantity: 10, reorderLevel: 30 },
      { productId: '10', productName: 'Laundry detergent', quantity: 1, reorderLevel: 6 },
      { productId: '11', productName: 'Fabric softener', quantity: 4, reorderLevel: 8 },
      { productId: '12', productName: 'Hand sanitizer', quantity: 7, reorderLevel: 12 },
      { productId: '14', productName: 'Spare keys', quantity: 2, reorderLevel: 5 },
      { productId: '15', productName: 'Iron', quantity: 1, reorderLevel: 3 },
    ],
    stockMovements: [
      { id: 'WM-001', type: 'in', productName: 'Towels', quantity: 40, date: '2025-03-03', time: '08:15', recordedAt: '2025-03-03 08:15', note: 'PO delivery received' },
      { id: 'WM-002', type: 'out', productName: 'Soap (bars)', quantity: 15, date: '2025-03-04', time: '11:20', recordedAt: '2025-03-04 11:20', note: 'Issued to cleaning team' },
      { id: 'WM-003', type: 'transfer', productName: 'Laundry detergent', quantity: 8, date: '2025-03-06', time: '14:05', recordedAt: '2025-03-06 14:05', note: 'Moved to Utility Room' },
    ],
  },
  {
    id: 'wh2',
    name: 'Utility Room',
    location: '2nd Floor - East Wing',
    description: 'Fast-access stock near service units.',
    isActive: true,
    inventoryBalances: [
      { productId: '4', productName: 'Trash bags', quantity: 2, reorderLevel: 10 },
      { productId: '9', productName: 'Paper towels', quantity: 3, reorderLevel: 15 },
      { productId: '13', productName: 'Air freshener', quantity: 0, reorderLevel: 5 },
    ],
    stockMovements: [
      { id: 'WM-004', type: 'in', productName: 'Trash bags', quantity: 20, date: '2025-03-01', time: '09:40', recordedAt: '2025-03-01 09:40', note: 'Weekly replenishment' },
      { id: 'WM-005', type: 'out', productName: 'Paper towels', quantity: 6, date: '2025-03-05', time: '16:35', recordedAt: '2025-03-05 16:35', note: 'Assigned to units' },
    ],
  },
  {
    id: 'wh3',
    name: 'Kitchen Stockroom',
    location: 'Building B - Pantry',
    description: 'Temperature-controlled storage for kitchen supplies.',
    isActive: false,
    inventoryBalances: [],
    stockMovements: [
      { id: 'WM-006', type: 'out', productName: 'Coffee pods', quantity: 10, date: '2025-02-26', time: '10:10', recordedAt: '2025-02-26 10:10', note: 'Event allocation' },
      { id: 'WM-007', type: 'transfer', productName: 'Dish soap', quantity: 3, date: '2025-02-28', time: '15:25', recordedAt: '2025-02-28 15:25', note: 'Transferred to Main Storage' },
    ],
  },
  {
    id: 'wh4',
    name: 'Archive Shelf',
    location: 'Basement - Room 3',
    description: 'Reserved shelf for retired SKUs.',
    isActive: true,
    inventoryBalances: [],
    stockMovements: [],
  },
];

// Mock Stock Movements
export const mockStockMovements: StockMovement[] = [
  // Product 1 - Towels
  { id: 'SM-001', productId: '1', warehouseId: 'wh1', type: 'in', quantity: 50, reason: 'Goods receipt', referenceType: 'PO', referenceId: 'GR-001', beforeQuantity: 8, afterQuantity: 58, movementDateTime: '2025-03-08 09:14', notes: 'Goods Receipt - All items in good condition.', createdAt: '2025-03-08 09:14', createdBy: 'Maria Santos' },
  { id: 'SM-002', productId: '1', warehouseId: 'wh1', unitId: 'u1', unitName: 'Unit 711', type: 'out', quantity: 30, reason: 'Distributed to unit', referenceType: 'MANUAL', referenceId: 'u1', beforeQuantity: 58, afterQuantity: 28, movementDateTime: '2025-02-20', notes: 'Distributed to Unit 711', createdAt: '2025-02-20', createdBy: 'Warehouse Staff' },
  { id: 'SM-003', productId: '1', warehouseId: 'wh1', type: 'out', quantity: 12, reason: 'Damage adjustment', referenceType: 'DAMAGE', referenceId: 'da1', beforeQuantity: 28, afterQuantity: 16, movementDateTime: '2025-02-25', notes: 'Damage adjustment after inspection', createdAt: '2025-02-25', createdBy: 'Inventory Manager' },
  
  // Product 2 - Soap (bars)
  { id: 'SM-004', productId: '2', warehouseId: 'wh1', type: 'out', quantity: 12, reason: 'Room preparation', referenceType: 'BOOKING', referenceId: 'BK-2025-003', beforeQuantity: 45, afterQuantity: 33, movementDateTime: '2025-03-08 10:02', notes: 'Room prep for 3-night stay.', createdAt: '2025-03-08 10:02', createdBy: 'Juan Reyes' },
  { id: 'SM-005', productId: '2', warehouseId: 'wh1', type: 'in', quantity: 40, reason: 'PO received', referenceType: 'PO', referenceId: 'po2', beforeQuantity: 5, afterQuantity: 45, movementDateTime: '2025-02-18', notes: 'PO-2025-002 received', createdAt: '2025-02-18', createdBy: 'Admin User' },
  { id: 'SM-006', productId: '2', warehouseId: 'wh1', type: 'out', quantity: 25, reason: 'Weekly distribution', referenceType: 'BOOKING', referenceId: 'booking1', beforeQuantity: 33, afterQuantity: 8, movementDateTime: '2025-02-22', notes: 'Weekly distribution', createdAt: '2025-02-22', createdBy: 'Warehouse Staff' },
  
  // Product 3 - Shampoo (bottles)
  { id: 'SM-007', productId: '3', warehouseId: 'wh1', type: 'out', quantity: 6, reason: 'Booking allocation', referenceType: 'BOOKING', referenceId: 'BK-2025-004', beforeQuantity: 33, afterQuantity: 27, movementDateTime: '2025-03-08 10:45', notes: '', createdAt: '2025-03-08 10:45', createdBy: 'Ana Cruz' },
  { id: 'SM-008', productId: '3', warehouseId: 'wh1', type: 'in', quantity: 30, reason: 'Emergency reorder', referenceType: 'PO', referenceId: 'po3', beforeQuantity: 3, afterQuantity: 33, movementDateTime: '2025-02-17', notes: 'Emergency reorder', createdAt: '2025-02-17', createdBy: 'Purchase Officer' },
  { id: 'SM-009', productId: '3', warehouseId: 'wh1', type: 'out', quantity: 5, reason: 'Transit damage', referenceType: 'DAMAGE', referenceId: 'da2', beforeQuantity: 27, afterQuantity: 22, movementDateTime: '2025-02-21', notes: 'Bottles leaked during transit', createdAt: '2025-02-21', createdBy: 'QA Inspector' },
  
  // Product 4 - Trash bags
  { id: 'SM-010', productId: '4', warehouseId: 'wh2', type: 'out', quantity: 4, reason: 'Damage disposal', referenceType: 'DAMAGE', referenceId: 'DI-2025-002', beforeQuantity: 22, afterQuantity: 18, movementDateTime: '2025-03-07 16:30', notes: 'Water damage — disposed of 4 rolls.', createdAt: '2025-03-07 16:30', createdBy: 'Maria Santos' },
  { id: 'SM-011', productId: '4', warehouseId: 'wh2', type: 'in', quantity: 50, reason: 'Bulk purchase', referenceType: 'PO', referenceId: 'po4', beforeQuantity: 2, afterQuantity: 52, movementDateTime: '2025-01-25', notes: 'Bulk purchase for Q1', createdAt: '2025-01-25', createdBy: 'Purchase Officer' },
  { id: 'SM-012', productId: '4', warehouseId: 'wh2', type: 'out', quantity: 20, reason: 'Unit distribution', referenceType: 'MANUAL', referenceId: '', beforeQuantity: 52, afterQuantity: 32, movementDateTime: '2025-02-10', notes: 'Distributed across multiple units', createdAt: '2025-02-10', createdBy: 'Warehouse Staff' },
  
  // Product 5 - Conditioner
  { id: 'SM-013', productId: '5', warehouseId: 'wh1', type: 'in', quantity: 80, reason: 'PO received', referenceType: 'PO', referenceId: 'GR-001', beforeQuantity: 4, afterQuantity: 84, movementDateTime: '2025-02-15', notes: 'PO-2025-001 received', createdAt: '2025-02-15', createdBy: 'Maria Santos' },
  { id: 'SM-014', productId: '5', warehouseId: 'wh1', type: 'out', quantity: 45, reason: 'Room preparation', referenceType: 'BOOKING', referenceId: 'BK-2025-001', beforeQuantity: 84, afterQuantity: 39, movementDateTime: '2025-02-28', notes: 'Room preparation - bulk checkout', createdAt: '2025-02-28', createdBy: 'Juan Reyes' },
  
  // Product 8 - Toilet paper
  { id: 'SM-015', productId: '8', warehouseId: 'wh1', type: 'in', quantity: 200, reason: 'PO received', referenceType: 'PO', referenceId: 'GR-002', beforeQuantity: 10, afterQuantity: 210, movementDateTime: '2025-02-17', notes: 'PO-2025-002 received', createdAt: '2025-02-17', createdBy: 'Juan Reyes' },
  { id: 'SM-016', productId: '8', warehouseId: 'wh1', type: 'out', quantity: 60, reason: 'Unit distribution', referenceType: 'MANUAL', referenceId: '', beforeQuantity: 210, afterQuantity: 150, movementDateTime: '2025-03-01', notes: 'Regular unit distribution', createdAt: '2025-03-01', createdBy: 'Ana Cruz' },
  
  // Product 9 - Floor cleaner
  { id: 'SM-017', productId: '9', warehouseId: 'wh2', type: 'in', quantity: 50, reason: 'Partial delivery', referenceType: 'PO', referenceId: 'GR-002', beforeQuantity: 3, afterQuantity: 53, movementDateTime: '2025-02-17', notes: 'Partial — floor cleaner short by 10 bottles.', createdAt: '2025-02-17', createdBy: 'Juan Reyes' },
  { id: 'SM-018', productId: '9', warehouseId: 'wh2', type: 'in', quantity: 10, reason: 'Remaining delivery', referenceType: 'PO', referenceId: 'GR-003', beforeQuantity: 53, afterQuantity: 63, movementDateTime: '2025-02-18', notes: 'Remaining 10 bottles received.', createdAt: '2025-02-18', createdBy: 'Maria Santos' },
  { id: 'SM-019', productId: '9', warehouseId: 'wh2', type: 'out', quantity: 15, reason: 'Deep cleaning operations', referenceType: 'MANUAL', referenceId: '', beforeQuantity: 63, afterQuantity: 48, movementDateTime: '2025-02-25', notes: 'Deep cleaning operations', createdAt: '2025-02-25', createdBy: 'Warehouse Staff' },
  
  // Product 10 - Coffee (pods)
  { id: 'SM-020', productId: '10', warehouseId: 'wh1', type: 'in', quantity: 30, reason: 'PO received', referenceType: 'PO', referenceId: 'po3', beforeQuantity: 1, afterQuantity: 31, movementDateTime: '2025-02-17', notes: 'PO-2025-003 received', createdAt: '2025-02-17', createdBy: 'Purchase Officer' },
  { id: 'SM-021', productId: '10', warehouseId: 'wh1', type: 'out', quantity: 18, reason: 'Guest amenity distribution', referenceType: 'BOOKING', referenceId: 'BK-2025-002', beforeQuantity: 31, afterQuantity: 13, movementDateTime: '2025-03-05', notes: 'Guest amenity distribution', createdAt: '2025-03-05', createdBy: 'Ana Cruz' },
  
  // Product 11 - Fabric softener
  { id: 'SM-022', productId: '11', warehouseId: 'wh1', type: 'in', quantity: 25, reason: 'Regular replenishment', referenceType: 'PO', referenceId: 'po5', beforeQuantity: 4, afterQuantity: 29, movementDateTime: '2025-02-05', notes: 'Regular stock replenishment', createdAt: '2025-02-05', createdBy: 'Admin User' },
  { id: 'SM-023', productId: '11', warehouseId: 'wh1', type: 'out', quantity: 21, reason: 'Laundry operations', referenceType: 'MANUAL', referenceId: '', beforeQuantity: 29, afterQuantity: 8, movementDateTime: '2025-02-19', notes: 'Laundry operations', createdAt: '2025-02-19', createdBy: 'Warehouse Staff' },
  
  // Product 13 - Air freshener
  { id: 'SM-024', productId: '13', warehouseId: 'wh2', type: 'in', quantity: 15, reason: 'Restocking utility room', referenceType: 'PO', referenceId: 'po6', beforeQuantity: 0, afterQuantity: 15, movementDateTime: '2025-02-09', notes: 'Restocking utility room', createdAt: '2025-02-09', createdBy: 'Mike Storage' },
  { id: 'SM-025', productId: '13', warehouseId: 'wh2', type: 'out', quantity: 3, reason: 'Damage adjustment', referenceType: 'DAMAGE', referenceId: 'DI-2025-001', beforeQuantity: 15, afterQuantity: 12, movementDateTime: '2025-03-01', notes: 'Minor cosmetic dents', createdAt: '2025-03-01', createdBy: 'Mike Storage' },
  { id: 'SM-026', productId: '13', warehouseId: 'wh2', type: 'out', quantity: 12, reason: 'Unit distribution', referenceType: 'MANUAL', referenceId: '', beforeQuantity: 12, afterQuantity: 0, movementDateTime: '2025-02-15', notes: 'Distributed to active units', createdAt: '2025-02-15', createdBy: 'Warehouse Staff' },
];

// Ensure seeded movement datetimes follow a single `YYYY-MM-DD HH:mm` format.
mockStockMovements.forEach((movement) => {
  const rawValue = movement.movementDateTime || movement.createdAt;
  if (!rawValue) return;

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(rawValue)) {
    movement.movementDateTime = rawValue;
    movement.createdAt = rawValue;
    return;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const normalized = `${rawValue} 00:00`;
    movement.movementDateTime = normalized;
    movement.createdAt = normalized;
  }
});

// Mock Damage Adjustments
export const mockDamageAdjustments: DamageAdjustment[] = [
  { id: 'da1', productId: '1', warehouseId: 'wh1', quantity: 12, severity: 'medium', reportedAt: '2025-02-25', reportedBy: 'John Inventory', status: 'resolved', notes: 'Mold damage in storage area', reviewedAt: '2025-02-26', reviewedBy: 'Maria QA' },
  { id: 'da2', productId: '3', warehouseId: 'wh1', quantity: 5, severity: 'high', reportedAt: '2025-02-21', reportedBy: 'Sarah Logistics', status: 'in-review', notes: 'Transit damage, investigating carrier' },
  { id: 'da3', productId: '13', warehouseId: 'wh1', quantity: 3, severity: 'low', reportedAt: '2025-03-01', reportedBy: 'Mike Storage', status: 'open', notes: 'Minor cosmetic dents' },
];

// Mock Purchase Orders
export const mockPurchaseOrders: PurchaseOrder[] = [
  { id: 'po1', supplierId: 's1', orderDate: '2025-02-01', expectedDelivery: '2025-02-15', status: 'received', totalAmount: 18000, createdAt: '2025-02-01' },
  { id: 'po2', supplierId: 's1', orderDate: '2025-02-10', expectedDelivery: '2025-02-18', status: 'received', totalAmount: 12200, createdAt: '2025-02-10' },
  { id: 'po3', supplierId: 's2', orderDate: '2025-02-15', expectedDelivery: '2025-02-17', status: 'received', totalAmount: 10000, createdAt: '2025-02-15' },
  { id: 'po4', supplierId: 's3', orderDate: '2025-02-28', expectedDelivery: '2025-03-10', status: 'pending', totalAmount: 20000, createdAt: '2025-02-28' },
  { id: 'po5', supplierId: 's1', orderDate: '2025-03-01', expectedDelivery: '2025-03-12', status: 'partially-received', totalAmount: 34400, createdAt: '2025-03-01' },
  { id: 'po6', supplierId: 's1', orderDate: '2025-01-20', expectedDelivery: '2025-01-30', status: 'cancelled', totalAmount: 5500, createdAt: '2025-01-20' },
];

// Mock Purchase Order Lines
export const mockPurchaseOrderLines: PurchaseOrderLine[] = [
  // PO1 items
  { id: 'pol1', poId: 'po1', productId: '1', quantity: 50, unitPrice: 180, receivedQuantity: 50 },
  { id: 'pol2', poId: 'po1', productId: '2', quantity: 100, unitPrice: 30, receivedQuantity: 100 },
  { id: 'pol3', poId: 'po1', productId: '5', quantity: 80, unitPrice: 75, receivedQuantity: 80 },
  // PO2 items
  { id: 'pol4', poId: 'po2', productId: '8', quantity: 200, unitPrice: 25, receivedQuantity: 200 },
  { id: 'pol5', poId: 'po2', productId: '9', quantity: 60, unitPrice: 120, receivedQuantity: 60 },
  // PO3 items
  { id: 'pol6', poId: 'po3', productId: '10', quantity: 30, unitPrice: 200, receivedQuantity: 30 },
  { id: 'pol7', poId: 'po3', productId: '11', quantity: 80, unitPrice: 50, receivedQuantity: 80 },
  // PO4 items (pending)
  { id: 'pol8', poId: 'po4', productId: '12', quantity: 10, unitPrice: 1200, receivedQuantity: 0 },
  { id: 'pol9', poId: 'po4', productId: '13', quantity: 50, unitPrice: 160, receivedQuantity: 0 },
  // PO5 items (partially received)
  { id: 'pol10', poId: 'po5', productId: '14', quantity: 120, unitPrice: 220, receivedQuantity: 60 },
  { id: 'pol11', poId: 'po5', productId: '15', quantity: 100, unitPrice: 80, receivedQuantity: 100 },
  // PO6 items (cancelled)
  { id: 'pol12', poId: 'po6', productId: '16', quantity: 40, unitPrice: 137.5, receivedQuantity: 0 },
];

// Mock Goods Receipts
export const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr1',
    poId: 'po1',
    receiptNo: 'GR-001',
    warehouseId: 'wh1',
    warehouse: 'Main Storage',
    receivedBy: 'Maria Santos',
    receivedAt: 'Feb 15, 2025',
    notes: 'All items in good condition.',
    evidenceImages: ['/receipt-mocks/gr-001.svg'],
    items: [
      { poItemId: 'pol1', description: 'Towels (sets)', qtyReceived: 50, unit: 'pcs', unitCost: 180 },
      { poItemId: 'pol2', description: 'Soap (bars)', qtyReceived: 100, unit: 'bars', unitCost: 30 },
      { poItemId: 'pol3', description: 'Shampoo (bottles)', qtyReceived: 80, unit: 'btl', unitCost: 75 },
    ],
  },
  {
    id: 'gr2',
    poId: 'po2',
    receiptNo: 'GR-002',
    warehouseId: 'wh1',
    warehouse: 'Main Storage',
    receivedBy: 'Juan Reyes',
    receivedAt: 'Feb 17, 2025',
    notes: 'Partial — floor cleaner short by 10 bottles.',
    evidenceImages: ['/receipt-mocks/gr-002.svg'],
    items: [
      { poItemId: 'pol4', description: 'Trash bags (rolls)', qtyReceived: 200, unit: 'rolls', unitCost: 25 },
      { poItemId: 'pol5', description: 'Floor cleaner (bottles)', qtyReceived: 50, unit: 'btl', unitCost: 120 },
    ],
  },
  {
    id: 'gr3',
    poId: 'po2',
    receiptNo: 'GR-003',
    warehouseId: 'wh2',
    warehouse: 'Utility Room',
    receivedBy: 'Maria Santos',
    receivedAt: 'Feb 18, 2025',
    notes: 'Remaining 10 bottles received.',
    evidenceImages: ['/receipt-mocks/gr-002.svg', '/receipt-mocks/gr-001.svg'],
    items: [
      { poItemId: 'pol5', description: 'Floor cleaner (bottles)', qtyReceived: 10, unit: 'btl', unitCost: 120 },
    ],
  },
  {
    id: 'gr4',
    poId: 'po3',
    receiptNo: 'GR-004',
    warehouseId: 'wh1',
    warehouse: 'Main Storage',
    receivedBy: 'Ana Cruz',
    receivedAt: 'Feb 17, 2025',
    notes: '',
    evidenceImages: ['/receipt-mocks/gr-001.svg'],
    items: [
      { poItemId: 'pol6', description: 'Bed sheets (sets)', qtyReceived: 30, unit: 'sets', unitCost: 200 },
      { poItemId: 'pol7', description: 'Pillow cases', qtyReceived: 80, unit: 'pcs', unitCost: 50 },
    ],
  },
  {
    id: 'gr5',
    poId: 'po5',
    receiptNo: 'GR-005',
    warehouseId: 'wh1',
    warehouse: 'Main Storage',
    receivedBy: 'Juan Reyes',
    receivedAt: 'Mar 10, 2025',
    notes: 'First batch. Remaining 60 bath towels expected next week.',
    evidenceImages: ['/receipt-mocks/gr-002.svg'],
    items: [
      { poItemId: 'pol10', description: 'Bath towels (premium)', qtyReceived: 60, unit: 'pcs', unitCost: 220 },
      { poItemId: 'pol11', description: 'Hand towels', qtyReceived: 100, unit: 'pcs', unitCost: 80 },
    ],
  },
];

// Keep supplier directory metrics consistent with purchase orders.
const formatDateLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

export const mockSupplierDirectoryData = supplierDirectorySeedData.map((supplier) => {
  const supplierPOs = mockPurchaseOrders.filter((po) => po.supplierId === supplier.id);
  const activePOs = supplierPOs.length;
  const lastOrderDate = supplierPOs.length
    ? formatDateLabel(
        supplierPOs.reduce((latest, po) => (po.orderDate > latest ? po.orderDate : latest), supplierPOs[0].orderDate)
      )
    : supplier.lastOrderDate;

  return {
    ...supplier,
    activePOs,
    lastOrderDate,
  };
});

export const mockReplenishmentItems: ReplenishmentItem[] = [
  { 
    id: '1', 
    sku: 'TWL-001', 
    name: 'Towels', 
    type: 'consumable', 
    category: 'Cloth & Sheets', 
    unit: 'pcs', 
    currentStock: 8, 
    minStock: 20, 
    shortfall: 12,
    unitCost: 150,
    totalValue: 1200,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-10',
    updatedAt: '2025-02-25',
    lastModifiedBy: 'Inventory Manager',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: mockStockMovements.filter(sm => sm.productId === '1'),
    damageAdjustments: mockDamageAdjustments.filter(da => da.productId === '1'),
    lastPurchaseOrder: mockPurchaseOrders[0],
    auditNotes: 'Recent damage incident resolved. Stock levels recovering after Q1 demand spike.'
  },
  { 
    id: '2', 
    sku: 'SOP-002', 
    name: 'Soap (bars)', 
    type: 'consumable', 
    category: 'Hygiene', 
    unit: 'bars', 
    currentStock: 5, 
    minStock: 15, 
    shortfall: 10,
    unitCost: 180,
    totalValue: 900,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-12',
    updatedAt: '2025-02-22',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: mockStockMovements.filter(sm => sm.productId === '2'),
    damageAdjustments: [],
    lastPurchaseOrder: mockPurchaseOrders[1],
    auditNotes: 'Consistent demand. No quality issues reported.'
  },
  { 
    id: '3', 
    sku: 'SHP-003', 
    name: 'Shampoo (bottles)', 
    type: 'consumable', 
    category: 'Hygiene', 
    unit: 'btl', 
    currentStock: 3, 
    minStock: 12, 
    shortfall: 9,
    unitCost: 200,
    totalValue: 600,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-02-21',
    lastModifiedBy: 'QA Inspector',
    currentsupplierId: 's2',
    supplierName: 'Premium Supply Inc',
    stockMovements: mockStockMovements.filter(sm => sm.productId === '3'),
    damageAdjustments: mockDamageAdjustments.filter(da => da.productId === '3'),
    lastPurchaseOrder: mockPurchaseOrders[2],
    auditNotes: 'Transit damage reported with carrier. Investigating insurance claim.'
  },
  { 
    id: '4', 
    sku: 'TRB-004', 
    name: 'Trash bags', 
    type: 'consumable', 
    category: 'Cleaning', 
    unit: 'rolls', 
    currentStock: 2, 
    minStock: 10, 
    shortfall: 8,
    unitCost: 120,
    totalValue: 240,
    warehouseId: 'wh2',
    warehouseName: 'Utility Room',
    isActive: true,
    createdAt: '2025-01-18',
    updatedAt: '2025-02-20',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: 'Reorder pending. No recent incidents.'
  },
  { 
    id: '5', 
    sku: 'TSS-005', 
    name: 'Tissue (boxes)', 
    type: 'consumable', 
    category: 'Hygiene', 
    unit: 'boxes', 
    currentStock: 4, 
    minStock: 12, 
    shortfall: 8,
    unitCost: 120,
    totalValue: 480,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-20',
    updatedAt: '2025-02-18',
    lastModifiedBy: 'Inventory Manager',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: mockPurchaseOrders[0],
    auditNotes: ''
  },
  { 
    id: '6', 
    sku: 'TPR-006', 
    name: 'Toilet paper (rolls)', 
    type: 'consumable', 
    category: 'Hygiene', 
    unit: 'rolls', 
    currentStock: 6, 
    minStock: 24, 
    shortfall: 18,
    unitCost: 180,
    totalValue: 1080,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-22',
    updatedAt: '2025-02-19',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's3',
    supplierName: 'Eco Supplies Ltd',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: mockPurchaseOrders[3],
    auditNotes: 'Highest shortfall. PO pending delivery.'
  },
  { 
    id: '7', 
    sku: 'DSH-007', 
    name: 'Dish soap', 
    type: 'consumable', 
    category: 'Kitchenware', 
    unit: 'btl', 
    currentStock: 2, 
    minStock: 8, 
    shortfall: 6,
    unitCost: 250,
    totalValue: 500,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-25',
    updatedAt: '2025-02-20',
    lastModifiedBy: 'Admin User',
    currentsupplierId: 's3',
    supplierName: 'Eco Supplies Ltd',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: mockPurchaseOrders[3],
    auditNotes: 'Pending PO delivery Mar 10. Expected to resolve shortfall.'
  },
  { 
    id: '8', 
    sku: 'COF-008', 
    name: 'Coffee pods', 
    type: 'consumable', 
    category: 'Food & Drinks', 
    unit: 'pcs', 
    currentStock: 10, 
    minStock: 30, 
    shortfall: 20,
    unitCost: 280,
    totalValue: 2800,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-01-28',
    updatedAt: '2025-02-18',
    lastModifiedBy: 'Purchase Officer',
    currentsupplierId: 's2',
    supplierName: 'Premium Supply Inc',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: 'Critical shortfall. Urgent reorder recommended.'
  },
  { 
    id: '9', 
    sku: 'PTW-009', 
    name: 'Paper towels', 
    type: 'consumable', 
    category: 'Cleaning', 
    unit: 'rolls', 
    currentStock: 3, 
    minStock: 15, 
    shortfall: 12,
    unitCost: 160,
    totalValue: 480,
    warehouseId: 'wh2',
    warehouseName: 'Utility Room',
    isActive: true,
    createdAt: '2025-02-01',
    updatedAt: '2025-02-20',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: ''
  },
  { 
    id: '10', 
    sku: 'LND-010', 
    name: 'Laundry detergent', 
    type: 'consumable', 
    category: 'Cleaning', 
    unit: 'btl', 
    currentStock: 1, 
    minStock: 6, 
    shortfall: 5,
    unitCost: 300,
    totalValue: 300,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-02-03',
    updatedAt: '2025-02-22',
    lastModifiedBy: 'Inventory Manager',
    currentsupplierId: 's2',
    supplierName: 'Premium Supply Inc',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: 'Nearly depleted. Reorder urgent.'
  },
  { 
    id: '11', 
    sku: 'FBS-011', 
    name: 'Fabric softener', 
    type: 'consumable', 
    category: 'Cleaning', 
    unit: 'btl', 
    currentStock: 4, 
    minStock: 8, 
    shortfall: 4,
    unitCost: 220,
    totalValue: 880,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-02-05',
    updatedAt: '2025-02-19',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: ''
  },
  { 
    id: '12', 
    sku: 'HSN-012', 
    name: 'Hand sanitizer', 
    type: 'consumable', 
    category: 'Hygiene', 
    unit: 'btl', 
    currentStock: 7, 
    minStock: 12, 
    shortfall: 5,
    unitCost: 190,
    totalValue: 1330,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-02-07',
    updatedAt: '2025-02-20',
    lastModifiedBy: 'Admin User',
    currentsupplierId: 's3',
    supplierName: 'Eco Supplies Ltd',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: ''
  },
  { 
    id: '13', 
    sku: 'AIR-013', 
    name: 'Air freshener', 
    type: 'consumable', 
    category: 'Cleaning', 
    unit: 'cans', 
    currentStock: 0, 
    minStock: 5, 
    shortfall: 5,
    unitCost: 140,
    totalValue: 0,
    warehouseId: 'wh2',
    warehouseName: 'Utility Room',
    isActive: true,
    createdAt: '2025-02-09',
    updatedAt: '2025-03-01',
    lastModifiedBy: 'Mike Storage',
    currentsupplierId: 's1',
    supplierName: 'Clean & Co',
    stockMovements: [],
    damageAdjustments: mockDamageAdjustments.filter(da => da.productId === '13'),
    lastPurchaseOrder: undefined,
    auditNotes: 'Out of stock. Damage adjustment pending. Reorder needed.'
  },
  { 
    id: '14', 
    sku: 'KEY-014', 
    name: 'Spare keys', 
    type: 'reusable', 
    category: 'Other', 
    unit: 'sets', 
    currentStock: 2, 
    minStock: 5, 
    shortfall: 3,
    unitCost: 500,
    totalValue: 1000,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: true,
    createdAt: '2025-02-11',
    updatedAt: '2025-02-18',
    lastModifiedBy: 'Warehouse Staff',
    currentsupplierId: 's2',
    supplierName: 'Premium Supply Inc',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: 'Reusable item. Maintenance required for worn keys.'
  },
  { 
    id: '15', 
    sku: 'IRN-015', 
    name: 'Iron', 
    type: 'reusable', 
    category: 'Appliances', 
    unit: 'pcs', 
    currentStock: 1, 
    minStock: 3, 
    shortfall: 2,
    unitCost: 1200,
    totalValue: 1200,
    warehouseId: 'wh1',
    warehouseName: 'Main Storage',
    isActive: false,
    createdAt: '2025-02-13',
    updatedAt: '2025-03-01',
    lastModifiedBy: 'Inventory Manager',
    currentsupplierId: 's3',
    supplierName: 'Eco Supplies Ltd',
    stockMovements: [],
    damageAdjustments: [],
    lastPurchaseOrder: undefined,
    auditNotes: 'Marked inactive. One unit damaged beyond repair. Replacement unit recommended.'
  },
];

/** Items assigned to units; used to compute unit-level low stock alerts */
export const mockUnitItems: InventoryItem[] = [
  { id: 'i1', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 5, minStock: 10, assignedToUnit: 'u1' },
  { id: 'i2', name: 'Soap', type: 'consumable', category: 'Hygiene', unit: 'piece', currentStock: 20, minStock: 15, assignedToUnit: 'u1' },
  { id: 'i3', name: 'Shampoo', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 2, minStock: 8, assignedToUnit: 'u1' },
  { id: 'i4', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 3, minStock: 10, assignedToUnit: 'u2' },
  { id: 'i5', name: 'Trash bags', type: 'consumable', category: 'Cleaning', unit: 'roll', currentStock: 1, minStock: 5, assignedToUnit: 'u2' },
  { id: 'i6', name: 'Tissue', type: 'consumable', category: 'Hygiene', unit: 'box', currentStock: 4, minStock: 6, assignedToUnit: 'u2' },
  { id: 'i7', name: 'Soap', type: 'consumable', category: 'Hygiene', unit: 'piece', currentStock: 12, minStock: 10, assignedToUnit: 'u3' },
  { id: 'i8', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 12, minStock: 10, assignedToUnit: 'u4' },
  { id: 'i9', name: 'Shampoo', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 1, minStock: 5, assignedToUnit: 'u5' },
  { id: 'i10', name: 'Toilet paper', type: 'consumable', category: 'Hygiene', unit: 'roll', currentStock: 2, minStock: 8, assignedToUnit: 'u1' },
  { id: 'i11', name: 'Dish soap', type: 'consumable', category: 'Kitchenware', unit: 'bottle', currentStock: 0, minStock: 2, assignedToUnit: 'u2' },
  { id: 'i12', name: 'Coffee pods', type: 'consumable', category: 'Food & Drinks', unit: 'piece', currentStock: 5, minStock: 12, assignedToUnit: 'u3' },
  { id: 'i13', name: 'Paper towels', type: 'consumable', category: 'Cleaning', unit: 'roll', currentStock: 1, minStock: 4, assignedToUnit: 'u4' },
  { id: 'i14', name: 'Laundry detergent', type: 'consumable', category: 'Cleaning', unit: 'bottle', currentStock: 0, minStock: 2, assignedToUnit: 'u5' },
  { id: 'i15', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 6, minStock: 10, assignedToUnit: 'u6' },
  { id: 'i16', name: 'Hand sanitizer', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 1, minStock: 3, assignedToUnit: 'u7' },
  { id: 'i17', name: 'Air freshener', type: 'consumable', category: 'Cleaning', unit: 'can', currentStock: 0, minStock: 2, assignedToUnit: 'u8' },
  { id: 'i18', name: 'Fabric softener', type: 'consumable', category: 'Cleaning', unit: 'bottle', currentStock: 3, minStock: 6, assignedToUnit: 'u9' },
  { id: 'i19', name: 'Iron', type: 'reusable', category: 'Appliances', unit: 'piece', currentStock: 1, minStock: 1, assignedToUnit: 'u4' },
  { id: 'i20', name: 'Spare keys', type: 'reusable', category: 'Other', unit: 'set', currentStock: 2, minStock: 2, assignedToUnit: 'u10' },
];

export const mockUnits: InventoryUnit[] = [
  { id: 'u1', name: 'Unit 711', type: 'apartment', location: 'Matina, Davao City', itemCount: 12, imageUrl: '/heroimage.png' },
  { id: 'u2', name: 'Unit 712', type: 'condominium', location: 'Matina, Davao City', itemCount: 10, imageUrl: '/heroimage.png' },
  { id: 'u3', name: 'A-1 Davao', type: 'apartment', location: 'Davao City', itemCount: 8, imageUrl: '/heroimage.png' },
  { id: 'u4', name: 'Unit 801', type: 'penthouse', location: 'Bajada', itemCount: 15, imageUrl: '/heroimage.png' },
  { id: 'u5', name: 'Studio B', type: 'house', location: 'Lanang', itemCount: 6, imageUrl: '/heroimage.png' },
  { id: 'u6', name: 'Unit 302', type: 'apartment', location: 'Matina, Davao City', itemCount: 9, imageUrl: '/heroimage.png' },
  { id: 'u7', name: 'Unit 205', type: 'apartment', location: 'Toril, Davao City', itemCount: 7, imageUrl: '/heroimage.png' },
  { id: 'u8', name: 'Villa C', type: 'house', location: 'Talomo', itemCount: 11, imageUrl: '/heroimage.png' },
  { id: 'u9', name: 'Unit 101', type: 'condominium', location: 'Ecoland', itemCount: 8, imageUrl: '/heroimage.png' },
  { id: 'u10', name: 'Loft D', type: 'apartment', location: 'Bajada', itemCount: 5, imageUrl: '/heroimage.png' },
];

export const mockUnitStockMovements: UnitStockMovementRow[] = [
  {
    id: 'UM-001',
    productId: '1',
    productName: 'Towels',
    unitId: 'u1',
    unitName: 'Unit 711',
    sourceWarehouseId: 'wh1',
    sourceWarehouseName: 'Main Storage',
    quantity: 12,
    reason: 'Room turnover preparation',
    referenceType: 'BOOKING',
    referenceId: 'BK-2025-001',
    beforeQuantity: 28,
    afterQuantity: 16,
    recordedAt: '2025-03-07 13:05',
    recordedDate: '2025-03-07',
    recordedTime: '13:05',
    createdBy: 'Ana Cruz',
  },
  {
    id: 'UM-002',
    productId: '3',
    productName: 'Shampoo (bottles)',
    unitId: 'u2',
    unitName: 'Unit 712',
    sourceWarehouseId: 'wh1',
    sourceWarehouseName: 'Main Storage',
    quantity: 6,
    reason: 'Guest stay preparation',
    referenceType: 'BOOKING',
    referenceId: 'BK-2025-004',
    beforeQuantity: 33,
    afterQuantity: 27,
    recordedAt: '2025-03-08 10:45',
    recordedDate: '2025-03-08',
    recordedTime: '10:45',
    createdBy: 'Ana Cruz',
  },
];

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

const normalizeInventoryName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Shared mock allocation index that keeps warehouse, unit, and inventory pages aligned.
 * Replace this with backend allocation mapping once API is available.
 */
const buildWarehouseUnitAllocationMap = (): Record<string, WarehouseUnitAllocationSummary[]> => {
  const replenishmentByNormalizedName = new Map(
    mockReplenishmentItems.map((item) => [normalizeInventoryName(item.name), item])
  );

  const byWarehouse = new Map<string, Map<string, WarehouseUnitAllocationSummary>>();

  mockUnitItems.forEach((unitItem) => {
    if (!unitItem.assignedToUnit || unitItem.currentStock <= 0) return;

    const replenishmentItem = replenishmentByNormalizedName.get(normalizeInventoryName(unitItem.name));
    if (!replenishmentItem) return;

    const unit = mockUnits.find((entry) => entry.id === unitItem.assignedToUnit);
    if (!unit) return;

    const warehouseId = replenishmentItem.warehouseId;
    if (!byWarehouse.has(warehouseId)) {
      byWarehouse.set(warehouseId, new Map<string, WarehouseUnitAllocationSummary>());
    }

    const unitMap = byWarehouse.get(warehouseId)!;
    if (!unitMap.has(unit.id)) {
      unitMap.set(unit.id, {
        unitId: unit.id,
        unitName: unit.name,
        items: [],
      });
    }

    const targetUnit = unitMap.get(unit.id)!;
    const existingItem = targetUnit.items.find((item) => item.productId === replenishmentItem.id);
    if (existingItem) {
      existingItem.quantity += unitItem.currentStock;
    } else {
      targetUnit.items.push({
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

const warehouseUnitAllocationMap = buildWarehouseUnitAllocationMap();

export const getWarehouseUnitAllocations = (warehouseId: string): WarehouseUnitAllocationSummary[] =>
  warehouseUnitAllocationMap[warehouseId] ?? [];

