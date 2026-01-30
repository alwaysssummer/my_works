"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { processUnifiedInput, INPUT_THRESHOLDS } from "@/lib/unifiedInputProcessor";
import { useBlockContext } from "@/contexts/BlockContext";
import { Send } from "lucide-react";

interface MobileQuickInputProps {
  autoFocus?: boolean;
  onBlockCreated?: (blockId: string) => void;
}

export const MobileQuickInput = forwardRef<HTMLTextAreaElement, MobileQuickInputProps>(
  function MobileQuickInput({ autoFocus = true, onBlockCreated }, ref) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addBlock, addProperty } = useBlockContext();

  // ref 전달
  useImperativeHandle(ref, () => inputRef.current!, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const processed = processUnifiedInput(trimmed);

    // 블록 생성
    const blockId = addBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });

    // 속성 적용
    if (processed.properties.hasCheckbox) {
      addProperty(blockId, "checkbox", undefined, {
        type: "checkbox",
        checked: false,
      });
    }

    if (processed.properties.date) {
      addProperty(blockId, "date", undefined, {
        type: "date",
        date: processed.properties.date,
      });
    }

    if (processed.properties.tags.length > 0) {
      addProperty(blockId, "tag", undefined, {
        type: "tag",
        tagIds: processed.properties.tags,
      });
    }

    if (processed.properties.priority) {
      addProperty(blockId, "priority", undefined, {
        type: "priority",
        level: processed.properties.priority,
      });
    }

    setValue("");
    onBlockCreated?.(blockId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isExpanded = value.length > INPUT_THRESHOLDS.SINGLE_LINE;

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="빠른 메모 입력..."
        rows={isExpanded ? 3 : 1}
        className={`w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
          isExpanded ? "min-h-[80px]" : "min-h-[48px]"
        }`}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        aria-label="메모 저장"
        className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
      >
        <Send className="w-4 h-4" />
      </button>
      {value.length > 0 && (
        <div className="absolute left-4 -bottom-5 text-xs text-muted-foreground">
          {value.length > INPUT_THRESHOLDS.EXPANDED
            ? "길어서 본문으로 분리됩니다"
            : value.length > INPUT_THRESHOLDS.SINGLE_LINE
            ? "Enter로 저장"
            : ""}
        </div>
      )}
    </div>
  );
});
