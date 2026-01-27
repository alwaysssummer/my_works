"use client";

import { BlockProperty, PropertyValue, Tag } from "@/types/property";
import { X, Check, Calendar, Tag as TagIcon, AlertCircle } from "lucide-react";

// 우선순위 레이블
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "● 높음", color: "text-red-500" },
  medium: { label: "● 중간", color: "text-yellow-500" },
  low: { label: "● 낮음", color: "text-blue-500" },
  none: { label: "○ 없음", color: "text-gray-400" },
};

interface PropertyEditorProps {
  property: BlockProperty;
  onUpdate: (value: PropertyValue) => void;
  onRemove?: () => void;
  tags?: Tag[];
  showRemove?: boolean;
  readonly?: boolean;
  compact?: boolean;
}

export function PropertyEditor({
  property,
  onUpdate,
  onRemove,
  tags = [],
  showRemove = false,
  readonly = false,
  compact = false,
}: PropertyEditorProps) {
  const { value } = property;

  // 체크박스 렌더링
  if (value.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.checked}
          disabled={readonly}
          onChange={(e) =>
            onUpdate({ type: "checkbox", checked: e.target.checked })
          }
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
        {!compact && <span className="text-sm text-gray-600">{property.name}</span>}
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 날짜 렌더링
  if (value.type === "date") {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      });
    };

    return (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm">
          {value.date ? formatDate(value.date) : "날짜 없음"}
          {value.endDate && ` ~ ${formatDate(value.endDate)}`}
          {value.time && ` ${value.time}`}
        </span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 태그 렌더링
  if (value.type === "tag") {
    const selectedTags = tags.filter((t) => value.tagIds.includes(t.id));

    return (
      <div className="flex items-center gap-1 flex-wrap">
        <TagIcon className="w-4 h-4 text-gray-400" />
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400">태그 없음</span>
        )}
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 우선순위 렌더링
  if (value.type === "priority") {
    const priority = PRIORITY_LABELS[value.level] || PRIORITY_LABELS.none;

    return (
      <div className="flex items-center gap-2">
        <span className={`text-sm ${priority.color}`}>{priority.label}</span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 텍스트 렌더링
  if (value.type === "text") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value.text}
          disabled={readonly}
          onChange={(e) => onUpdate({ type: "text", text: e.target.value })}
          className="text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent disabled:opacity-50"
          placeholder={property.name}
        />
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 메모 렌더링
  if (value.type === "memo") {
    return (
      <div className="flex items-start gap-2">
        <textarea
          value={value.text}
          disabled={readonly}
          onChange={(e) => onUpdate({ type: "memo", text: e.target.value })}
          className="text-sm w-full border rounded p-2 resize-none disabled:opacity-50"
          placeholder={property.name}
          rows={2}
        />
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 연락처 렌더링
  if (value.type === "contact") {
    return (
      <div className="flex items-center gap-2 text-sm">
        {value.phone && <span>☎ {value.phone}</span>}
        {value.email && <span>✉ {value.email}</span>}
        {!value.phone && !value.email && (
          <span className="text-gray-400">연락처 없음</span>
        )}
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 반복 렌더링
  if (value.type === "repeat") {
    const repeatLabels: Record<string, string> = {
      daily: "매일",
      weekly: "매주",
      monthly: "매월",
      yearly: "매년",
    };

    return (
      <div className="flex items-center gap-2 text-sm">
        <span>↻</span>
        {value.config ? (
          <span>
            {repeatLabels[value.config.type]}
            {value.config.interval > 1 && ` (${value.config.interval}회)`}
          </span>
        ) : (
          <span className="text-gray-400">반복 없음</span>
        )}
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 수업 시간 렌더링
  if (value.type === "duration") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span>⧖ {value.minutes}분</span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 긴급 (TOP 3) 렌더링
  if (value.type === "urgent") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-red-500 font-medium">
          TOP {value.slotIndex + 1}
        </span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 숫자 렌더링
  if (value.type === "number") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value.value}
          disabled={readonly}
          onChange={(e) =>
            onUpdate({ type: "number", value: parseFloat(e.target.value) || 0 })
          }
          className="text-sm w-20 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent disabled:opacity-50"
        />
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 사람 연결 렌더링
  if (value.type === "person") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span>○</span>
        <span>{value.blockIds.length}명 연결됨</span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 선택 렌더링
  if (value.type === "select") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span>{value.selected || "선택 없음"}</span>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
            aria-label="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // 알 수 없는 타입
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <span>알 수 없는 속성</span>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500"
          aria-label="삭제"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
