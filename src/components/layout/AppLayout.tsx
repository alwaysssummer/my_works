"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { ViewRouter } from "./ViewRouter";
import { SearchModal } from "./SearchModal";
import { NoteView } from "@/components/view";
import { BlockProvider, useBlockContext } from "@/contexts/BlockContext";
import { useSettings } from "@/hooks/useSettings";
import { useTags } from "@/hooks/useTags";
import { useBlockTypes } from "@/hooks/useBlockTypes";
import { useCustomViews } from "@/hooks/useCustomViews";
import { useView, filterBlocksByView } from "@/hooks/useView";
import { useStudents } from "@/hooks/useStudents";
import { VIEW_LABELS, ViewType } from "@/types/view";
import { DEFAULT_PROPERTIES } from "@/types/property";
import { getKoreanToday } from "@/lib/dateFormat";
import { getPropertyByType, getTagIds } from "@/lib/propertyHelpers";
import { UnifiedInput } from "@/components/input";

// 내부 레이아웃 컴포넌트 (Context 내부)
function AppLayoutInner() {
  // Context에서 블록 상태 가져오기
  const {
    blocks,
    isLoaded,
    addBlock,
    updateBlock,
    deleteBlock,
    addProperty,
    updateProperty,
    updatePropertyName,
    removeProperty,
    updateBlockName,
    applyType,
    moveToColumn,
    top3Blocks,
  } = useBlockContext();

  const { tags, createTag, getTagsByIds } = useTags();
  const { blockTypes, createBlockType, deleteBlockType } = useBlockTypes();
  const { customViews, createView, deleteView } = useCustomViews();
  const { view, changeView: changeViewOriginal, selectDate, selectCustomView } = useView();
  const { studentBlocks, students } = useStudents(blocks);
  const { settings } = useSettings();

  const [showSearch, setShowSearch] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [triggerQuickInput, setTriggerQuickInput] = useState(0);
  const [noteViewBlockId, setNoteViewBlockId] = useState<string | null>(null);

  // 뷰 전환 시 NoteView 자동 닫기
  const changeView = useCallback((...args: Parameters<typeof changeViewOriginal>) => {
    setNoteViewBlockId(null);
    changeViewOriginal(...args);
  }, [changeViewOriginal]);

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

  // 뷰에 따라 필터링된 블록
  const filteredBlocks = useMemo(
    () => filterBlocksByView(blocks, view, getTagsByIds, customViews),
    [blocks, view, getTagsByIds, customViews]
  );

  // 현재 뷰의 블록 목록 (NoteView 이동용)
  const contextBlocks = useMemo(() => {
    if (view.type === "students") return studentBlocks;
    if (view.type === "dashboard") {
      const todayStr = getKoreanToday();
      const todayBlocks = blocks.filter((b) => {
        const dateProp = getPropertyByType(b, "date");
        return dateProp?.value?.type === "date" && dateProp.value.date === todayStr;
      });
      return [...top3Blocks, ...todayBlocks.filter((b) => !top3Blocks.some((t) => t.id === b.id))];
    }
    return filteredBlocks;
  }, [view.type, studentBlocks, blocks, top3Blocks, filteredBlocks]);

  // 블록 이동 핸들러 (NoteView에서 이전/다음 블록으로 이동)
  const handleNavigateBlock = useCallback(
    (blockId: string | null) => {
      if (blockId) {
        setNoteViewBlockId(blockId);
      } else {
        setNoteViewBlockId(null);
      }
    },
    []
  );

  // 삭제 후 이동 핸들러
  const handleDeleteWithNav = useCallback(
    (blockId: string) => {
      const currentIndex = contextBlocks.findIndex((b) => b.id === blockId);
      deleteBlock(blockId);

      if (currentIndex > 0) {
        setNoteViewBlockId(contextBlocks[currentIndex - 1].id);
      } else if (currentIndex < contextBlocks.length - 1) {
        setNoteViewBlockId(contextBlocks[currentIndex + 1].id);
      } else {
        setNoteViewBlockId(null);
      }
    },
    [contextBlocks, deleteBlock]
  );

  // 블록 카운트 계산
  const blockCounts = useMemo(() => {
    return { all: blocks.length };
  }, [blocks]);

  // 학생 선택 핸들러
  const handleSelectStudent = useCallback((studentId: string) => {
    setNoteViewBlockId(studentId);
  }, []);

  // 학생 추가 핸들러
  const handleAddStudent = useCallback(() => {
    const newBlockId = addBlock();
    addProperty(newBlockId, "contact");
    setNoteViewBlockId(newBlockId);
  }, [addBlock, addProperty]);

  // 캘린더에서 일정/수업 추가 핸들러
  const handleAddSchedule = useCallback(
    (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => {
      const newBlockId = addBlock();

      if (studentId) {
        updateBlockName(newBlockId, content);
      } else {
        updateBlock(newBlockId, content);
      }

      addProperty(newBlockId, "date");

      if (studentId) {
        addProperty(newBlockId, "person");
        addProperty(newBlockId, "duration");
        if (isRepeat) {
          addProperty(newBlockId, "repeat");
        }
      }

      addProperty(newBlockId, "checkbox");
    },
    [addBlock, updateBlock, updateBlockName, addProperty]
  );

  // 자주 쓰는 태그 계산
  const frequentTags = useMemo(() => {
    const tagUsage: Record<string, number> = {};

    blocks.forEach((block) => {
      const blockTagIds = getTagIds(block);
      blockTagIds.forEach((tagId: string) => {
        tagUsage[tagId] = (tagUsage[tagId] || 0) + 1;
      });
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

  // UnifiedInput 표시 여부 결정 (모든 뷰에서 표시)
  const shouldShowUnifiedInput = useCallback((_viewType: ViewType): boolean => {
    return true;
  }, []);

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

      const types = blockType.propertyIds.map((propId) => {
        const prop = DEFAULT_PROPERTIES.find((p) => p.id === propId);
        return prop?.type || "text";
      }) as import("@/types/property").PropertyType[];

      applyType(blockId, types);
    },
    [blockTypes, applyType]
  );

  // 체크박스 토글 핸들러 (Dashboard용)
  const handleToggleCheckbox = useCallback(
    (blockId: string, checked: boolean) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const checkboxProp = getPropertyByType(block, "checkbox");
      if (checkboxProp) {
        updateProperty(blockId, checkboxProp.id, { type: "checkbox", checked });
      }
    },
    [blocks, updateProperty]
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

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 통합 입력창 - 특정 뷰에서만 표시 */}
        {shouldShowUnifiedInput(view.type) && (
          <div className="sticky top-0 z-20 bg-background border-b border-border">
            <UnifiedInput
              placeholder="입력하세요..."
              showHints={true}
              triggerFocus={triggerQuickInput}
              autoFocus={isLoaded}
              onOpenFullPage={handleSelectBlock}
            />
          </div>
        )}

        {/* ViewRouter - props 대폭 감소 (58개 → 17개) */}
        <ViewRouter
        view={view}
        viewTitle={viewTitle}
        filteredBlocks={filteredBlocks}
        tags={tags}
        blockTypes={blockTypes}
        students={students}
        settings={settings}
        frequentTags={frequentTags}
        onSelectBlock={handleSelectBlock}
        onAddStudent={handleAddStudent}
        onCalendarSelectDate={handleCalendarSelectDate}
        onAddSchedule={handleAddSchedule}
        onCreateTag={createTag}
        onApplyType={handleApplyTypeToBlock}
        onToggleCheckbox={handleToggleCheckbox}
        selectedBlockId={focusedBlockId}
        onClearSelection={() => setFocusedBlockId(null)}
        triggerQuickInput={triggerQuickInput}
        />
      </div>

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
          contextBlocks={contextBlocks}
          onUpdateBlock={updateBlock}
          onUpdateBlockName={updateBlockName}
          onAddProperty={addProperty}
          onUpdateProperty={updateProperty}
          onUpdatePropertyName={updatePropertyName}
          onRemoveProperty={removeProperty}
          onCreateTag={createTag}
          onMoveToColumn={moveToColumn}
          onDeleteBlock={handleDeleteWithNav}
          onNavigate={handleNavigateBlock}
          onClose={() => setNoteViewBlockId(null)}
        />
      )}
    </div>
  );
}

// 메인 AppLayout (BlockProvider로 감싸기)
export function AppLayout() {
  return (
    <BlockProvider>
      <AppLayoutInner />
    </BlockProvider>
  );
}
