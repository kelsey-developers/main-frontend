'use client';

import React, { useMemo } from 'react';
import type { InventoryUnit, InventoryItem } from '../types';

interface UnitAlertProps {
  units: InventoryUnit[];
  unitItems: InventoryItem[];
  onUnitClick?: (unit: InventoryUnit) => void;
}

interface UnitWithAlerts {
  unit: InventoryUnit;
  lowStockItems: InventoryItem[];
}

const UnitAlert: React.FC<UnitAlertProps> = ({ units, unitItems, onUnitClick }) => {
  const unitsWithAlerts = useMemo(() => {
    const lowStock = unitItems.filter((item) => item.currentStock < item.minStock && item.assignedToUnit);
    const byUnit = new Map<string, InventoryItem[]>();
    for (const item of lowStock) {
      const id = item.assignedToUnit!;
      if (!byUnit.has(id)) byUnit.set(id, []);
      byUnit.get(id)!.push(item);
    }
    const result: UnitWithAlerts[] = [];
    for (const unit of units) {
      const items = byUnit.get(unit.id);
      if (items && items.length > 0) result.push({ unit, lowStockItems: items });
    }
    return result;
  }, [units, unitItems]);

  if (unitsWithAlerts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Unit low stock alerts
          </h3>
          <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
            Units with items below threshold
          </p>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm text-center py-4" style={{ fontFamily: 'Poppins' }}>
            No units with low stock alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col max-h-[420px] overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
          <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Unit low stock alerts
        </h3>
        <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
          Units with items below threshold
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 scrollbar-no-arrows">
        {unitsWithAlerts.map(({ unit, lowStockItems }) => (
          <div
            key={unit.id}
            role={onUnitClick ? 'button' : undefined}
            tabIndex={onUnitClick ? 0 : undefined}
            onClick={onUnitClick ? () => onUnitClick(unit) : undefined}
            onKeyDown={
              onUnitClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onUnitClick(unit);
                    }
                  }
                : undefined
            }
            className={`flex-shrink-0 flex gap-3 p-2 rounded-lg border border-gray-100 bg-gray-50/80 hover:border-[#0B5858]/30 hover:bg-teal-50/30 transition-colors ${onUnitClick ? 'cursor-pointer' : ''}`}
          >
            <div className="w-30 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src={unit.imageUrl || '/heroimage.png'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: 'Poppins' }}>
                  {unit.name}
                </p>
                {unit.type && (
                  <span
                    className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                  </span>
                )}
              </div>
              {unit.location && (
                <p className="text-xs text-gray-600 truncate mt-0.5" style={{ fontFamily: 'Poppins' }}>
                  {unit.location}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStockItems.map((item, index) => {
                  const isFirst = index === 0;
                  return (
                    <span
                      key={item.id}
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isFirst
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {item.name} {item.currentStock}/{item.minStock}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnitAlert;
