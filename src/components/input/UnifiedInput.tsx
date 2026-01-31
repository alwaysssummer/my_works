"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import { useBlockActions } from "@/contexts/BlockContext";
import {
  processUnifiedInput,
  determineInputMode,
  INPUT_THRESHOLDS,
  InputMode,
} from "@/lib/unifiedInputProcessor";
import { parseQuickInput, hasQuickProperties } from "@/lib/parseQuickInput";
import { processBlockInput } from "@/lib/blockDefaults";

interface UnifiedInputProps {
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 힌트 표시 여부 */
  showHints?: boolean;
  /** 외부에서 포커스 트리거 */
  triggerFocus?: number;
  /** 자동 포커스 */
  autoFocus?: boolean;
  /** 전체 페이지 열기 콜백 (NoteView 열기) */
  onOpenFullPage?: (blockId: string) => void;
}

/**
 * 통합 입력 컴포넌트
 *
 * GTD 스타일 자동 확장:
 * - 30자 이하: 한 줄 입력
 * - 30~100자: 자동 확장 (2-3줄)
 * - 100자+ 또는 Shift+Enter: 전체 페이지 열림
 */
export function UnifiedInput({
  placeholder = "입력하세요...",
  showHints = true,
  triggerFocus,
  autoFocus = false,
  onOpenFullPage,
}: UnifiedInputProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<InputMode>("single");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addBlock, addProperty } = useBlockActions();

  // 입력 모드 자동 결정
  useEffect(() => {
    const newMode = determineInputMode(value);
    if (newMode !== mode) {
      setMode(newMode);
    }
  }, [value, mode]);

  // 외부 트리거로 포커스
  useEffect(() => {
    if (triggerFocus && triggerFocus > 0) {
      setTimeout(() => {
        if (mode === "single") {
          inputRef.current?.focus();
        } else {
          textareaRef.current?.focus();
        }
      }, 50);
    }
  }, [triggerFocus, mode]);

  // 자동 포커스
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // 제출 핸들러
  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;

    // 입력 처리
    const processed = processUnifiedInput(value.trim());

    // 블록 생성
    const newBlockId = addBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });

    // 파싱된 속성 자동 추가
    const props = processed.properties;
    if (hasQuickProperties(props)) {
      if (props.hasCheckbox) {
        addProperty(newBlockId, "checkbox", "할일", {
          type: "checkbox",
          checked: false,
        });
      }
      if (props.date) {
        addProperty(newBlockId, "date", "날짜", {
          type: "date",
          date: props.date,
        });
      }
      if (props.tags.length > 0) {
        addProperty(newBlockId, "tag", "태그", {
          type: "tag",
          tagIds: props.tags,
        });
      }
      if (props.priority) {
        addProperty(newBlockId, "priority", "우선순위", {
          type: "priority",
          level: props.priority,
        });
      }
    }

    // 초기화
    setValue("");
    setMode("single");

    // 전체 페이지 모드였으면 NoteView 열기
    if (mode === "full" && onOpenFullPage) {
      onOpenFullPage(newBlockId);
    }
  }, [value, mode, addBlock, addProperty, onOpenFullPage]);

  // 전체 페이지로 확장
  const expandToFullPage = useCallback(() => {
    if (!value.trim()) {
      // 빈 상태에서 확장 → 새 블록 생성 후 열기
      const newBlockId = addBlock(undefined, {
        name: "",
        content: "",
      });
      setValue("");
      setMode("single");
      if (onOpenFullPage) {
        onOpenFullPage(newBlockId);
      }
    } else {
      // 내용 있으면 블록 생성 후 NoteView 열기
      const processed = processUnifiedInput(value.trim());
      const newBlockId = addBlock(undefined, {
        name: processed.name,
        content: processed.content,
      });

      // 속성 추가 (handleSubmit과 동일 로직)
      const props = processed.properties;
      if (hasQuickProperties(props)) {
        if (props.hasCheckbox) {
          addProperty(newBlockId, "checkbox", "할일", {
            type: "checkbox",
            checked: false,
          });
        }
        if (props.date) {
          addProperty(newBlockId, "date", "날짜", {
            type: "date",
            date: props.date,
          });
        }
        if (props.tags.length > 0) {
          addProperty(newBlockId, "tag", "태그", {
            type: "tag",
            tagIds: props.tags,
          });
        }
        if (props.priority) {
          addProperty(newBlockId, "priority", "우선순위", {
            type: "priority",
            level: props.priority,
          });
        }
      }

      setValue("");
      setMode("single");

      if (onOpenFullPage) {
        onOpenFullPage(newBlockId);
      }
    }
  }, [value, addBlock, addProperty, onOpenFullPage]);

  // 취소
  const handleCancel = useCallback(() => {
    setValue("");
    setMode("single");
    setIsFocused(false);
  }, []);

  // 키보드 핸들러 (single 모드)
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      console.log("[UnifiedInput] KeyDown:", e.key, "shiftKey:", e.shiftKey);
      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Shift+Enter: 전체 페이지
          console.log("[UnifiedInput] Shift+Enter detected, expanding to full page");
          e.preventDefault();
          expandToFullPage();
        } else {
          // Enter: 저장
          e.preventDefault();
          handleSubmit();
        }
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSubmit, expandToFullPage, handleCancel]
  );

  // 키보드 핸들러 (expanded/full 모드)
  const handleTextareaKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey && mode !== "full") {
          // Shift+Enter: 전체 페이지로 전환
          e.preventDefault();
          setMode("full");
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl+Enter: 저장
          e.preventDefault();
          handleSubmit();
        }
        // 일반 Enter: 줄바꿈 (기본 동작)
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [mode, handleSubmit, handleCancel]
  );

  // 붙여넣기 핸들러
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData("text");
      const newValue = value + pastedText;

      // 긴 텍스트 붙여넣기 시 전체 페이지 모드
      if (newValue.length > INPUT_THRESHOLDS.EXPANDED) {
        setMode("full");
      }
    },
    [value]
  );

  // 포커스 핸들러
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (!value.trim()) {
      setIsFocused(false);
      setMode("single");
    }
  }, [value]);

  // 단일 줄 모드 (포커스 안 됨) - 모바일 호환: 실제 input을 사용
  if (mode === "single" && !isFocused) {
    return (
      <div className="px-4 pb-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 hover:shadow transition-all">
            <span className="text-muted-foreground text-lg">+</span>
            {/* 모바일 호환: 터치 시 바로 키보드가 뜨도록 실제 input 사용 */}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              // 모바일에서 터치 시 즉시 포커스되도록
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation();
                expandToFullPage();
              }}
              title="전체 페이지로 열기 (Shift+Enter)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 한 줄 입력 (focused)
  if (mode === "single") {
    return (
      <div className="px-4 pb-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary bg-card shadow-md transition-all">
            <span className="text-primary text-lg">+</span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              autoFocus
              // 모바일 호환성
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              onClick={expandToFullPage}
              title="전체 페이지로 열기"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </button>
          </div>
          {showHints && (
            <div className="flex gap-3 mt-1.5 px-1 text-[10px] text-muted-foreground/60">
              <span>Enter 저장</span>
              <span>Shift+Enter 확장</span>
              <span>[] 할일</span>
              <span>@오늘</span>
              <span>#태그</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 확장/전체 모드
  return (
    <div className="px-4 pb-3">
      <div className="max-w-3xl mx-auto">
        <div
          className={`rounded-lg border shadow-md transition-all ${
            mode === "full"
              ? "border-primary/50 bg-card"
              : "border-primary bg-card"
          }`}
        >
          {/* 헤더 (전체 모드일 때) */}
          {mode === "full" && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">전체 페이지</span>
              <button
                onClick={handleCancel}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                title="닫기 (ESC)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6L18 18" />
                </svg>
              </button>
            </div>
          )}

          {/* 입력 영역 */}
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              onPaste={handlePaste}
              onFocus={handleFocus}
              placeholder={placeholder}
              className={`w-full bg-transparent outline-none text-sm resize-none placeholder:text-muted-foreground ${
                mode === "full" ? "min-h-[200px]" : "min-h-[80px]"
              }`}
              rows={mode === "full" ? 10 : 3}
              autoFocus
              // 모바일 호환성
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {/* 힌트 */}
            {showHints && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground/60">
                <span>[] 할일</span>
                <span>@오늘 @내일</span>
                <span>#태그</span>
                <span>!!! 우선순위</span>
                <span>[[링크]]</span>
              </div>
            )}

            {/* 하단 툴바 */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                {mode === "full" ? "Ctrl+Enter 저장" : "Enter 줄바꿈 · Ctrl+Enter 저장"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs text-muted-foreground hover:bg-accent rounded"
                >
                  취소
                </button>
                {mode === "expanded" && (
                  <button
                    onClick={() => setMode("full")}
                    className="px-3 py-1 text-xs text-muted-foreground hover:bg-accent rounded"
                    title="전체 페이지로 열기"
                  >
                    확장
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim()}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
