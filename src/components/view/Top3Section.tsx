"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Block, Top3History } from "@/types/block";
import { X, Plus, Search } from "lucide-react";
import { parseBlockContent, getBlockTitle } from "@/lib/blockParser";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { processBlockInput } from "@/lib/blockDefaults";

interface Top3SectionProps {
  blocks: Block[];
  top3Blocks: Block[];
  top3History: Top3History[];
  onAddToTop3: (blockId: string, slotIndex?: number) => void;
  onRemoveFromTop3: (blockId: string) => void;
  onAddBlock: (afterId?: string, options?: { name?: string; content?: string }) => string;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onSelectBlock: (blockId: string) => void;
}

export function Top3Section({
  blocks,
  top3Blocks,
  top3History,
  onAddToTop3,
  onRemoveFromTop3,
  onAddBlock,
  onToggleCheckbox,
  onSelectBlock,
}: Top3SectionProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [directInput, setDirectInput] = useState("");
  const directInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSlotIndex !== null && directInputRef.current) {
      directInputRef.current.focus();
    }
  }, [editingSlotIndex]);

  const handleDirectInputSubmit = () => {
    if (!directInput.trim()) {
      setEditingSlotIndex(null);
      setDirectInput("");
      return;
    }
    const processed = processBlockInput(directInput.trim());
    const newBlockId = onAddBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });
    onAddToTop3(newBlockId, editingSlotIndex ?? undefined);
    setEditingSlotIndex(null);
    setDirectInput("");
  };

  const getBlockForSlot = (slotIndex: number): Block | undefined => {
    return top3Blocks.find((block) => {
      const urgent = block.properties.find((p) => p.propertyType === "urgent");
      return urgent?.value.type === "urgent" && urgent.value.slotIndex === slotIndex;
    });
  };

  const handleCheckboxToggle = (block: Block) => {
    const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
    if (checkboxProp?.value.type === "checkbox") {
      onToggleCheckbox(block.id, !checkboxProp.value.checked);
    }
  };

  const isCompleted = (block: Block) => {
    const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
    return checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;
  };

  const availableBlocks = useMemo(() => {
    const top3Ids = new Set(top3Blocks.map((b) => b.id));
    return blocks.filter((b) => !top3Ids.has(b.id) && (b.name || b.content.trim()));
  }, [blocks, top3Blocks]);

  // 어제의 TOP 3 기록
  const yesterdayTop3 = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const yesterday = today.toISOString().split("T")[0];
    return top3History.find((h) => h.date === yesterday);
  }, [top3History]);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-orange-500 text-lg">★</span>
          <h2 className="text-base font-semibold">TOP 3 오늘의 집중</h2>
        </div>
        {top3Blocks.length < 3 && (
          <button
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            추가
          </button>
        )}
      </div>

      {/* TOP 3 슬롯 */}
      <div className="space-y-2">
        {[0, 1, 2].map((index) => {
          const block = getBlockForSlot(index);
          if (block) {
            const completed = isCompleted(block);
            return (
              <div
                key={block.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  completed
                    ? "border-green-200 bg-green-50"
                    : "border-orange-200 bg-orange-50"
                } cursor-pointer group`}
                onClick={() => onSelectBlock(block.id)}
              >
                {/* 번호 */}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                    completed ? "bg-green-500" : "bg-orange-500"
                  }`}
                >
                  {index + 1}
                </span>

                {/* 체크박스 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckboxToggle(block);
                  }}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    completed
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-orange-300 hover:border-orange-500"
                  }`}
                >
                  {completed && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* 이름 */}
                <span className={`flex-1 text-sm ${completed ? "line-through text-gray-400" : ""}`}>
                  {block.name || getBlockTitle(block.content, 40)}
                </span>

                {/* 제거 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromTop3(block.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/50 transition-opacity"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            );
          }

          // 빈 슬롯
          const isEditing = editingSlotIndex === index;
          return (
            <div
              key={`empty-${index}`}
              onClick={() => {
                if (!isEditing) {
                  setEditingSlotIndex(index);
                  setDirectInput("");
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isEditing
                  ? "border-orange-400 bg-orange-50"
                  : "border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer"
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-200 flex-shrink-0">
                {index + 1}
              </span>
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    ref={directInputRef}
                    type="text"
                    value={directInput}
                    onChange={(e) => setDirectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        handleDirectInputSubmit();
                      } else if (e.key === "Escape") {
                        setEditingSlotIndex(null);
                        setDirectInput("");
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (!directInput.trim()) {
                          setEditingSlotIndex(null);
                          setDirectInput("");
                        }
                      }, 150);
                    }}
                    placeholder="집중할 일 입력..."
                    className="flex-1 px-2 py-1 text-sm border border-orange-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSelector(true);
                      setEditingSlotIndex(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400">
                  <Plus className="w-3 h-3 inline mr-1" />
                  추가
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 어제의 TOP 3 */}
      {yesterdayTop3 && yesterdayTop3.blocks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-orange-100">
          <div className="text-xs text-muted-foreground mb-1.5">
            어제 성취: {yesterdayTop3.blocks.filter((b) => b.completed).length}/{yesterdayTop3.blocks.length} 완료
          </div>
          <div className="flex gap-2">
            {yesterdayTop3.blocks.map((block, i) => (
              <span
                key={`${block.id}-${i}`}
                className={`text-xs px-2 py-1 rounded ${
                  block.completed
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {block.completed ? "☑" : "□"}{" "}
                {block.content.length > 15 ? block.content.slice(0, 15) + "..." : block.content || "내용 없음"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 선택 모달 */}
      {showSelector && (
        <Top3SelectorModal
          availableBlocks={availableBlocks}
          onSelect={(blockId) => {
            onAddToTop3(blockId, editingSlotIndex ?? undefined);
            setShowSelector(false);
            setEditingSlotIndex(null);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </section>
  );
}

function Top3SelectorModal({
  availableBlocks,
  onSelect,
  onClose,
}: {
  availableBlocks: Block[];
  onSelect: (blockId: string) => void;
  onClose: () => void;
}) {
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: onClose,
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">TOP 3에 추가할 항목 선택</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-2 overflow-y-auto max-h-[400px]">
          {availableBlocks.length > 0 ? (
            availableBlocks.slice(0, 20).map((block) => (
              <button
                key={block.id}
                onClick={() => onSelect(block.id)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm line-clamp-2">
                  {block.name || getBlockTitle(block.content, 40)}
                </span>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              추가할 수 있는 항목이 없어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
