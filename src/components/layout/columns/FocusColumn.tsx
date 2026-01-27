"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/types/block";
import { Tag, PropertyType, TAG_COLORS } from "@/types/property";
import { DraggableBlock } from "./DraggableBlock";
import { parseQuickInput } from "@/lib/parseQuickInput";

interface FocusColumnProps {
  blocks: Block[];
  allTags: Tag[];
  onAddBlock: () => string;
  onUpdateBlock: (id: string, content: string) => void;
  onOpenDetail: (id: string) => void;
  onAddProperty?: (blockId: string, propertyId: string, type: PropertyType) => void;
  onUpdateProperty?: (blockId: string, propertyId: string, value: any) => void;
  onCreateTag?: (name: string, color: string) => Tag;
}

export function FocusColumn({
  blocks,
  allTags,
  onAddBlock,
  onUpdateBlock,
  onOpenDetail,
  onAddProperty,
  onUpdateProperty,
  onCreateTag,
}: FocusColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "focus" });
  const [inputValue, setInputValue] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 오늘 날짜
  const today = new Date().toISOString().split("T")[0];

  // 사용자가 직접 추가한 블록 (날짜 없거나 오늘 이전)
  const manualBlocks = useMemo(() => {
    return blocks.filter((block) => {
      const dateProp = block.properties.find((p) => p.propertyId === "date");
      const dateValue = dateProp?.value.type === "date" ? dateProp.value.date : null;
      return !dateValue || dateValue < today;
    });
  }, [blocks, today]);

  // 오늘 할일 (날짜가 오늘이고 체크박스가 있는 블록)
  const todayTodos = useMemo(() => {
    return blocks.filter((block) => {
      const dateProp = block.properties.find((p) => p.propertyId === "date");
      const dateValue = dateProp?.value.type === "date" ? dateProp.value.date : null;
      const hasCheckbox = block.properties.some((p) => p.propertyId === "checkbox");
      return dateValue === today && hasCheckbox;
    });
  }, [blocks, today]);

  // 태그 이름으로 태그 찾기 또는 생성
  const getOrCreateTagByName = useCallback(
    (tagName: string): Tag | null => {
      const existingTag = allTags.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase()
      );
      if (existingTag) return existingTag;

      if (onCreateTag) {
        const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
        return onCreateTag(tagName, color);
      }
      return null;
    },
    [allTags, onCreateTag]
  );

  // 블록에 속성 적용
  const applyParsedProperties = useCallback(
    (blockId: string, parsed: ReturnType<typeof parseQuickInput>) => {
      if (!onAddProperty || !onUpdateProperty) return;

      if (parsed.hasCheckbox) {
        onAddProperty(blockId, "checkbox", "checkbox");
      }

      if (parsed.date) {
        onAddProperty(blockId, "date", "date");
        onUpdateProperty(blockId, "date", { type: "date", date: parsed.date });
      }

      if (parsed.tags.length > 0) {
        const tagIds: string[] = [];
        parsed.tags.forEach((tagName) => {
          const tag = getOrCreateTagByName(tagName);
          if (tag) {
            tagIds.push(tag.id);
          }
        });

        if (tagIds.length > 0) {
          onAddProperty(blockId, "tag", "tag");
          onUpdateProperty(blockId, "tag", { type: "tag", tagIds });
        }
      }
    },
    [onAddProperty, onUpdateProperty, getOrCreateTagByName]
  );

  // 빠른 입력 제출
  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      const parsed = parseQuickInput(inputValue.trim());

      const newId = onAddBlock();
      onUpdateBlock(newId, `<p>${parsed.content || inputValue.trim()}</p>`);

      applyParsedProperties(newId, parsed);

      setInputValue("");
      setIsInputExpanded(false);
    }
  }, [inputValue, onAddBlock, onUpdateBlock, applyParsedProperties]);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[360px] h-full border-r border-border flex flex-col transition-colors ${
        isOver ? "bg-primary/5" : "bg-background"
      }`}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <span className="text-lg">🎯</span>
          포커스
          <span className="text-xs text-muted-foreground font-normal">
            ({blocks.length})
          </span>
        </h2>
      </div>

      {/* 빠른 입력 */}
      <div className="p-3 border-b border-border">
        <div
          className={`rounded-lg border transition-all ${
            isInputExpanded
              ? "border-primary bg-card shadow-sm"
              : "border-border bg-accent/30 hover:bg-accent/50"
          }`}
        >
          {!isInputExpanded ? (
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-text"
              onClick={() => {
                setIsInputExpanded(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <span className="text-muted-foreground">+</span>
              <span className="text-sm text-muted-foreground">집중할 것 추가...</span>
            </div>
          ) : (
            <div className="p-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="집중할 작업 (#태그 @오늘 [] /할일)"
                className="w-full bg-transparent outline-none text-sm resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    setInputValue("");
                    setIsInputExpanded(false);
                  }
                }}
                onBlur={() => {
                  if (!inputValue.trim()) {
                    setIsInputExpanded(false);
                  }
                }}
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => {
                    setInputValue("");
                    setIsInputExpanded(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 블록 목록 */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* 직접 추가한 블록 */}
        {manualBlocks.length > 0 && (
          <div className="space-y-2">
            {manualBlocks.map((block) => (
              <DraggableBlock
                key={block.id}
                block={block}
                allTags={allTags}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}

        {/* 오늘 할일 구분선 */}
        {todayTodos.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>오늘 할일</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {todayTodos.map((block) => (
                <DraggableBlock
                  key={block.id}
                  block={block}
                  allTags={allTags}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          </>
        )}

        {/* 빈 상태 */}
        {blocks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">집중할 작업을</p>
            <p className="text-sm">여기로 드래그하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
