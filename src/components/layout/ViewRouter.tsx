"use client";

import { useCallback } from "react";
import { View } from "@/types/view";
import { Block, Top3History, BlockColumn } from "@/types/block";
import { BlockType } from "@/types/blockType";
import { BlockProperty, PropertyType, Tag } from "@/types/property";
import { ScheduleSettings } from "@/types/settings";
import { StudentListView } from "@/components/view/StudentListView";
import { Dashboard } from "@/components/view/Dashboard";
import { WeeklySchedule } from "@/components/view/WeeklySchedule";
import { CalendarView } from "@/components/view/CalendarView";
import { Editor } from "@/components/layout/Editor";

// 공통 props
interface CommonProps {
  blocks: Block[];
  isLoaded: boolean;
  onSelectBlock: (blockId: string) => void;
}

// StudentListView props
interface StudentViewProps extends CommonProps {
  blockTypes: BlockType[];
  tags: Tag[];
  onAddStudent: () => void;
}

// Dashboard props
interface DashboardProps extends CommonProps {
  top3Blocks: Block[];
  top3History: Top3History[];
  onAddToTop3: (blockId: string) => void;
  onRemoveFromTop3: (blockId: string) => void;
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
}

// WeeklySchedule props
interface WeeklyProps extends CommonProps {
  settings: ScheduleSettings;
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => void;
}

// 학생 정보 타입 (캘린더용)
interface StudentInfo {
  id: string;
  name: string;
}

// CalendarView props
interface CalendarProps {
  blocks: Block[];
  selectedDate?: string;
  students: StudentInfo[];
  onSelectDate: (date: string) => void;
  onAddSchedule: (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => void;
}

// Editor props
interface EditorProps extends CommonProps {
  filteredBlocks: Block[];
  viewTitle: string;
  viewType: string;
  tags: Tag[];
  blockTypes: BlockType[];
  frequentTags: Tag[];
  selectedBlockIds: Set<string>;
  isSelectionMode: boolean;
  selectedBlockId?: string | null;
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
  onIndentBlock: (id: string) => void;
  onOutdentBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  isChildOfCollapsed: (index: number) => boolean;
  getPrevBlockId: (id: string) => string | null;
  getNextBlockId: (id: string) => string | null;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: BlockProperty["value"]) => void;
  onUpdatePropertyByType: (blockId: string, propertyType: PropertyType, value: BlockProperty["value"]) => void;
  onUpdateBlockName: (blockId: string, name: string) => void;
  onUpdatePropertyName: (blockId: string, propertyId: string, name: string) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onRemovePropertyByType: (blockId: string, propertyType: PropertyType) => void;
  onCreateTag: (name: string, color?: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onMoveBlockUp: (id: string) => void;
  onMoveBlockDown: (id: string) => void;
  onDuplicateBlock: (id: string) => string;
  onDeleteCompletedTodos: () => void;
  onClearSelection: () => void;
  triggerQuickInput: number;
  onTogglePin: (id: string) => void;
  onMoveToColumn: (id: string, column: BlockColumn) => void;
  onToggleSelectionMode: () => void;
  onToggleBlockSelection: (id: string) => void;
  onSelectAllBlocks: (blockIds: string[]) => void;
  onClearBlockSelection: () => void;
  onDeleteSelectedBlocks: () => void;
}

// ViewRouter 통합 props
export interface ViewRouterProps {
  view: View;
  // 공통
  blocks: Block[];
  filteredBlocks: Block[];
  isLoaded: boolean;
  viewTitle: string;
  tags: Tag[];
  blockTypes: BlockType[];
  top3Blocks: Block[];
  top3History: Top3History[];
  students: StudentInfo[];
  settings: ScheduleSettings;
  frequentTags: Tag[];
  selectedBlockIds: Set<string>;
  isSelectionMode: boolean;
  selectedBlockId?: string | null;
  // 콜백
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string) => void;
  onAddStudent: () => void;
  onAddToTop3: (blockId: string) => void;
  onRemoveFromTop3: (blockId: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => void;
  onCalendarSelectDate: (date: string) => void;
  onAddSchedule: (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => void;
  // Editor 전용
  onIndentBlock: (id: string) => void;
  onOutdentBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  isChildOfCollapsed: (index: number) => boolean;
  getPrevBlockId: (id: string) => string | null;
  getNextBlockId: (id: string) => string | null;
  onUpdateProperty: (blockId: string, propertyId: string, value: BlockProperty["value"]) => void;
  onUpdatePropertyByType: (blockId: string, propertyType: PropertyType, value: BlockProperty["value"]) => void;
  onUpdateBlockName: (blockId: string, name: string) => void;
  onUpdatePropertyName: (blockId: string, propertyId: string, name: string) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onRemovePropertyByType: (blockId: string, propertyType: PropertyType) => void;
  onCreateTag: (name: string, color?: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onMoveBlockUp: (id: string) => void;
  onMoveBlockDown: (id: string) => void;
  onDuplicateBlock: (id: string) => string;
  onDeleteCompletedTodos: () => void;
  onClearSelection: () => void;
  triggerQuickInput: number;
  onTogglePin: (id: string) => void;
  onMoveToColumn: (id: string, column: BlockColumn) => void;
  onToggleSelectionMode: () => void;
  onToggleBlockSelection: (id: string) => void;
  onSelectAllBlocks: (blockIds: string[]) => void;
  onClearBlockSelection: () => void;
  onDeleteSelectedBlocks: () => void;
}

export function ViewRouter({
  view,
  blocks,
  filteredBlocks,
  isLoaded,
  viewTitle,
  tags,
  blockTypes,
  top3Blocks,
  top3History,
  students,
  settings,
  frequentTags,
  selectedBlockIds,
  isSelectionMode,
  selectedBlockId,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onSelectBlock,
  onAddStudent,
  onAddToTop3,
  onRemoveFromTop3,
  onToggleCheckbox,
  onAddProperty,
  onCalendarSelectDate,
  onAddSchedule,
  onIndentBlock,
  onOutdentBlock,
  onToggleCollapse,
  hasChildren,
  isChildOfCollapsed,
  getPrevBlockId,
  getNextBlockId,
  onUpdateProperty,
  onUpdatePropertyByType,
  onUpdateBlockName,
  onUpdatePropertyName,
  onRemoveProperty,
  onRemovePropertyByType,
  onCreateTag,
  onApplyType,
  onMoveBlockUp,
  onMoveBlockDown,
  onDuplicateBlock,
  onDeleteCompletedTodos,
  onClearSelection,
  triggerQuickInput,
  onTogglePin,
  onMoveToColumn,
  onToggleSelectionMode,
  onToggleBlockSelection,
  onSelectAllBlocks,
  onClearBlockSelection,
  onDeleteSelectedBlocks,
}: ViewRouterProps) {
  // 다중 블록 삭제 핸들러
  const handleDeleteBlocks = useCallback((blockIds: string[]) => {
    blockIds.forEach(id => onDeleteBlock(id));
  }, [onDeleteBlock]);

  // 학생 목록 뷰
  if (view.type === "students") {
    return (
      <StudentListView
        blocks={blocks}
        blockTypes={blockTypes}
        tags={tags}
        onSelectBlock={onSelectBlock}
        onAddStudent={onAddStudent}
        onDeleteBlocks={handleDeleteBlocks}
      />
    );
  }

  // 대시보드 뷰
  if (view.type === "dashboard") {
    return (
      <Dashboard
        blocks={blocks}
        top3Blocks={top3Blocks}
        top3History={top3History}
        onAddToTop3={onAddToTop3}
        onRemoveFromTop3={onRemoveFromTop3}
        onAddBlock={onAddBlock}
        onUpdateBlock={onUpdateBlock}
        onToggleCheckbox={onToggleCheckbox}
        onSelectBlock={onSelectBlock}
      />
    );
  }

  // 주간 시간표 뷰
  if (view.type === "weekly") {
    return (
      <WeeklySchedule
        blocks={blocks}
        settings={settings}
        onAddBlock={onAddBlock}
        onUpdateBlock={onUpdateBlock}
        onUpdateBlockName={onUpdateBlockName}
        onAddProperty={onAddProperty}
        onSelectBlock={onSelectBlock}
      />
    );
  }

  // 캘린더 뷰 (날짜 미선택)
  if (view.type === "calendar" && !view.date) {
    return (
      <main className="flex-1 h-screen overflow-auto bg-background">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className="text-sm font-medium">{viewTitle}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">날짜 선택</span>
          </div>
        </header>
        <CalendarView
          blocks={blocks}
          selectedDate={view.date}
          students={students}
          onSelectDate={onCalendarSelectDate}
          onAddSchedule={onAddSchedule}
        />
      </main>
    );
  }

  // 기본 에디터 뷰 (all, today, todo, tag, calendar with date, custom 등)
  return (
    <Editor
      blocks={blocks}
      filteredBlocks={filteredBlocks}
      isLoaded={isLoaded}
      viewTitle={viewTitle}
      viewType={view.type}
      tags={tags}
      blockTypes={blockTypes}
      onAddBlock={onAddBlock}
      onUpdateBlock={onUpdateBlock}
      onDeleteBlock={onDeleteBlock}
      onIndentBlock={onIndentBlock}
      onOutdentBlock={onOutdentBlock}
      onToggleCollapse={onToggleCollapse}
      hasChildren={hasChildren}
      isChildOfCollapsed={isChildOfCollapsed}
      getPrevBlockId={getPrevBlockId}
      getNextBlockId={getNextBlockId}
      onAddProperty={onAddProperty}
      onUpdateProperty={onUpdateProperty}
      onUpdatePropertyByType={onUpdatePropertyByType}
      onUpdateBlockName={onUpdateBlockName}
      onUpdatePropertyName={onUpdatePropertyName}
      onRemoveProperty={onRemoveProperty}
      onRemovePropertyByType={onRemovePropertyByType}
      onCreateTag={onCreateTag}
      onApplyType={onApplyType}
      onMoveBlockUp={onMoveBlockUp}
      onMoveBlockDown={onMoveBlockDown}
      onDuplicateBlock={onDuplicateBlock}
      onDeleteCompletedTodos={onDeleteCompletedTodos}
      selectedBlockId={selectedBlockId}
      onClearSelection={onClearSelection}
      triggerQuickInput={triggerQuickInput}
      onTogglePin={onTogglePin}
      onMoveToColumn={onMoveToColumn}
      frequentTags={frequentTags}
      selectedBlockIds={selectedBlockIds}
      isSelectionMode={isSelectionMode}
      onToggleSelectionMode={onToggleSelectionMode}
      onToggleBlockSelection={onToggleBlockSelection}
      onSelectAllBlocks={onSelectAllBlocks}
      onClearBlockSelection={onClearBlockSelection}
      onDeleteSelectedBlocks={onDeleteSelectedBlocks}
    />
  );
}
