import type { InventoryDashboardSummary, ReplenishmentItem, InventoryUnit, InventoryItem } from '../types';

export const mockDashboardSummary: InventoryDashboardSummary = {
  totalItems: 15,
  totalStocks: 58,
  lowStockCount: 15,
  replenishmentNeeded: 15,
};

export const mockReplenishmentItems: ReplenishmentItem[] = [
  { id: '1', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', currentStock: 8, minStock: 20, shortfall: 12 },
  { id: '2', name: 'Soap (bars)', type: 'consumable', category: 'Hygiene', currentStock: 5, minStock: 15, shortfall: 10 },
  { id: '3', name: 'Shampoo (bottles)', type: 'consumable', category: 'Hygiene', currentStock: 3, minStock: 12, shortfall: 9 },
  { id: '4', name: 'Trash bags', type: 'consumable', category: 'Cleaning', currentStock: 2, minStock: 10, shortfall: 8 },
  { id: '5', name: 'Tissue (boxes)', type: 'consumable', category: 'Hygiene', currentStock: 4, minStock: 12, shortfall: 8 },
  { id: '6', name: 'Toilet paper (rolls)', type: 'consumable', category: 'Hygiene', currentStock: 6, minStock: 24, shortfall: 18 },
  { id: '7', name: 'Dish soap', type: 'consumable', category: 'Kitchenware', currentStock: 2, minStock: 8, shortfall: 6 },
  { id: '8', name: 'Coffee pods', type: 'consumable', category: 'Food & Drinks', currentStock: 10, minStock: 30, shortfall: 20 },
  { id: '9', name: 'Paper towels', type: 'consumable', category: 'Cleaning', currentStock: 3, minStock: 15, shortfall: 12 },
  { id: '10', name: 'Laundry detergent', type: 'consumable', category: 'Cleaning', currentStock: 1, minStock: 6, shortfall: 5 },
  { id: '11', name: 'Fabric softener', type: 'consumable', category: 'Cleaning', currentStock: 4, minStock: 8, shortfall: 4 },
  { id: '12', name: 'Hand sanitizer', type: 'consumable', category: 'Hygiene', currentStock: 7, minStock: 12, shortfall: 5 },
  { id: '13', name: 'Air freshener', type: 'consumable', category: 'Cleaning', currentStock: 0, minStock: 5, shortfall: 5 },
  { id: '14', name: 'Spare keys', type: 'reusable', category: 'Other', currentStock: 2, minStock: 5, shortfall: 3 },
  { id: '15', name: 'Iron', type: 'reusable', category: 'Appliances', currentStock: 1, minStock: 3, shortfall: 2 },
];

/** Items assigned to units; used to compute unit-level low stock alerts */
export const mockUnitItems: InventoryItem[] = [
  { id: 'i1', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 5, minStock: 10, assignedToUnit: 'u1' },
  { id: 'i2', name: 'Soap', type: 'consumable', category: 'Hygiene', unit: 'piece', currentStock: 20, minStock: 15, assignedToUnit: 'u1' },
  { id: 'i3', name: 'Shampoo', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 2, minStock: 8, assignedToUnit: 'u1' },
  { id: 'i4', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 3, minStock: 10, assignedToUnit: 'u2' },
  { id: 'i5', name: 'Trash bags', type: 'consumable', category: 'Cleaning', unit: 'roll', currentStock: 1, minStock: 5, assignedToUnit: 'u2' },
  { id: 'i6', name: 'Tissue', type: 'consumable', category: 'Hygiene', unit: 'box', currentStock: 4, minStock: 6, assignedToUnit: 'u2' },
  { id: 'i7', name: 'Soap', type: 'consumable', category: 'Hygiene', unit: 'piece', currentStock: 8, minStock: 10, assignedToUnit: 'u3' },
  { id: 'i8', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 12, minStock: 10, assignedToUnit: 'u4' },
  { id: 'i9', name: 'Shampoo', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 1, minStock: 5, assignedToUnit: 'u5' },
  { id: 'i10', name: 'Toilet paper', type: 'consumable', category: 'Hygiene', unit: 'roll', currentStock: 2, minStock: 8, assignedToUnit: 'u1' },
  { id: 'i11', name: 'Dish soap', type: 'consumable', category: 'Kitchenware', unit: 'bottle', currentStock: 0, minStock: 2, assignedToUnit: 'u2' },
  { id: 'i12', name: 'Coffee pods', type: 'consumable', category: 'Food & Drinks', unit: 'piece', currentStock: 5, minStock: 12, assignedToUnit: 'u3' },
  { id: 'i13', name: 'Paper towels', type: 'consumable', category: 'Cleaning', unit: 'roll', currentStock: 1, minStock: 4, assignedToUnit: 'u4' },
  { id: 'i14', name: 'Laundry detergent', type: 'consumable', category: 'Cleaning', unit: 'bottle', currentStock: 0, minStock: 2, assignedToUnit: 'u5' },
  { id: 'i15', name: 'Towels', type: 'consumable', category: 'Cloth & Sheets', unit: 'piece', currentStock: 6, minStock: 10, assignedToUnit: 'u6' },
  { id: 'i16', name: 'Soap', type: 'consumable', category: 'Hygiene', unit: 'piece', currentStock: 4, minStock: 8, assignedToUnit: 'u6' },
  { id: 'i17', name: 'Trash bags', type: 'consumable', category: 'Cleaning', unit: 'roll', currentStock: 3, minStock: 5, assignedToUnit: 'u7' },
  { id: 'i18', name: 'Hand sanitizer', type: 'consumable', category: 'Hygiene', unit: 'bottle', currentStock: 1, minStock: 3, assignedToUnit: 'u7' },
  { id: 'i19', name: 'Iron', type: 'reusable', category: 'Appliances', unit: 'piece', currentStock: 1, minStock: 1, assignedToUnit: 'u4' },
  { id: 'i20', name: 'Spare keys', type: 'reusable', category: 'Other', unit: 'set', currentStock: 0, minStock: 2, assignedToUnit: 'u8' },
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
