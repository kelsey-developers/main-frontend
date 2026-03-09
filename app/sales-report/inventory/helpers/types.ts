import type { StockMovement } from '../types';

export interface EnhancedMovement extends StockMovement {
  productName: string;
  productSku: string;
  productCategory: string;
  warehouseName: string;
  recordedDate: string;
  recordedTime: string;
}
