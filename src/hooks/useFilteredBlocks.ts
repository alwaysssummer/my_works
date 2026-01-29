import { useMemo } from "react";
import { Block } from "@/types/block";
import { PriorityLevel } from "@/types/property";
import { ViewType } from "@/types/view";
import {
  getCheckboxValue,
  getDateValue,
  getPriorityLevel,
} from "@/lib/propertyHelpers";

// 정렬 타입
export type SortType = "newest" | "oldest" | "date" | "priority";

export const SORT_LABELS: Record<SortType, string> = {
  newest: "최신순",
  oldest: "오래된순",
  date: "날짜순",
  priority: "우선순위순",
};

// 우선순위 가중치 (높을수록 상위)
const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

interface UseFilteredBlocksOptions {
  viewType: ViewType;
  sortType: SortType;
  hideCompleted?: boolean;
  showUnorganizedOnly?: boolean;
  isChildOfCollapsed?: (index: number) => boolean;
  allBlocks?: Block[]; // 접힘 상태 확인용 전체 블록
}

/**
 * 블록 필터링 및 정렬 로직 분리 훅
 */
export function useFilteredBlocks(
  blocks: Block[],
  options: UseFilteredBlocksOptions
) {
  const {
    viewType,
    sortType,
    hideCompleted = false,
    showUnorganizedOnly = false,
    isChildOfCollapsed,
    allBlocks,
  } = options;

  const visibleBlocks = useMemo(() => {
    let result = [...blocks];

    // 전체 뷰일 때만 계층 구조 고려
    if (viewType === "all" && isChildOfCollapsed && allBlocks) {
      result = result.filter((block) => {
        const index = allBlocks.findIndex((b) => b.id === block.id);
        return index >= 0 && !isChildOfCollapsed(index);
      });

      // 정리 안 된 것만 필터
      if (showUnorganizedOnly) {
        result = result.filter((block) => block.properties.length === 0);
      }
    }

    // 완료된 할일 숨기기 (할일 뷰에서만)
    if (viewType === "todo" && hideCompleted) {
      result = result.filter((block) => !getCheckboxValue(block));
    }

    // 정렬
    if (sortType !== "newest") {
      result = sortBlocks(result, sortType);
    }

    // 고정된 블록을 상단에 표시
    const pinned = result.filter((b) => b.isPinned);
    const unpinned = result.filter((b) => !b.isPinned);
    result = [...pinned, ...unpinned];

    return result;
  }, [
    blocks,
    viewType,
    sortType,
    hideCompleted,
    showUnorganizedOnly,
    isChildOfCollapsed,
    allBlocks,
  ]);

  // 통계 계산
  const stats = useMemo(() => {
    return {
      total: blocks.length,
      visible: visibleBlocks.length,
      unorganized: blocks.filter((b) => b.properties.length === 0).length,
    };
  }, [blocks, visibleBlocks]);

  // 할일 통계 (할일 뷰용)
  const todoStats = useMemo(() => {
    if (viewType !== "todo") return null;

    const completed = blocks.filter(getCheckboxValue).length;
    return { completed, total: blocks.length };
  }, [viewType, blocks]);

  return {
    visibleBlocks,
    stats,
    todoStats,
  };
}

/**
 * 블록 정렬 함수
 */
export function sortBlocks(blocks: Block[], sortType: SortType): Block[] {
  return [...blocks].sort((a, b) => {
    switch (sortType) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

      case "date": {
        const aVal = getDateValue(a);
        const bVal = getDateValue(b);
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        return aVal.localeCompare(bVal);
      }

      case "priority": {
        const aLevel = getPriorityLevel(a);
        const bLevel = getPriorityLevel(b);
        return PRIORITY_WEIGHT[bLevel] - PRIORITY_WEIGHT[aLevel];
      }

      default:
        return 0;
    }
  });
}

/**
 * 완료되지 않은 할일 필터
 */
export function filterIncompleteTodos(blocks: Block[]): Block[] {
  return blocks.filter((block) => !getCheckboxValue(block));
}

/**
 * 정리되지 않은 블록 필터 (속성 없음)
 */
export function filterUnorganizedBlocks(blocks: Block[]): Block[] {
  return blocks.filter((block) => block.properties.length === 0);
}

/**
 * 고정 블록 우선 정렬
 */
export function sortPinnedFirst(blocks: Block[]): Block[] {
  const pinned = blocks.filter((b) => b.isPinned);
  const unpinned = blocks.filter((b) => !b.isPinned);
  return [...pinned, ...unpinned];
}
