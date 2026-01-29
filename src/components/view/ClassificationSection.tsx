"use client";

import { useCallback, useMemo } from "react";
import { Block } from "@/types/block";
import { Tag } from "@/types/property";
import {
  ClassificationType,
  Classification,
  getClassificationInfo,
} from "@/lib/autoClassify";

interface ClassificationSectionProps {
  type: ClassificationType;
  blocks: Block[];
  /** 전체 태그 목록 (태그 ID → 이름 변환용) */
  allTags?: Tag[];
  /** 블록 클릭 핸들러 */
  onBlockClick?: (blockId: string) => void;
  /** 블록 상세 보기 (NoteView 열기) */
  onOpenDetail?: (blockId: string) => void;
  /** 블록 삭제 핸들러 */
  onDeleteBlock?: (blockId: string) => void;
  /** 다중 선택 모드 */
  isSelectionMode?: boolean;
  /** 선택된 블록 ID 집합 */
  selectedIds?: Set<string>;
  /** 개별 블록 선택 토글 */
  onToggleSelection?: (blockId: string) => void;
  /** 섹션 전체 선택 */
  onSelectSection?: (blockIds: string[]) => void;
  /** 표시 스타일: list (기존) | card (칸반) */
  variant?: "list" | "card";
  /** 섹션 숨기기 (헤더로 접기) */
  onHide?: () => void;
}

/**
 * GTD 분류 섹션 컴포넌트
 *
 * 각 분류별 블록 목록을 표시:
 * - 미분류, 학생, 수업, 할일, 루틴
 */
export function ClassificationSection({
  type,
  blocks,
  allTags = [],
  onBlockClick,
  onOpenDetail,
  onDeleteBlock,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onSelectSection,
  variant = "list",
  onHide,
}: ClassificationSectionProps) {
  const info = getClassificationInfo(type);
  const count = blocks.length;

  // 섹션 전체 선택 상태 계산
  const sectionSelectionState = useMemo(() => {
    if (!isSelectionMode || count === 0) return "none";
    const selectedCount = blocks.filter((b) => selectedIds.has(b.id)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === count) return "all";
    return "partial";
  }, [isSelectionMode, blocks, selectedIds, count]);

  // 섹션 전체 선택/해제 핸들러
  const handleSectionCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSelectSection) {
        const blockIds = blocks.map((b) => b.id);
        onSelectSection(blockIds);
      }
    },
    [blocks, onSelectSection]
  );

  // 블록 클릭
  const handleBlockClick = useCallback(
    (blockId: string) => {
      if (onBlockClick) {
        onBlockClick(blockId);
      }
    },
    [onBlockClick]
  );

  // 상세 보기
  const handleOpenDetail = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      e.stopPropagation();
      if (onOpenDetail) {
        onOpenDetail(blockId);
      }
    },
    [onOpenDetail]
  );

  // 빈 섹션은 표시 안함 (미분류는 항상 표시)
  if (count === 0 && type !== "unclassified") {
    return null;
  }

  return (
    <div
      className={`${
        variant === "card"
          ? "border rounded-lg shadow-sm bg-card overflow-hidden flex flex-col h-full"
          : "mb-4"
      }`}
    >
      {/* 섹션 헤더 */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 flex-shrink-0 ${
          variant === "card" ? "bg-muted/50 border-b" : ""
        }`}
      >
        {/* 섹션 전체 선택 체크박스 (선택 모드일 때만) */}
        {isSelectionMode && count > 0 && (
          <button
            onClick={handleSectionCheckboxClick}
            className="flex items-center justify-center w-4 h-4 border rounded transition-colors hover:bg-accent"
            style={{
              borderColor:
                sectionSelectionState !== "none"
                  ? "hsl(var(--primary))"
                  : "hsl(var(--border))",
              backgroundColor:
                sectionSelectionState === "all"
                  ? "hsl(var(--primary))"
                  : sectionSelectionState === "partial"
                  ? "hsl(var(--primary) / 0.3)"
                  : "transparent",
            }}
            title={
              sectionSelectionState === "all"
                ? "전체 선택 해제"
                : "섹션 전체 선택"
            }
          >
            {sectionSelectionState === "all" && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
            {sectionSelectionState === "partial" && (
              <span className="w-2 h-0.5 bg-primary rounded" />
            )}
          </button>
        )}

        <div className="flex-1 flex items-center gap-2 text-sm font-medium py-0.5 px-1">
          <span className="text-base">{info.icon}</span>
          <span>{info.label}</span>
          {type === "unclassified" && count > 0 && (
            <span className="text-xs text-orange-500 font-normal ml-1">
              (먼저 정리하세요)
            </span>
          )}
          <span className="ml-auto text-xs font-normal bg-accent px-1.5 py-0.5 rounded">
            {count}
          </span>
        </div>

        {/* 접기 버튼 (헤더로 이동) */}
        {onHide && (
          <button
            onClick={onHide}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="접기 (헤더로 이동)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* 블록 목록 */}
      <div
        className={`mt-1 space-y-0.5 ${
          variant === "card" ? "flex-1 overflow-y-auto px-1 py-1" : ""
        }`}
      >
        {count === 0 ? (
          <div className="px-8 py-3 text-sm text-muted-foreground/60 italic">
            {type === "unclassified"
              ? "새 블록을 입력하면 여기에 표시됩니다"
              : "해당하는 블록이 없습니다"}
          </div>
        ) : (
          <>
            {blocks.map((block) => (
              <ClassificationBlockItem
                key={block.id}
                block={block}
                type={type}
                allTags={allTags}
                onClick={() => handleBlockClick(block.id)}
                onOpenDetail={(e) => handleOpenDetail(e, block.id)}
                onDeleteBlock={onDeleteBlock}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(block.id)}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 분류별 블록 아이템
 */
interface ClassificationBlockItemProps {
  block: Block;
  type: ClassificationType;
  /** 전체 태그 목록 (태그 ID → 이름 변환용) */
  allTags?: Tag[];
  onClick?: () => void;
  onOpenDetail?: (e: React.MouseEvent) => void;
  /** 블록 삭제 핸들러 */
  onDeleteBlock?: (blockId: string) => void;
  /** 다중 선택 모드 */
  isSelectionMode?: boolean;
  /** 선택 여부 */
  isSelected?: boolean;
  /** 선택 토글 */
  onToggleSelection?: (blockId: string) => void;
}

function ClassificationBlockItem({
  block,
  type,
  allTags = [],
  onClick,
  onOpenDetail,
  onDeleteBlock,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: ClassificationBlockItemProps) {
  // 블록 표시 이름
  const displayName = block.name || extractFirstLine(block.content) || "(제목 없음)";

  // 태그 추출 (ID → Tag 객체로 변환)
  const tags = useMemo(() => {
    const tagProp = block.properties?.find((p) => p.propertyType === "tag");
    if (tagProp?.value.type === "tag" && tagProp.value.tagIds.length > 0) {
      return tagProp.value.tagIds
        .map((tagId) => allTags.find((t) => t.id === tagId))
        .filter((tag): tag is Tag => tag !== undefined);
    }
    return [];
  }, [block.properties, allTags]);

  // 날짜 추출
  const dateStr = useMemo(() => {
    const dateProp = block.properties?.find((p) => p.propertyType === "date");
    if (dateProp?.value.type === "date") {
      return formatRelativeDate(dateProp.value.date);
    }
    return null;
  }, [block.properties]);

  // 우선순위 추출
  const priority = useMemo(() => {
    const priorProp = block.properties?.find(
      (p) => p.propertyType === "priority"
    );
    if (priorProp?.value.type === "priority" && priorProp.value.level !== "none") {
      return priorProp.value.level;
    }
    return null;
  }, [block.properties]);

  // 체크박스 상태
  const isChecked = useMemo(() => {
    const checkProp = block.properties?.find(
      (p) => p.propertyType === "checkbox"
    );
    return checkProp?.value.type === "checkbox" && checkProp.value.checked;
  }, [block.properties]);

  // 연결된 학생 (person 속성)
  const linkedPerson = useMemo(() => {
    const personProp = block.properties?.find(
      (p) => p.propertyType === "person"
    );
    if (personProp?.value.type === "person" && personProp.value.blockIds.length > 0) {
      return personProp.value.blockIds.length;
    }
    return null;
  }, [block.properties]);

  // 백링크 수 (TODO: 실제 백링크 계산)
  const backlinkCount = 0;

  // 체크박스 클릭 핸들러
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleSelection) {
        onToggleSelection(block.id);
      }
    },
    [block.id, onToggleSelection]
  );

  // 블록 클릭 핸들러 (선택 모드가 아니면 상세 보기)
  const handleBlockClick = useCallback(
    (e: React.MouseEvent) => {
      if (isSelectionMode) {
        handleCheckboxClick(e);
      } else if (onOpenDetail) {
        onOpenDetail(e);
      } else if (onClick) {
        onClick();
      }
    },
    [isSelectionMode, handleCheckboxClick, onOpenDetail, onClick]
  );

  return (
    <div
      onClick={handleBlockClick}
      className={`group flex items-center gap-2 px-2 py-1.5 mx-2 rounded cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary/10"
          : isChecked
          ? "text-muted-foreground/50 line-through"
          : "hover:bg-accent/50"
      }`}
    >
      {/* 선택 체크박스 (선택 모드일 때) */}
      {isSelectionMode && (
        <button
          onClick={handleCheckboxClick}
          className="flex items-center justify-center w-4 h-4 border rounded transition-colors hover:bg-accent flex-shrink-0"
          style={{
            borderColor: isSelected
              ? "hsl(var(--primary))"
              : "hsl(var(--border))",
            backgroundColor: isSelected
              ? "hsl(var(--primary))"
              : "transparent",
          }}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      )}

      {/* 분류 아이콘 */}
      <span className="text-sm text-muted-foreground w-5 text-center flex-shrink-0">
        {getClassificationInfo(type).icon}
      </span>

      {/* 블록 이름 */}
      <span className="flex-1 text-sm truncate">{displayName}</span>

      {/* 메타 정보 */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {/* 태그 */}
        {tags.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              backgroundColor: `${tags[0].color}20`,
              color: tags[0].color,
            }}
          >
            {tags[0].name}
          </span>
        )}

        {/* 연결된 사람 */}
        {linkedPerson && (
          <span className="text-purple-500">→ {linkedPerson}명</span>
        )}

        {/* 날짜 */}
        {dateStr && <span>@{dateStr}</span>}

        {/* 우선순위 */}
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

        {/* 백링크 */}
        {backlinkCount > 0 && (
          <span className="text-muted-foreground/70">[← {backlinkCount}]</span>
        )}
      </div>

      {/* 삭제 버튼 (hover 시 표시) */}
      {onDeleteBlock && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("이 블록을 삭제할까요?")) {
              onDeleteBlock(block.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-xs rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
          title="블록 삭제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// 헬퍼 함수
function extractFirstLine(html: string): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.split("\n")[0]?.trim() || "";
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

  return dateStr.slice(5).replace("-", "/"); // MM/DD
}
