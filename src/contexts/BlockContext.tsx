"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useBlocks } from "@/hooks/useBlocks";
import { Block, BlockColumn, Top3History } from "@/types/block";
import { BlockProperty, PropertyType } from "@/types/property";

// 액션 인터페이스 분리
export interface BlockActions {
  // 블록 CRUD
  addBlock: (afterId?: string, options?: { name?: string; content?: string }) => string;
  updateBlock: (id: string, content: string) => void;
  deleteBlock: (id: string) => void;

  // 들여쓰기
  indentBlock: (id: string) => void;
  outdentBlock: (id: string) => void;

  // 토글
  toggleCollapse: (id: string) => void;

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
  addToTop3: (blockId: string, slotIndex?: number) => void;
  removeFromTop3: (blockId: string) => void;

  // 다중 선택
  toggleSelectionMode: () => void;
  toggleBlockSelection: (id: string) => void;
  selectAllBlocks: (blockIds: string[]) => void;
  clearSelection: () => void;
  deleteSelectedBlocks: () => void;
}

// 데이터 인터페이스 분리
export interface BlockData {
  blocks: Block[];
  isLoaded: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isOnline: boolean;
  isSupabaseConnected: boolean;
  useSupabase: boolean;
  top3Blocks: Block[];
  top3History: Top3History[];
  selectedBlockIds: Set<string>;
  isSelectionMode: boolean;
}

// 네비게이션 헬퍼 인터페이스
export interface BlockNavigation {
  hasChildren: (id: string) => boolean;
  isChildOfCollapsed: (index: number) => boolean;
  getPrevBlockId: (id: string) => string | null;
  getNextBlockId: (id: string) => string | null;
}

// 전체 컨텍스트 값
interface BlockContextValue {
  // 데이터
  data: BlockData;

  // 액션 (안정된 참조)
  actions: BlockActions;

  // 네비게이션 헬퍼
  navigation: BlockNavigation;

  // 레거시 호환성 (기존 코드 지원)
  blocks: Block[];
  isLoaded: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isOnline: boolean;
  isSupabaseConnected: boolean;
  useSupabase: boolean;

  // 블록 CRUD
  addBlock: (afterId?: string, options?: { name?: string; content?: string }) => string;
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
  const blockState = useBlocks();

  // 액션 객체 (안정된 참조로 useMemo 사용)
  const actions = useMemo<BlockActions>(() => ({
    addBlock: blockState.addBlock,
    updateBlock: blockState.updateBlock,
    deleteBlock: blockState.deleteBlock,
    indentBlock: blockState.indentBlock,
    outdentBlock: blockState.outdentBlock,
    toggleCollapse: blockState.toggleCollapse,
    addProperty: blockState.addProperty,
    updateProperty: blockState.updateProperty,
    updatePropertyByType: blockState.updatePropertyByType,
    updatePropertyName: blockState.updatePropertyName,
    removeProperty: blockState.removeProperty,
    removePropertyByType: blockState.removePropertyByType,
    updateBlockName: blockState.updateBlockName,
    applyType: blockState.applyType,
    moveBlockUp: blockState.moveBlockUp,
    moveBlockDown: blockState.moveBlockDown,
    duplicateBlock: blockState.duplicateBlock,
    deleteCompletedTodos: blockState.deleteCompletedTodos,
    togglePin: blockState.togglePin,
    moveToColumn: blockState.moveToColumn,
    addToTop3: blockState.addToTop3,
    removeFromTop3: blockState.removeFromTop3,
    toggleSelectionMode: blockState.toggleSelectionMode,
    toggleBlockSelection: blockState.toggleBlockSelection,
    selectAllBlocks: blockState.selectAllBlocks,
    clearSelection: blockState.clearSelection,
    deleteSelectedBlocks: blockState.deleteSelectedBlocks,
  }), [
    blockState.addBlock,
    blockState.updateBlock,
    blockState.deleteBlock,
    blockState.indentBlock,
    blockState.outdentBlock,
    blockState.toggleCollapse,
    blockState.addProperty,
    blockState.updateProperty,
    blockState.updatePropertyByType,
    blockState.updatePropertyName,
    blockState.removeProperty,
    blockState.removePropertyByType,
    blockState.updateBlockName,
    blockState.applyType,
    blockState.moveBlockUp,
    blockState.moveBlockDown,
    blockState.duplicateBlock,
    blockState.deleteCompletedTodos,
    blockState.togglePin,
    blockState.moveToColumn,
    blockState.addToTop3,
    blockState.removeFromTop3,
    blockState.toggleSelectionMode,
    blockState.toggleBlockSelection,
    blockState.selectAllBlocks,
    blockState.clearSelection,
    blockState.deleteSelectedBlocks,
  ]);

  // 데이터 객체
  const data = useMemo<BlockData>(() => ({
    blocks: blockState.blocks,
    isLoaded: blockState.isLoaded,
    syncStatus: blockState.syncStatus,
    syncError: blockState.syncError,
    isOnline: blockState.isOnline,
    isSupabaseConnected: blockState.isSupabaseConnected,
    useSupabase: blockState.useSupabase,
    top3Blocks: blockState.top3Blocks,
    top3History: blockState.top3History,
    selectedBlockIds: blockState.selectedBlockIds,
    isSelectionMode: blockState.isSelectionMode,
  }), [
    blockState.blocks,
    blockState.isLoaded,
    blockState.syncStatus,
    blockState.syncError,
    blockState.isOnline,
    blockState.isSupabaseConnected,
    blockState.useSupabase,
    blockState.top3Blocks,
    blockState.top3History,
    blockState.selectedBlockIds,
    blockState.isSelectionMode,
  ]);

  // 네비게이션 헬퍼
  const navigation = useMemo<BlockNavigation>(() => ({
    hasChildren: blockState.hasChildren,
    isChildOfCollapsed: blockState.isChildOfCollapsed,
    getPrevBlockId: blockState.getPrevBlockId,
    getNextBlockId: blockState.getNextBlockId,
  }), [
    blockState.hasChildren,
    blockState.isChildOfCollapsed,
    blockState.getPrevBlockId,
    blockState.getNextBlockId,
  ]);

  // 컨텍스트 값 (레거시 호환성 포함)
  const value = useMemo<BlockContextValue>(() => ({
    data,
    actions,
    navigation,
    ...blockState,
  }), [data, actions, navigation, blockState]);

  return (
    <BlockContext.Provider value={value}>
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

// === 새로운 구조화된 훅들 ===

/**
 * 블록 액션만 가져오는 훅 (안정된 참조)
 */
export function useBlockActions(): BlockActions {
  const { actions } = useBlockContext();
  return actions;
}

/**
 * 블록 데이터만 가져오는 훅
 */
export function useBlockData(): BlockData {
  const { data } = useBlockContext();
  return data;
}

/**
 * 네비게이션 헬퍼만 가져오는 훅
 */
export function useBlockNavigation(): BlockNavigation {
  const { navigation } = useBlockContext();
  return navigation;
}

// === 레거시 호환 훅들 ===

export function useBlockList() {
  const { blocks, isLoaded } = useBlockContext();
  return { blocks, isLoaded };
}

export function useSyncStatus() {
  const { syncStatus, syncError, isOnline, isSupabaseConnected } = useBlockContext();
  return { syncStatus, syncError, isOnline, isSupabaseConnected };
}

export function useBlockSelection() {
  const { data, actions } = useBlockContext();

  return {
    selectedBlockIds: data.selectedBlockIds,
    isSelectionMode: data.isSelectionMode,
    toggleSelectionMode: actions.toggleSelectionMode,
    toggleBlockSelection: actions.toggleBlockSelection,
    selectAllBlocks: actions.selectAllBlocks,
    clearSelection: actions.clearSelection,
    deleteSelectedBlocks: actions.deleteSelectedBlocks,
  };
}

export function useTop3() {
  const { data, actions } = useBlockContext();
  return {
    top3Blocks: data.top3Blocks,
    top3History: data.top3History,
    addToTop3: actions.addToTop3,
    removeFromTop3: actions.removeFromTop3,
  };
}

// === 속성 관련 훅 ===

/**
 * 속성 CRUD 액션만 가져오는 훅
 */
export function usePropertyActions() {
  const { actions } = useBlockContext();
  return {
    addProperty: actions.addProperty,
    updateProperty: actions.updateProperty,
    updatePropertyByType: actions.updatePropertyByType,
    updatePropertyName: actions.updatePropertyName,
    removeProperty: actions.removeProperty,
    removePropertyByType: actions.removePropertyByType,
  };
}

/**
 * 블록 CRUD 액션만 가져오는 훅
 */
export function useBlockCRUD() {
  const { actions } = useBlockContext();
  return {
    addBlock: actions.addBlock,
    updateBlock: actions.updateBlock,
    deleteBlock: actions.deleteBlock,
    updateBlockName: actions.updateBlockName,
  };
}
