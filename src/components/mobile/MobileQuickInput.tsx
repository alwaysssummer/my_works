"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
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

  // 자동 높이 조절
  const adjustHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // autoFocus 또는 외부 트리거로 포커스
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
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
    // 높이 초기화
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
    });
    onBlockCreated?.(blockId);
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="메모 입력... (줄바꿈 가능)"
        rows={1}
        className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background resize-none transition-[border-color] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
        enterKeyHint="enter"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        spellCheck={false}
        inputMode="text"
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
            : "전송 버튼으로 저장"}
        </div>
      )}
    </div>
  );
});
