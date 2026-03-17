'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

export interface GridCell {
  date: Date;
  unitId: string;
  rowIndex: number;
  colIndex: number;
}

export interface GridSelectionState {
  isDragging: boolean;
  startCell: GridCell | null;
  endCell: GridCell | null;
  hasSelection: boolean;
}

export interface GridSelectionResult {
  unitIds: string[];
  startDate: Date;
  endDate: Date;
  dateRange: Date[];
}

export interface UseTimelineGridSelectReturn {
  state: GridSelectionState;
  onCellPointerDown: (cell: GridCell) => void;
  onCellPointerEnter: (cell: GridCell) => void;
  onPointerUp: () => void;
  isInSelection: (rowIndex: number, colIndex: number) => boolean;
  clearSelection: () => void;
  getSelectionResult: () => GridSelectionResult | null;
}

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function useTimelineGridSelect(): UseTimelineGridSelectReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState<GridCell | null>(null);
  const [endCell, setEndCell] = useState<GridCell | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const dragStarted = useRef(false);

  // Memoized bounding box calculation for performance
  const selectionBounds = useMemo(() => {
    if (!startCell || !endCell) return null;
    
    return {
      minRow: Math.min(startCell.rowIndex, endCell.rowIndex),
      maxRow: Math.max(startCell.rowIndex, endCell.rowIndex),
      minCol: Math.min(startCell.colIndex, endCell.colIndex),
      maxCol: Math.max(startCell.colIndex, endCell.colIndex),
    };
  }, [startCell, endCell]);

  const onCellPointerDown = useCallback((cell: GridCell) => {
    const normalizedCell = {
      ...cell,
      date: toMidnight(cell.date),
    };
    
    setStartCell(normalizedCell);
    setEndCell(normalizedCell);
    setIsDragging(true);
    setHasSelection(false);
    dragStarted.current = true;
  }, []);

  const onCellPointerEnter = useCallback((cell: GridCell) => {
    if (!dragStarted.current) return;
    
    const normalizedCell = {
      ...cell,
      date: toMidnight(cell.date),
    };
    
    setEndCell(normalizedCell);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragStarted.current) return;
    
    dragStarted.current = false;
    setIsDragging(false);
    
    if (startCell && endCell) {
      setHasSelection(true);
    }
  }, [startCell, endCell]);

  // Optimized cell inclusion check using memoized bounds
  const isInSelection = useCallback((rowIndex: number, colIndex: number): boolean => {
    if (!selectionBounds) return false;
    
    return (
      rowIndex >= selectionBounds.minRow &&
      rowIndex <= selectionBounds.maxRow &&
      colIndex >= selectionBounds.minCol &&
      colIndex <= selectionBounds.maxCol
    );
  }, [selectionBounds]);

  const clearSelection = useCallback(() => {
    setStartCell(null);
    setEndCell(null);
    setHasSelection(false);
    setIsDragging(false);
    dragStarted.current = false;
  }, []);

  const getSelectionResult = useCallback((): GridSelectionResult | null => {
    if (!startCell || !endCell || !selectionBounds) return null;

    // Collect unique unit IDs
    const unitIdsSet = new Set<string>();
    const datesSet = new Set<number>();

    // We need to build the complete result from the selection bounds
    // Since we only track start/end cells, we need to reconstruct the full range
    
    // Get unique unit IDs from the range
    // Note: In a real implementation, you'd pass the units array to extract IDs
    // For now, we'll use the start and end cell unit IDs as a simple case
    unitIdsSet.add(startCell.unitId);
    unitIdsSet.add(endCell.unitId);

    // Get date range
    const dates = [startCell.date, endCell.date].sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[1];

    // Generate all dates in range
    const dateRange: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dateRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return {
      unitIds: Array.from(unitIdsSet),
      startDate,
      endDate,
      dateRange,
    };
  }, [startCell, endCell, selectionBounds]);

  return {
    state: {
      isDragging,
      startCell,
      endCell,
      hasSelection,
    },
    onCellPointerDown,
    onCellPointerEnter,
    onPointerUp,
    isInSelection,
    clearSelection,
    getSelectionResult,
  };
}
