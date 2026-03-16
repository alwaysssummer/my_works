"use client";

import { useMemo, useCallback, useState, useRef } from "react";
import { Block, BlockColumn } from "@/types/block";
import { Tag } from "@/types/property";
import { ClassificationSection } from "./ClassificationSection";
import { useClassification } from "@/hooks/useClassification";
import { ClassificationType } from "@/lib/autoClassify";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface TasksViewProps {
  blocks: Block[];
  tags: Tag[];
  activeTagFilter: string | null;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onTogglePin: (blockId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onMoveToColumn: (blockId: string, column: BlockColumn) => void;
}

// 칸반 열 순서
const COLUMN_ORDER: BlockColumn[] = ["focus", "inbox", "queue"];

// 칸반 열 정보
const COLUMN_INFO: Record<BlockColumn, { label: string; emptyText: string }> = {
  focus: { label: "진행", emptyText: "작업 중인 항목이 없습니다" },
  inbox: { label: "대기", emptyText: "새 블록을 입력하면 여기에 표시됩니다" },
  queue: { label: "보류", emptyText: "보류 중인 항목이 없습니다" },
};

// 할일 탭에서 보여줄 분류만 (학생/수업은 제외)
const TASK_CLASSIFICATIONS: ClassificationType[] = ["todo", "routine", "unclassified"];

// 체크박스 값 헬퍼
function getCheckboxValue(block: Block): boolean {
  const checkProp = block.properties?.find((p) => p.propertyType === "checkbox");
  return checkProp?.value.type === "checkbox" && checkProp.value.checked;
}

export function TasksView({
  blocks,
  tags,
  activeTagFilter,
  onToggleCheckbox,
  onTogglePin,
  onSelectBlock,
  onMoveToColumn,
}: TasksViewProps) {
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // isDeleted 필터 + 태그 필터 적용
  const filteredBlocks = useMemo(() => {
    let result = blocks.filter((b) => !b.isDeleted);
    if (activeTagFilter) {
      result = result.filter((block) => {
        const tagProp = block.properties.find((p) => p.propertyType === "tag");
        if (tagProp?.value.type === "tag") {
          return tagProp.value.tagIds.includes(activeTagFilter);
        }
        return false;
      });
    }
    return result;
  }, [blocks, activeTagFilter]);

  // 할일 관련 블록만 필터 (학생/수업 제외)
  const { groupedBlocks } = useClassification(filteredBlocks);
  const taskBlocks = useMemo(() => {
    const result: Block[] = [];
    for (const type of TASK_CLASSIFICATIONS) {
      const sectionBlocks = groupedBlocks.get(type) || [];
      result.push(...sectionBlocks);
    }
    return result;
  }, [groupedBlocks]);

  // column별 그룹핑 + 정렬 (고정 상단, 체크 하단)
  const columnBlocks = useMemo(() => {
    const groups: Record<BlockColumn, Block[]> = {
      focus: [],
      inbox: [],
      queue: [],
    };
    for (const block of taskBlocks) {
      const col = block.column || "inbox";
      groups[col].push(block);
    }
    // 정렬: isPinned → 상단, isChecked → 하단
    for (const col of COLUMN_ORDER) {
      groups[col].sort((a, b) => {
        const aChecked = getCheckboxValue(a);
        const bChecked = getCheckboxValue(b);
        if (aChecked !== bChecked) return aChecked ? 1 : -1;
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return 0;
      });
    }
    return groups;
  }, [taskBlocks]);

  // blockId → Block 매핑
  const blockMap = useMemo(() => {
    const map = new Map<string, Block>();
    for (const block of taskBlocks) {
      map.set(block.id, block);
    }
    return map;
  }, [taskBlocks]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const block = blockMap.get(event.active.id as string);
      setActiveBlock(block || null);
    },
    [blockMap]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBlock(null);
      const { active, over } = event;
      if (!over) return;

      const blockId = active.id as string;
      const targetColumn = over.id as BlockColumn;
      const block = blockMap.get(blockId);
      if (!block) return;

      const currentColumn = block.column || "inbox";
      if (currentColumn === targetColumn) return;

      onMoveToColumn(blockId, targetColumn);
    },
    [blockMap, onMoveToColumn]
  );

  return (
    <main className="flex-1 h-full overflow-hidden bg-background">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-3 h-full p-3">
          {COLUMN_ORDER.map((column) => (
            <KanbanColumn
              key={column}
              column={column}
              label={COLUMN_INFO[column].label}
              emptyText={COLUMN_INFO[column].emptyText}
              blocks={columnBlocks[column]}
              allTags={tags}
              onBlockClick={onSelectBlock}
              onToggleCheckbox={onToggleCheckbox}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeBlock ? (
            <DragOverlayContent block={activeBlock} allTags={tags} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

// 칸반 열 컴포넌트
interface KanbanColumnProps {
  column: BlockColumn;
  label: string;
  emptyText: string;
  blocks: Block[];
  allTags: Tag[];
  onBlockClick: (blockId: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onTogglePin: (blockId: string) => void;
}

function KanbanColumn({
  column,
  label,
  emptyText,
  blocks,
  allTags,
  onBlockClick,
  onToggleCheckbox,
  onTogglePin,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full border rounded-lg bg-card overflow-hidden transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      {/* 열 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b flex-shrink-0">
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-xs font-normal bg-accent px-1.5 py-0.5 rounded">
          {blocks.length}
        </span>
      </div>

      {/* 블록 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {blocks.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground/60 italic text-center">
            {emptyText}
          </div>
        ) : (
          blocks.map((block) => (
            <KanbanBlockItem
              key={block.id}
              block={block}
              allTags={allTags}
              onClick={() => onBlockClick(block.id)}
              onToggleCheckbox={onToggleCheckbox}
              onTogglePin={onTogglePin}
            />
          ))
        )}
      </div>
    </div>
  );
}

// 칸반 블록 아이템
interface KanbanBlockItemProps {
  block: Block;
  allTags: Tag[];
  onClick: () => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onTogglePin: (blockId: string) => void;
}

function KanbanBlockItem({
  block,
  allTags,
  onClick,
  onToggleCheckbox,
  onTogglePin,
}: KanbanBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: block.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const displayName = block.name || extractFirstLine(block.content) || "(제목 없음)";

  const isChecked = useMemo(() => {
    return getCheckboxValue(block);
  }, [block]);

  // 체크 시 잠깐 체크 표시 후 사라지는 효과
  const [pendingCheck, setPendingCheck] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCheck = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isChecked) {
      // 체크: 먼저 시각적으로 체크 표시 → 600ms 후 실제 반영
      setPendingCheck(true);
      pendingTimer.current = setTimeout(() => {
        onToggleCheckbox(block.id, true);
        setPendingCheck(false);
      }, 600);
    } else {
      // 체크 해제: 즉시 반영
      onToggleCheckbox(block.id, false);
    }
  }, [isChecked, block.id, onToggleCheckbox]);

  const visuallyChecked = isChecked || pendingCheck;

  const tags = useMemo(() => {
    const tagProp = block.properties?.find((p) => p.propertyType === "tag");
    if (tagProp?.value.type === "tag" && tagProp.value.tagIds.length > 0) {
      return tagProp.value.tagIds
        .map((tagId) => allTags.find((t) => t.id === tagId))
        .filter((tag): tag is Tag => tag !== undefined);
    }
    return [];
  }, [block.properties, allTags]);

  const priority = useMemo(() => {
    const priorProp = block.properties?.find((p) => p.propertyType === "priority");
    if (priorProp?.value.type === "priority" && priorProp.value.level !== "none") {
      return priorProp.value.level;
    }
    return null;
  }, [block.properties]);

  const dateStr = useMemo(() => {
    const dateProp = block.properties?.find((p) => p.propertyType === "date");
    if (dateProp?.value.type === "date") {
      return formatRelativeDate(dateProp.value.date);
    }
    return null;
  }, [block.properties]);

  const previewText = useMemo(() => {
    return extractPreviewText(block.content);
  }, [block.content]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`group flex flex-col gap-1 border rounded-lg p-2 transition-all duration-500 ${
        isDragging
          ? "opacity-30 cursor-grabbing"
          : pendingCheck
          ? "text-muted-foreground/50 line-through opacity-40 scale-95 cursor-grab"
          : isChecked
          ? "text-muted-foreground/50 line-through cursor-grab"
          : "hover:bg-accent/50 cursor-grab"
      }`}
    >
      {/* 헤더: 체크박스 + 제목 + 핀 */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleCheck}
          className={`text-xl flex-shrink-0 transition-all duration-300 ${visuallyChecked ? "opacity-60 scale-110" : "opacity-30 hover:opacity-60"}`}
        >
          {visuallyChecked ? "\u2611" : "\u2610"}
        </button>

        <span className="flex-1 text-sm truncate">{displayName}</span>

        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(block.id); }}
          className={block.isPinned
            ? "text-xs flex-shrink-0"
            : "text-xs flex-shrink-0 grayscale opacity-30 hover:opacity-60"}
        >
          {"📌"}
        </button>
      </div>

      {/* 본문 미리보기 */}
      {previewText && (
        <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-5 pl-0.5">
          {previewText}
        </p>
      )}

      {/* 메타 정보 */}
      {(tags.length > 0 || dateStr || priority) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {tags.length > 0 && (
            <span
              className="px-1 py-0.5 rounded text-xs"
              style={{
                backgroundColor: `${tags[0].color}20`,
                color: tags[0].color,
              }}
            >
              {tags[0].name}
            </span>
          )}
          {dateStr && <span>@{dateStr}</span>}
          {priority && (
            <span
              className={
                priority === "high"
                  ? "text-red-500"
                  : priority === "medium"
                  ? "text-orange-500"
                  : "text-blue-500"
              }
            >
              {priority === "high" ? "!!!" : priority === "medium" ? "!!" : "!"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// 드래그 오버레이 콘텐츠
function DragOverlayContent({ block, allTags }: { block: Block; allTags: Tag[] }) {
  const displayName = block.name || extractFirstLine(block.content) || "(제목 없음)";

  const firstTag = useMemo(() => {
    const tagProp = block.properties?.find((p) => p.propertyType === "tag");
    if (tagProp?.value.type === "tag") {
      const tagIds = tagProp.value.tagIds;
      if (tagIds.length > 0) {
        return allTags.find((t) => t.id === tagIds[0]);
      }
    }
    return undefined;
  }, [block.properties, allTags]);

  const previewText = useMemo(() => {
    return extractPreviewText(block.content);
  }, [block.content]);

  return (
    <div className="flex flex-col gap-1 border rounded-lg p-2 bg-card shadow-lg cursor-grabbing max-w-64">
      <div className="flex items-center gap-1.5">
        <span className="flex-1 text-sm truncate">{displayName}</span>
        {firstTag && (
          <span
            className="px-1 py-0.5 rounded text-xs flex-shrink-0"
            style={{
              backgroundColor: `${firstTag.color}20`,
              color: firstTag.color,
            }}
          >
            {firstTag.name}
          </span>
        )}
      </div>
      {previewText && (
        <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-5">
          {previewText}
        </p>
      )}
    </div>
  );
}

// 헬퍼 함수
function extractFirstLine(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
  return text.split("\n")[0]?.trim() || "";
}

function extractPreviewText(html: string, maxLines = 5): string {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
  if (!text) return "";
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(0, maxLines).join("\n");
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";
  if (diff > 0 && diff <= 7) return `${diff}일 후`;
  if (diff < 0 && diff >= -7) return `${-diff}일 전`;

  return dateStr.slice(5).replace("-", "/");
}
