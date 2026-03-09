import { mockReplenishmentItems, mockStockMovements, mockWarehouses } from '../lib/mockData';
import type { EnhancedMovement } from './types';

export const buildEnhancedMovements = (): EnhancedMovement[] => {
  return mockStockMovements.map((movement) => {
    const product = mockReplenishmentItems.find((item) => item.id === movement.productId);
    const warehouse = mockWarehouses.find((item) => item.id === product?.warehouseId);

    return {
      ...movement,
      productName: product?.name || 'Unknown Product',
      productSku: product?.sku || 'N/A',
      productCategory: product?.category || 'Other',
      warehouseName: warehouse?.name || 'Unknown Warehouse',
    };
  });
};
