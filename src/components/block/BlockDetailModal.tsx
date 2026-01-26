"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Block, BlockColumn } from "@/types/block";
import { Tag, PropertyType, PriorityLevel, DEFAULT_PROPERTIES } from "@/types/property";
import { BlockType } from "@/types/blockType";

interface BlockDetailModalProps {
  block: Block;
  allTags: Tag[];
  blockTypes: BlockType[];
  onUpdateBlock: (id: string, content: string) => void;
  onAddProperty: (blockId: string, propertyId: string, type: PropertyType) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: any) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onMoveToColumn: (id: string, column: BlockColumn) => void;
  onDeleteBlock: (id: string) => void;
  onClose: () => void;
}

const COLUMN_LABELS: Record<BlockColumn, { label: string; icon: string }> = {
  focus: { label: "포커스", icon: "🎯" },
  inbox: { label: "수집", icon: "📥" },
  queue: { label: "대기", icon: "📋" },
};

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string; color: string }[] = [
  { value: "high", label: "높음", color: "bg-red-500" },
  { value: "medium", label: "중간", color: "bg-yellow-500" },
  { value: "low", label: "낮음", color: "bg-blue-500" },
  { value: "none", label: "없음", color: "bg-gray-300" },
];

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
  none: "",
};

const TAG_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function BlockDetailModal({
  block,
  allTags,
  blockTypes,
  onUpdateBlock,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onCreateTag,
  onApplyType,
  onMoveToColumn,
  onDeleteBlock,
  onClose,
}: BlockDetailModalProps) {
  // 블록 내용 (HTML에서 텍스트 추출)
  const [content, setContent] = useState(() => {
    return block.content.replace(/<[^>]+>/g, "").trim();
  });
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 오늘/내일/다음주 날짜
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // 속성 값 가져오기
  const getPropertyValue = useCallback(
    (propertyId: string) => {
      return block.properties.find((p) => p.propertyId === propertyId)?.value;
    },
    [block.properties]
  );

  // 체크박스
  const checkboxValue = getPropertyValue("checkbox");
  const isChecked = checkboxValue?.type === "checkbox" && checkboxValue.checked;

  // 날짜
  const dateValue = getPropertyValue("date");
  const dateStr = dateValue?.type === "date" ? dateValue.date : "";

  // 우선순위
  const priorityValue = getPropertyValue("priority");
  const priority: PriorityLevel = priorityValue?.type === "priority" ? priorityValue.level : "none";

  // 태그
  const tagValue = getPropertyValue("tag");
  const tagIds: string[] = tagValue?.type === "tag" ? tagValue.tagIds : [];
  const blockTags = tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean);

  // 메모
  const memoValue = getPropertyValue("memo");
  const memoText = memoValue?.type === "memo" ? memoValue.text : "";

  // 연락처
  const contactValue = getPropertyValue("contact");
  const contactPhone = contactValue?.type === "contact" ? contactValue.phone : "";
  const contactEmail = contactValue?.type === "contact" ? contactValue.email : "";

  // 속성 존재 여부
  const hasProperty = useCallback(
    (propertyId: string) => {
      return block.properties.some((p) => p.propertyId === propertyId);
    },
    [block.properties]
  );

  // 내용 저장
  const handleSaveContent = useCallback(() => {
    if (content.trim() !== block.content.replace(/<[^>]+>/g, "").trim()) {
      onUpdateBlock(block.id, `<p>${content}</p>`);
    }
  }, [content, block.id, block.content, onUpdateBlock]);

  // 체크박스 토글
  const handleToggleCheckbox = useCallback(() => {
    onUpdateProperty(block.id, "checkbox", { type: "checkbox", checked: !isChecked });
  }, [block.id, isChecked, onUpdateProperty]);

  // 날짜 변경
  const handleDateChange = useCallback(
    (date: string) => {
      onUpdateProperty(block.id, "date", { type: "date", date });
    },
    [block.id, onUpdateProperty]
  );

  // 우선순위 변경
  const handlePriorityChange = useCallback(
    (level: PriorityLevel) => {
      onUpdateProperty(block.id, "priority", { type: "priority", level });
    },
    [block.id, onUpdateProperty]
  );

  // 태그 추가/제거
  const handleToggleTag = useCallback(
    (tagId: string) => {
      const newTagIds = tagIds.includes(tagId)
        ? tagIds.filter((id) => id !== tagId)
        : [...tagIds, tagId];
      onUpdateProperty(block.id, "tag", { type: "tag", tagIds: newTagIds });
    },
    [block.id, tagIds, onUpdateProperty]
  );

  // 새 태그 생성
  const handleCreateTag = useCallback(() => {
    if (newTagName.trim()) {
      const newTag = onCreateTag(newTagName.trim(), newTagColor);
      const newTagIds = [...tagIds, newTag.id];
      onUpdateProperty(block.id, "tag", { type: "tag", tagIds: newTagIds });
      setNewTagName("");
      setShowTagInput(false);
    }
  }, [newTagName, newTagColor, tagIds, block.id, onCreateTag, onUpdateProperty]);

  // 메모 변경
  const handleMemoChange = useCallback(
    (text: string) => {
      onUpdateProperty(block.id, "memo", { type: "memo", text });
    },
    [block.id, onUpdateProperty]
  );

  // 연락처 변경
  const handleContactChange = useCallback(
    (field: "phone" | "email", value: string) => {
      onUpdateProperty(block.id, "contact", {
        type: "contact",
        phone: field === "phone" ? value : contactPhone,
        email: field === "email" ? value : contactEmail,
      });
    },
    [block.id, contactPhone, contactEmail, onUpdateProperty]
  );

  // 속성 추가
  const handleAddProperty = useCallback(
    (propertyId: string) => {
      const prop = DEFAULT_PROPERTIES.find((p) => p.id === propertyId);
      if (prop) {
        onAddProperty(block.id, propertyId, prop.type);
      }
      setShowAddProperty(false);
    },
    [block.id, onAddProperty]
  );

  // 열 이동
  const handleMoveToColumn = useCallback(
    (column: BlockColumn) => {
      onMoveToColumn(block.id, column);
    },
    [block.id, onMoveToColumn]
  );

  // 삭제
  const handleDelete = useCallback(() => {
    if (confirm("이 블록을 삭제할까요?")) {
      onDeleteBlock(block.id);
      onClose();
    }
  }, [block.id, onDeleteBlock, onClose]);

  // ESC로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSaveContent();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveContent, onClose]);

  // 추가 가능한 속성
  const availableProperties = DEFAULT_PROPERTIES.filter(
    (prop) => !hasProperty(prop.id)
  );

  // 속성 개수 계산
  const propertyCount = block.properties.length;

  // 날짜 표시 텍스트
  const getDateDisplayText = () => {
    if (!dateStr) return "";
    if (dateStr === today) return "오늘";
    if (dateStr === tomorrow) return "내일";
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          handleSaveContent();
          onClose();
        }}
      />

      {/* 모달 - 노션 스타일 */}
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col mx-6">
        {/* 미니멀 헤더 - 닫기 버튼만 */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-border">
          <button
            onClick={() => {
              handleSaveContent();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1 transition-colors"
          >
            <span className="text-base">✕</span>
          </button>
        </div>

        {/* 접히는 속성 바 */}
        <div className="border-b border-border">
          <button
            onClick={() => setIsPropertyExpanded(!isPropertyExpanded)}
            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent/50 transition-colors text-left"
          >
            <span className="text-muted-foreground text-sm">
              {isPropertyExpanded ? "▾" : "▸"}
            </span>
            <span className="text-sm text-muted-foreground">
              속성 ({propertyCount})
            </span>
            {/* 인라인 속성 요약 */}
            {!isPropertyExpanded && propertyCount > 0 && (
              <div className="flex items-center gap-3 text-sm ml-2">
                {hasProperty("date") && dateStr && (
                  <span className="text-muted-foreground">📅 {getDateDisplayText()}</span>
                )}
                {hasProperty("tag") && blockTags.length > 0 && (
                  <span className="text-muted-foreground">
                    🏷️ {blockTags.map(t => t?.name).join(", ")}
                  </span>
                )}
                {hasProperty("priority") && priority !== "none" && (
                  <span className="text-muted-foreground">⚡ {PRIORITY_LABELS[priority]}</span>
                )}
                {hasProperty("checkbox") && (
                  <span className="text-muted-foreground">{isChecked ? "☑" : "☐"}</span>
                )}
              </div>
            )}
          </button>

          {/* 펼쳐진 속성 상세 UI */}
          {isPropertyExpanded && (
            <div className="px-4 pb-3 space-y-2">

            {/* 체크박스 */}
            {hasProperty("checkbox") && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">☑ 체크박스</span>
                <button
                  onClick={handleToggleCheckbox}
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {isChecked && <span className="text-xs">✓</span>}
                </button>
              </div>
            )}

            {/* 날짜 */}
            {hasProperty("date") && (
              <div className="py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">📅 날짜</span>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDateChange(today)}
                    className={`text-xs px-2 py-1 rounded ${
                      dateStr === today
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    오늘
                  </button>
                  <button
                    onClick={() => handleDateChange(tomorrow)}
                    className={`text-xs px-2 py-1 rounded ${
                      dateStr === tomorrow
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    내일
                  </button>
                  <button
                    onClick={() => handleDateChange(nextWeek)}
                    className={`text-xs px-2 py-1 rounded ${
                      dateStr === nextWeek
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    다음주
                  </button>
                  {dateStr && (
                    <button
                      onClick={() => handleDateChange("")}
                      className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 우선순위 */}
            {hasProperty("priority") && (
              <div className="py-2">
                <span className="text-sm block mb-2">⚡ 우선순위</span>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handlePriorityChange(opt.value)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                        priority === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 태그 */}
            {hasProperty("tag") && (
              <div className="py-2">
                <span className="text-sm block mb-2">🏷️ 태그</span>
                <div className="flex flex-wrap gap-2 mb-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`text-xs px-2 py-1 rounded transition-all ${
                        tagIds.includes(tag.id)
                          ? "ring-2 ring-offset-1"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        ...(tagIds.includes(tag.id) && { ringColor: tag.color }),
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowTagInput(!showTagInput)}
                    className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground"
                  >
                    + 새 태그
                  </button>
                </div>
                {showTagInput && (
                  <div className="flex gap-2 items-center mt-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="태그 이름"
                      className="flex-1 bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    />
                    <div className="flex gap-1">
                      {TAG_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={`w-4 h-4 rounded-full ${
                            newTagColor === color ? "ring-2 ring-offset-1" : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 메모 */}
            {hasProperty("memo") && (
              <div className="py-2">
                <span className="text-sm block mb-2">📝 메모</span>
                <textarea
                  value={memoText}
                  onChange={(e) => handleMemoChange(e.target.value)}
                  placeholder="메모를 입력하세요"
                  className="w-full bg-accent/30 border border-border rounded px-2 py-1 text-xs resize-none"
                  rows={2}
                />
              </div>
            )}

            {/* 연락처 */}
            {hasProperty("contact") && (
              <div className="py-2">
                <span className="text-sm block mb-2">📞 연락처</span>
                <div className="space-y-2">
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => handleContactChange("phone", e.target.value)}
                    placeholder="전화번호"
                    className="w-full bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => handleContactChange("email", e.target.value)}
                    placeholder="이메일"
                    className="w-full bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}

            {/* 속성 추가 버튼 */}
            <div className="pt-2">
              {!showAddProperty ? (
                <button
                  onClick={() => setShowAddProperty(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  + 속성 추가
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableProperties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => handleAddProperty(prop.id)}
                      className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80"
                    >
                      {prop.icon} {prop.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddProperty(false)}
                    className="text-xs px-2 py-1 text-muted-foreground"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* 타입 적용 - 속성 섹션 내부 */}
            {blockTypes.length > 0 && (
              <div className="pt-3 border-t border-border mt-3">
                <span className="text-sm text-muted-foreground block mb-2">📋 타입 적용</span>
                <div className="flex flex-wrap gap-2">
                  {blockTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => onApplyType(block.id, type.id)}
                      className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80"
                    >
                      {type.icon} {type.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* 본문 영역 - 최대 확장 */}
        <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSaveContent}
            className="w-full h-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50"
            placeholder="여기에 내용을 작성하세요..."
          />
        </div>

        {/* 미니멀 푸터 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          {/* 위치 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent px-3 py-1.5 rounded transition-colors"
            >
              {COLUMN_LABELS[block.column].icon} {COLUMN_LABELS[block.column].label}
              <span className="text-xs">▾</span>
            </button>
            {showColumnDropdown && (
              <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10">
                {(Object.keys(COLUMN_LABELS) as BlockColumn[]).map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      handleMoveToColumn(col);
                      setShowColumnDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors ${
                      block.column === col ? "bg-accent/50" : ""
                    }`}
                  >
                    {COLUMN_LABELS[col].icon} {COLUMN_LABELS[col].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 삭제 버튼 - 아이콘만 */}
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded transition-colors"
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
