"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getKoreanDateParts, getKoreanToday } from "@/lib/dateFormat";
import { View } from "@/types/view";
import { Block, Top3History, BlockColumn } from "@/types/block";
import { BlockType } from "@/types/blockType";
import { BlockProperty, PropertyType, Tag } from "@/types/property";
import { ScheduleSettings } from "@/types/settings";
import { StudentListView } from "@/components/view/StudentListView";
import { Dashboard } from "@/components/view/Dashboard";
import { WeeklySchedule } from "@/components/view/WeeklySchedule";
import { CalendarView } from "@/components/view/CalendarView";
import { DeadlineView } from "@/components/view/DeadlineView";
import { TasksView } from "@/components/view/TasksView";
import { Editor } from "@/components/layout/Editor";
import {
  useBlockContext,
  useBlockActions,
  useBlockData,
  useBlockNavigation,
} from "@/contexts/BlockContext";

// 학생 정보 타입 (캘린더용)
interface StudentInfo {
  id: string;
  name: string;
}

// ViewRouter 간소화된 props (58개 → ~15개)
export interface ViewRouterProps {
  // 뷰 관련 (필수)
  view: View;
  viewTitle: string;
  filteredBlocks: Block[];

  // 외부 데이터 (Context 외부)
  tags: Tag[];
  blockTypes: BlockType[];
  students: StudentInfo[];
  settings: ScheduleSettings;
  frequentTags: Tag[];

  // 뷰 전환/선택 콜백
  onSelectBlock: (blockId: string) => void;
  onAddStudent: () => void;
  onCalendarSelectDate: (date: string) => void;
  onAddSchedule: (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => void;
  onCreateTag: (name: string, color?: string) => Tag;
  onUpdateTag?: (id: string, updates: Partial<Omit<Tag, "id">>) => void;
  onDeleteTag?: (id: string) => void;
  onApplyType: (blockId: string, typeId: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;

  // Editor 전용 (로컬 상태)
  selectedBlockId?: string | null;
  onClearSelection: () => void;
  triggerQuickInput: number;

  // 할일 탭 태그 필터
  activeTagFilter?: string | null;

  // 시간표 모드 전환
  onChangeScheduleMode?: (mode: "weekly" | "calendar" | "deadline") => void;
}

export function ViewRouter({
  view,
  viewTitle,
  filteredBlocks,
  tags,
  blockTypes,
  students,
  settings,
  frequentTags,
  onSelectBlock,
  onAddStudent,
  onCalendarSelectDate,
  onAddSchedule,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onApplyType,
  onToggleCheckbox,
  selectedBlockId,
  onClearSelection,
  triggerQuickInput,
  activeTagFilter,
  onChangeScheduleMode,
}: ViewRouterProps) {
  // Context에서 데이터와 액션 가져오기
  const { blocks, isLoaded, top3Blocks, top3History, selectedBlockIds, isSelectionMode } = useBlockData();
  const actions = useBlockActions();
  const navigation = useBlockNavigation();

  // 캘린더 월 상태 (ViewRouter에서 관리 → 헤더에 네비게이션 표시)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parts = getKoreanDateParts();
    return { year: parts.year, month: parts.month - 1 };
  });

  const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const goToPrevMonth = useCallback(() => {
    setCalendarMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  }, []);

  const goToCalendarToday = useCallback(() => {
    const parts = getKoreanDateParts();
    setCalendarMonth({ year: parts.year, month: parts.month - 1 });
    onCalendarSelectDate(getKoreanToday());
  }, [onCalendarSelectDate]);

  // 다중 블록 삭제 핸들러
  const handleDeleteBlocks = useCallback((blockIds: string[]) => {
    blockIds.forEach(id => actions.deleteBlock(id));
  }, [actions]);

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
        onAddToTop3={actions.addToTop3}
        onRemoveFromTop3={actions.removeFromTop3}
        onAddBlock={actions.addBlock}
        onUpdateBlock={actions.updateBlock}
        onUpdateBlockName={actions.updateBlockName}
        onToggleCheckbox={onToggleCheckbox}
        onSelectBlock={onSelectBlock}
      />
    );
  }

  // 할일 통합 뷰 (3단 칸반)
  if (view.type === "tasks") {
    return (
      <TasksView
        blocks={blocks}
        tags={tags}
        activeTagFilter={activeTagFilter ?? null}
        onToggleCheckbox={onToggleCheckbox}
        onTogglePin={actions.togglePin}
        onSelectBlock={onSelectBlock}
        onMoveToColumn={actions.moveToColumn}
      />
    );
  }

  // 주간 시간표 뷰
  if (view.type === "weekly") {
    return (
      <WeeklySchedule
        blocks={blocks}
        tags={tags}
        settings={settings}
        onAddBlock={actions.addBlock}
        onUpdateBlock={actions.updateBlock}
        onUpdateBlockName={actions.updateBlockName}
        onAddProperty={actions.addProperty}
        onUpdateProperty={actions.updateProperty}
        onDeleteBlock={actions.deleteBlock}
        onSelectBlock={onSelectBlock}
        onChangeScheduleMode={onChangeScheduleMode}
      />
    );
  }

  // 마감일 뷰
  if (view.type === "deadline") {
    return (
      <DeadlineView
        blocks={blocks}
        onSelectBlock={onSelectBlock}
        onToggleCheckbox={onToggleCheckbox}
      />
    );
  }

  // 캘린더 뷰 (날짜 미선택)
  if (view.type === "calendar" && !view.date) {
    return (
      <main className="flex-1 h-screen overflow-auto bg-background">
        <header className="h-14 flex items-center px-4 border-b border-border">
          <button
            onClick={() => onChangeScheduleMode?.("weekly")}
            className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex-shrink-0"
            title="주간 뷰로 전환"
          >
            Week
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[100px] text-center">
              {calendarMonth.year}년 {MONTH_NAMES[calendarMonth.month]}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={goToCalendarToday}
            className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex-shrink-0"
          >
            오늘
          </button>
        </header>
        <CalendarView
          blocks={blocks}
          selectedDate={view.date}
          students={students}
          onSelectDate={onCalendarSelectDate}
          onAddSchedule={onAddSchedule}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          hideHeader
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
      onAddBlock={actions.addBlock}
      onUpdateBlock={actions.updateBlock}
      onDeleteBlock={actions.deleteBlock}
      onIndentBlock={actions.indentBlock}
      onOutdentBlock={actions.outdentBlock}
      onToggleCollapse={actions.toggleCollapse}
      hasChildren={navigation.hasChildren}
      isChildOfCollapsed={navigation.isChildOfCollapsed}
      getPrevBlockId={navigation.getPrevBlockId}
      getNextBlockId={navigation.getNextBlockId}
      onAddProperty={actions.addProperty}
      onUpdateProperty={actions.updateProperty}
      onUpdatePropertyByType={actions.updatePropertyByType}
      onUpdateBlockName={actions.updateBlockName}
      onUpdatePropertyName={actions.updatePropertyName}
      onRemoveProperty={actions.removeProperty}
      onRemovePropertyByType={actions.removePropertyByType}
      onCreateTag={onCreateTag}
      onUpdateTag={onUpdateTag}
      onDeleteTag={onDeleteTag}
      onApplyType={onApplyType}
      onMoveBlockUp={actions.moveBlockUp}
      onMoveBlockDown={actions.moveBlockDown}
      onDuplicateBlock={actions.duplicateBlock}
      onDeleteCompletedTodos={actions.deleteCompletedTodos}
      selectedBlockId={selectedBlockId}
      onClearSelection={onClearSelection}
      triggerQuickInput={triggerQuickInput}
      onTogglePin={actions.togglePin}
      onMoveToColumn={actions.moveToColumn}
      frequentTags={frequentTags}
      selectedBlockIds={selectedBlockIds}
      isSelectionMode={isSelectionMode}
      onToggleSelectionMode={actions.toggleSelectionMode}
      onToggleBlockSelection={actions.toggleBlockSelection}
      onSelectAllBlocks={actions.selectAllBlocks}
      onClearBlockSelection={actions.clearSelection}
      onDeleteSelectedBlocks={actions.deleteSelectedBlocks}
    />
  );
}
