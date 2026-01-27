"use client";

import { useState, useRef, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/types/block";
import { Tag, PropertyType, TAG_COLORS } from "@/types/property";
import { DraggableBlock } from "./DraggableBlock";
import { parseQuickInput } from "@/lib/parseQuickInput";

interface InboxColumnProps {
  blocks: Block[];
  allTags: Tag[];
  onAddBlock: () => string;
  onUpdateBlock: (id: string, content: string) => void;
  onOpenDetail: (id: string) => void;
  onAddProperty?: (blockId: string, propertyId: string, type: PropertyType) => void;
  onUpdateProperty?: (blockId: string, propertyId: string, value: any) => void;
  onCreateTag?: (name: string, color: string) => Tag;
}

export function InboxColumn({
  blocks,
  allTags,
  onAddBlock,
  onUpdateBlock,
  onOpenDetail,
  onAddProperty,
  onUpdateProperty,
  onCreateTag,
}: InboxColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "inbox" });
  const [inputValue, setInputValue] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 태그 이름으로 태그 찾기 또는 생성
  const getOrCreateTagByName = useCallback(
    (tagName: string): Tag | null => {
      // 기존 태그에서 찾기
      const existingTag = allTags.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase()
      );
      if (existingTag) return existingTag;

      // 새 태그 생성 (랜덤 색상 적용)
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

      // 체크박스 추가
      if (parsed.hasCheckbox) {
        onAddProperty(blockId, "checkbox", "checkbox");
      }

      // 날짜 추가
      if (parsed.date) {
        onAddProperty(blockId, "date", "date");
        onUpdateProperty(blockId, "date", { type: "date", date: parsed.date });
      }

      // 태그 추가
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
      const lines = inputValue.trim().split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          // 빠른 입력 파싱
          const parsed = parseQuickInput(line.trim());

          const newId = onAddBlock();
          onUpdateBlock(newId, `<p>${parsed.content || line.trim()}</p>`);

          // 파싱된 속성 적용
          applyParsedProperties(newId, parsed);
        }
      });
      setInputValue("");
      setIsInputExpanded(false);
    }
  }, [inputValue, onAddBlock, onUpdateBlock, applyParsedProperties]);

  return (
    <div
      ref={setNodeRef}
      className={`flex-[2] min-w-[400px] h-full border-r border-border flex flex-col transition-colors ${
        isOver ? "bg-primary/5" : "bg-background"
      }`}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <span className="text-lg">📥</span>
          수집
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
              <span className="text-sm text-muted-foreground">빠른 메모...</span>
            </div>
          ) : (
            <div className="p-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="여러 줄 입력 가능 (각 줄이 블록)&#10;#태그 @오늘 @내일 [] /할일"
                className="w-full bg-transparent outline-none text-sm resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    setInputValue("");
                    setIsInputExpanded(false);
                  }
                }}
              />
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Ctrl+Enter로 추가
                </span>
                <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </div>

      {/* 블록 목록 */}
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {blocks.map((block) => (
            <DraggableBlock
              key={block.id}
              block={block}
              allTags={allTags}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>

        {/* 빈 상태 */}
        {blocks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">새로운 메모를</p>
            <p className="text-sm">여기에 수집하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
