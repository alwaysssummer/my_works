"use client";

import { useCallback, useState } from "react";
import { Block } from "@/types/block";
import {
  Tag,
  DEFAULT_PROPERTIES,
  PropertyType,
  PriorityLevel,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  RepeatType,
  REPEAT_LABELS,
  RepeatConfig,
} from "@/types/property";
import { TagInput } from "./TagInput";

interface PropertyPanelProps {
  block: Block;
  allTags: Tag[];
  allBlocks?: Block[];
  onAddProperty: (propertyId: string, type: PropertyType) => void;
  onUpdateProperty: (propertyId: string, value: any) => void;
  onRemoveProperty: (propertyId: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onClose: () => void;
}

export function PropertyPanel({
  block,
  allTags,
  allBlocks = [],
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onCreateTag,
  onClose,
}: PropertyPanelProps) {
  // 속성 찾기 헬퍼
  const getProperty = useCallback(
    (propertyId: string) => block.properties.find((p) => p.propertyType === propertyId),
    [block.properties]
  );

  const checkboxProperty = getProperty("checkbox");
  const dateProperty = getProperty("date");
  const tagProperty = getProperty("tag");
  const priorityProperty = getProperty("priority");
  const repeatProperty = getProperty("repeat");
  const personProperty = getProperty("person");
  const contactProperty = getProperty("contact");
  const memoProperty = getProperty("memo");

  const hasCheckbox = !!checkboxProperty;
  const hasDate = !!dateProperty;
  const hasTag = !!tagProperty;
  const hasPriority = !!priorityProperty;
  const hasRepeat = !!repeatProperty;
  const hasPerson = !!personProperty;
  const hasContact = !!contactProperty;
  const hasMemo = !!memoProperty;

  const isChecked = checkboxProperty?.value.type === "checkbox" && checkboxProperty.value.checked;
  const dateValue = dateProperty?.value.type === "date" ? dateProperty.value.date : "";
  const tagIds = tagProperty?.value.type === "tag" ? tagProperty.value.tagIds : [];
  const priorityLevel = priorityProperty?.value.type === "priority" ? priorityProperty.value.level : "none";
  const repeatConfig = repeatProperty?.value.type === "repeat" ? repeatProperty.value.config : null;
  const personBlockIds = personProperty?.value.type === "person" ? personProperty.value.blockIds : [];
  const contactPhone = contactProperty?.value.type === "contact" ? contactProperty.value.phone || "" : "";
  const contactEmail = contactProperty?.value.type === "contact" ? contactProperty.value.email || "" : "";
  const memoText = memoProperty?.value.type === "memo" ? memoProperty.value.text : "";

  // 속성이 없는 것들
  const missingProperties = DEFAULT_PROPERTIES.filter(
    (prop) => !block.properties.some((p) => p.propertyType === prop.id)
  );

  const handleCheckboxToggle = useCallback(() => {
    if (checkboxProperty) {
      onUpdateProperty("checkbox", { type: "checkbox", checked: !isChecked });
    }
  }, [checkboxProperty, isChecked, onUpdateProperty]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateProperty("date", { type: "date", date: e.target.value });
    },
    [onUpdateProperty]
  );

  const handleAddTag = useCallback(
    (tagId: string) => {
      const currentTagIds = tagProperty?.value.type === "tag" ? tagProperty.value.tagIds : [];
      if (!currentTagIds.includes(tagId)) {
        onUpdateProperty("tag", { type: "tag", tagIds: [...currentTagIds, tagId] });
      }
    },
    [tagProperty, onUpdateProperty]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      const currentTagIds = tagProperty?.value.type === "tag" ? tagProperty.value.tagIds : [];
      onUpdateProperty("tag", { type: "tag", tagIds: currentTagIds.filter((id) => id !== tagId) });
    },
    [tagProperty, onUpdateProperty]
  );

  const handlePriorityChange = useCallback(
    (level: PriorityLevel) => {
      onUpdateProperty("priority", { type: "priority", level });
    },
    [onUpdateProperty]
  );

  const handleRepeatChange = useCallback(
    (config: RepeatConfig | null) => {
      onUpdateProperty("repeat", { type: "repeat", config });
    },
    [onUpdateProperty]
  );

  const handleContactChange = useCallback(
    (field: "phone" | "email", value: string) => {
      const current = contactProperty?.value.type === "contact" ? contactProperty.value : {};
      onUpdateProperty("contact", {
        type: "contact",
        ...current,
        [field]: value,
      });
    },
    [contactProperty, onUpdateProperty]
  );

  const handleMemoChange = useCallback(
    (text: string) => {
      onUpdateProperty("memo", { type: "memo", text });
    },
    [onUpdateProperty]
  );

  const handlePersonAdd = useCallback(
    (blockId: string) => {
      const currentIds = personProperty?.value.type === "person" ? personProperty.value.blockIds : [];
      if (!currentIds.includes(blockId)) {
        onUpdateProperty("person", { type: "person", blockIds: [...currentIds, blockId] });
      }
    },
    [personProperty, onUpdateProperty]
  );

  const handlePersonRemove = useCallback(
    (blockId: string) => {
      const currentIds = personProperty?.value.type === "person" ? personProperty.value.blockIds : [];
      onUpdateProperty("person", { type: "person", blockIds: currentIds.filter((id) => id !== blockId) });
    },
    [personProperty, onUpdateProperty]
  );

  // 블록 내용에서 텍스트만 추출 (HTML 태그 제거)
  const blockText = block.content.replace(/<[^>]*>/g, "") || "(내용 없음)";

  // 연결 가능한 블록들 (자기 자신 제외)
  const linkableBlocks = allBlocks.filter((b) => b.id !== block.id);

  return (
    <div className="w-80 border-l border-border bg-background h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">속성</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-accent"
        >
          ×
        </button>
      </div>

      {/* 블록 미리보기 */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm text-muted-foreground line-clamp-2">{blockText}</p>
      </div>

      {/* 속성 목록 */}
      <div className="p-4 space-y-4">
        {/* 체크박스 속성 */}
        {hasCheckbox && (
          <PropertySection
            icon="□"
            title="체크박스"
            onRemove={() => onRemoveProperty("checkbox")}
          >
            <button
              onClick={handleCheckboxToggle}
              className={`w-full px-3 py-2 rounded border text-left text-sm flex items-center gap-2 ${
                isChecked
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isChecked ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {isChecked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </span>
              {isChecked ? "완료됨" : "미완료"}
            </button>
          </PropertySection>
        )}

        {/* 날짜 속성 */}
        {hasDate && (
          <PropertySection
            icon="◇"
            title="날짜"
            onRemove={() => onRemoveProperty("date")}
          >
            <input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </PropertySection>
        )}

        {/* 우선순위 속성 */}
        {hasPriority && (
          <PropertySection
            icon="!"
            title="우선순위"
            onRemove={() => onRemoveProperty("priority")}
          >
            <div className="flex gap-1">
              {(["high", "medium", "low", "none"] as PriorityLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handlePriorityChange(level)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                    priorityLevel === level
                      ? "border-transparent text-white"
                      : "border-border hover:bg-accent"
                  }`}
                  style={
                    priorityLevel === level
                      ? { backgroundColor: PRIORITY_COLORS[level] }
                      : undefined
                  }
                >
                  {PRIORITY_LABELS[level]}
                </button>
              ))}
            </div>
          </PropertySection>
        )}

        {/* 반복 속성 */}
        {hasRepeat && (
          <PropertySection
            icon="↻"
            title="반복"
            onRemove={() => onRemoveProperty("repeat")}
          >
            <RepeatEditor config={repeatConfig} onChange={handleRepeatChange} />
          </PropertySection>
        )}

        {/* 태그 속성 */}
        {hasTag && (
          <PropertySection
            icon="#"
            title="태그"
            onRemove={() => onRemoveProperty("tag")}
          >
            <div className="px-3 py-2 rounded border border-border">
              <TagInput
                selectedTagIds={tagIds}
                allTags={allTags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onCreateTag={onCreateTag}
              />
            </div>
          </PropertySection>
        )}

        {/* 사람 연결 속성 */}
        {hasPerson && (
          <PropertySection
            icon="○"
            title="사람 연결"
            onRemove={() => onRemoveProperty("person")}
          >
            <PersonLinker
              selectedBlockIds={personBlockIds}
              allBlocks={linkableBlocks}
              onAdd={handlePersonAdd}
              onRemove={handlePersonRemove}
            />
          </PropertySection>
        )}

        {/* 연락처 속성 */}
        {hasContact && (
          <PropertySection
            icon="☎"
            title="연락처"
            onRemove={() => onRemoveProperty("contact")}
          >
            <div className="space-y-2">
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => handleContactChange("phone", e.target.value)}
                placeholder="전화번호"
                className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => handleContactChange("email", e.target.value)}
                placeholder="이메일"
                className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </PropertySection>
        )}

        {/* 메모 속성 */}
        {hasMemo && (
          <PropertySection
            icon="≡"
            title="메모"
            onRemove={() => onRemoveProperty("memo")}
          >
            <textarea
              value={memoText}
              onChange={(e) => handleMemoChange(e.target.value)}
              placeholder="메모를 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </PropertySection>
        )}

        {/* 속성 추가 버튼 */}
        {missingProperties.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">속성 추가</p>
            <div className="flex flex-wrap gap-2">
              {missingProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAddProperty(prop.id, prop.type)}
                  className="px-2 py-1 text-xs border border-dashed border-border rounded hover:border-foreground hover:bg-accent flex items-center gap-1"
                >
                  <span>{prop.icon}</span>
                  {prop.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 모든 속성이 추가되어 있을 때 */}
        {missingProperties.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            모든 속성이 추가되어 있어요
          </p>
        )}
      </div>
    </div>
  );
}

// 속성 섹션 컴포넌트
function PropertySection({
  icon,
  title,
  onRemove,
  children,
}: {
  icon: string;
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          제거
        </button>
      </div>
      {children}
    </div>
  );
}

// 반복 설정 에디터
function RepeatEditor({
  config,
  onChange,
}: {
  config: RepeatConfig | null;
  onChange: (config: RepeatConfig | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!config && !isEditing) {
    return (
      <button
        onClick={() => {
          onChange({ type: "daily", interval: 1 });
          setIsEditing(true);
        }}
        className="w-full px-3 py-2 text-sm text-muted-foreground border border-dashed border-border rounded hover:bg-accent"
      >
        + 반복 설정 추가
      </button>
    );
  }

  const currentConfig = config || { type: "daily" as RepeatType, interval: 1 };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={currentConfig.type}
          onChange={(e) =>
            onChange({ ...currentConfig, type: e.target.value as RepeatType })
          }
          className="flex-1 px-2 py-1.5 text-sm border border-border rounded bg-background"
        >
          {(["daily", "weekly", "monthly", "yearly"] as RepeatType[]).map((type) => (
            <option key={type} value={type}>
              {REPEAT_LABELS[type]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={currentConfig.interval}
          onChange={(e) =>
            onChange({ ...currentConfig, interval: parseInt(e.target.value) || 1 })
          }
          className="w-16 px-2 py-1.5 text-sm border border-border rounded bg-background text-center"
        />
        <button
          onClick={() => onChange(null)}
          className="px-2 py-1.5 text-sm text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {currentConfig.interval === 1
          ? REPEAT_LABELS[currentConfig.type]
          : `${currentConfig.interval}${
              currentConfig.type === "daily"
                ? "일"
                : currentConfig.type === "weekly"
                ? "주"
                : currentConfig.type === "monthly"
                ? "개월"
                : "년"
            }마다`}
      </p>
    </div>
  );
}

// 사람 연결 컴포넌트
function PersonLinker({
  selectedBlockIds,
  allBlocks,
  onAdd,
  onRemove,
}: {
  selectedBlockIds: string[];
  allBlocks: Block[];
  onAdd: (blockId: string) => void;
  onRemove: (blockId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedBlocks = allBlocks.filter((b) => selectedBlockIds.includes(b.id));
  const availableBlocks = allBlocks.filter(
    (b) => !selectedBlockIds.includes(b.id) && b.content.toLowerCase().includes(search.toLowerCase())
  );

  const getBlockText = (block: Block) =>
    block.content.replace(/<[^>]*>/g, "").slice(0, 30) || "(내용 없음)";

  return (
    <div className="space-y-2">
      {/* 선택된 블록들 */}
      {selectedBlocks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedBlocks.map((block) => (
            <span
              key={block.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent rounded text-xs"
            >
              {getBlockText(block)}
              <button
                onClick={() => onRemove(block.id)}
                className="hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 검색/추가 */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="블록 검색..."
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isOpen && availableBlocks.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
            {availableBlocks.slice(0, 10).map((block) => (
              <button
                key={block.id}
                onClick={() => {
                  onAdd(block.id);
                  setSearch("");
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent truncate"
              >
                {getBlockText(block)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
