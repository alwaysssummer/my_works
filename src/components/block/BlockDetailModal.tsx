"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Block, BlockColumn, getBlockDisplayName } from "@/types/block";
import { Tag, PropertyType, PriorityLevel, DEFAULT_PROPERTIES, BlockProperty } from "@/types/property";
import { BlockType } from "@/types/blockType";

interface BlockDetailModalProps {
  block: Block;
  allTags: Tag[];
  blockTypes: BlockType[];
  onUpdateBlock: (id: string, content: string) => void;
  onUpdateBlockName: (id: string, name: string) => void;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: any) => void;
  onUpdatePropertyName: (blockId: string, propertyId: string, name: string) => void;
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
  onUpdateBlockName,
  onAddProperty,
  onUpdateProperty,
  onUpdatePropertyName,
  onRemoveProperty,
  onCreateTag,
  onApplyType,
  onMoveToColumn,
  onDeleteBlock,
  onClose,
}: BlockDetailModalProps) {
  // 블록 이름
  const [blockName, setBlockName] = useState(block.name || "");
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
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 오늘/내일/다음주 날짜
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // 속성 타입으로 속성 찾기
  const getPropertyByType = useCallback(
    (propertyType: PropertyType): BlockProperty | undefined => {
      return block.properties.find((p) => p.propertyType === propertyType);
    },
    [block.properties]
  );

  // 속성 타입 존재 여부
  const hasPropertyType = useCallback(
    (propertyType: PropertyType) => {
      return block.properties.some((p) => p.propertyType === propertyType);
    },
    [block.properties]
  );

  // 체크박스
  const checkboxProp = getPropertyByType("checkbox");
  const isChecked = checkboxProp?.value?.type === "checkbox" && checkboxProp.value.checked;

  // 날짜
  const dateProp = getPropertyByType("date");
  const dateStr = dateProp?.value?.type === "date" ? dateProp.value.date : "";

  // 우선순위
  const priorityProp = getPropertyByType("priority");
  const priority: PriorityLevel = priorityProp?.value?.type === "priority" ? priorityProp.value.level : "none";

  // 태그
  const tagProp = getPropertyByType("tag");
  const tagIds: string[] = tagProp?.value?.type === "tag" ? tagProp.value.tagIds : [];
  const blockTags = tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean);

  // 메모
  const memoProp = getPropertyByType("memo");
  const memoText = memoProp?.value?.type === "memo" ? memoProp.value.text : "";

  // 연락처
  const contactProp = getPropertyByType("contact");
  const contactPhone = contactProp?.value?.type === "contact" ? contactProp.value.phone : "";
  const contactEmail = contactProp?.value?.type === "contact" ? contactProp.value.email : "";

  // 블록 이름 저장
  const handleSaveBlockName = useCallback(() => {
    if (blockName !== block.name) {
      onUpdateBlockName(block.id, blockName);
    }
  }, [blockName, block.id, block.name, onUpdateBlockName]);

  // 내용 저장
  const handleSaveContent = useCallback(() => {
    if (content.trim() !== block.content.replace(/<[^>]+>/g, "").trim()) {
      onUpdateBlock(block.id, `<p>${content}</p>`);
    }
  }, [content, block.id, block.content, onUpdateBlock]);

  // 체크박스 토글
  const handleToggleCheckbox = useCallback(() => {
    if (checkboxProp) {
      onUpdateProperty(block.id, checkboxProp.id, { type: "checkbox", checked: !isChecked });
    }
  }, [block.id, checkboxProp, isChecked, onUpdateProperty]);

  // 날짜 변경
  const handleDateChange = useCallback(
    (date: string) => {
      if (dateProp) {
        onUpdateProperty(block.id, dateProp.id, { type: "date", date });
      }
    },
    [block.id, dateProp, onUpdateProperty]
  );

  // 우선순위 변경
  const handlePriorityChange = useCallback(
    (level: PriorityLevel) => {
      if (priorityProp) {
        onUpdateProperty(block.id, priorityProp.id, { type: "priority", level });
      }
    },
    [block.id, priorityProp, onUpdateProperty]
  );

  // 태그 추가/제거
  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (tagProp) {
        const newTagIds = tagIds.includes(tagId)
          ? tagIds.filter((id) => id !== tagId)
          : [...tagIds, tagId];
        onUpdateProperty(block.id, tagProp.id, { type: "tag", tagIds: newTagIds });
      }
    },
    [block.id, tagProp, tagIds, onUpdateProperty]
  );

  // 새 태그 생성
  const handleCreateTag = useCallback(() => {
    if (newTagName.trim() && tagProp) {
      const newTag = onCreateTag(newTagName.trim(), newTagColor);
      const newTagIds = [...tagIds, newTag.id];
      onUpdateProperty(block.id, tagProp.id, { type: "tag", tagIds: newTagIds });
      setNewTagName("");
      setShowTagInput(false);
    }
  }, [newTagName, newTagColor, tagIds, tagProp, block.id, onCreateTag, onUpdateProperty]);

  // 메모 변경
  const handleMemoChange = useCallback(
    (text: string) => {
      if (memoProp) {
        onUpdateProperty(block.id, memoProp.id, { type: "memo", text });
      }
    },
    [block.id, memoProp, onUpdateProperty]
  );

  // 연락처 변경
  const handleContactChange = useCallback(
    (field: "phone" | "email", value: string) => {
      if (contactProp) {
        onUpdateProperty(block.id, contactProp.id, {
          type: "contact",
          phone: field === "phone" ? value : contactPhone,
          email: field === "email" ? value : contactEmail,
        });
      }
    },
    [block.id, contactProp, contactPhone, contactEmail, onUpdateProperty]
  );

  // 속성 추가 (노션 방식: 기본 이름으로 즉시 추가)
  const handleAddProperty = useCallback(
    (propertyType: PropertyType) => {
      const prop = DEFAULT_PROPERTIES.find((p) => p.type === propertyType);
      if (prop) {
        onAddProperty(block.id, propertyType, prop.name);
      }
      setShowAddProperty(false);
    },
    [block.id, onAddProperty]
  );

  // 속성 이름 변경
  const handlePropertyNameChange = useCallback(
    (propertyId: string, name: string) => {
      onUpdatePropertyName(block.id, propertyId, name);
      setEditingPropertyId(null);
    },
    [block.id, onUpdatePropertyName]
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
        handleSaveBlockName();
        handleSaveContent();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveBlockName, handleSaveContent, onClose]);

  // 모든 속성 유형 (같은 타입 여러 개 추가 가능)
  const allPropertyTypes = DEFAULT_PROPERTIES;

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
        {/* 헤더 - 블록 이름 입력 + 닫기 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <input
            ref={nameInputRef}
            type="text"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            onBlur={handleSaveBlockName}
            placeholder="블록 이름을 입력하세요..."
            className="flex-1 bg-transparent text-lg font-medium focus:outline-none placeholder:text-muted-foreground/50"
          />
          <button
            onClick={() => {
              handleSaveBlockName();
              handleSaveContent();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1 transition-colors ml-2"
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
                {hasPropertyType("date") && dateStr && (
                  <span className="text-muted-foreground">📅 {getDateDisplayText()}</span>
                )}
                {hasPropertyType("tag") && blockTags.length > 0 && (
                  <span className="text-muted-foreground">
                    🏷️ {blockTags.map(t => t?.name).join(", ")}
                  </span>
                )}
                {hasPropertyType("priority") && priority !== "none" && (
                  <span className="text-muted-foreground">⚡ {PRIORITY_LABELS[priority]}</span>
                )}
                {hasPropertyType("checkbox") && (
                  <span className="text-muted-foreground">{isChecked ? "☑" : "☐"}</span>
                )}
              </div>
            )}
          </button>

          {/* 펼쳐진 속성 상세 UI */}
          {isPropertyExpanded && (
            <div className="px-4 pb-3 space-y-2">

            {/* 체크박스 */}
            {checkboxProp && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">☑</span>
                  {editingPropertyId === checkboxProp.id ? (
                    <input
                      type="text"
                      defaultValue={checkboxProp.name}
                      autoFocus
                      className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                      onBlur={(e) => handlePropertyNameChange(checkboxProp.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePropertyNameChange(checkboxProp.id, e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPropertyId(checkboxProp.id)}
                      className="text-sm hover:bg-accent/50 px-1 rounded"
                    >
                      {checkboxProp.name}
                    </button>
                  )}
                </div>
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
            {dateProp && (
              <div className="py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📅</span>
                    {editingPropertyId === dateProp.id ? (
                      <input
                        type="text"
                        defaultValue={dateProp.name}
                        autoFocus
                        className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                        onBlur={(e) => handlePropertyNameChange(dateProp.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePropertyNameChange(dateProp.id, e.currentTarget.value);
                          }
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingPropertyId(dateProp.id)}
                        className="text-sm hover:bg-accent/50 px-1 rounded"
                      >
                        {dateProp.name}
                      </button>
                    )}
                  </div>
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
            {priorityProp && (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⚡</span>
                  {editingPropertyId === priorityProp.id ? (
                    <input
                      type="text"
                      defaultValue={priorityProp.name}
                      autoFocus
                      className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                      onBlur={(e) => handlePropertyNameChange(priorityProp.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePropertyNameChange(priorityProp.id, e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPropertyId(priorityProp.id)}
                      className="text-sm hover:bg-accent/50 px-1 rounded"
                    >
                      {priorityProp.name}
                    </button>
                  )}
                </div>
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
            {tagProp && (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🏷️</span>
                  {editingPropertyId === tagProp.id ? (
                    <input
                      type="text"
                      defaultValue={tagProp.name}
                      autoFocus
                      className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                      onBlur={(e) => handlePropertyNameChange(tagProp.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePropertyNameChange(tagProp.id, e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPropertyId(tagProp.id)}
                      className="text-sm hover:bg-accent/50 px-1 rounded"
                    >
                      {tagProp.name}
                    </button>
                  )}
                </div>
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
            {memoProp && (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📝</span>
                  {editingPropertyId === memoProp.id ? (
                    <input
                      type="text"
                      defaultValue={memoProp.name}
                      autoFocus
                      className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                      onBlur={(e) => handlePropertyNameChange(memoProp.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePropertyNameChange(memoProp.id, e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPropertyId(memoProp.id)}
                      className="text-sm hover:bg-accent/50 px-1 rounded"
                    >
                      {memoProp.name}
                    </button>
                  )}
                </div>
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
            {contactProp && (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📞</span>
                  {editingPropertyId === contactProp.id ? (
                    <input
                      type="text"
                      defaultValue={contactProp.name}
                      autoFocus
                      className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                      onBlur={(e) => handlePropertyNameChange(contactProp.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePropertyNameChange(contactProp.id, e.currentTarget.value);
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPropertyId(contactProp.id)}
                      className="text-sm hover:bg-accent/50 px-1 rounded"
                    >
                      {contactProp.name}
                    </button>
                  )}
                </div>
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

            {/* 속성 추가 버튼 (노션 방식: 같은 타입 여러 개 추가 가능) */}
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
                  {allPropertyTypes.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => handleAddProperty(prop.type)}
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
