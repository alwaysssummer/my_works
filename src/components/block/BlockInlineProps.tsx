"use client";

import { Block } from "@/types/block";
import { Tag, PRIORITY_COLORS, PRIORITY_LABELS, PriorityLevel, REPEAT_LABELS, RepeatConfig } from "@/types/property";
import {
  getPropertyByType,
  getCheckboxValue,
  getDateValue,
  getTagIds,
  getPriorityLevel,
  getRepeatConfig,
} from "@/lib/propertyHelpers";

interface BlockInlinePropsDisplayProps {
  block: Block;
  allTags: Tag[];
  /** 태그 클릭 핸들러 */
  onTagClick?: (tagId: string) => void;
  /** 반복 아이콘 클릭 핸들러 */
  onRepeatClick?: () => void;
  /** 컴팩트 모드 (작은 뷰용) */
  compact?: boolean;
}

/**
 * 블록의 인라인 속성 표시 컴포넌트
 * - 태그, 반복 등을 인라인으로 표시
 */
export function BlockInlinePropsDisplay({
  block,
  allTags,
  onTagClick,
  onRepeatClick,
  compact = false,
}: BlockInlinePropsDisplayProps) {
  // 속성 추출
  const tagIds = getTagIds(block);
  const blockTags = allTags.filter((tag) => tagIds.includes(tag.id));
  const repeatConfig = getRepeatConfig(block);

  if (blockTags.length === 0 && !repeatConfig) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 flex-shrink-0 ${compact ? 'gap-0.5' : ''}`}>
      {/* 태그 표시 */}
      {blockTags.map((tag) => (
        <span
          key={tag.id}
          onClick={(e) => {
            e.stopPropagation();
            onTagClick?.(tag.id);
          }}
          className={`px-1.5 py-0.5 rounded-sm text-xs cursor-pointer hover:opacity-80 ${
            compact ? 'text-[10px] px-1' : ''
          }`}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          {tag.name}
        </span>
      ))}

      {/* 반복 표시 */}
      {repeatConfig && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRepeatClick?.();
          }}
          className={`text-muted-foreground cursor-pointer hover:text-foreground ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
          title={formatRepeatLabel(repeatConfig)}
        >
          ↻
        </span>
      )}
    </div>
  );
}

/**
 * 반복 설정 라벨 포맷
 */
function formatRepeatLabel(config: RepeatConfig): string {
  if (!config) return "";

  const baseLabel = REPEAT_LABELS[config.type] || config.type;

  if (config.type === "weekly" && config.weekdays && config.weekdays.length > 0) {
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const days = config.weekdays.map((d) => dayNames[d]).join(", ");
    return `${baseLabel} (${days})`;
  }

  return baseLabel;
}

interface BlockPriorityIndicatorProps {
  block: Block;
  size?: "sm" | "md";
}

/**
 * 우선순위 표시 컴포넌트
 */
export function BlockPriorityIndicator({
  block,
  size = "sm",
}: BlockPriorityIndicatorProps) {
  const priorityLevel = getPriorityLevel(block);

  if (priorityLevel === "none") {
    return null;
  }

  const sizeClass = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  return (
    <span
      className={`${sizeClass} rounded-full flex-shrink-0`}
      style={{ backgroundColor: PRIORITY_COLORS[priorityLevel] }}
      title={PRIORITY_LABELS[priorityLevel]}
    />
  );
}

interface BlockCheckboxProps {
  block: Block;
  onToggle: () => void;
  size?: "sm" | "md";
}

/**
 * 체크박스 컴포넌트
 */
export function BlockCheckbox({
  block,
  onToggle,
  size = "sm",
}: BlockCheckboxProps) {
  const checkboxProp = getPropertyByType(block, "checkbox");
  const isChecked = getCheckboxValue(block);

  if (!checkboxProp) {
    return null;
  }

  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isChecked ? "완료 해제" : "완료 처리"}
      aria-pressed={isChecked}
      className={`${sizeClass} border rounded flex items-center justify-center flex-shrink-0 focus-visible:ring-2 focus-visible:ring-ring ${
        isChecked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-border hover:border-foreground"
      }`}
    >
      {isChecked && (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

interface BlockDateDisplayProps {
  block: Block;
  onChange?: (date: string) => void;
  compact?: boolean;
}

/**
 * 날짜 표시 컴포넌트
 */
export function BlockDateDisplay({
  block,
  onChange,
  compact = false,
}: BlockDateDisplayProps) {
  const dateProp = getPropertyByType(block, "date");
  const dateValue = getDateValue(block);

  if (!dateProp) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <span className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
        ◇
      </span>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onChange?.(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className={`text-muted-foreground bg-transparent border-none outline-none cursor-pointer hover:text-foreground ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      />
    </div>
  );
}
