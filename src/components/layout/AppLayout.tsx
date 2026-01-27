"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import { SearchModal } from "./SearchModal";
import { CalendarView, Dashboard, WeeklySchedule, NoteView, StudentListView } from "@/components/view";
import { useBlocks } from "@/hooks/useBlocks";
import { useSettings } from "@/hooks/useSettings";
import { useTags } from "@/hooks/useTags";
import { useBlockTypes } from "@/hooks/useBlockTypes";
import { useCustomViews } from "@/hooks/useCustomViews";
import { useView, filterBlocksByView } from "@/hooks/useView";
import { VIEW_LABELS } from "@/types/view";
import { DEFAULT_PROPERTIES } from "@/types/property";

export function AppLayout() {
  const {
    blocks,
    isLoaded,
    addBlock,
    updateBlock,
    deleteBlock,
    indentBlock,
    outdentBlock,
    toggleCollapse,
    hasChildren,
    isChildOfCollapsed,
    getPrevBlockId,
    getNextBlockId,
    addProperty,
    updateProperty,
    removeProperty,
    applyType,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    deleteCompletedTodos,
    togglePin,
    moveToColumn,
    // TOP 3 관련
    top3Blocks,
    top3History,
    addToTop3,
    removeFromTop3,
  } = useBlocks();

  const { tags, createTag, getTagsByIds } = useTags();
  const { blockTypes, createBlockType, deleteBlockType } = useBlockTypes();
  const { customViews, createView, deleteView } = useCustomViews();
  const { view, changeView, selectDate, selectCustomView } = useView();
  const { settings } = useSettings();

  const [showSearch, setShowSearch] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [triggerQuickInput, setTriggerQuickInput] = useState(0);
  const [noteViewBlockId, setNoteViewBlockId] = useState<string | null>(null);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P: 검색
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // n: 빠른 입력창 포커스 (입력 중이 아닐 때만)
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (e.key === "n" && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTriggerQuickInput((prev) => prev + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 노트 뷰에 표시할 블록
  const noteViewBlock = useMemo(() => {
    if (!noteViewBlockId) return null;
    return blocks.find((b) => b.id === noteViewBlockId) || null;
  }, [noteViewBlockId, blocks]);

  // 블록 선택 시 노트 뷰 열기
  const handleSelectBlock = useCallback((blockId: string) => {
    setNoteViewBlockId(blockId);
  }, []);

  // 블록 선택 시 포커스 (기존 동작 - 에디터용)
  const handleFocusBlock = useCallback((blockId: string) => {
    setFocusedBlockId(blockId);
    changeView("all");
  }, [changeView]);

  // 뷰에 따라 필터링된 블록
  const filteredBlocks = useMemo(
    () => filterBlocksByView(blocks, view, getTagsByIds, customViews),
    [blocks, view, getTagsByIds, customViews]
  );

  // 블록 카운트 계산
  const blockCounts = useMemo(() => {
    return {
      all: blocks.length,
    };
  }, [blocks]);

  // 학생 목록 (contact 속성이 있는 블록)
  const students = useMemo(() => {
    const getPlainText = (html: string) => {
      if (typeof window === "undefined") return html;
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    };

    return blocks
      .filter((b) => b.properties.some((p) => p.propertyId === "contact"))
      .map((b) => ({
        id: b.id,
        name: getPlainText(b.content) || "이름 없음",
      }));
  }, [blocks]);

  // 학생 선택 핸들러
  const handleSelectStudent = useCallback(
    (studentId: string) => {
      setNoteViewBlockId(studentId);
    },
    []
  );

  // 학생 추가 핸들러
  const handleAddStudent = useCallback(() => {
    const newBlockId = addBlock();
    // contact 속성 추가
    addProperty(newBlockId, "contact", { type: "contact", phone: "", email: "" });
    setNoteViewBlockId(newBlockId);
  }, [addBlock, addProperty]);

  // 캘린더에서 일정/수업 추가 핸들러
  const handleAddSchedule = useCallback(
    (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => {
      const newBlockId = addBlock();
      updateBlock(newBlockId, content);

      // 날짜 속성 추가
      addProperty(newBlockId, "date", {
        type: "date",
        date,
        time: time || undefined,
      });

      // 학생 선택 시 → 수업
      if (studentId) {
        // person 속성으로 학생 연결
        addProperty(newBlockId, "person", {
          type: "person",
          blockIds: [studentId],
        });

        // 기본 수업 시간 (50분)
        addProperty(newBlockId, "duration", {
          type: "duration",
          minutes: 50,
        });

        // 반복 설정 시 → 정규 수업
        if (isRepeat) {
          const dayOfWeek = new Date(date).getDay();
          addProperty(newBlockId, "repeat", {
            type: "repeat",
            config: {
              type: "weekly",
              interval: 1,
              weekdays: [dayOfWeek],
            },
          });
        }
      }

      // 체크박스 추가 (할일로 관리 가능하게)
      addProperty(newBlockId, "checkbox", {
        type: "checkbox",
        checked: false,
      });
    },
    [addBlock, updateBlock, addProperty]
  );

  // 자주 쓰는 태그 계산 (사용 빈도 기준 상위 5개)
  const frequentTags = useMemo(() => {
    const tagUsage: Record<string, number> = {};

    blocks.forEach((block) => {
      const tagProperty = block.properties.find((p) => p.propertyId === "tag");
      if (tagProperty?.value.type === "tag") {
        tagProperty.value.tagIds.forEach((tagId: string) => {
          tagUsage[tagId] = (tagUsage[tagId] || 0) + 1;
        });
      }
    });

    return tags
      .map((tag) => ({ ...tag, usage: tagUsage[tag.id] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);
  }, [blocks, tags]);

  // 현재 뷰 제목
  const viewTitle = useMemo(() => {
    if (view.type === "tag" && view.tagId) {
      const tag = tags.find((t) => t.id === view.tagId);
      return tag?.name || "태그";
    }
    if (view.type === "calendar" && view.date) {
      return view.date;
    }
    if (view.type === "custom" && view.customViewId) {
      const customView = customViews.find((v) => v.id === view.customViewId);
      return customView?.name || "커스텀 뷰";
    }
    return VIEW_LABELS[view.type];
  }, [view, tags, customViews]);

  // 캘린더에서 날짜 선택
  const handleCalendarSelectDate = useCallback(
    (date: string) => {
      selectDate(date);
    },
    [selectDate]
  );

  // 타입 생성 핸들러
  const handleCreateType = useCallback(
    (name: string, propertyIds: string[], icon?: string, color?: string) => {
      return createBlockType(name, propertyIds, icon, color);
    },
    [createBlockType]
  );

  // 뷰 생성 핸들러
  const handleCreateView = useCallback(
    (name: string, icon: string, color: string, propertyIds: string[]) => {
      return createView(name, icon, color, propertyIds);
    },
    [createView]
  );

  // 블록에 타입 적용 핸들러
  const handleApplyTypeToBlock = useCallback(
    (blockId: string, typeId: string) => {
      const blockType = blockTypes.find((t) => t.id === typeId);
      if (!blockType) return;

      // 속성 ID에 해당하는 타입 찾기
      const types = blockType.propertyIds.map((propId) => {
        const prop = DEFAULT_PROPERTIES.find((p) => p.id === propId);
        return prop?.type || "text";
      });

      applyType(blockId, blockType.propertyIds, types);
    },
    [blockTypes, applyType]
  );

  // 체크박스 토글 핸들러 (Dashboard용)
  const handleToggleCheckbox = useCallback(
    (blockId: string, checked: boolean) => {
      updateProperty(blockId, "checkbox", { type: "checkbox", checked });
    },
    [updateProperty]
  );

  return (
    <div className="flex h-screen">
      <Sidebar
        currentView={view}
        onChangeView={changeView}
        onSelectCustomView={selectCustomView}
        tags={tags}
        blockTypes={blockTypes}
        customViews={customViews}
        students={students}
        blockCounts={blockCounts}
        onCreateType={handleCreateType}
        onDeleteType={deleteBlockType}
        onCreateView={handleCreateView}
        onDeleteView={deleteView}
        onSelectStudent={handleSelectStudent}
      />

      {view.type === "students" ? (
        // 학생 목록 뷰
        <StudentListView
          blocks={blocks}
          blockTypes={blockTypes}
          tags={tags}
          onSelectBlock={handleSelectBlock}
          onAddStudent={handleAddStudent}
        />
      ) : view.type === "dashboard" ? (
        // 대시보드 뷰
        <Dashboard
          blocks={blocks}
          top3Blocks={top3Blocks}
          top3History={top3History}
          onAddToTop3={addToTop3}
          onRemoveFromTop3={removeFromTop3}
          onAddBlock={addBlock}
          onUpdateBlock={updateBlock}
          onToggleCheckbox={handleToggleCheckbox}
          onSelectBlock={handleSelectBlock}
        />
      ) : view.type === "weekly" ? (
        // 주간 시간표 뷰
        <WeeklySchedule
          blocks={blocks}
          settings={settings}
          onAddBlock={addBlock}
          onUpdateBlock={updateBlock}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onSelectBlock={handleSelectBlock}
        />
      ) : view.type === "calendar" && !view.date ? (
        // 캘린더 뷰 (날짜 미선택 시)
        <main className="flex-1 h-screen overflow-auto bg-background">
          <header className="h-14 flex items-center justify-between px-4 border-b border-border">
            <div className="text-sm font-medium">{viewTitle}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                날짜 선택
              </span>
            </div>
          </header>
          <CalendarView
            blocks={blocks}
            selectedDate={view.date}
            students={students}
            onSelectDate={handleCalendarSelectDate}
            onAddSchedule={handleAddSchedule}
          />
        </main>
      ) : (
        // 일반 에디터 뷰
        <Editor
          blocks={blocks}
          filteredBlocks={filteredBlocks}
          isLoaded={isLoaded}
          viewTitle={viewTitle}
          viewType={view.type}
          tags={tags}
          blockTypes={blockTypes}
          onAddBlock={addBlock}
          onUpdateBlock={updateBlock}
          onDeleteBlock={deleteBlock}
          onIndentBlock={indentBlock}
          onOutdentBlock={outdentBlock}
          onToggleCollapse={toggleCollapse}
          hasChildren={hasChildren}
          isChildOfCollapsed={isChildOfCollapsed}
          getPrevBlockId={getPrevBlockId}
          getNextBlockId={getNextBlockId}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onRemoveProperty={removeProperty}
          onCreateTag={createTag}
          onApplyType={handleApplyTypeToBlock}
          onMoveBlockUp={moveBlockUp}
          onMoveBlockDown={moveBlockDown}
          onDuplicateBlock={duplicateBlock}
          onDeleteCompletedTodos={deleteCompletedTodos}
          selectedBlockId={focusedBlockId}
          onClearSelection={() => setFocusedBlockId(null)}
          triggerQuickInput={triggerQuickInput}
          onTogglePin={togglePin}
          onMoveToColumn={moveToColumn}
          frequentTags={frequentTags}
        />
      )}

      {/* 검색 모달 */}
      <SearchModal
        blocks={blocks}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectBlock={handleSelectBlock}
      />

      {/* 노트 뷰 (전체 화면) */}
      {noteViewBlock && (
        <NoteView
          block={noteViewBlock}
          allTags={tags}
          blockTypes={blockTypes}
          onUpdateBlock={updateBlock}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onRemoveProperty={removeProperty}
          onCreateTag={createTag}
          onMoveToColumn={moveToColumn}
          onDeleteBlock={deleteBlock}
          onClose={() => setNoteViewBlockId(null)}
        />
      )}
    </div>
  );
}
