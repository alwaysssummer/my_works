"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import { SearchModal } from "./SearchModal";
import { CalendarView } from "@/components/view";
import { useBlocks } from "@/hooks/useBlocks";
import { useTags } from "@/hooks/useTags";
import { useBlockTypes } from "@/hooks/useBlockTypes";
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
  } = useBlocks();

  const { tags, createTag, getTagsByIds } = useTags();
  const { blockTypes, createBlockType, deleteBlockType } = useBlockTypes();
  const { view, changeView, selectDate } = useView();

  const [showSearch, setShowSearch] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  // 키보드 단축키 (Ctrl+P: 검색)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 블록 선택 시 포커스
  const handleSelectBlock = useCallback((blockId: string) => {
    setFocusedBlockId(blockId);
    // 전체 뷰로 이동
    changeView("all");
  }, [changeView]);

  // 뷰에 따라 필터링된 블록
  const filteredBlocks = useMemo(
    () => filterBlocksByView(blocks, view, getTagsByIds),
    [blocks, view, getTagsByIds]
  );

  // 블록 카운트 계산
  const blockCounts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    const todayBlocks = blocks.filter((block) => {
      const dateProperty = block.properties.find((p) => p.propertyId === "date");
      const checkboxProperty = block.properties.find((p) => p.propertyId === "checkbox");

      if (dateProperty?.value.type === "date" && dateProperty.value.date === today) {
        return true;
      }
      if (checkboxProperty?.value.type === "checkbox" && !checkboxProperty.value.checked) {
        if (dateProperty?.value.type === "date" && dateProperty.value.date <= today) {
          return true;
        }
      }
      return false;
    });

    const todoBlocks = blocks.filter((block) =>
      block.properties.some((p) => p.propertyId === "checkbox")
    );

    const completedTodos = todoBlocks.filter((block) => {
      const checkboxProperty = block.properties.find((p) => p.propertyId === "checkbox");
      return checkboxProperty?.value.type === "checkbox" && checkboxProperty.value.checked;
    });

    return {
      all: blocks.length,
      today: todayBlocks.length,
      todo: todoBlocks.length,
      todoCompleted: completedTodos.length,
    };
  }, [blocks]);

  // 현재 뷰 제목
  const viewTitle = useMemo(() => {
    if (view.type === "tag" && view.tagId) {
      const tag = tags.find((t) => t.id === view.tagId);
      return tag?.name || "태그";
    }
    if (view.type === "calendar" && view.date) {
      return view.date;
    }
    return VIEW_LABELS[view.type];
  }, [view, tags]);

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

  return (
    <div className="flex h-screen">
      <Sidebar
        currentView={view}
        onChangeView={changeView}
        tags={tags}
        blockTypes={blockTypes}
        blockCounts={blockCounts}
        onCreateType={handleCreateType}
        onDeleteType={deleteBlockType}
      />

      {view.type === "calendar" && !view.date ? (
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
            onSelectDate={handleCalendarSelectDate}
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
        />
      )}

      {/* 검색 모달 */}
      <SearchModal
        blocks={blocks}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectBlock={handleSelectBlock}
      />
    </div>
  );
}
