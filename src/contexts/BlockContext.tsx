"use client";

import { createContext, useContext, ReactNode } from "react";
import { useBlocks } from "@/hooks/useBlocks";
import { Block, BlockColumn, Top3History } from "@/types/block";
import { BlockProperty, PropertyType } from "@/types/property";

// useBlocks 반환 타입
interface BlockContextValue {
  // 상태
  blocks: Block[];
  isLoaded: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isOnline: boolean;
  isSupabaseConnected: boolean;
  useSupabase: boolean;

  // 블록 CRUD
  addBlock: (afterId?: string) => string;
  updateBlock: (id: string, content: string) => void;
  deleteBlock: (id: string) => void;

  // 들여쓰기
  indentBlock: (id: string) => void;
  outdentBlock: (id: string) => void;

  // 토글
  toggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  isChildOfCollapsed: (index: number) => boolean;

  // 네비게이션
  getPrevBlockId: (id: string) => string | null;
  getNextBlockId: (id: string) => string | null;

  // 속성
  addProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => void;
  updateProperty: (blockId: string, propertyId: string, value: BlockProperty["value"]) => void;
  updatePropertyByType: (blockId: string, propertyType: PropertyType, value: BlockProperty["value"]) => void;
  updatePropertyName: (blockId: string, propertyId: string, name: string) => void;
  removeProperty: (blockId: string, propertyId: string) => void;
  removePropertyByType: (blockId: string, propertyType: PropertyType) => void;

  // 블록 메타
  updateBlockName: (blockId: string, name: string) => void;
  applyType: (blockId: string, propertyTypes: PropertyType[], names?: string[]) => void;

  // 이동/복제
  moveBlockUp: (id: string) => void;
  moveBlockDown: (id: string) => void;
  duplicateBlock: (id: string) => string;

  // 기타
  deleteCompletedTodos: () => void;
  togglePin: (id: string) => void;
  moveToColumn: (id: string, column: BlockColumn) => void;

  // TOP 3
  top3Blocks: Block[];
  top3History: Top3History[];
  addToTop3: (blockId: string, slotIndex?: number) => void;
  removeFromTop3: (blockId: string) => void;

  // 다중 선택
  selectedBlockIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelectionMode: () => void;
  toggleBlockSelection: (id: string) => void;
  selectAllBlocks: (blockIds: string[]) => void;
  clearSelection: () => void;
  deleteSelectedBlocks: () => void;
}

const BlockContext = createContext<BlockContextValue | null>(null);

interface BlockProviderProps {
  children: ReactNode;
}

export function BlockProvider({ children }: BlockProviderProps) {
  const blocks = useBlocks();

  return (
    <BlockContext.Provider value={blocks}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlockContext(): BlockContextValue {
  const context = useContext(BlockContext);

  if (!context) {
    throw new Error("useBlockContext must be used within a BlockProvider");
  }

  return context;
}

// 선택적으로 특정 값만 가져오는 훅들
export function useBlockList() {
  const { blocks, isLoaded } = useBlockContext();
  return { blocks, isLoaded };
}

export function useSyncStatus() {
  const { syncStatus, syncError, isOnline, isSupabaseConnected } = useBlockContext();
  return { syncStatus, syncError, isOnline, isSupabaseConnected };
}

export function useBlockSelection() {
  const {
    selectedBlockIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleBlockSelection,
    selectAllBlocks,
    clearSelection,
    deleteSelectedBlocks,
  } = useBlockContext();

  return {
    selectedBlockIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleBlockSelection,
    selectAllBlocks,
    clearSelection,
    deleteSelectedBlocks,
  };
}

export function useTop3() {
  const { top3Blocks, top3History, addToTop3, removeFromTop3 } = useBlockContext();
  return { top3Blocks, top3History, addToTop3, removeFromTop3 };
}
