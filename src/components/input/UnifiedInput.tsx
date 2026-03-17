"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { useBlockActions } from "@/contexts/BlockContext";
import { processUnifiedInput } from "@/lib/unifiedInputProcessor";
import { parseQuickInput, hasQuickProperties } from "@/lib/parseQuickInput";
import { processBlockInput } from "@/lib/blockDefaults";
import { saveImage, getImage, deleteImage } from "@/lib/imageStorage";

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
  /** 제출 완료 후 콜백 (탭 이동 등) */
  onAfterSubmit?: () => void;
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
  onAfterSubmit,
}: UnifiedInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isPinToggled, setIsPinToggled] = useState(false);
  const [pastedImages, setPastedImages] = useState<Array<{ id: string; url: string }>>([]);

  const { addBlock, addProperty, togglePin } = useBlockActions();

  // 모바일 감지 (lg breakpoint = 1024px 기준)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
    if (autoFocus && !isMobile) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, isMobile]);

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

  // 이미지 붙여넣기 핸들러
  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (!blob) continue;

          // input 상태일 때 자동으로 textarea로 전환
          if (!isFocused) {
            setIsFocused(true);
          }

          const id = await saveImage(blob);
          const url = await getImage(id);
          if (url) {
            setPastedImages((prev) => [...prev, { id, url }]);
          }
          break; // 한 번에 하나의 이미지만 처리
        }
      }
    },
    [isFocused]
  );

  // 이미지 삭제
  const handleRemoveImage = useCallback(async (imageId: string) => {
    await deleteImage(imageId);
    setPastedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  // 모든 붙여넣기 이미지 정리
  const clearPastedImages = useCallback(async () => {
    for (const img of pastedImages) {
      await deleteImage(img.id);
    }
    setPastedImages([]);
  }, [pastedImages]);

  // 이미지 HTML 생성
  const buildImageHtml = useCallback(() => {
    if (pastedImages.length === 0) return "";
    return pastedImages
      .map((img) => `<img src="${img.url}" alt="image-${img.id}">`)
      .join("");
  }, [pastedImages]);

  // 제출 핸들러
  const handleSubmit = useCallback(() => {
    if (!value.trim() && pastedImages.length === 0) return;

    const processed = processUnifiedInput(value.trim());
    const imageHtml = buildImageHtml();

    const newBlockId = addBlock(undefined, {
      name: processed.name,
      content: (processed.content || "") + imageHtml,
    });

    addParsedProperties(newBlockId, processed.properties);

    // isPinToggled가 켜져 있으면 생성된 블록을 고정
    if (isPinToggled) {
      togglePin(newBlockId);
      setIsPinToggled(false);
    }

    // 초기화
    setValue("");
    setPastedImages([]);
    // 포커스 유지 — 연속 입력 가능하도록 setIsFocused(false) 제거

    onAfterSubmit?.();
  }, [value, pastedImages, addBlock, addParsedProperties, isPinToggled, togglePin, buildImageHtml, onAfterSubmit]);

  // 전체 페이지로 확장
  const expandToFullPage = useCallback(() => {
    const imageHtml = buildImageHtml();

    if (!value.trim() && pastedImages.length === 0) {
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
      setPastedImages([]);
      setIsFocused(false);
      if (onOpenFullPage) {
        onOpenFullPage(newBlockId);
      }
    } else {
      // 내용 있으면 블록 생성 후 NoteView 열기
      const processed = processUnifiedInput(value.trim());
      const newBlockId = addBlock(undefined, {
        name: processed.name,
        content: (processed.content || "") + imageHtml,
      });

      addParsedProperties(newBlockId, processed.properties);

      if (isPinToggled) {
        togglePin(newBlockId);
        setIsPinToggled(false);
      }

      setValue("");
      setPastedImages([]);
      setIsFocused(false);

      if (onOpenFullPage) {
        onOpenFullPage(newBlockId);
      }
    }
  }, [value, pastedImages, addBlock, addParsedProperties, onOpenFullPage, isPinToggled, togglePin, buildImageHtml]);

  // 취소
  const handleCancel = useCallback(() => {
    clearPastedImages();
    setValue("");
    setIsFocused(false);
    setIsPinToggled(false);
  }, [clearPastedImages]);

  // 키보드 핸들러 (input — 비포커스 상태에서 클릭 시)
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (isMobile) {
          handleSubmit();
        } else {
          setIsFocused(true);
        }
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleCancel, isMobile, handleSubmit]
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
    if (isMobile) return; // 모바일: 팝업 없이 인라인 유지
    setIsFocused(true);
  }, [isMobile]);

  // 외부 클릭 감지 — backdrop 대신 사용
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isFocused) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFocused, handleCancel]);

  // 통합 렌더링: 단일 컨테이너에서 인라인 확장
  return (
    <div ref={containerRef} className="relative">
      {/* 메인 입력 컨테이너 — 포커스 시 인라인 확장 */}
      <div className={`rounded-lg border transition-all ${
        isFocused
          ? "border-primary bg-card shadow-sm"
          : "border-border bg-accent/30 hover:bg-accent/50"
      }`}>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setIsPinToggled(prev => !prev); }}
            className={isPinToggled
              ? "text-sm hover:opacity-70"
              : "text-sm grayscale opacity-40 hover:opacity-70"}
            title={isPinToggled ? "고정 해제" : "고정하여 저장"}
            tabIndex={-1}
          >
            📌
          </button>

          {isFocused ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-muted-foreground min-w-0 overflow-hidden"
              style={{ maxHeight: "300px", overflowY: value.split("\n").length > 10 ? "auto" : "hidden" }}
              rows={1}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          )}

          {/* 전체페이지 버튼 — 포커스 시만 */}
          {isFocused && (
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
          )}
        </div>

        {/* 포커스 시 추가 UI — 인라인으로 아래에 펼쳐짐 */}
        {isFocused && (
          <>
            {/* 이미지 미리보기 */}
            {pastedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-2" data-testid="image-preview-area">
                {pastedImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={`image-${img.id}`}
                      className="w-20 h-20 object-cover rounded border border-border"
                    />
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="이미지 삭제"
                      data-testid={`remove-image-${img.id}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                  disabled={!value.trim() && pastedImages.length === 0}
                  className="px-2.5 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  tabIndex={-1}
                >
                  저장
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
