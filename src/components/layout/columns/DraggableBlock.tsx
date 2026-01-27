"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Block } from "@/types/block";
import { Tag } from "@/types/property";

interface DraggableBlockProps {
  block: Block;
  allTags: Tag[];
  onOpenDetail?: (id: string) => void;
  isCompact?: boolean;
}

export function DraggableBlock({
  block,
  allTags,
  onOpenDetail,
  isCompact = false,
}: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { block },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // content에서 텍스트만 추출
  const textContent = block.content
    .replace(/<[^>]+>/g, "")
    .trim() || "빈 블록";

  // 체크박스 상태
  const checkbox = block.properties.find((p) => p.propertyType === "checkbox");
  const isChecked = checkbox?.value.type === "checkbox" && checkbox.value.checked;

  // 날짜
  const dateProp = block.properties.find((p) => p.propertyType === "date");
  const dateValue = dateProp?.value.type === "date" ? dateProp.value.date : null;

  // 우선순위
  const priorityProp = block.properties.find((p) => p.propertyType === "priority");
  const priority = priorityProp?.value.type === "priority" ? priorityProp.value.level : null;

  // 태그들
  const tagProp = block.properties.find((p) => p.propertyType === "tag");
  const tagIds = tagProp?.value.type === "tag" ? tagProp.value.tagIds : [];
  const blockTags = tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean);

  const priorityColors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? "shadow-lg z-50" : ""
      } ${isCompact ? "p-2" : "p-3"}`}
      onClick={() => onOpenDetail?.(block.id)}
    >
      {/* 상단: 체크박스 + 제목 */}
      <div className="flex items-start gap-2">
        {checkbox && (
          <div
            className={`w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center ${
              isChecked
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {isChecked && <span className="text-xs">✓</span>}
          </div>
        )}
        <span
          className={`flex-1 text-sm ${
            isChecked ? "line-through text-muted-foreground" : ""
          } ${isCompact ? "truncate" : "line-clamp-2"}`}
        >
          {textContent}
        </span>
        {priority && priority !== "none" && (
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[priority]}`}
          />
        )}
      </div>

      {/* 하단: 날짜 + 태그 */}
      {!isCompact && (dateValue || blockTags.length > 0) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {dateValue && (
            <span className="text-xs text-muted-foreground">
              ◇ {dateValue}
            </span>
          )}
          {blockTags.slice(0, 2).map((tag) => (
            <span
              key={tag!.id}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${tag!.color}20`, color: tag!.color }}
            >
              {tag!.name}
            </span>
          ))}
          {blockTags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{blockTags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* 고정 표시 */}
      {block.isPinned && (
        <div className="absolute -top-1 -right-1 text-xs">•</div>
      )}
    </div>
  );
}
