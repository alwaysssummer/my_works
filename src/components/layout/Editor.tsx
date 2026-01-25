"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Block } from "@/types/block";
import { Tag, PropertyType, PriorityLevel } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { ViewType } from "@/types/view";
import { BlockItem, PropertyModal } from "@/components/block";

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
  onAddProperty: (blockId: string, propertyId: string, type: PropertyType) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: any) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onMoveBlockUp: (id: string) => void;
  onMoveBlockDown: (id: string) => void;
  onDuplicateBlock: (id: string) => string;
  onDeleteCompletedTodos?: () => void;
  selectedBlockId?: string | null;
  onClearSelection?: () => void;
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
  onRemoveProperty,
  onCreateTag,
  onApplyType,
  onMoveBlockUp,
  onMoveBlockDown,
  onDuplicateBlock,
  onDeleteCompletedTodos,
  selectedBlockId,
  onClearSelection,
}: EditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [panelBlockId, setPanelBlockId] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>("newest");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

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
    (propertyId: string, type: PropertyType) => {
      if (panelBlockId) {
        onAddProperty(panelBlockId, propertyId, type);
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

  // 뷰에 따라 보이는 블록 필터링 (접힌 블록 제외)
  const visibleBlocks = useMemo(() => {
    let result = filteredBlocks;

    // 전체 뷰일 때만 계층 구조 고려
    if (viewType === "all") {
      result = result.filter((block) => {
        const index = blocks.findIndex((b) => b.id === block.id);
        return !isChildOfCollapsed(index);
      });
    }

    // 완료된 할일 숨기기 (할일 뷰에서만)
    if (viewType === "todo" && hideCompleted) {
      result = result.filter((block) => {
        const checkbox = block.properties.find((p) => p.propertyId === "checkbox");
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
            const aDate = a.properties.find((p) => p.propertyId === "date");
            const bDate = b.properties.find((p) => p.propertyId === "date");
            const aVal = aDate?.value.type === "date" ? aDate.value.date : "";
            const bVal = bDate?.value.type === "date" ? bDate.value.date : "";
            if (!aVal && !bVal) return 0;
            if (!aVal) return 1;
            if (!bVal) return -1;
            return aVal.localeCompare(bVal);
          }
          case "priority": {
            const aPri = a.properties.find((p) => p.propertyId === "priority");
            const bPri = b.properties.find((p) => p.propertyId === "priority");
            const aLevel: PriorityLevel = aPri?.value.type === "priority" ? aPri.value.level : "none";
            const bLevel: PriorityLevel = bPri?.value.type === "priority" ? bPri.value.level : "none";
            return PRIORITY_WEIGHT[bLevel] - PRIORITY_WEIGHT[aLevel];
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [filteredBlocks, blocks, viewType, isChildOfCollapsed, hideCompleted, sortType]);

  // 완료된 할일 수 (할일 뷰용)
  const todoStats = useMemo(() => {
    if (viewType !== "todo") return null;

    const completed = filteredBlocks.filter((block) => {
      const checkbox = block.properties.find((p) => p.propertyId === "checkbox");
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

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* 메인 편집 영역 */}
      <main className="flex-1 h-screen overflow-auto bg-background">
        {/* 상단 바 */}
        <header className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="text-sm font-medium">{viewTitle}</div>
            <div className="flex items-center gap-3">
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

          {/* 빠른 입력창 */}
          {viewType === "all" && (
            <div className="px-4 pb-3">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/30 hover:bg-accent/50 rounded-lg border border-border focus-within:border-primary focus-within:bg-accent/50 transition-colors">
                  <span className="text-muted-foreground text-lg">+</span>
                  <input
                    type="text"
                    placeholder="새 블록 추가... (Enter로 추가)"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        const content = e.currentTarget.value.trim();
                        const newId = onAddBlock();
                        onUpdateBlock(newId, `<p>${content}</p>`);
                        e.currentTarget.value = "";
                        setFocusedBlockId(newId);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
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
              />
            ))}
          </div>

          {visibleBlocks.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              {viewType === "all" ? (
                <>
                  <p className="text-lg mb-2">아직 블록이 없어요</p>
                  <p className="text-sm">Enter를 눌러 새 블록을 만들어보세요</p>
                </>
              ) : viewType === "today" ? (
                <>
                  <p className="text-lg mb-2">오늘 할 일이 없어요</p>
                  <p className="text-sm">블록에 오늘 날짜를 추가해보세요</p>
                </>
              ) : viewType === "todo" ? (
                <>
                  <p className="text-lg mb-2">할일이 없어요</p>
                  <p className="text-sm">블록에 체크박스를 추가해보세요</p>
                </>
              ) : viewType === "tag" ? (
                <>
                  <p className="text-lg mb-2">이 태그의 블록이 없어요</p>
                  <p className="text-sm">블록에 태그를 추가해보세요</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">이 날짜의 블록이 없어요</p>
                  <p className="text-sm">블록에 날짜를 추가해보세요</p>
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
          onUpdateProperty={onUpdateProperty}
          onRemoveProperty={onRemoveProperty}
          onCreateTag={onCreateTag}
          onApplyType={onApplyType}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
