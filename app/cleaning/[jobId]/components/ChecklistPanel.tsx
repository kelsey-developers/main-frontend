'use client';

import React, { useMemo } from 'react';
import {
  CookingPot,
  Bath,
  BedDouble,
  Armchair,
  ClipboardList,
  Check,
} from 'lucide-react';
import type { CleaningChecklistItem } from '@/types/cleaning';

interface Props {
  items: CleaningChecklistItem[];
  editable: boolean;
  onToggle?: (id: string) => void;
  /** When true, show only a slim progress bar instead of the large progress card */
  showSlimBar?: boolean;
  /** When true, do not render any progress UI (e.g. when parent shows compact Status) */
  hideProgress?: boolean;
  totalCount?: number;
  checkedCount?: number;
}

/** Icon class for area headers — matches design system teal */
const ICON_CLASS = 'w-4 h-4 text-[#0B5858] shrink-0';

/** Area → Lucide icons: room-appropriate (kitchen, bath, bed, living, general) */
const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Kitchen: CookingPot,
  Bathroom: Bath,
  Bedroom: BedDouble,
  Living: Armchair,
  General: ClipboardList,
};

export default function ChecklistPanel({ items, editable, onToggle, showSlimBar, hideProgress, totalCount: totalCountProp, checkedCount: checkedCountProp }: Props) {
  const byArea = useMemo(() => {
    const map = new Map<string, CleaningChecklistItem[]>();
    for (const item of items) {
      if (!map.has(item.area)) map.set(item.area, []);
      map.get(item.area)!.push(item);
    }
    return map;
  }, [items]);

  const checkedCount = checkedCountProp ?? items.filter((i) => i.isChecked).length;
  const totalCount = totalCountProp ?? items.length;
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {!hideProgress && (
        showSlimBar ? (
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#0B5858] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <div className="bg-[#0B5858]/5 rounded-xl sm:rounded-2xl p-4 border border-[#0B5858]/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-[#0B5858]">Checklist Progress</p>
              <span className="text-sm font-bold text-[#0B5858]">{pct}%</span>
            </div>
            <div className="w-full h-2 bg-[#0B5858]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0B5858] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{checkedCount} of {totalCount} items complete</p>
          </div>
        )
      )}

      {/* Section grouping: room header with clear contrast; 1px dividers between tasks */}
      {Array.from(byArea.entries()).map(([area, areaItems]) => {
        const areaChecked = areaItems.filter((i) => i.isChecked).length;
        const areaTotal = areaItems.length;
        const allDone = areaChecked === areaTotal;
        return (
          <div key={area} className="rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
            {/* Section header: white so it pops against page background; border defines the block */}
            <div className={`flex items-center justify-between px-4 sm:px-5 py-4 gap-3 border-b border-gray-100 ${allDone ? 'bg-white' : 'bg-white'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center shrink-0" aria-hidden>
                  {(() => {
                    const Icon = AREA_ICONS[area] ?? ClipboardList;
                    return <Icon className={ICON_CLASS} />;
                  })()}
                </span>
                <span className="text-base font-bold text-gray-900 truncate" style={{ fontFamily: 'Poppins' }}>{area}</span>
                {allDone && (
                  <Check className="w-5 h-5 text-[#0B5858] shrink-0" strokeWidth={2.5} aria-hidden />
                )}
              </div>
              <span
                key={`${area}-${areaChecked}-${areaTotal}`}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 animate-fade-in-up ${
                  allDone ? 'bg-[#0B5858]/15 text-[#0B5858]' : 'bg-gray-200/70 text-gray-600'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {areaChecked}/{areaTotal}
              </span>
            </div>
            {/* Task rows: 1px divider; full-width button; success tint + legible text when completed */}
            <div className="divide-y divide-gray-200">
              {areaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!editable}
                  onClick={() => editable && onToggle?.(item.id)}
                  className={`w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left min-h-[52px] transition-all duration-500 ease-in-out ${editable ? 'cursor-pointer hover:bg-gray-50/80 active:bg-gray-100/80' : 'cursor-default'} ${item.isChecked ? 'bg-emerald-50/60' : 'bg-white'}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-[background-color,border-color,transform] duration-500 ease-in-out active:scale-110 ${item.isChecked ? 'bg-[#0B5858] border-[#0B5858]' : 'border-gray-300 bg-white'}`}>
                    <svg className={`w-3 h-3 text-white transition-opacity duration-500 ease-in-out ${item.isChecked ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className={`text-sm flex-1 min-w-0 text-left font-medium transition-all duration-500 ease-in-out ${item.isChecked ? 'text-gray-600' : 'text-gray-800'}`} style={{ fontFamily: 'Poppins' }}>
                    {item.label}
                  </span>
                  {item.isChecked && item.checkedAt && (
                    <span className="text-[10px] text-gray-400/80 shrink-0 tabular-nums text-right ml-auto min-w-[4rem] transition-opacity duration-500 ease-in-out" style={{ fontFamily: 'Poppins' }}>
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
