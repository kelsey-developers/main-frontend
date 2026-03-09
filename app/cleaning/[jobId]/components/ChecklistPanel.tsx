'use client';

import React, { useMemo } from 'react';
import type { CleaningChecklistItem } from '@/types/cleaning';

interface Props {
  items: CleaningChecklistItem[];
  editable: boolean;
  onToggle?: (id: string) => void;
}

export default function ChecklistPanel({ items, editable, onToggle }: Props) {
  const byArea = useMemo(() => {
    const map = new Map<string, CleaningChecklistItem[]>();
    for (const item of items) {
      if (!map.has(item.area)) map.set(item.area, []);
      map.get(item.area)!.push(item);
    }
    return map;
  }, [items]);

  const checkedCount = items.filter((i) => i.isChecked).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const AREA_ICONS: Record<string, string> = {
    Kitchen: '🍳',
    Bathroom: '🚿',
    Bedroom: '🛏️',
    Living: '🛋️',
    General: '✅',
  };

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="bg-[#0B5858]/5 rounded-xl p-4 border border-[#0B5858]/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#0B5858]">Checklist Progress</p>
          <span className="text-sm font-bold text-[#0B5858]">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-[#0B5858]/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#0B5858] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{checkedCount} of {totalCount} items complete</p>
      </div>

      {/* Area-grouped checklist */}
      {Array.from(byArea.entries()).map(([area, areaItems]) => {
        const areaChecked = areaItems.filter((i) => i.isChecked).length;
        const areaTotal = areaItems.length;
        const allDone = areaChecked === areaTotal;
        return (
          <div key={area} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-50 ${allDone ? 'bg-[#0B5858]/5' : 'bg-gray-50/50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{AREA_ICONS[area] ?? '📋'}</span>
                <span className="text-sm font-bold text-gray-700">{area}</span>
              </div>
              <span className={`text-xs font-bold ${allDone ? 'text-[#0B5858]' : 'text-gray-400'}`}>
                {areaChecked}/{areaTotal}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {areaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!editable}
                  onClick={() => editable && onToggle?.(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${editable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${item.isChecked ? 'bg-[#0B5858] border-[#0B5858]' : 'border-gray-300 bg-white'}`}>
                    {item.isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${item.isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                  {item.isChecked && item.checkedAt && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(item.checkedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
