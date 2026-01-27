"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Block, BlockColumn, BlockProperty } from "@/types/block";
import { Tag, PropertyType, PriorityLevel, DEFAULT_PROPERTIES } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { saveImage, getImage } from "@/lib/imageStorage";
import { formatRelativeDate } from "@/lib/dateFormat";

interface NoteViewProps {
  block: Block;
  allTags: Tag[];
  blockTypes: BlockType[];
  contextBlocks?: Block[];
  onUpdateBlock: (id: string, content: string) => void;
  onUpdateBlockName: (id: string, name: string) => void;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: BlockProperty["value"]) => void;
  onUpdatePropertyName: (blockId: string, propertyId: string, name: string) => void;
  onRemoveProperty: (blockId: string, propertyId: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
  onMoveToColumn?: (id: string, column: BlockColumn) => void;
  onDeleteBlock: (id: string) => void;
  onNavigate?: (blockId: string | null) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string; color: string }[] = [
  { value: "high", label: "높음", color: "bg-red-500" },
  { value: "medium", label: "중간", color: "bg-yellow-500" },
  { value: "low", label: "낮음", color: "bg-blue-500" },
  { value: "none", label: "없음", color: "bg-gray-300" },
];

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
  none: "",
};

const TAG_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function NoteView({
  block,
  allTags,
  blockTypes,
  contextBlocks = [],
  onUpdateBlock,
  onUpdateBlockName,
  onAddProperty,
  onUpdateProperty,
  onUpdatePropertyName,
  onRemoveProperty,
  onCreateTag,
  onMoveToColumn,
  onDeleteBlock,
  onNavigate,
  onClose,
}: NoteViewProps) {
  const [blockName, setBlockName] = useState(block.name || "");
  const [showPropertyBar, setShowPropertyBar] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 학생 블록 여부 판단 (contact 속성 존재)
  const isStudentBlock = useMemo(() =>
    block.properties.some(p => p.propertyType === "contact"),
    [block.properties]
  );

  // 현재 블록의 인덱스 및 이전/다음 블록 계산
  const currentIndex = useMemo(() =>
    contextBlocks.findIndex((b) => b.id === block.id),
    [contextBlocks, block.id]
  );
  const prevBlock = currentIndex > 0 ? contextBlocks[currentIndex - 1] : null;
  const nextBlock = currentIndex < contextBlocks.length - 1 ? contextBlocks[currentIndex + 1] : null;
  const hasNavigation = contextBlocks.length > 1;

  // 이전 블록으로 이동
  const handlePrevBlock = useCallback(() => {
    if (prevBlock && onNavigate) {
      onNavigate(prevBlock.id);
    }
  }, [prevBlock, onNavigate]);

  // 다음 블록으로 이동
  const handleNextBlock = useCallback(() => {
    if (nextBlock && onNavigate) {
      onNavigate(nextBlock.id);
    }
  }, [nextBlock, onNavigate]);

  // 삭제 핸들러 (확인 포함)
  const handleDelete = useCallback(() => {
    const hasContent = block.content && block.content !== "<p></p>" && block.content.trim() !== "";
    const hasName = block.name && block.name.trim() !== "";

    if (hasContent || hasName) {
      if (!confirm("이 블록을 삭제하시겠습니까?")) {
        return;
      }
    }
    onDeleteBlock(block.id);
  }, [block.id, block.content, block.name, onDeleteBlock]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  // 오늘/내일/다음주 날짜
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // 속성 타입으로 속성 찾기
  const getPropertyByType = useCallback(
    (propertyType: PropertyType) => {
      return block.properties.find((p) => p.propertyType === propertyType);
    },
    [block.properties]
  );

  // 속성 타입 존재 여부
  const hasPropertyType = useCallback(
    (propertyType: PropertyType) => {
      return block.properties.some((p) => p.propertyType === propertyType);
    },
    [block.properties]
  );

  // 체크박스
  const checkboxProp = getPropertyByType("checkbox");
  const isChecked = checkboxProp?.value?.type === "checkbox" && checkboxProp.value.checked;

  // 날짜
  const dateProp = getPropertyByType("date");
  const dateStr = dateProp?.value?.type === "date" ? dateProp.value.date : "";

  // 우선순위
  const priorityProp = getPropertyByType("priority");
  const priority: PriorityLevel = priorityProp?.value?.type === "priority" ? priorityProp.value.level : "none";

  // 태그
  const tagProp = getPropertyByType("tag");
  const tagIds: string[] = tagProp?.value?.type === "tag" ? tagProp.value.tagIds : [];
  const blockTags = tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean);

  // Tiptap 에디터 설정 (Typora 스타일)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded my-4",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: block.content,
    editorProps: {
      attributes: {
        class: "note-editor-content outline-none min-h-[60vh] focus:outline-none",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const blob = item.getAsFile();
            if (!blob) continue;

            (async () => {
              try {
                const imageId = await saveImage(blob);
                const url = await getImage(imageId);
                if (url && editor) {
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: url, alt: `image-${imageId}` })
                    .run();
                }
              } catch (error) {
                console.error("이미지 저장 실패:", error);
              }
            })();

            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdateBlock(block.id, html);
    },
    autofocus: "end",
  });

  // 에디터 내용 동기화
  useEffect(() => {
    if (editor && block.content !== editor.getHTML()) {
      editor.commands.setContent(block.content);
    }
  }, [block.content, editor]);

  // 키보드 단축키 (ESC 닫기, Alt+←/→ 이동, Ctrl+Backspace 삭제)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: 닫기
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl+S: 저장 피드백 (자동 저장이지만 시각적 피드백용)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return;
      }

      // Alt+← 또는 Ctrl+[: 이전 블록
      if ((e.altKey && e.key === "ArrowLeft") || (e.ctrlKey && e.key === "[")) {
        e.preventDefault();
        handlePrevBlock();
        return;
      }

      // Alt+→ 또는 Ctrl+]: 다음 블록
      if ((e.altKey && e.key === "ArrowRight") || (e.ctrlKey && e.key === "]")) {
        e.preventDefault();
        handleNextBlock();
        return;
      }

      // Ctrl+Backspace: 삭제
      if (e.ctrlKey && e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrevBlock, handleNextBlock, handleDelete]);

  // 블록 이름 저장
  const handleSaveBlockName = useCallback(() => {
    if (blockName !== block.name) {
      onUpdateBlockName(block.id, blockName);
    }
  }, [blockName, block.id, block.name, onUpdateBlockName]);

  // 학생 블록이고 이름이 비어있으면 자동 포커스
  useEffect(() => {
    if (isStudentBlock && !block.name) {
      // 약간의 딜레이 후 포커스 (렌더링 완료 대기)
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStudentBlock, block.name]);

  // 체크박스 토글
  const handleToggleCheckbox = useCallback(() => {
    if (checkboxProp) {
      onUpdateProperty(block.id, checkboxProp.id, { type: "checkbox", checked: !isChecked });
    }
  }, [block.id, checkboxProp, isChecked, onUpdateProperty]);

  // 날짜 변경
  const handleDateChange = useCallback(
    (date: string) => {
      if (dateProp) {
        onUpdateProperty(block.id, dateProp.id, { type: "date", date });
      }
      setShowDatePicker(false);
    },
    [block.id, dateProp, onUpdateProperty]
  );

  // 우선순위 변경
  const handlePriorityChange = useCallback(
    (level: PriorityLevel) => {
      if (priorityProp) {
        onUpdateProperty(block.id, priorityProp.id, { type: "priority", level });
      }
      setShowPriorityPicker(false);
    },
    [block.id, priorityProp, onUpdateProperty]
  );

  // 태그 토글
  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (tagProp) {
        const newTagIds = tagIds.includes(tagId)
          ? tagIds.filter((id) => id !== tagId)
          : [...tagIds, tagId];
        onUpdateProperty(block.id, tagProp.id, { type: "tag", tagIds: newTagIds });
      }
    },
    [block.id, tagProp, tagIds, onUpdateProperty]
  );

  // 새 태그 생성
  const handleCreateTag = useCallback(() => {
    if (newTagName.trim() && tagProp) {
      const newTag = onCreateTag(newTagName.trim(), newTagColor);
      const newTagIds = [...tagIds, newTag.id];
      onUpdateProperty(block.id, tagProp.id, { type: "tag", tagIds: newTagIds });
      setNewTagName("");
      setShowTagInput(false);
    }
  }, [newTagName, newTagColor, tagIds, tagProp, block.id, onCreateTag, onUpdateProperty]);

  // 속성 추가 (노션 방식: 기본 이름으로 즉시 추가)
  const handleAddProperty = useCallback(
    (propertyType: PropertyType) => {
      const prop = DEFAULT_PROPERTIES.find((p) => p.type === propertyType);
      if (prop) {
        onAddProperty(block.id, propertyType, prop.name);
      }
      setShowAddProperty(false);
    },
    [block.id, onAddProperty]
  );

  // 날짜 표시 텍스트
  const getDateDisplayText = () => {
    if (!dateStr) return "날짜";
    if (dateStr === today) return "오늘";
    if (dateStr === tomorrow) return "내일";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 모든 속성 유형 (같은 타입 여러 개 추가 가능)
  const allPropertyTypes = DEFAULT_PROPERTIES;

  return (
    <div className="fixed top-0 right-0 bottom-0 left-60 z-50 bg-background flex flex-col">
      {/* 클릭 외부 닫기 핸들러 - DOM 순서상 가장 먼저 렌더링하여 드롭다운 아래에 위치 */}
      {(showDatePicker || showPropertyBar || showPriorityPicker || showAddProperty) && (
        <div
          className="fixed inset-0 z-[1]"
          onClick={() => {
            setShowDatePicker(false);
            setShowPropertyBar(false);
            setShowPriorityPicker(false);
            setShowAddProperty(false);
          }}
        />
      )}

      {/* 상단 바 */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-10">
        {/* 왼쪽: 돌아가기 + 이전/다음 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            aria-label="목록으로 돌아가기"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span aria-hidden="true">←</span>
            <span>돌아가기</span>
          </button>

          {/* 이전/다음 이동 버튼 */}
          {hasNavigation && (
            <nav className="flex items-center gap-1 ml-4 border-l border-border pl-4" aria-label="블록 탐색">
              <button
                onClick={handlePrevBlock}
                disabled={!prevBlock}
                aria-label="이전 블록 (Alt+←)"
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm" aria-hidden="true">◀</span>
              </button>
              <span className="text-xs text-muted-foreground px-1" aria-live="polite">
                {currentIndex + 1} / {contextBlocks.length}
              </span>
              <button
                onClick={handleNextBlock}
                disabled={!nextBlock}
                aria-label="다음 블록 (Alt+→)"
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm" aria-hidden="true">▶</span>
              </button>
            </nav>
          )}
        </div>

        {/* 오른쪽: 속성 미니멀 표시 */}
        <div className="flex items-center gap-3">
          {/* 체크박스 */}
          {hasPropertyType("checkbox") && (
            <button
              onClick={handleToggleCheckbox}
              aria-label={isChecked ? "할일 완료 해제" : "할일 완료 처리"}
              aria-pressed={isChecked}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                isChecked
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/50 hover:border-primary"
              }`}
            >
              {isChecked && <span className="text-xs" aria-hidden="true">✓</span>}
            </button>
          )}

          {/* 날짜 */}
          {hasPropertyType("date") && (
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                aria-label={`날짜: ${getDateDisplayText()}`}
                aria-expanded={showDatePicker}
                aria-haspopup="dialog"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true">◇</span>
                <span>{getDateDisplayText()}</span>
              </button>
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 z-[100] min-w-[200px]">
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => handleDateChange(today)}
                      className={`text-xs px-2 py-1 rounded ${
                        dateStr === today
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      오늘
                    </button>
                    <button
                      onClick={() => handleDateChange(tomorrow)}
                      className={`text-xs px-2 py-1 rounded ${
                        dateStr === tomorrow
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      내일
                    </button>
                    <button
                      onClick={() => handleDateChange(nextWeek)}
                      className={`text-xs px-2 py-1 rounded ${
                        dateStr === nextWeek
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      다음주
                    </button>
                  </div>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-accent/30 border border-border rounded px-2 py-1 text-sm"
                  />
                  {dateStr && (
                    <button
                      onClick={() => handleDateChange("")}
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      날짜 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 태그 */}
          {hasPropertyType("tag") && (
            <div className="relative">
              <button
                onClick={() => setShowPropertyBar(!showPropertyBar)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
              >
                <span>#</span>
                {blockTags.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {blockTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag?.id}
                        className="px-1.5 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: tag?.color }}
                      >
                        {tag?.name}
                      </span>
                    ))}
                    {blockTags.length > 2 && (
                      <span className="text-xs">+{blockTags.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <span>태그</span>
                )}
              </button>
              {showPropertyBar && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 z-[100] min-w-[250px]">
                  <div className="text-xs text-muted-foreground mb-2">태그 선택</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={`text-xs px-2 py-1 rounded transition-all ${
                          tagIds.includes(tag.id)
                            ? "ring-2 ring-offset-1"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowTagInput(!showTagInput)}
                      className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-muted-foreground"
                    >
                      + 새 태그
                    </button>
                  </div>
                  {showTagInput && (
                    <div className="flex gap-2 items-center mt-2 pt-2 border-t border-border">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="태그 이름"
                        className="flex-1 bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                      />
                      <div className="flex gap-1">
                        {TAG_COLORS.slice(0, 5).map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewTagColor(color)}
                            className={`w-4 h-4 rounded-full ${
                              newTagColor === color ? "ring-2 ring-offset-1" : ""
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim()}
                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        추가
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 우선순위 */}
          {hasPropertyType("priority") && priority !== "none" && (
            <div className="relative">
              <button
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
              >
                <span>!</span>
                <span>{PRIORITY_LABELS[priority]}</span>
              </button>
              {showPriorityPicker && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 z-[100]">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handlePriorityChange(opt.value)}
                      className={`w-full flex items-center gap-2 text-xs px-3 py-1.5 rounded hover:bg-accent ${
                        priority === opt.value ? "bg-accent" : ""
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 속성 추가 버튼 */}
          <div className="relative">
            <button
              onClick={() => setShowAddProperty(!showAddProperty)}
              aria-label="속성 추가"
              aria-expanded={showAddProperty}
              aria-haspopup="menu"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true">+</span>
            </button>
            {showAddProperty && (
              <div
                className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] min-w-[140px]"
                role="menu"
                aria-label="속성 추가 메뉴"
              >
                {allPropertyTypes.map((prop) => (
                  <button
                    key={prop.id}
                    role="menuitem"
                    onClick={() => handleAddProperty(prop.type)}
                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span aria-hidden="true">{prop.icon}</span>
                    {prop.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 삭제 버튼 */}
          <button
            onClick={handleDelete}
            aria-label="블록 삭제 (Ctrl+Backspace)"
            className="text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </header>

      {/* 에디터 영역 - Typora 스타일 */}
      <main className="flex-1 overflow-auto">
        <div className="note-view max-w-3xl mx-auto px-16 py-12 min-h-full">
          {/* 이름 입력 영역 */}
          <div className="mb-6">
            <input
              ref={nameInputRef}
              type="text"
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              onBlur={handleSaveBlockName}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSaveBlockName();
                  editor?.commands.focus();
                }
              }}
              placeholder={isStudentBlock ? "학생 이름을 입력하세요" : "제목을 입력하세요..."}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
            {isStudentBlock && (
              <p className="text-xs text-muted-foreground mt-1">○ 학생</p>
            )}
          </div>

          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none
              prose-headings:font-semibold prose-headings:text-foreground
              prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
              prose-h2:text-2xl prose-h2:mb-4
              prose-h3:text-xl prose-h3:mb-3
              prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
              prose-ul:my-4 prose-ol:my-4
              prose-li:my-1 prose-li:text-foreground
              prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30
              prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-foreground
              [&_*:focus]:outline-none"
          />
        </div>
      </main>

      {/* 하단 상태 바 */}
      <footer className="flex items-center justify-between px-6 py-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <kbd className="px-1 py-0.5 bg-muted rounded">ESC</kbd>
          <span>닫기</span>
          {hasNavigation && (
            <>
              <kbd className="px-1 py-0.5 bg-muted rounded">Alt+←/→</kbd>
              <span>이동</span>
            </>
          )}
          <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+⌫</kbd>
          <span>삭제</span>
          <span aria-live="polite">자동 저장</span>
        </div>
        <time dateTime={new Date(block.updatedAt).toISOString()} aria-label="마지막 수정">
          {formatRelativeDate(block.updatedAt)} 수정됨
        </time>
      </footer>
    </div>
  );
}
