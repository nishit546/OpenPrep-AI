import { useState, useCallback, useMemo } from 'react';

/**
 * Custom React hook for managing multi-item batch selection state.
 * Supports toggle, select all, deselect all, and membership checks.
 *
 * @param {Array<{ id: string | number }>} items - List of items available for selection
 * @returns {object} Batch selection state and handlers
 */
export default function useBatchSelection(items = []) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Toggle selection of a single item
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all currently visible / provided items
  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((item) => (typeof item === 'object' ? item.id : item)));
    setSelectedIds(allIds);
  }, [items]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Explicitly set selected IDs (useful for presets or programmatic batch updates)
  const setSelected = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Membership check
  const isSelected = useCallback(
    (id) => selectedIds.has(id),
    [selectedIds]
  );

  // Check if all visible items are selected
  const isAllSelected = useMemo(() => {
    if (!items || items.length === 0) return false;
    return items.every((item) => selectedIds.has(typeof item === 'object' ? item.id : item));
  }, [items, selectedIds]);

  const selectedCount = selectedIds.size;
  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedList,
    selectedCount,
    isSelected,
    isAllSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    setSelected
  };
}
