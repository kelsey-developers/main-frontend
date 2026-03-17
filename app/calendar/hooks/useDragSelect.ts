'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

export interface DragSelectState {
  isDragging: boolean;
  startDate: Date | null;
  endDate: Date | null;
  hasSelection: boolean;
  selectedUnitId: string | null;
  selectedUnitIds: Set<string>;
}

export interface UseDragSelectReturn {
  state: DragSelectState;
  onCellPointerDown: (date: Date, unitId?: string, rowIndex?: number, colIndex?: number) => void;
  onCellPointerEnter: (date: Date, unitId?: string, rowIndex?: number, colIndex?: number) => void;
  onPointerUp: () => void;
  isInDragRange: (date: Date) => boolean;
  isCellSelected: (rowIndex: number, colIndex: number) => boolean;
  clearSelection: () => void;
  selectionAsStrings: () => { start: string; end: string } | null;
  getSelectedUnitId: () => string | null;
  getSelectedUnitIds: () => string[];
}

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useDragSelect(): UseDragSelectReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [anchorDate, setAnchorDate] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const dragStarted = useRef(false);
  const dragStartUnitId = useRef<string | null>(null);

  // 2D bounding box tracking for spreadsheet-style selection
  const anchorRow = useRef<number>(-1);
  const anchorCol = useRef<number>(-1);
  const [currentRow, setCurrentRow] = useState<number>(-1);
  const [currentCol, setCurrentCol] = useState<number>(-1);

  // Store the units array reference for bounding box unit resolution
  const unitsMapRef = useRef<Map<number, string>>(new Map());

  const selectionBounds = useMemo(() => {
    if (anchorRow.current < 0 || anchorCol.current < 0 || currentRow < 0 || currentCol < 0) return null;
    return {
      minRow: Math.min(anchorRow.current, currentRow),
      maxRow: Math.max(anchorRow.current, currentRow),
      minCol: Math.min(anchorCol.current, currentCol),
      maxCol: Math.max(anchorCol.current, currentCol),
    };
  }, [currentRow, currentCol]);

  const getOrderedRange = useCallback((): { start: Date; end: Date } | null => {
    if (!anchorDate || !currentDate) return null;
    const a = toMidnight(anchorDate);
    const b = toMidnight(currentDate);
    return a.getTime() <= b.getTime() ? { start: a, end: b } : { start: b, end: a };
  }, [anchorDate, currentDate]);

  const onCellPointerDown = useCallback((date: Date, unitId?: string, rowIndex?: number, colIndex?: number) => {
    const d = toMidnight(date);
    setAnchorDate(d);
    setCurrentDate(d);
    setIsDragging(true);
    setHasSelection(false);
    dragStarted.current = true;
    dragStartUnitId.current = unitId ?? null;
    setSelectedUnitId(unitId ?? null);
    setSelectedUnitIds(new Set(unitId && unitId !== 'header' ? [unitId] : []));

    // Track row/col for bounding box
    if (rowIndex !== undefined && colIndex !== undefined) {
      anchorRow.current = rowIndex;
      anchorCol.current = colIndex;
      setCurrentRow(rowIndex);
      setCurrentCol(colIndex);
      if (unitId && unitId !== 'header') {
        unitsMapRef.current.set(rowIndex, unitId);
      }
    }
  }, []);

  const onCellPointerEnter = useCallback((date: Date, unitId?: string, rowIndex?: number, colIndex?: number) => {
    if (!dragStarted.current) return;
    setCurrentDate(toMidnight(date));

    // Update bounding box endpoint
    if (rowIndex !== undefined && colIndex !== undefined) {
      setCurrentRow(rowIndex);
      setCurrentCol(colIndex);
      if (unitId && unitId !== 'header') {
        unitsMapRef.current.set(rowIndex, unitId);
      }
    }

    // Recalculate selected unit IDs from bounding box
    if (rowIndex !== undefined && anchorRow.current >= 0) {
      const minR = Math.min(anchorRow.current, rowIndex);
      const maxR = Math.max(anchorRow.current, rowIndex);
      const newIds = new Set<string>();
      for (let r = minR; r <= maxR; r++) {
        const id = unitsMapRef.current.get(r);
        if (id) newIds.add(id);
      }
      setSelectedUnitIds(newIds);

      if (unitId === 'header' || dragStartUnitId.current === 'header') {
        setSelectedUnitId('header');
      } else if (newIds.size === 1) {
        setSelectedUnitId(Array.from(newIds)[0]);
      } else {
        setSelectedUnitId(null);
      }
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragStarted.current) return;
    dragStarted.current = false;
    setIsDragging(false);
    if (anchorDate && currentDate) {
      setHasSelection(true);
    }
  }, [anchorDate, currentDate]);

  const isInDragRange = useCallback((date: Date): boolean => {
    const range = getOrderedRange();
    if (!range) return false;
    const d = toMidnight(date).getTime();
    return d >= range.start.getTime() && d <= range.end.getTime();
  }, [getOrderedRange]);

  // O(1) bounding box check for spreadsheet-style selection
  const isCellSelected = useCallback((rowIndex: number, colIndex: number): boolean => {
    if (!selectionBounds) return false;
    return (
      rowIndex >= selectionBounds.minRow &&
      rowIndex <= selectionBounds.maxRow &&
      colIndex >= selectionBounds.minCol &&
      colIndex <= selectionBounds.maxCol
    );
  }, [selectionBounds]);

  const clearSelection = useCallback(() => {
    setAnchorDate(null);
    setCurrentDate(null);
    setHasSelection(false);
    setIsDragging(false);
    setSelectedUnitId(null);
    setSelectedUnitIds(new Set());
    setCurrentRow(-1);
    setCurrentCol(-1);
    anchorRow.current = -1;
    anchorCol.current = -1;
    dragStarted.current = false;
    dragStartUnitId.current = null;
    unitsMapRef.current.clear();
  }, []);

  const selectionAsStrings = useCallback((): { start: string; end: string } | null => {
    const range = getOrderedRange();
    if (!range) return null;
    return { start: formatYMD(range.start), end: formatYMD(range.end) };
  }, [getOrderedRange]);

  const getSelectedUnitId = useCallback((): string | null => {
    return selectedUnitId;
  }, [selectedUnitId]);

  const getSelectedUnitIds = useCallback((): string[] => {
    return Array.from(selectedUnitIds);
  }, [selectedUnitIds]);

  const range = getOrderedRange();

  return {
    state: {
      isDragging,
      startDate: range?.start ?? null,
      endDate: range?.end ?? null,
      hasSelection,
      selectedUnitId,
      selectedUnitIds,
    },
    onCellPointerDown,
    onCellPointerEnter,
    onPointerUp,
    isInDragRange,
    isCellSelected,
    clearSelection,
    selectionAsStrings,
    getSelectedUnitId,
    getSelectedUnitIds,
  };
}
