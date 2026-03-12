import { NextResponse } from 'next/server';

/** Live backend URL for market-backend. Used to proxy dataset when requests hit this app. */
const BACKEND_URL = (
  process.env.MARKET_API_URL ||
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''
).replace(/\/+$/, '');

type InventoryDataset = {
  suppliers: unknown[];
  supplierDirectoryData: unknown[];
  warehouseDirectoryData: unknown[];
  purchaseOrders: unknown[];
  purchaseOrderLines: unknown[];
  goodsReceipts: unknown[];
  stockMovements: unknown[];
  damageAdjustments: unknown[];
  replenishmentItems: unknown[];
  units?: unknown[];
  unitItems?: unknown[];
  unitStockMovements?: unknown[];
  dashboardSummary: {
    totalItems: number;
    totalStocks: number;
    lowStockCount: number;
    replenishmentNeeded: number;
    // Allow extra properties from backend without failing the type
    [key: string]: unknown;
  };
};

const emptyDataset: InventoryDataset = {
  suppliers: [],
  supplierDirectoryData: [],
  warehouseDirectoryData: [],
  purchaseOrders: [],
  purchaseOrderLines: [],
  goodsReceipts: [],
  stockMovements: [],
  damageAdjustments: [],
  replenishmentItems: [],
  units: [],
  unitItems: [],
  unitStockMovements: [],
  dashboardSummary: {
    totalItems: 0,
    totalStocks: 0,
    lowStockCount: 0,
    replenishmentNeeded: 0,
  },
};

function ensureDatasetShape(raw: unknown): typeof emptyDataset {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      suppliers: Array.isArray(o.suppliers) ? o.suppliers : emptyDataset.suppliers,
      supplierDirectoryData: Array.isArray(o.supplierDirectoryData) ? o.supplierDirectoryData : emptyDataset.supplierDirectoryData,
      warehouseDirectoryData: Array.isArray(o.warehouseDirectoryData) ? o.warehouseDirectoryData : emptyDataset.warehouseDirectoryData,
      purchaseOrders: Array.isArray(o.purchaseOrders) ? o.purchaseOrders : emptyDataset.purchaseOrders,
      purchaseOrderLines: Array.isArray(o.purchaseOrderLines) ? o.purchaseOrderLines : emptyDataset.purchaseOrderLines,
      goodsReceipts: Array.isArray(o.goodsReceipts) ? o.goodsReceipts : emptyDataset.goodsReceipts,
      stockMovements: Array.isArray(o.stockMovements) ? o.stockMovements : emptyDataset.stockMovements,
      damageAdjustments: Array.isArray(o.damageAdjustments) ? o.damageAdjustments : emptyDataset.damageAdjustments,
      replenishmentItems: Array.isArray(o.replenishmentItems) ? o.replenishmentItems : emptyDataset.replenishmentItems,
      units: Array.isArray(o.units) ? o.units : emptyDataset.units,
      unitItems: Array.isArray(o.unitItems) ? o.unitItems : emptyDataset.unitItems,
      unitStockMovements: Array.isArray(o.unitStockMovements) ? o.unitStockMovements : emptyDataset.unitStockMovements,
      dashboardSummary:
        o.dashboardSummary != null && typeof o.dashboardSummary === 'object' && !Array.isArray(o.dashboardSummary)
          ? { ...emptyDataset.dashboardSummary, ...(o.dashboardSummary as Record<string, unknown>) }
          : emptyDataset.dashboardSummary,
    };
  }
  return emptyDataset;
}

export async function GET() {
  const headers = { 'Content-Type': 'application/json' };

  if (!BACKEND_URL) {
    // No backend configured – return an empty dataset and let the UI handle "no data" states.
    return NextResponse.json(emptyDataset, { headers });
  }

  try {
    const url = `${BACKEND_URL}/api/inventory/dataset`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Inventory dataset backend returned', res.status, url, '- serving empty dataset');
      }
      return NextResponse.json(emptyDataset, { headers });
    }

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    let data: unknown = emptyDataset;
    if (isJson) {
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : emptyDataset;
      } catch {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Inventory dataset: backend response was not valid JSON, serving empty dataset');
        }
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('Inventory dataset: backend Content-Type was not JSON:', contentType);
    }

    const body = ensureDatasetShape(data);
    return NextResponse.json(body, { headers });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Inventory dataset backend unreachable:', message);
    }
    // On error, return an empty dataset instead of injecting mock items.
    return NextResponse.json(emptyDataset, { headers });
  }
}
