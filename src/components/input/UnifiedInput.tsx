"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import { useBlockActions } from "@/contexts/BlockContext";
import { processUnifiedInput } from "@/lib/unifiedInputProcessor";
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
  /** 탭별 입력 컨텍스트 */
  inputContext?: "schedule" | "tasks" | "students" | "general";
}

/**
 * 통합 입력 컴포넌트 — Google Keep 스타일
 *
 * - 비포커스: 한 줄 input
 * - 포커스: textarea (자동 높이 확장)
 * - Enter: 줄바꿈
 * - Ctrl+Enter: 저장
 * - Shift+Enter: 전체 페이지 열기
 * - Escape: 취소/접기
 */
export function UnifiedInput({
  placeholder = "입력...",
  showHints = true,
  triggerFocus,
  autoFocus = false,
  onOpenFullPage,
  inputContext = "general",
}: UnifiedInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isPinToggled, setIsPinToggled] = useState(false);

  const { addBlock, addProperty, togglePin } = useBlockActions();

  // textarea 자동 높이 조절
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }, []);

  // 포커스 시 textarea로 전환 후 높이 조절
  useEffect(() => {
    if (isFocused) {
      // 다음 렌더 사이클에서 textarea에 포커스
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // 커서를 끝으로 이동
          const len = textarea.value.length;
          textarea.setSelectionRange(len, len);
          adjustTextareaHeight();
        }
      });
    }
  }, [isFocused, adjustTextareaHeight]);

  // 외부 트리거로 포커스
  useEffect(() => {
    if (triggerFocus && triggerFocus > 0) {
      setTimeout(() => {
        if (isFocused) {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 50);
    }
  }, [triggerFocus, isFocused]);

  // 자동 포커스
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // 속성 추가 공통 로직
  const addParsedProperties = useCallback(
    (blockId: string, props: ReturnType<typeof parseQuickInput>) => {
      if (hasQuickProperties(props)) {
        if (props.hasCheckbox) {
          addProperty(blockId, "checkbox", "메모", {
            type: "checkbox",
            checked: false,
          });
        }
        if (props.date) {
          addProperty(blockId, "date", "날짜", {
            type: "date",
            date: props.date,
          });
        }
        if (props.tags.length > 0) {
          addProperty(blockId, "tag", "태그", {
            type: "tag",
            tagIds: props.tags,
          });
        }
        if (props.priority) {
          addProperty(blockId, "priority", "우선순위", {
            type: "priority",
            level: props.priority,
          });
        }
      }
      // 기본: 항상 메모(체크박스)로 저장 — 빠른 수집함
      if (!props.hasCheckbox) {
        addProperty(blockId, "checkbox", "메모", {
          type: "checkbox",
          checked: false,
        });
      }
    },
    [addProperty]
  );

  // 제출 핸들러
  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;

    const processed = processUnifiedInput(value.trim());

    const newBlockId = addBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });

    addParsedProperties(newBlockId, processed.properties);

    // isPinToggled가 켜져 있으면 생성된 블록을 고정
    if (isPinToggled) {
      togglePin(newBlockId);
      setIsPinToggled(false);
    }

    // 초기화
    setValue("");
    // 포커스 유지 — 연속 입력 가능하도록 setIsFocused(false) 제거
  }, [value, addBlock, addParsedProperties, isPinToggled, togglePin]);

  // 전체 페이지로 확장
  const expandToFullPage = useCallback(() => {
    if (!value.trim()) {
      // 빈 상태에서 확장 → 새 블록 생성 후 열기
      const newBlockId = addBlock(undefined, {
        name: "",
        content: "",
      });
      if (isPinToggled) {
        togglePin(newBlockId);
        setIsPinToggled(false);
      }
      setValue("");
      setIsFocused(false);
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

      addParsedProperties(newBlockId, processed.properties);

      if (isPinToggled) {
        togglePin(newBlockId);
        setIsPinToggled(false);
      }

      setValue("");
      setIsFocused(false);

      if (onOpenFullPage) {
        onOpenFullPage(newBlockId);
      }
    }
  }, [value, addBlock, addParsedProperties, onOpenFullPage, isPinToggled, togglePin]);

  // 취소
  const handleCancel = useCallback(() => {
    setValue("");
    setIsFocused(false);
    setIsPinToggled(false);
  }, []);

  // 키보드 핸들러 (input — 비포커스 상태에서 클릭 시)
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // input에서 Enter → 포커스 전환 (textarea로)
        setIsFocused(true);
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleCancel]
  );

  // 키보드 핸들러 (textarea)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Enter: 저장
          e.preventDefault();
          handleSubmit();
        } else if (e.shiftKey) {
          // Shift+Enter: 전체 페이지 열기
          e.preventDefault();
          expandToFullPage();
        }
        // 일반 Enter: 줄바꿈 (기본 동작)
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSubmit, expandToFullPage, handleCancel]
  );

  // textarea onChange
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      // 높이 자동 조절
      requestAnimationFrame(adjustTextareaHeight);
    },
    [adjustTextareaHeight]
  );

  // 포커스 핸들러 (input 클릭 시 textarea로 전환)
  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // 통합 렌더링: input 항상 보임 + 포커스 시 제자리 확장 오버레이
  return (
    <div className="relative">
      {/* 항상 존재 — 헤더 높이 유지용 (포커스 시 카드에 가려짐) */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        isFocused
          ? "border-transparent bg-accent/30"
          : "border-border bg-accent/30 hover:bg-accent/50"
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); setIsPinToggled(prev => !prev); }}
          className={isPinToggled ? "text-sm" : "text-sm grayscale opacity-40 hover:opacity-70"}
          title="고정하여 저장"
          tabIndex={-1}
        >
          📌
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {/* 포커스 시 제자리 확장 오버레이 — input 위치부터 시작 */}
      {isFocused && (
        <>
          {/* backdrop — 클릭하면 접기 */}
          <div
            className="fixed inset-0 z-20"
            onClick={handleCancel}
          />

          {/* 확장 카드 — top-0으로 input 위를 덮어씌움 */}
          <div className="absolute top-0 left-0 right-0 z-30 rounded-lg border border-primary bg-card shadow-lg">
            <div className="flex items-start gap-2 px-3 pt-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setIsPinToggled(prev => !prev); }}
                className={isPinToggled
                  ? "text-sm mt-0.5 hover:opacity-70"
                  : "text-sm mt-0.5 grayscale opacity-40 hover:opacity-70"}
                title={isPinToggled ? "고정 해제" : "고정하여 저장"}
                tabIndex={-1}
              >
                📌
              </button>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-muted-foreground min-w-0 overflow-hidden"
                style={{ maxHeight: "300px", overflowY: value.split("\n").length > 10 ? "auto" : "hidden" }}
                rows={1}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded flex-shrink-0"
                onClick={expandToFullPage}
                title="전체 페이지로 열기 (Shift+Enter)"
                tabIndex={-1}
                data-input-toolbar
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </button>
            </div>

            {/* 퀵 문법 힌트 */}
            {showHints && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pt-1 text-[10px] text-muted-foreground/60">
                <span>[] 할일</span>
                <span>@오늘 @내일</span>
                <span>#태그</span>
                <span>!!! 우선순위</span>
                <span>[[링크]]</span>
              </div>
            )}

            {/* 하단 툴바 */}
            <div
              className="flex items-center justify-between px-3 py-1.5 mt-1 border-t border-border/50"
              data-input-toolbar
            >
              <span className="text-[10px] text-muted-foreground/50">
                Ctrl+Enter 저장
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent rounded"
                  tabIndex={-1}
                >
                  닫기
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim()}
                  className="px-2.5 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  tabIndex={-1}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
