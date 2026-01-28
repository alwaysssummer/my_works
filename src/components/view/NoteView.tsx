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
import { formatRelativeDate, getKoreanNow, getKoreanToday, toKoreanDateString } from "@/lib/dateFormat";

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
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 속성 관련 상태
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(true);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

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

  // 오늘/내일/다음주 날짜 (한국 시간)
  const today = toKoreanDateString(getKoreanNow());
  const tomorrow = (() => { const d = getKoreanNow(); d.setDate(d.getDate() + 1); return toKoreanDateString(d); })();
  const nextWeek = (() => { const d = getKoreanNow(); d.setDate(d.getDate() + 7); return toKoreanDateString(d); })();

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

  // 메모
  const memoProp = getPropertyByType("memo");
  const memoText = memoProp?.value?.type === "memo" ? memoProp.value.text : "";

  // 연락처
  const contactProp = getPropertyByType("contact");
  const contactPhone = contactProp?.value?.type === "contact" ? contactProp.value.phone || "" : "";
  const contactEmail = contactProp?.value?.type === "contact" ? contactProp.value.email || "" : "";

  // 반복
  const repeatProp = getPropertyByType("repeat");
  const repeatConfig = repeatProp?.value?.type === "repeat" ? repeatProp.value.config : null;
  const repeatType = repeatConfig?.type || "none";
  const repeatWeekdays = repeatConfig?.weekdays || [];

  // 사람 연결
  const personProp = getPropertyByType("person");
  const personBlockIds = personProp?.value?.type === "person" ? personProp.value.blockIds || [] : [];
  const linkedPersons = personBlockIds.map(id => contextBlocks.find(b => b.id === id)).filter(Boolean);

  // 긴급
  const urgentProp = getPropertyByType("urgent");
  const urgentSlot = urgentProp?.value?.type === "urgent" ? urgentProp.value.slotIndex : undefined;

  // 수업 시간
  const durationProp = getPropertyByType("duration");
  const durationMinutes = durationProp?.value?.type === "duration" ? durationProp.value.minutes : 0;

  // 속성 개수
  const propertyCount = block.properties.length;

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
        class: "note-editor-content outline-none min-h-[200px] focus:outline-none",
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
    },
    [block.id, dateProp, onUpdateProperty]
  );

  // 우선순위 변경
  const handlePriorityChange = useCallback(
    (level: PriorityLevel) => {
      if (priorityProp) {
        onUpdateProperty(block.id, priorityProp.id, { type: "priority", level });
      }
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

  // 메모 변경
  const handleMemoChange = useCallback(
    (text: string) => {
      if (memoProp) {
        onUpdateProperty(block.id, memoProp.id, { type: "memo", text });
      }
    },
    [block.id, memoProp, onUpdateProperty]
  );

  // 연락처 변경
  const handleContactChange = useCallback(
    (field: "phone" | "email", value: string) => {
      if (contactProp) {
        onUpdateProperty(block.id, contactProp.id, {
          type: "contact",
          phone: field === "phone" ? value : contactPhone,
          email: field === "email" ? value : contactEmail,
        });
      }
    },
    [block.id, contactProp, contactPhone, contactEmail, onUpdateProperty]
  );

  // 반복 변경
  const handleRepeatChange = useCallback(
    (type: "none" | "daily" | "weekly" | "monthly", weekdays?: number[]) => {
      if (repeatProp) {
        onUpdateProperty(block.id, repeatProp.id, {
          type: "repeat",
          config: type === "none" ? null : {
            type,
            interval: 1,
            weekdays: weekdays || repeatWeekdays,
          },
        });
      }
    },
    [block.id, repeatProp, repeatWeekdays, onUpdateProperty]
  );

  // 사람 연결 토글
  const handleTogglePerson = useCallback(
    (personId: string) => {
      if (personProp) {
        const newBlockIds = personBlockIds.includes(personId)
          ? personBlockIds.filter(id => id !== personId)
          : [...personBlockIds, personId];
        onUpdateProperty(block.id, personProp.id, { type: "person", blockIds: newBlockIds });
      }
    },
    [block.id, personProp, personBlockIds, onUpdateProperty]
  );

  // 긴급 슬롯 변경 (undefined면 속성 제거)
  const handleUrgentChange = useCallback(
    (slotIndex: number | undefined) => {
      if (urgentProp) {
        if (slotIndex === undefined) {
          onRemoveProperty(block.id, urgentProp.id);
        } else {
          const currentAddedAt = urgentProp.value?.type === "urgent" ? urgentProp.value.addedAt : getKoreanToday();
          onUpdateProperty(block.id, urgentProp.id, { type: "urgent", addedAt: currentAddedAt, slotIndex });
        }
      }
    },
    [block.id, urgentProp, onUpdateProperty, onRemoveProperty]
  );

  // 수업 시간 변경
  const handleDurationChange = useCallback(
    (minutes: number) => {
      if (durationProp) {
        onUpdateProperty(block.id, durationProp.id, { type: "duration", minutes });
      }
    },
    [block.id, durationProp, onUpdateProperty]
  );

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

  // 속성 이름 변경
  const handlePropertyNameChange = useCallback(
    (propertyId: string, name: string) => {
      onUpdatePropertyName(block.id, propertyId, name);
      setEditingPropertyId(null);
    },
    [block.id, onUpdatePropertyName]
  );

  // 속성 제거
  const handleRemoveProperty = useCallback(
    (propertyId: string) => {
      onRemoveProperty(block.id, propertyId);
    },
    [block.id, onRemoveProperty]
  );

  // 날짜 표시 텍스트
  const getDateDisplayText = () => {
    if (!dateStr) return "";
    if (dateStr === today) return "오늘";
    if (dateStr === tomorrow) return "내일";
    return dateStr;
  };

  // 모든 속성 유형
  const allPropertyTypes = DEFAULT_PROPERTIES;

  return (
    <div className="fixed top-0 right-0 bottom-0 left-60 z-50 bg-background flex flex-col">
      {/* 클릭 외부 닫기 핸들러 */}
      {showAddProperty && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => setShowAddProperty(false)}
        />
      )}

      {/* 상단 바 - 간소화 */}
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

        {/* 오른쪽: 삭제만 */}
        <button
          onClick={handleDelete}
          aria-label="블록 삭제 (Ctrl+Backspace)"
          className="text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      {/* 메인 콘텐츠 - 스크롤 가능 */}
      <main className="flex-1 overflow-auto">
        <div className="note-view max-w-3xl mx-auto px-16 py-12 min-h-full">
          {/* 1. 제목 입력 영역 */}
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

          {/* 2. 속성 영역 (노션 스타일 - 세로 테이블) */}
          {(propertyCount > 0 || true) && (
            <div className="mb-6">
              {/* 속성 헤더 (접기/펼치기) */}
              <button
                onClick={() => setIsPropertyExpanded(!isPropertyExpanded)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <span>{isPropertyExpanded ? "▾" : "▸"}</span>
                <span>속성 ({propertyCount})</span>
              </button>

              {/* 속성 목록 */}
              {isPropertyExpanded && (
                <div className="border border-border rounded-lg divide-y divide-border">
                  {/* 체크박스 */}
                  {checkboxProp && (
                    <div className="flex items-center justify-between px-4 py-3 group">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">☑</span>
                        {editingPropertyId === checkboxProp.id ? (
                          <input
                            type="text"
                            defaultValue={checkboxProp.name}
                            autoFocus
                            className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                            onBlur={(e) => handlePropertyNameChange(checkboxProp.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handlePropertyNameChange(checkboxProp.id, e.currentTarget.value);
                              }
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingPropertyId(checkboxProp.id)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            {checkboxProp.name}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleCheckbox}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {isChecked && <span className="text-xs">✓</span>}
                        </button>
                        <button
                          onClick={() => handleRemoveProperty(checkboxProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 날짜 */}
                  {dateProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">◇</span>
                          {editingPropertyId === dateProp.id ? (
                            <input
                              type="text"
                              defaultValue={dateProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(dateProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(dateProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(dateProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {dateProp.name}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={dateStr}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleRemoveProperty(dateProp.id)}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-7">
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
                        {dateStr && (
                          <button
                            onClick={() => handleDateChange("")}
                            className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 우선순위 */}
                  {priorityProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">!</span>
                          {editingPropertyId === priorityProp.id ? (
                            <input
                              type="text"
                              defaultValue={priorityProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(priorityProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(priorityProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(priorityProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {priorityProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(priorityProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 ml-7">
                        {PRIORITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handlePriorityChange(opt.value)}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                              priority === opt.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent hover:bg-accent/80"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 태그 */}
                  {tagProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">#</span>
                          {editingPropertyId === tagProp.id ? (
                            <input
                              type="text"
                              defaultValue={tagProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(tagProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(tagProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(tagProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {tagProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(tagProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-7">
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
                        <div className="flex gap-2 items-center mt-2 ml-7">
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

                  {/* 연락처 */}
                  {contactProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">☎</span>
                          {editingPropertyId === contactProp.id ? (
                            <input
                              type="text"
                              defaultValue={contactProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(contactProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(contactProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(contactProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {contactProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(contactProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-4 ml-7">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">전화</span>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => handleContactChange("phone", e.target.value)}
                            placeholder="010-0000-0000"
                            className="bg-accent/30 border border-border rounded px-2 py-1 text-xs w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">이메일</span>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => handleContactChange("email", e.target.value)}
                            placeholder="email@example.com"
                            className="bg-accent/30 border border-border rounded px-2 py-1 text-xs w-40"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 메모 */}
                  {memoProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">≡</span>
                          {editingPropertyId === memoProp.id ? (
                            <input
                              type="text"
                              defaultValue={memoProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(memoProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(memoProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(memoProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {memoProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(memoProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        value={memoText}
                        onChange={(e) => handleMemoChange(e.target.value)}
                        placeholder="메모를 입력하세요..."
                        className="w-full ml-7 bg-accent/30 border border-border rounded px-3 py-2 text-sm resize-none h-20"
                      />
                    </div>
                  )}

                  {/* 반복 */}
                  {repeatProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">↻</span>
                          {editingPropertyId === repeatProp.id ? (
                            <input
                              type="text"
                              defaultValue={repeatProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(repeatProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(repeatProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(repeatProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {repeatProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(repeatProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 ml-7">
                        <div className="flex gap-2">
                          {(["none", "daily", "weekly", "monthly"] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => handleRepeatChange(type)}
                              className={`text-xs px-2 py-1 rounded ${
                                repeatType === type
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent hover:bg-accent/80"
                              }`}
                            >
                              {type === "none" ? "없음" : type === "daily" ? "매일" : type === "weekly" ? "매주" : "매월"}
                            </button>
                          ))}
                        </div>
                        {repeatType === "weekly" && (
                          <div className="flex gap-1">
                            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  const newDays = repeatWeekdays.includes(i)
                                    ? repeatWeekdays.filter(d => d !== i)
                                    : [...repeatWeekdays, i];
                                  handleRepeatChange("weekly", newDays);
                                }}
                                className={`w-7 h-7 text-xs rounded ${
                                  repeatWeekdays.includes(i)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-accent hover:bg-accent/80"
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 사람 연결 */}
                  {personProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">@</span>
                          {editingPropertyId === personProp.id ? (
                            <input
                              type="text"
                              defaultValue={personProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(personProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(personProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(personProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {personProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(personProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-7">
                        {linkedPersons.length > 0 ? (
                          linkedPersons.map((person) => (
                            <button
                              key={person!.id}
                              onClick={() => handleTogglePerson(person!.id)}
                              className="text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                            >
                              {person!.name || "이름 없음"} ✕
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">연결된 사람 없음</span>
                        )}
                        {contextBlocks.filter(b => b.properties.some(p => p.propertyType === "contact") && !personBlockIds.includes(b.id)).length > 0 && (
                          <details className="relative">
                            <summary className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 cursor-pointer list-none">
                              + 추가
                            </summary>
                            <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] min-w-[120px] max-h-32 overflow-y-auto">
                              {contextBlocks
                                .filter(b => b.properties.some(p => p.propertyType === "contact") && !personBlockIds.includes(b.id))
                                .map(b => (
                                  <button
                                    key={b.id}
                                    onClick={() => handleTogglePerson(b.id)}
                                    className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent"
                                  >
                                    {b.name || "이름 없음"}
                                  </button>
                                ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 긴급 (TOP 3) */}
                  {urgentProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">★</span>
                          {editingPropertyId === urgentProp.id ? (
                            <input
                              type="text"
                              defaultValue={urgentProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(urgentProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(urgentProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(urgentProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {urgentProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(urgentProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 ml-7">
                        {([1, 2, 3] as const).map((slot) => (
                          <button
                            key={slot}
                            onClick={() => handleUrgentChange(urgentSlot === slot ? undefined : slot)}
                            className={`text-xs px-3 py-1 rounded ${
                              urgentSlot === slot
                                ? "bg-red-500 text-white"
                                : "bg-accent hover:bg-accent/80"
                            }`}
                          >
                            TOP {slot}
                          </button>
                        ))}
                        {urgentSlot && (
                          <button
                            onClick={() => handleUrgentChange(undefined)}
                            className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent"
                          >
                            해제
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 수업 시간 */}
                  {durationProp && (
                    <div className="px-4 py-3 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">⏱</span>
                          {editingPropertyId === durationProp.id ? (
                            <input
                              type="text"
                              defaultValue={durationProp.name}
                              autoFocus
                              className="text-sm bg-accent/30 border border-border rounded px-2 py-0.5"
                              onBlur={(e) => handlePropertyNameChange(durationProp.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePropertyNameChange(durationProp.id, e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingPropertyId(durationProp.id)}
                              className="text-sm text-muted-foreground hover:text-foreground"
                            >
                              {durationProp.name}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveProperty(durationProp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 ml-7 items-center">
                        {[30, 45, 60, 90, 120].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleDurationChange(mins)}
                            className={`text-xs px-2 py-1 rounded ${
                              durationMinutes === mins
                                ? "bg-primary text-primary-foreground"
                                : "bg-accent hover:bg-accent/80"
                            }`}
                          >
                            {mins}분
                          </button>
                        ))}
                        <input
                          type="number"
                          value={durationMinutes || ""}
                          onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                          placeholder="직접 입력"
                          className="w-20 bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                          min="0"
                        />
                        <span className="text-xs text-muted-foreground">분</span>
                      </div>
                    </div>
                  )}

                  {/* 속성이 없을 때 */}
                  {propertyCount === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      속성이 없습니다
                    </div>
                  )}
                </div>
              )}

              {/* 3. 속성 추가 버튼 */}
              <div className="relative mt-2">
                <button
                  onClick={() => setShowAddProperty(!showAddProperty)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span>+</span>
                  <span>속성 추가</span>
                </button>
                {showAddProperty && (
                  <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] min-w-[160px]">
                    {allPropertyTypes.map((prop) => (
                      <button
                        key={prop.id}
                        onClick={() => handleAddProperty(prop.type)}
                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2"
                      >
                        <span>{prop.icon}</span>
                        {prop.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. 구분선 */}
          <hr className="border-border my-6" />

          {/* 5. 댓글 섹션 (플레이스홀더) */}
          <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
            <span>A</span>
            <span>댓글 추가</span>
            <span className="text-xs">(준비 중)</span>
          </div>

          {/* 6. 구분선 */}
          <hr className="border-border my-6" />

          {/* 7. 본문 (Tiptap 에디터) */}
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
