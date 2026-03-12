import { apiClient } from './client';

export interface WarehouseListItem {
  id: string;
  code?: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

/** Fetch warehouse list from dedicated endpoint. Use ?activeOnly=true for active warehouses only. */
export async function fetchWarehouses(activeOnly = false): Promise<WarehouseListItem[]> {
  const url = activeOnly
    ? '/api/inventory/warehouses?activeOnly=true'
    : '/api/inventory/warehouses';
  const res = await apiClient.get<{ warehouses: WarehouseListItem[] }>(url);
  return res.warehouses ?? [];
}

/** Toggle warehouse active/inactive via status endpoint. */
export async function toggleWarehouseStatus(id: string, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/inventory/warehouses/${id}/status`, { isActive });
}
