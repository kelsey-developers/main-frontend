import type { PurchaseOrder, PurchaseOrderLine } from '../types';

export type POStatus = 'pending' | 'partially-received' | 'received' | 'cancelled';

/**
 * Returns the most recent unit price used for a product in any purchase order.
 * Used as the default when adding that product to a new PO.
 */
export function getLastUnitPriceForProduct(
  productId: string,
  purchaseOrders: PurchaseOrder[],
  purchaseOrderLines: PurchaseOrderLine[]
): number {
  const linesForProduct = purchaseOrderLines.filter((l) => l.productId === productId);
  if (linesForProduct.length === 0) return 0;

  const poById = new Map(purchaseOrders.map((po) => [po.id, po]));
  const getPoDate = (po: PurchaseOrder) => {
    const d = (po as { orderDate?: string; orderedAt?: string; createdAt?: string }).orderDate
      ?? (po as { orderedAt?: string }).orderedAt
      ?? po.createdAt;
    return d ? new Date(d).getTime() : 0;
  };

  const sorted = linesForProduct
    .map((line) => {
      const po = poById.get(line.poId);
      return { line, po, ts: po ? getPoDate(po) : 0 };
    })
    .filter((x) => x.po)
    .sort((a, b) => b.ts - a.ts);

  const mostRecent = sorted[0];
  if (!mostRecent) return 0;
  const line = mostRecent.line as PurchaseOrderLine & { unitCost?: number };
  const price = line.unitPrice ?? line.unitCost ?? 0;
  return Number(price) > 0 ? Number(price) : 0;
}

export const PO_STATUS_CONFIG: Record<
  POStatus,
  { label: string; bgClass: string; textClass: string; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-[#fffbeb]',
    textClass: 'text-[#e0b819]',
    dotColor: '#e0b819',
  },
  'partially-received': {
    label: 'Partially Received',
    bgClass: 'bg-[#fff7ed]',
    textClass: 'text-[#f18b0e]',
    dotColor: '#f18b0e',
  },
  received: {
    label: 'Received',
    bgClass: 'bg-[#f0fdf4]',
    textClass: 'text-[#15803d]',
    dotColor: '#15803d',
  },
  cancelled: {
    label: 'Cancelled',
    bgClass: 'bg-[#fef2f2]',
    textClass: 'text-[#f10e3b]',
    dotColor: '#f10e3b',
  },
};

export const formatPhp = (value: number) =>
  'PHP ' + value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
