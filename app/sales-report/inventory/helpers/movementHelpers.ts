import { inventoryItems, inventoryStockMovements, inventoryWarehouses } from '../lib/inventoryDataStore';
import type { EnhancedMovement } from './types';

const toRecordedDateTime = (value?: string) => {
  const fallback = '1970-01-01 00:00';
  const raw = value?.trim();
  if (!raw) return fallback;

  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

export const buildEnhancedMovements = (): EnhancedMovement[] => {
  return inventoryStockMovements.map((movement) => {
    const product = inventoryItems.find((item) => item.id === movement.productId);
    const warehouse = inventoryWarehouses.find(
      (item) => item.id === movement.warehouseId || item.id === product?.warehouseId
    );

    const recordedAt = toRecordedDateTime(movement.movementDateTime || movement.createdAt);
    const [recordedDate = '', recordedTime = '00:00'] = recordedAt.split(' ');

    return {
      ...movement,
      createdAt: recordedAt,
      movementDateTime: recordedAt,
      productName: product?.name || 'Unknown Product',
      productSku: product?.sku || 'N/A',
      productCategory: product?.category || 'Other',
      warehouseName: warehouse?.name || 'Unknown Warehouse',
      recordedDate,
      recordedTime,
    };
  });
};
