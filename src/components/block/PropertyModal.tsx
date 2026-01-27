"use client";

import { useState, useCallback, useEffect } from "react";
import { Block } from "@/types/block";
import { Tag, DEFAULT_PROPERTIES, PropertyType, PriorityLevel, PRIORITY_COLORS, PRIORITY_LABELS, TAG_COLORS, RepeatType, REPEAT_LABELS, RepeatConfig } from "@/types/property";
import { BlockType } from "@/types/blockType";

// 빠른 날짜 선택 옵션
const QUICK_DATES = [
  { label: "오늘", getValue: () => new Date().toISOString().split("T")[0] },
  { label: "내일", getValue: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }},
  { label: "이번 주말", getValue: () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : 6 - day; // 토요일까지
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }},
  { label: "다음 주", getValue: () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }},
];

interface PropertyModalProps {
  block: Block;
  allTags: Tag[];
  blockTypes: BlockType[];
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: any) => void;
  onUpdatePropertyByType: (blockId: string, propertyType: PropertyType, value: any) => void;
  onRemovePropertyByType: (blockId: string, propertyType: PropertyType) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onApplyType: (blockId: string, typeId: string) => void;
  onClose: () => void;
}

export function PropertyModal({
  block,
  allTags,
  blockTypes,
  onAddProperty,
  onUpdatePropertyByType,
  onRemovePropertyByType,
  onCreateTag,
  onApplyType,
  onClose,
}: PropertyModalProps) {
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // 현재 속성 값들
  const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
  const dateProp = block.properties.find((p) => p.propertyType === "date");
  const tagProp = block.properties.find((p) => p.propertyType === "tag");
  const priorityProp = block.properties.find((p) => p.propertyType === "priority");
  const memoProp = block.properties.find((p) => p.propertyType === "memo");
  const contactProp = block.properties.find((p) => p.propertyType === "contact");
  const repeatProp = block.properties.find((p) => p.propertyType === "repeat");

  const isChecked = checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;
  const dateValue = dateProp?.value.type === "date" ? dateProp.value.date : "";
  const tagIds = tagProp?.value.type === "tag" ? tagProp.value.tagIds : [];
  const priorityLevel: PriorityLevel = priorityProp?.value.type === "priority" ? priorityProp.value.level : "none";
  const memoText = memoProp?.value.type === "memo" ? memoProp.value.text : "";
  const phone = contactProp?.value.type === "contact" ? contactProp.value.phone : "";
  const email = contactProp?.value.type === "contact" ? contactProp.value.email : "";
  const repeatConfig: RepeatConfig | null = repeatProp?.value.type === "repeat" ? repeatProp.value.config : null;

  // 블록 내용 (HTML 태그 제거)
  const blockText = block.content.replace(/<[^>]*>/g, "") || "(빈 블록)";

  // ESC로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 속성 토글 (있으면 제거, 없으면 추가)
  const toggleProperty = useCallback(
    (propertyType: PropertyType) => {
      const exists = block.properties.some((p) => p.propertyType === propertyType);
      if (exists) {
        onRemovePropertyByType(block.id, propertyType);
      } else {
        onAddProperty(block.id, propertyType);
      }
    },
    [block.id, block.properties, onAddProperty, onRemovePropertyByType]
  );

  // 태그 토글
  const toggleTag = useCallback(
    (tagId: string) => {
      const currentIds = tagProp?.value.type === "tag" ? tagProp.value.tagIds : [];
      const newIds = currentIds.includes(tagId)
        ? currentIds.filter((id: string) => id !== tagId)
        : [...currentIds, tagId];

      if (!tagProp) {
        // 태그 속성이 없으면 초기값과 함께 추가
        onAddProperty(block.id, "tag", undefined, { type: "tag", tagIds: [tagId] });
      } else {
        onUpdatePropertyByType(block.id, "tag", { type: "tag", tagIds: newIds });
      }
    },
    [block.id, tagProp, onAddProperty, onUpdatePropertyByType]
  );

  // 새 태그 생성
  const handleCreateTag = useCallback(() => {
    if (!newTagName.trim()) return;
    const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
    const newTag = onCreateTag(newTagName.trim(), color);
    toggleTag(newTag.id);
    setNewTagName("");
    setShowTagInput(false);
  }, [newTagName, allTags.length, onCreateTag, toggleTag]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">속성 편집</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* 블록 미리보기 */}
        <div className="px-5 py-3 bg-accent/30 border-b border-border">
          <p className="text-sm text-muted-foreground">블록</p>
          <p className="font-medium truncate">{blockText}</p>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 빠른 추가 */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">빠른 추가</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PROPERTIES.slice(0, 4).map((prop) => {
                const hasProperty = block.properties.some((p) => p.propertyType === prop.id);
                return (
                  <button
                    key={prop.id}
                    onClick={() => toggleProperty(prop.type)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      hasProperty
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    <span>{prop.icon}</span>
                    {prop.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 타입 적용 */}
          {blockTypes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">타입 적용</p>
              <div className="flex flex-wrap gap-2">
                {blockTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onApplyType(block.id, type.id)}
                    className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <span>{type.icon}</span>
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 체크박스 */}
          {checkboxProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>☐</span>
                  <span className="font-medium">할일</span>
                </div>
                <button
                  onClick={() =>
                    onUpdatePropertyByType(block.id, "checkbox", {
                      type: "checkbox",
                      checked: !isChecked,
                    })
                  }
                  className={`w-10 h-6 rounded-full transition-colors ${
                    isChecked ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isChecked ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* 날짜 */}
          {dateProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span>📅</span>
                <span className="font-medium">날짜</span>
              </div>
              {/* 빠른 선택 버튼 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {QUICK_DATES.map((option) => (
                  <button
                    key={option.label}
                    onClick={() =>
                      onUpdatePropertyByType(block.id, "date", {
                        type: "date",
                        date: option.getValue(),
                      })
                    }
                    className="px-2 py-1 text-xs rounded bg-accent hover:bg-accent/80 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={dateValue}
                onChange={(e) =>
                  onUpdatePropertyByType(block.id, "date", {
                    type: "date",
                    date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* 우선순위 */}
          {priorityProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span>⚡</span>
                <span className="font-medium">우선순위</span>
              </div>
              <div className="flex gap-2">
                {(["high", "medium", "low", "none"] as PriorityLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      onUpdatePropertyByType(block.id, "priority", {
                        type: "priority",
                        level,
                      })
                    }
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      priorityLevel === level
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    {level !== "none" && (
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: PRIORITY_COLORS[level] }}
                      />
                    )}
                    {PRIORITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 태그 */}
          {tagProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span>🏷️</span>
                <span className="font-medium">태그</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        isSelected
                          ? "text-white"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {showTagInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateTag();
                        if (e.key === "Escape") setShowTagInput(false);
                      }}
                      placeholder="새 태그"
                      className="w-24 px-2 py-1 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateTag}
                      className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded"
                    >
                      추가
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="px-3 py-1.5 rounded-full text-sm bg-accent hover:bg-accent/80 text-muted-foreground"
                  >
                    + 새 태그
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 메모 */}
          {memoProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span>📝</span>
                <span className="font-medium">메모</span>
              </div>
              <textarea
                value={memoText}
                onChange={(e) =>
                  onUpdatePropertyByType(block.id, "memo", {
                    type: "memo",
                    text: e.target.value,
                  })
                }
                placeholder="메모를 입력하세요..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          )}

          {/* 연락처 */}
          {contactProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span>📞</span>
                <span className="font-medium">연락처</span>
              </div>
              <div className="space-y-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    onUpdatePropertyByType(block.id, "contact", {
                      type: "contact",
                      phone: e.target.value,
                      email,
                    })
                  }
                  placeholder="전화번호"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    onUpdatePropertyByType(block.id, "contact", {
                      type: "contact",
                      phone,
                      email: e.target.value,
                    })
                  }
                  placeholder="이메일"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* 반복 */}
          {repeatProp && (
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span>🔄</span>
                <span className="font-medium">반복</span>
              </div>
              <div className="space-y-3">
                {/* 반복 타입 선택 */}
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly", "yearly"] as RepeatType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        onUpdatePropertyByType(block.id, "repeat", {
                          type: "repeat",
                          config: repeatConfig?.type === type
                            ? null // 같은 타입 클릭 시 해제
                            : { type, interval: 1 },
                        })
                      }
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        repeatConfig?.type === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      {REPEAT_LABELS[type]}
                    </button>
                  ))}
                </div>

                {/* 반복 간격 (반복이 설정된 경우) */}
                {repeatConfig && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">매</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={repeatConfig.interval}
                      onChange={(e) =>
                        onUpdatePropertyByType(block.id, "repeat", {
                          type: "repeat",
                          config: {
                            ...repeatConfig,
                            interval: Math.max(1, parseInt(e.target.value) || 1),
                          },
                        })
                      }
                      className="w-16 px-2 py-1 text-center rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      {repeatConfig.type === "daily" && "일마다"}
                      {repeatConfig.type === "weekly" && "주마다"}
                      {repeatConfig.type === "monthly" && "달마다"}
                      {repeatConfig.type === "yearly" && "년마다"}
                    </span>
                  </div>
                )}

                {/* 반복 해제 버튼 */}
                {repeatConfig && (
                  <button
                    onClick={() =>
                      onUpdatePropertyByType(block.id, "repeat", {
                        type: "repeat",
                        config: null,
                      })
                    }
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    반복 해제
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 더 많은 속성 추가 */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">더 추가하기</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PROPERTIES.filter(
                (prop) => !block.properties.some((p) => p.propertyType === prop.id)
              ).map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAddProperty(block.id, prop.type)}
                  className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-accent/50 hover:bg-accent transition-colors"
                >
                  <span>{prop.icon}</span>
                  {prop.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
