import { useMemo, useState } from 'react';
import type { StockMovementType } from '../../types';
import type { EnhancedMovement } from '../../helpers/types';

export function useStockMovementFilters(movements: EnhancedMovement[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filtered = useMemo(() => {
    return movements.filter((movement) => {
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        movement.productName.toLowerCase().includes(query) ||
        movement.id.toLowerCase().includes(query) ||
        movement.productSku.toLowerCase().includes(query) ||
        movement.createdBy?.toLowerCase().includes(query);

      const matchesType = typeFilter === 'all' || movement.type === typeFilter;
      const matchesWarehouse = warehouseFilter === 'all' || movement.warehouseName === warehouseFilter;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const movementDate = new Date(movement.createdAt);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          matchesDate = matchesDate && movementDate >= fromDate;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && movementDate <= toDate;
        }
      }

      return matchesSearch && matchesType && matchesWarehouse && matchesDate;
    });
  }, [search, typeFilter, warehouseFilter, dateFrom, dateTo, movements]);

  const warehouses = useMemo(() => {
    return Array.from(new Set(movements.map((movement) => movement.warehouseName))).sort();
  }, [movements]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setWarehouseFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    warehouseFilter,
    setWarehouseFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtered,
    warehouses,
    clearFilters,
  };
}
