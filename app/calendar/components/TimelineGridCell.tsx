'use client';

import React, { memo } from 'react';
import type { GridCell } from '../hooks/useTimelineGridSelect';

interface TimelineGridCellProps {
  date: Date;
  unitId: string;
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isBlocked: boolean;
  isDragging: boolean;
  dayWidth: number;
  onPointerDown: (cell: GridCell) => void;
  onPointerEnter: (cell: GridCell) => void;
  children?: React.ReactNode;
}

const TimelineGridCell: React.FC<TimelineGridCellProps> = ({
  date,
  unitId,
  rowIndex,
  colIndex,
  isSelected,
  isBlocked,
  isDragging,
  dayWidth,
  onPointerDown,
  onPointerEnter,
  children,
}) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isBlocked) return;
    e.preventDefault();
    e.stopPropagation();
    onPointerDown({ date, unitId, rowIndex, colIndex });
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (isBlocked) return;
    e.stopPropagation();
    onPointerEnter({ date, unitId, rowIndex, colIndex });
  };

  return (
    <div
      style={{
        width: `${dayWidth}px`,
        minWidth: `${dayWidth}px`,
        height: '100%',
        borderRight: '1px solid #E5E7EB',
        position: 'relative',
        backgroundColor: isSelected
          ? 'rgba(11, 88, 88, 0.12)'
          : isBlocked
            ? 'rgba(77, 80, 78, 0.12)'
            : 'transparent',
        cursor: isBlocked ? 'not-allowed' : 'crosshair',
        transition: isDragging ? 'none' : 'background-color 0.15s ease',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
    >
      {/* Selection border for visual clarity */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid rgba(11, 88, 88, 0.4)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      {children}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
// Only re-render when selection state or blocked state changes
export default memo(TimelineGridCell, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isBlocked === next.isBlocked &&
    prev.isDragging === next.isDragging &&
    prev.dayWidth === next.dayWidth &&
    prev.date.getTime() === next.date.getTime()
  );
});
