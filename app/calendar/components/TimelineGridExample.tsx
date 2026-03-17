'use client';

/**
 * EXAMPLE: High-Performance 2D Spreadsheet-Style Drag Selection
 * 
 * This example demonstrates how to integrate the timeline grid selection
 * into your calendar timeline view with optimal performance.
 */

import React, { useMemo, useCallback } from 'react';
import { useTimelineGridSelect } from '../hooks/useTimelineGridSelect';
import TimelineGridCell from './TimelineGridCell';

interface Unit {
  id: string;
  title: string;
  imageUrl?: string;
}

interface TimelineGridExampleProps {
  units: Unit[];
  dateRange: Date[];
  dayWidth: number;
  rowHeight: number;
  isEditMode: boolean;
  isDateBlocked: (date: Date, unitId: string) => boolean;
  onSelectionComplete: (unitIds: string[], startDate: Date, endDate: Date) => void;
}

const TimelineGridExample: React.FC<TimelineGridExampleProps> = ({
  units,
  dateRange,
  dayWidth,
  rowHeight,
  isEditMode,
  isDateBlocked,
  onSelectionComplete,
}) => {
  const gridSelect = useTimelineGridSelect();

  // Handle pointer up at container level
  const handleContainerPointerUp = useCallback(() => {
    gridSelect.onPointerUp();
    
    // Get selection result and trigger modal
    const result = gridSelect.getSelectionResult();
    if (result && gridSelect.state.hasSelection) {
      onSelectionComplete(result.unitIds, result.startDate, result.endDate);
      gridSelect.clearSelection();
    }
  }, [gridSelect, onSelectionComplete]);

  return (
    <div
      onPointerUp={isEditMode ? handleContainerPointerUp : undefined}
      onPointerLeave={isEditMode ? handleContainerPointerUp : undefined}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {units.map((unit, rowIndex) => (
        <div
          key={unit.id}
          style={{
            display: 'flex',
            height: `${rowHeight}px`,
            borderBottom: '1px solid #E5E7EB',
            position: 'relative',
          }}
        >
          {/* Unit label column (sticky) */}
          <div
            style={{
              width: '350px',
              minWidth: '350px',
              padding: '12px 16px',
              borderRight: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              position: 'sticky',
              left: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {unit.imageUrl && (
              <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden' }}>
                <img src={unit.imageUrl} alt={unit.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#111827' }}>
              {unit.title}
            </div>
          </div>

          {/* Date cells */}
          <div style={{ display: 'flex', position: 'relative', flex: 1 }}>
            {dateRange.map((date, colIndex) => {
              const isBlocked = isDateBlocked(date, unit.id);
              const isSelected = isEditMode && gridSelect.isInSelection(rowIndex, colIndex);

              return (
                <TimelineGridCell
                  key={`${unit.id}-${date.getTime()}`}
                  date={date}
                  unitId={unit.id}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  isSelected={isSelected}
                  isBlocked={isBlocked}
                  isDragging={gridSelect.state.isDragging}
                  dayWidth={dayWidth}
                  onPointerDown={gridSelect.onCellPointerDown}
                  onPointerEnter={gridSelect.onCellPointerEnter}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineGridExample;
