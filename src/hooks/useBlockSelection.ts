"use client";

import { useState, useCallback } from "react";

export function useBlockSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // 선택 모드 토글
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // 선택 모드 끄면 선택도 해제
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // 개별 블록 선택/해제
  const toggleBlock = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 전체 선택
  const selectAll = useCallback((blockIds: string[]) => {
    setSelectedIds(new Set(blockIds));
  }, []);

  // 선택 해제
  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 특정 블록이 선택되었는지 확인
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // 선택된 블록 개수
  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    isSelectionMode,
    selectedCount,
    toggleSelectionMode,
    toggleBlock,
    selectAll,
    clear,
    isSelected,
  };
}
