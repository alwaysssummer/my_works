"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { TabBar } from "./TabBar";
import { TagFilterChips } from "./TagFilterChips";
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
import { TabType, TAB_TO_VIEW, VIEW_LABELS, ViewType } from "@/types/view";
import { DEFAULT_PROPERTIES } from "@/types/property";
import { getKoreanToday } from "@/lib/dateFormat";
import { getPropertyByType, getTagIds } from "@/lib/propertyHelpers";
import { UnifiedInput } from "@/components/input";

// Sidebar에서 사용하던 모달 컴포넌트 (OverflowMenu에서 재사용)
import { TypeCreateModal, ViewCreateModal } from "./OverflowModals";

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

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [scheduleMode, setScheduleMode] = useState<"weekly" | "calendar" | "deadline">("weekly");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // 모달 상태 (더보기 메뉴에서 사용)
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // 뷰 전환 시 NoteView 자동 닫기
  const changeView = useCallback((...args: Parameters<typeof changeViewOriginal>) => {
    setNoteViewBlockId(null);
    changeViewOriginal(...args);
  }, [changeViewOriginal]);

  // 탭 전환 핸들러
  const handleChangeTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setNoteViewBlockId(null);
    setActiveTagFilter(null);
    const viewType = TAB_TO_VIEW[tab];
    if (tab === "schedule") {
      changeViewOriginal(scheduleMode === "weekly" ? "weekly" : scheduleMode === "calendar" ? "calendar" : "deadline");
    } else {
      changeViewOriginal(viewType);
    }
  }, [changeViewOriginal, scheduleMode]);

  // 시간표 서브 모드 전환
  const handleChangeScheduleMode = useCallback((mode: "weekly" | "calendar" | "deadline") => {
    setScheduleMode(mode);
    setNoteViewBlockId(null);
    changeViewOriginal(mode === "weekly" ? "weekly" : mode === "calendar" ? "calendar" : "deadline");
  }, [changeViewOriginal]);

  // 더보기 메뉴 액션
  const handleOverflowAction = useCallback((action: string) => {
    switch (action) {
      case "dashboard":
        changeViewOriginal("dashboard");
        setActiveTab("schedule"); // 더보기에서 선택한 뷰는 탭 상태 유지
        break;
      case "all":
        changeViewOriginal("all");
        break;
      case "calendar":
        changeViewOriginal("calendar");
        setActiveTab("schedule");
        setScheduleMode("calendar");
        break;
      case "deadline":
        changeViewOriginal("deadline");
        setActiveTab("schedule");
        setScheduleMode("deadline");
        break;
      case "custom":
        // 커스텀 뷰 목록 (첫 번째 커스텀 뷰로 이동하거나 생성 모달)
        if (customViews.length > 0) {
          selectCustomView(customViews[0].id);
        } else {
          setShowViewModal(true);
        }
        break;
      case "types":
        setShowTypeModal(true);
        break;
      case "settings":
        // TODO: 설정 페이지
        break;
      case "sample":
        if (confirm("모든 데이터를 초기화하고 샘플 데이터를 불러올까요?")) {
          localStorage.removeItem("blocknote-blocks");
          localStorage.removeItem("blocknote-tags");
          localStorage.removeItem("blocknote-types");
          localStorage.removeItem("blocknote-custom-views");
          window.location.reload();
        }
        break;
    }
  }, [changeViewOriginal, customViews, selectCustomView]);

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

  // 체크박스 토글 핸들러
  const handleToggleCheckbox = useCallback(
    (blockId: string, checked: boolean) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const checkboxProp = getPropertyByType(block, "checkbox");
      if (checkboxProp) {
        updateProperty(blockId, checkboxProp.id, {
          type: "checkbox",
          checked,
          checkedAt: checked ? new Date().toISOString() : undefined,
        });
      } else if (checked) {
        addProperty(blockId, "checkbox", undefined, {
          type: "checkbox",
          checked: true,
          checkedAt: new Date().toISOString(),
        });
      }
    },
    [blocks, updateProperty, addProperty]
  );

  // 제출 후 할일 탭으로 자동 이동
  const handleAfterSubmit = useCallback(() => {
    if (activeTab !== "tasks") {
      handleChangeTab("tasks");
    }
  }, [activeTab, handleChangeTab]);

  // 탭별 입력 컨텍스트
  const inputContext = useMemo((): "schedule" | "tasks" | "students" | "general" => {
    if (view.type === "dashboard" || view.type === "all" || view.type === "custom") return "general";
    return activeTab;
  }, [activeTab, view.type]);

  return (
    <div className="flex flex-col h-dvh">
      {/* 헤더: 로고 + 입력 + 검색 */}
      <header className="order-last lg:order-none lg:sticky lg:top-0 z-20 bg-background border-t lg:border-t-0 lg:border-b border-border relative pb-[env(safe-area-inset-bottom)] lg:pb-0">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* 로고 — 모바일에서 숨김 */}
          <button
            onClick={() => handleChangeTab("schedule")}
            className="hidden lg:block text-base font-semibold whitespace-nowrap hover:opacity-70 transition-opacity"
          >
            DEEP THINKING
          </button>

          {/* 입력창 */}
          <div className="flex-1 min-w-0">
            <UnifiedInput
              placeholder="입력..."
              showHints={false}
              triggerFocus={triggerQuickInput}
              autoFocus={isLoaded}
              onOpenFullPage={handleSelectBlock}
              inputContext={inputContext}
              onAfterSubmit={handleAfterSubmit}
            />
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
            aria-label="검색 (Ctrl+P)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>
      </header>

      {/* 탭 바 + 태그 필터 */}
      <div className="order-3 lg:order-none">
        <TabBar
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          onChangeScheduleMode={handleChangeScheduleMode}
          scheduleMode={scheduleMode}
          onOverflowAction={handleOverflowAction}
        />

        {/* 태그 필터 칩 — 일시 숨김 */}
        {false && activeTab === "tasks" && (
          <TagFilterChips
            blocks={blocks}
            tags={tags}
            activeTagId={activeTagFilter}
            onSelectTag={setActiveTagFilter}
            onCreateTag={createTag}
          />
        )}
      </div>

      {/* ViewRouter */}
      <div className="flex-1 overflow-hidden order-first lg:order-none">
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
          activeTagFilter={activeTagFilter}
          onChangeScheduleMode={handleChangeScheduleMode}
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

      {/* 타입 생성 모달 */}
      {showTypeModal && (
        <TypeCreateModal
          onClose={() => setShowTypeModal(false)}
          onCreate={(name, propertyIds, icon, color) => {
            handleCreateType(name, propertyIds, icon, color);
            setShowTypeModal(false);
          }}
        />
      )}

      {/* 뷰 생성 모달 */}
      {showViewModal && (
        <ViewCreateModal
          onClose={() => setShowViewModal(false)}
          onCreate={(name, icon, color, propertyIds) => {
            handleCreateView(name, icon, color, propertyIds);
            setShowViewModal(false);
          }}
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
