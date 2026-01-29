"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Block, BlockColumn } from "@/types/block";
import { Tag, PropertyType, PriorityLevel } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { ViewType } from "@/types/view";
import { BlockItem, PropertyModal } from "@/components/block";
import { NoteView } from "@/components/view/NoteView";
import { ClassificationSection } from "@/components/view/ClassificationSection";
import { useClassification } from "@/hooks/useClassification";
import { ClassificationType } from "@/lib/autoClassify";

// 정렬 타입
type SortType = "newest" | "oldest" | "date" | "priority";

const SORT_LABELS: Record<SortType, string> = {
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

interface EditorProps {
  blocks: Block[];
  filteredBlocks: Block[];
  isLoaded: boolean;
  viewTitle: string;
  viewType: ViewType;
  tags: Tag[];
  blockTypes: BlockType[];
  onAddBlock: (afterId?: string, options?: { name?: string; content?: string }) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
  onIndentBlock: (id: string) => void;
  onOutdentBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  isChildOfCollapsed: (index: number) => boolean;
  getPrevBlockId: (id: string) => string | null;
  getNextBlockId: (id: string) => string | null;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: any) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: any) => void;
  onUpdatePropertyByType: (blockId: string, propertyType: PropertyType, value: any) => void;
  onUpdateBlockName: (blockId: string, name: string) => void;
  onUpdatePropertyName: (blockId: string, propertyId: string, name: string) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onRemovePropertyByType: (blockId: string, propertyType: PropertyType) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onMoveBlockUp: (id: string) => void;
  onMoveBlockDown: (id: string) => void;
  onDuplicateBlock: (id: string) => string;
  onDeleteCompletedTodos?: () => void;
  selectedBlockId?: string | null;
  onClearSelection?: () => void;
  triggerQuickInput?: number;
  onTogglePin?: (id: string) => void;
  onMoveToColumn?: (id: string, column: BlockColumn) => void;
  frequentTags?: Tag[];
  // 다중 선택 관련
  selectedBlockIds?: Set<string>;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onToggleBlockSelection?: (id: string) => void;
  onSelectAllBlocks?: (blockIds: string[]) => void;
  onClearBlockSelection?: () => void;
  onDeleteSelectedBlocks?: () => void;
}

export function Editor({
  blocks,
  filteredBlocks,
  isLoaded,
  viewTitle,
  viewType,
  tags,
  blockTypes,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onIndentBlock,
  onOutdentBlock,
  onToggleCollapse,
  hasChildren,
  isChildOfCollapsed,
  getPrevBlockId,
  getNextBlockId,
  onAddProperty,
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
  selectedBlockId,
  onClearSelection,
  triggerQuickInput,
  onTogglePin,
  onMoveToColumn,
  frequentTags = [],
  // 다중 선택 관련
  selectedBlockIds = new Set(),
  isSelectionMode = false,
  onToggleSelectionMode,
  onToggleBlockSelection,
  onSelectAllBlocks,
  onClearBlockSelection,
  onDeleteSelectedBlocks,
}: EditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [panelBlockId, setPanelBlockId] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>("newest");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showUnorganizedOnly, setShowUnorganizedOnly] = useState(false);

  // 검색에서 선택된 블록에 포커스
  useEffect(() => {
    if (selectedBlockId) {
      setFocusedBlockId(selectedBlockId);
      onClearSelection?.();
    }
  }, [selectedBlockId, onClearSelection]);

  // 정렬 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (showSortMenu) setShowSortMenu(false);
    };
    if (showSortMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showSortMenu]);

  // 패널에 표시할 블록
  const panelBlock = panelBlockId ? blocks.find((b) => b.id === panelBlockId) : null;

  // 처음 로드 시 블록이 없으면 하나 생성
  useEffect(() => {
    if (isLoaded && blocks.length === 0) {
      const newId = onAddBlock();
      setFocusedBlockId(newId);
    }
  }, [isLoaded, blocks.length, onAddBlock]);


  const handleAddAfter = useCallback(
    (afterId: string) => {
      return onAddBlock(afterId);
    },
    [onAddBlock]
  );

  const handleFocusPrev = useCallback(
    (currentId: string) => {
      const prevId = getPrevBlockId(currentId);
      if (prevId) {
        setFocusedBlockId(prevId);
      }
    },
    [getPrevBlockId]
  );

  const handleFocusNext = useCallback(
    (currentId: string) => {
      const nextId = getNextBlockId(currentId);
      if (nextId) {
        setFocusedBlockId(nextId);
      }
    },
    [getNextBlockId]
  );

  const handleFocus = useCallback((id: string) => {
    setFocusedBlockId(id);
  }, []);

  const handleOpenPropertyPanel = useCallback((id: string) => {
    setPanelBlockId(id);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelBlockId(null);
  }, []);

  // 패널용 속성 핸들러 (blockId 고정)
  const handlePanelAddProperty = useCallback(
    (propertyType: PropertyType, name?: string) => {
      if (panelBlockId) {
        onAddProperty(panelBlockId, propertyType, name);
      }
    },
    [panelBlockId, onAddProperty]
  );

  const handlePanelUpdateProperty = useCallback(
    (propertyId: string, value: any) => {
      if (panelBlockId) {
        onUpdateProperty(panelBlockId, propertyId, value);
      }
    },
    [panelBlockId, onUpdateProperty]
  );

  const handlePanelRemoveProperty = useCallback(
    (propertyId: string) => {
      if (panelBlockId) {
        onRemoveProperty(panelBlockId, propertyId);
      }
    },
    [panelBlockId, onRemoveProperty]
  );

  const handleEditorClick = useCallback(() => {
    if (filteredBlocks.length > 0) {
      // 마지막으로 보이는 블록에 포커스
      setFocusedBlockId(filteredBlocks[filteredBlocks.length - 1].id);
    }
  }, [filteredBlocks]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && blocks.length === 0) {
        e.preventDefault();
        const newId = onAddBlock();
        setFocusedBlockId(newId);
      }
    },
    [blocks.length, onAddBlock]
  );

  // 정리 안 된 블록 수 (속성이 없는 블록)
  const unorganizedCount = useMemo(() => {
    return filteredBlocks.filter((block) => block.properties.length === 0).length;
  }, [filteredBlocks]);

  // 뷰에 따라 보이는 블록 필터링 (접힌 블록 제외)
  const visibleBlocks = useMemo(() => {
    let result = filteredBlocks;

    // 전체 뷰일 때만 계층 구조 고려
    if (viewType === "all") {
      result = result.filter((block) => {
        const index = blocks.findIndex((b) => b.id === block.id);
        return !isChildOfCollapsed(index);
      });

      // 정리 안 된 것만 필터
      if (showUnorganizedOnly) {
        result = result.filter((block) => block.properties.length === 0);
      }
    }

    // 완료된 할일 숨기기 (할일 뷰에서만)
    if (viewType === "todo" && hideCompleted) {
      result = result.filter((block) => {
        const checkbox = block.properties.find((p) => p.propertyType === "checkbox");
        return !(checkbox?.value.type === "checkbox" && checkbox.value.checked);
      });
    }

    // 정렬
    if (sortType !== "newest") {
      result = [...result].sort((a, b) => {
        switch (sortType) {
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "date": {
            const aDate = a.properties.find((p) => p.propertyType === "date");
            const bDate = b.properties.find((p) => p.propertyType === "date");
            const aVal = aDate?.value.type === "date" ? aDate.value.date : "";
            const bVal = bDate?.value.type === "date" ? bDate.value.date : "";
            if (!aVal && !bVal) return 0;
            if (!aVal) return 1;
            if (!bVal) return -1;
            return aVal.localeCompare(bVal);
          }
          case "priority": {
            const aPri = a.properties.find((p) => p.propertyType === "priority");
            const bPri = b.properties.find((p) => p.propertyType === "priority");
            const aLevel: PriorityLevel = aPri?.value.type === "priority" ? aPri.value.level : "none";
            const bLevel: PriorityLevel = bPri?.value.type === "priority" ? bPri.value.level : "none";
            return PRIORITY_WEIGHT[bLevel] - PRIORITY_WEIGHT[aLevel];
          }
          default:
            return 0;
        }
      });
    }

    // 고정된 블록을 상단에 표시
    const pinned = result.filter((b) => b.isPinned);
    const unpinned = result.filter((b) => !b.isPinned);
    result = [...pinned, ...unpinned];

    return result;
  }, [filteredBlocks, blocks, viewType, isChildOfCollapsed, hideCompleted, sortType, showUnorganizedOnly]);

  // 완료된 할일 수 (할일 뷰용)
  const todoStats = useMemo(() => {
    if (viewType !== "todo") return null;

    const completed = filteredBlocks.filter((block) => {
      const checkbox = block.properties.find((p) => p.propertyType === "checkbox");
      return checkbox?.value.type === "checkbox" && checkbox.value.checked;
    }).length;

    return { completed, total: filteredBlocks.length };
  }, [viewType, filteredBlocks]);

  if (!isLoaded) {
    return (
      <main className="flex-1 h-screen overflow-auto bg-background">
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="text-center text-muted-foreground py-20">
            <p className="text-sm">불러오는 중...</p>
          </div>
        </div>
      </main>
    );
  }

  // GTD 분류 훅
  const { sections, unclassifiedCount, totalCount } = useClassification(filteredBlocks);

  // 전체 보기 전용 다중 선택 상태
  const [isAllViewSelectionMode, setIsAllViewSelectionMode] = useState(false);
  const [allViewSelectedIds, setAllViewSelectedIds] = useState<Set<string>>(new Set());

  // 숨긴 섹션 상태
  const [hiddenSections, setHiddenSections] = useState<Set<ClassificationType>>(new Set());

  // 섹션 숨기기/표시 핸들러
  const handleHideSection = useCallback((type: ClassificationType) => {
    setHiddenSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(type);
      return newSet;
    });
  }, []);

  const handleShowSection = useCallback((type: ClassificationType) => {
    setHiddenSections((prev) => {
      const newSet = new Set(prev);
      newSet.delete(type);
      return newSet;
    });
  }, []);

  // 표시할 섹션과 숨긴 섹션 분리
  const visibleSections = sections.filter((s) => !hiddenSections.has(s.type));
  const hiddenSectionsData = sections.filter((s) => hiddenSections.has(s.type));

  // 전체 보기 선택 모드 토글
  const handleToggleAllViewSelectionMode = useCallback(() => {
    setIsAllViewSelectionMode((prev) => {
      if (prev) {
        // 선택 모드 해제 시 선택 초기화
        setAllViewSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // 개별 블록 선택 토글
  const handleToggleAllViewSelection = useCallback((blockId: string) => {
    setAllViewSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  // 섹션 전체 선택/해제
  const handleSelectSection = useCallback((blockIds: string[]) => {
    setAllViewSelectedIds((prev) => {
      const newSet = new Set(prev);
      // 섹션의 모든 블록이 선택되어 있으면 해제, 아니면 전체 선택
      const allSelected = blockIds.every((id) => prev.has(id));
      if (allSelected) {
        blockIds.forEach((id) => newSet.delete(id));
      } else {
        blockIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  // 전체 선택
  const handleSelectAllBlocks = useCallback(() => {
    const allBlockIds = filteredBlocks.map((b) => b.id);
    setAllViewSelectedIds(new Set(allBlockIds));
  }, [filteredBlocks]);

  // 선택 해제
  const handleClearAllViewSelection = useCallback(() => {
    setAllViewSelectedIds(new Set());
  }, []);

  // 선택된 블록 삭제
  const handleDeleteAllViewSelected = useCallback(() => {
    if (allViewSelectedIds.size > 0 && confirm(`${allViewSelectedIds.size}개 블록을 삭제할까요?`)) {
      allViewSelectedIds.forEach((id) => onDeleteBlock(id));
      setAllViewSelectedIds(new Set());
      setIsAllViewSelectionMode(false);
    }
  }, [allViewSelectedIds, onDeleteBlock]);

  // 전체 뷰: GTD 분류 뷰
  if (viewType === "all") {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 헤더 */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{viewTitle}</span>
            {unclassifiedCount > 0 && !isAllViewSelectionMode && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                미분류 {unclassifiedCount}개
              </span>
            )}

            {/* 선택 모드 토글 버튼 */}
            <button
              onClick={handleToggleAllViewSelectionMode}
              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                isAllViewSelectionMode
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground"
              }`}
              title="다중 선택 모드"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {isAllViewSelectionMode ? "선택 중" : "선택"}
            </button>

            {/* 숨긴 섹션 칩 */}
            {hiddenSectionsData.length > 0 && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                <span className="text-xs text-muted-foreground">접힘:</span>
                {hiddenSectionsData.map((section) => (
                  <button
                    key={section.type}
                    onClick={() => handleShowSection(section.type)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted hover:bg-accent rounded transition-colors"
                    title="클릭하여 펼치기"
                  >
                    <span>{section.info.icon}</span>
                    <span>{section.info.label}</span>
                    <span className="text-muted-foreground">{section.blocks.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 선택 모드 액션 바 */}
            {isAllViewSelectionMode && (
              <div className="flex items-center gap-2 px-2 py-1 bg-accent rounded">
                <span className="text-xs text-muted-foreground">
                  {allViewSelectedIds.size}개 선택됨
                </span>
                <button
                  onClick={handleSelectAllBlocks}
                  className="text-xs px-2 py-0.5 rounded hover:bg-background transition-colors"
                >
                  전체 선택
                </button>
                <button
                  onClick={handleClearAllViewSelection}
                  className="text-xs px-2 py-0.5 rounded hover:bg-background transition-colors"
                >
                  선택 해제
                </button>
                <button
                  onClick={handleDeleteAllViewSelected}
                  disabled={allViewSelectedIds.size === 0}
                  className="text-xs px-2 py-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  삭제
                </button>
              </div>
            )}

            {!isAllViewSelectionMode && (
              <span className="text-xs text-muted-foreground">
                {totalCount}개 블록
              </span>
            )}
          </div>
        </header>

        {/* 메인 영역 - 동적 칸반 레이아웃 (화면 폭 최대 활용) */}
        <main className="flex-1 overflow-hidden bg-background">
          <div className="h-full px-4 py-4">
            <div
              className="h-full grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(visibleSections.length, 5)}, minmax(0, 1fr))`,
              }}
            >
              {visibleSections.map((section) => (
                <ClassificationSection
                  key={section.type}
                  type={section.type}
                  blocks={section.blocks}
                  allTags={tags}
                  onBlockClick={handleFocus}
                  onOpenDetail={handleOpenPropertyPanel}
                  onDeleteBlock={onDeleteBlock}
                  isSelectionMode={isAllViewSelectionMode}
                  selectedIds={allViewSelectedIds}
                  onToggleSelection={handleToggleAllViewSelection}
                  onSelectSection={handleSelectSection}
                  variant="card"
                  onHide={() => handleHideSection(section.type)}
                />
              ))}
            </div>
          </div>
        </main>

        {/* 블록 상세 뷰 (노션 스타일) */}
        {panelBlock && (
          <NoteView
            block={panelBlock}
            allTags={tags}
            blockTypes={blockTypes}
            contextBlocks={filteredBlocks}
            onUpdateBlock={onUpdateBlock}
            onUpdateBlockName={onUpdateBlockName}
            onAddProperty={onAddProperty}
            onUpdateProperty={onUpdateProperty}
            onUpdatePropertyName={onUpdatePropertyName}
            onRemoveProperty={onRemoveProperty}
            onCreateTag={onCreateTag}
            onMoveToColumn={onMoveToColumn}
            onDeleteBlock={onDeleteBlock}
            onNavigate={(blockId) => blockId && setPanelBlockId(blockId)}
            onClose={handleClosePanel}
          />
        )}
      </div>
    );
  }

  // 기본 뷰: 기존 단일 열 레이아웃
  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* 메인 편집 영역 */}
      <main className="flex-1 h-screen overflow-auto bg-background">
        {/* 상단 바 */}
        <header className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{viewTitle}</span>

              {/* 선택 모드 토글 버튼 */}
              <button
                onClick={onToggleSelectionMode}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  isSelectionMode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
                }`}
                title="다중 선택 모드"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                {isSelectionMode ? "선택 중" : "선택"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* 선택 모드 액션 바 */}
              {isSelectionMode && (
                <div className="flex items-center gap-2 px-2 py-1 bg-accent rounded">
                  <span className="text-xs text-muted-foreground">
                    {selectedBlockIds.size}개 선택됨
                  </span>
                  <button
                    onClick={() => onSelectAllBlocks?.(visibleBlocks.map((b) => b.id))}
                    className="text-xs px-2 py-0.5 rounded hover:bg-background transition-colors"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={onClearBlockSelection}
                    className="text-xs px-2 py-0.5 rounded hover:bg-background transition-colors"
                  >
                    선택 해제
                  </button>
                  <button
                    onClick={() => {
                      if (selectedBlockIds.size > 0 && confirm(`${selectedBlockIds.size}개의 블록을 삭제할까요?`)) {
                        onDeleteSelectedBlocks?.();
                      }
                    }}
                    disabled={selectedBlockIds.size === 0}
                    className="text-xs px-2 py-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    삭제
                  </button>
                </div>
              )}

              {/* 할일 뷰 전용 옵션 */}
              {viewType === "todo" && (
                <>
                  <button
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      hideCompleted
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {hideCompleted ? "완료 숨김" : "완료 표시"}
                  </button>
                  {todoStats && todoStats.completed > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`완료된 ${todoStats.completed}개의 할일을 삭제할까요?`)) {
                          onDeleteCompletedTodos?.();
                        }
                      }}
                      className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      완료 삭제
                    </button>
                  )}
                </>
              )}

              {/* 정렬 메뉴 */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground flex items-center gap-1"
                >
                  <span>↕</span>
                  {SORT_LABELS[sortType]}
                </button>
                {showSortMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[100px] z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(Object.keys(SORT_LABELS) as SortType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setSortType(type);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent ${
                          sortType === type ? "text-primary font-medium" : ""
                        }`}
                      >
                        {SORT_LABELS[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 통계 */}
              {todoStats ? (
                <span className="text-xs text-muted-foreground">
                  {todoStats.completed}/{todoStats.total} 완료
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {visibleBlocks.length}개 블록
                </span>
              )}
            </div>
          </div>
        </header>

        {/* 편집 영역 */}
        <div
          className="max-w-3xl mx-auto py-8 px-4 min-h-[calc(100vh-3.5rem)]"
          onClick={handleEditorClick}
          onKeyDown={handleEditorKeyDown}
          tabIndex={0}
        >
          <div className="pl-6">
            {visibleBlocks.map((block) => (
              <BlockItem
                key={block.id}
                block={block}
                onUpdate={onUpdateBlock}
                onDelete={onDeleteBlock}
                onAddAfter={handleAddAfter}
                onFocusPrev={handleFocusPrev}
                onFocusNext={handleFocusNext}
                onFocus={handleFocus}
                onIndent={onIndentBlock}
                onOutdent={onOutdentBlock}
                onToggleCollapse={onToggleCollapse}
                onAddProperty={onAddProperty}
                onUpdateProperty={onUpdateProperty}
                onRemoveProperty={onRemoveProperty}
                onOpenPropertyPanel={handleOpenPropertyPanel}
                isFocused={focusedBlockId === block.id}
                isOnly={blocks.length === 1}
                hasChildren={hasChildren(block.id)}
                allTags={tags}
                blockTypes={blockTypes}
                onApplyType={onApplyType}
                onMoveUp={onMoveBlockUp}
                onMoveDown={onMoveBlockDown}
                onDuplicate={onDuplicateBlock}
                onTogglePin={onTogglePin}
                frequentTags={frequentTags}
                isInboxView={false}
                isSelectionMode={isSelectionMode}
                isSelected={selectedBlockIds.has(block.id)}
                onToggleSelection={onToggleBlockSelection}
              />
            ))}
          </div>

          {visibleBlocks.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              {viewType === "tag" ? (
                <>
                  <p className="text-lg mb-2">이 태그의 블록이 없어요</p>
                  <p className="text-sm">블록에 태그를 추가해보세요</p>
                </>
              ) : viewType === "custom" ? (
                <>
                  <p className="text-lg mb-2">이 뷰에 표시할 블록이 없어요</p>
                  <p className="text-sm">블록에 해당 속성을 추가해보세요</p>
                </>
              ) : viewType === "calendar" ? (
                <>
                  <p className="text-lg mb-2">이 날짜의 블록이 없어요</p>
                  <p className="text-sm">블록에 날짜를 추가해보세요</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">아직 블록이 없어요</p>
                  <p className="text-sm">Enter를 눌러 새 블록을 만들어보세요</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 속성 모달 */}
      {panelBlock && (
        <PropertyModal
          block={panelBlock}
          allTags={tags}
          blockTypes={blockTypes}
          onAddProperty={onAddProperty}
          onUpdatePropertyByType={onUpdatePropertyByType}
          onRemovePropertyByType={onRemovePropertyByType}
          onCreateTag={onCreateTag}
          onApplyType={onApplyType}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
