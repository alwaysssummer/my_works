"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Block, getBlockDisplayName } from "@/types/block";
import { DEFAULT_PROPERTIES, PropertyType, Tag, PRIORITY_COLORS, PRIORITY_LABELS, PriorityLevel, RepeatConfig, REPEAT_LABELS, BlockProperty } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { SlashMenu } from "./SlashMenu";
import { saveImage, getImage } from "@/lib/imageStorage";
import { parseBlockContent } from "@/lib/blockParser";

interface BlockItemProps {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (id: string) => string;
  onFocusPrev: (id: string) => void;
  onFocusNext: (id: string) => void;
  onFocus: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onAddProperty: (id: string, propertyType: PropertyType, name?: string) => void;
  onUpdateProperty: (id: string, propertyId: string, value: any) => void;
  onRemoveProperty: (id: string, propertyId: string) => void;
  onOpenPropertyPanel?: (id: string) => void;
  isFocused: boolean;
  isOnly: boolean;
  hasChildren: boolean;
  allTags?: Tag[];
  blockTypes?: BlockType[];
  onApplyType?: (blockId: string, typeId: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDuplicate?: (id: string) => string;
  onTogglePin?: (id: string) => void;
  frequentTags?: Tag[];
  isInboxView?: boolean;
  // 다중 선택 관련
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}

export function BlockItem({
  block,
  onUpdate,
  onDelete,
  onAddAfter,
  onFocusPrev,
  onFocusNext,
  onFocus,
  onIndent,
  onOutdent,
  onToggleCollapse,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onOpenPropertyPanel,
  isFocused,
  isOnly,
  hasChildren,
  allTags = [],
  blockTypes = [],
  onApplyType,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onTogglePin,
  frequentTags = [],
  isInboxView = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: BlockItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });

  // 체크박스 속성 찾기
  const checkboxProperty = block.properties.find((p) => p.propertyType === "checkbox");
  const hasCheckbox = !!checkboxProperty;
  const isChecked = checkboxProperty?.value.type === "checkbox" && checkboxProperty.value.checked;

  // 날짜 속성 찾기
  const dateProperty = block.properties.find((p) => p.propertyType === "date");
  const hasDate = !!dateProperty;
  const dateValue = dateProperty?.value.type === "date" ? dateProperty.value.date : "";

  // 태그 속성 찾기
  const tagProperty = block.properties.find((p) => p.propertyType === "tag");
  const hasTag = !!tagProperty;
  const tagIds = tagProperty?.value.type === "tag" ? tagProperty.value.tagIds : [];
  const blockTags = allTags.filter((tag) => tagIds.includes(tag.id));

  // 우선순위 속성 찾기
  const priorityProperty = block.properties.find((p) => p.propertyType === "priority");
  const hasPriority = !!priorityProperty;
  const priorityLevel: PriorityLevel = priorityProperty?.value.type === "priority" ? priorityProperty.value.level : "none";

  // 반복 속성 찾기
  const repeatProperty = block.properties.find((p) => p.propertyType === "repeat");
  const hasRepeat = !!repeatProperty;
  const repeatConfig: RepeatConfig | null = repeatProperty?.value.type === "repeat" ? repeatProperty.value.config : null;

  // 블록 파싱 (카테고리 아이콘 표시용)
  const parsedBlock = parseBlockContent(block.content);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (dateProperty) {
        onUpdateProperty(block.id, dateProperty.id, {
          type: "date",
          date: e.target.value,
        });
      }
    },
    [block.id, dateProperty, onUpdateProperty]
  );

  const handleRemoveDate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (dateProperty) {
        onRemoveProperty(block.id, dateProperty.id);
      }
      setShowMenu(false);
    },
    [block.id, dateProperty, onRemoveProperty]
  );

  // 빠른 태그 추가 (빠른 분류용)
  const handleQuickAddTag = useCallback(
    (e: React.MouseEvent, tagId: string) => {
      e.stopPropagation();
      // 태그 속성이 없으면 추가
      if (!hasTag) {
        onAddProperty(block.id, "tag");
      }
      // 태그 값 업데이트 (기존 태그에 추가)
      if (tagProperty) {
        onUpdateProperty(block.id, tagProperty.id, {
          type: "tag",
          tagIds: [...tagIds, tagId],
        });
      }
    },
    [block.id, hasTag, tagProperty, tagIds, onAddProperty, onUpdateProperty]
  );

  // 빠른 타입 적용 (빠른 분류용)
  const handleQuickApplyType = useCallback(
    (e: React.MouseEvent, typeId: string) => {
      e.stopPropagation();
      onApplyType?.(block.id, typeId);
    },
    [block.id, onApplyType]
  );

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
          class: "max-w-full h-auto rounded my-2",
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
        class: `outline-none min-h-[1.5em] ${isChecked ? "line-through text-muted-foreground" : ""}`,
      },
      // 이미지 붙여넣기 핸들러
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const blob = item.getAsFile();
            if (!blob) continue;

            // 비동기로 이미지 저장 및 삽입
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
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          const { state } = view;
          const { $from } = state.selection;
          const node = $from.node(-1);
          if (node?.type.name === "listItem") return false;

          event.preventDefault();
          const newBlockId = onAddAfter(block.id);
          setTimeout(() => onFocus(newBlockId), 0);
          return true;
        }

        if (event.key === "Backspace") {
          const isEmpty = editor?.isEmpty;
          if (isEmpty && !isOnly) {
            event.preventDefault();
            onFocusPrev(block.id);
            onDelete(block.id);
            return true;
          }
        }

        if (event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          onIndent(block.id);
          return true;
        }

        if (event.key === "Tab" && event.shiftKey) {
          event.preventDefault();
          onOutdent(block.id);
          return true;
        }

        // Ctrl+Shift+↑: 블록 위로 이동
        if (event.key === "ArrowUp" && (event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          onMoveUp?.(block.id);
          return true;
        }
        // Ctrl+Shift+↓: 블록 아래로 이동
        if (event.key === "ArrowDown" && (event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          onMoveDown?.(block.id);
          return true;
        }

        // Ctrl+↑: 이전 블록으로 포커스 이동
        if (event.key === "ArrowUp" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
          event.preventDefault();
          onFocusPrev(block.id);
          return true;
        }
        // Ctrl+↓: 다음 블록으로 포커스 이동
        if (event.key === "ArrowDown" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
          event.preventDefault();
          onFocusNext(block.id);
          return true;
        }

        // Ctrl+Enter: 체크박스 토글
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          if (hasCheckbox && checkboxProperty) {
            onUpdateProperty(block.id, checkboxProperty.id, {
              type: "checkbox",
              checked: !isChecked,
            });
          }
          return true;
        }

        // Ctrl+D: 블록 복제
        if (event.key === "d" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          const newBlockId = onDuplicate?.(block.id);
          if (newBlockId) {
            setTimeout(() => onFocus(newBlockId), 0);
          }
          return true;
        }

        // Ctrl+Backspace: 블록 삭제
        if (event.key === "Backspace" && (event.metaKey || event.ctrlKey) && !isOnly) {
          event.preventDefault();
          onFocusPrev(block.id);
          onDelete(block.id);
          return true;
        }

        // Ctrl+E: 속성 모달 열기
        if (event.key === "e" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onOpenPropertyPanel?.(block.id);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(block.id, html);

      // 슬래시 명령어 감지
      const text = editor.getText();
      const slashMatch = text.match(/\/(\w*)$/);

      if (slashMatch) {
        const query = slashMatch[1] || "";
        setSlashQuery(query);

        // 커서 위치 계산
        const { view } = editor;
        const { from } = view.state.selection;
        const coords = view.coordsAtPos(from);

        setSlashPosition({
          top: coords.bottom + 4,
          left: coords.left,
        });
        setShowSlashMenu(true);
      } else {
        setShowSlashMenu(false);
        setSlashQuery("");
      }
    },
    onFocus: () => {
      onFocus(block.id);
    },
  });

  useEffect(() => {
    if (isFocused && editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  }, [isFocused, editor]);

  useEffect(() => {
    if (editor && block.content !== editor.getHTML()) {
      editor.commands.setContent(block.content);
    }
  }, [block.content, editor]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowMenu(false);
      setShowPropertyMenu(false);
      setShowTypeMenu(false);
    };
    if (showMenu || showPropertyMenu || showTypeMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showMenu, showPropertyMenu, showTypeMenu]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isOnly) {
        onFocusPrev(block.id);
        onDelete(block.id);
      }
      setShowMenu(false);
    },
    [block.id, isOnly, onDelete, onFocusPrev]
  );

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
    setShowPropertyMenu(false);
  }, []);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse(block.id);
    },
    [block.id, onToggleCollapse]
  );

  const handleCheckboxToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (checkboxProperty) {
        onUpdateProperty(block.id, checkboxProperty.id, {
          type: "checkbox",
          checked: !isChecked,
        });
      }
    },
    [block.id, checkboxProperty, isChecked, onUpdateProperty]
  );

  const handleAddProperty = useCallback(
    (e: React.MouseEvent, propertyType: PropertyType) => {
      e.stopPropagation();
      onAddProperty(block.id, propertyType);
      setShowMenu(false);
      setShowPropertyMenu(false);
    },
    [block.id, onAddProperty]
  );

  const handleRemoveCheckbox = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (checkboxProperty) {
        onRemoveProperty(block.id, checkboxProperty.id);
      }
      setShowMenu(false);
    },
    [block.id, checkboxProperty, onRemoveProperty]
  );

  const handleRemoveTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (tagProperty) {
        onRemoveProperty(block.id, tagProperty.id);
      }
      setShowMenu(false);
    },
    [block.id, tagProperty, onRemoveProperty]
  );

  const handleOpenPanel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenPropertyPanel?.(block.id);
      setShowMenu(false);
    },
    [block.id, onOpenPropertyPanel]
  );

  const handleApplyType = useCallback(
    (e: React.MouseEvent, typeId: string) => {
      e.stopPropagation();
      onApplyType?.(block.id, typeId);
      setShowMenu(false);
      setShowTypeMenu(false);
    },
    [block.id, onApplyType]
  );

  // 슬래시 메뉴에서 속성 추가
  const handleSlashAddProperty = useCallback(
    (propertyType: PropertyType) => {
      // 슬래시 명령어 제거
      if (editor) {
        const text = editor.getText();
        const slashIndex = text.lastIndexOf("/");
        if (slashIndex !== -1) {
          const html = editor.getHTML();
          // HTML에서 /로 시작하는 부분 제거
          const cleanHtml = html.replace(/\/\w*$/, "").replace(/<p>\s*<\/p>$/, "<p></p>");
          editor.commands.setContent(cleanHtml);
          onUpdate(block.id, cleanHtml);
        }
      }
      onAddProperty(block.id, propertyType);
      setShowSlashMenu(false);
    },
    [block.id, editor, onAddProperty, onUpdate]
  );

  // 슬래시 메뉴에서 타입 적용
  const handleSlashApplyType = useCallback(
    (typeId: string) => {
      // 슬래시 명령어 제거
      if (editor) {
        const html = editor.getHTML();
        const cleanHtml = html.replace(/\/\w*$/, "").replace(/<p>\s*<\/p>$/, "<p></p>");
        editor.commands.setContent(cleanHtml);
        onUpdate(block.id, cleanHtml);
      }
      onApplyType?.(block.id, typeId);
      setShowSlashMenu(false);
    },
    [block.id, editor, onApplyType, onUpdate]
  );

  const handleCloseSlashMenu = useCallback(() => {
    setShowSlashMenu(false);
    setSlashQuery("");
  }, []);

  const indentPadding = block.indent * 24;

  // 속성 추가 메뉴용 (모든 타입 표시 - 같은 타입 여러 개 추가 가능)
  const allPropertyTypes = DEFAULT_PROPERTIES;

  // 선택 체크박스 토글
  const handleSelectionToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection?.(block.id);
    },
    [block.id, onToggleSelection]
  );

  return (
    <div
      className={`group relative py-1 ${isSelected ? "bg-primary/10 rounded" : ""}`}
      style={{ paddingLeft: `${indentPadding}px` }}
    >
      {/* 선택 모드 체크박스 */}
      {isSelectionMode && (
        <button
          onClick={handleSelectionToggle}
          aria-label={isSelected ? "선택 해제" : "블록 선택"}
          aria-pressed={isSelected}
          className={`absolute top-2 w-5 h-5 border-2 rounded flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
            isSelected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/50 hover:border-primary"
          }`}
          style={{ left: `${indentPadding - 28}px` }}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      )}

      {/* 블록 메뉴 버튼 (호버 시 표시, 선택 모드가 아닐 때만) */}
      <div
        className={`absolute left-0 top-2 transition-opacity flex items-center gap-0.5 ${
          isSelectionMode ? "hidden" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        }`}
        style={{ marginLeft: `${indentPadding - 24}px` }}
      >
        <button
          onClick={handleMenuClick}
          aria-label="블록 메뉴 열기"
          aria-expanded={showMenu}
          aria-haspopup="menu"
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="18" r="2" />
          </svg>
        </button>

        <div
          className="w-4 h-4 flex items-center justify-center text-muted-foreground cursor-grab"
          aria-label="블록 드래그 핸들"
          role="button"
          tabIndex={0}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="2" />
            <circle cx="15" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="18" r="2" />
            <circle cx="15" cy="18" r="2" />
          </svg>
        </div>
      </div>

      {/* 드롭다운 메뉴 */}
      {showMenu && (
        <div
          className="absolute left-0 top-8 bg-popover border border-border rounded-md shadow-md py-1 z-20 min-w-[150px]"
          style={{ marginLeft: `${indentPadding - 24}px` }}
        >
          {/* 속성 추가 (모든 타입 표시 - 같은 타입 여러 개 추가 가능) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPropertyMenu((prev) => !prev);
              }}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span>➕</span>
                속성 추가
              </span>
              <span>▶</span>
            </button>

            {showPropertyMenu && (
              <div className="absolute left-full top-0 ml-1 bg-popover border border-border rounded-md shadow-md py-1 min-w-[120px]">
                {allPropertyTypes.map((prop) => (
                  <button
                    key={prop.id}
                    onClick={(e) => handleAddProperty(e, prop.type)}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
                  >
                    <span>{prop.icon}</span>
                    {prop.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 체크박스 제거 (있을 때만) */}
          {hasCheckbox && (
            <button
              onClick={handleRemoveCheckbox}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>□</span>
              체크박스 제거
            </button>
          )}

          {/* 날짜 제거 (있을 때만) */}
          {hasDate && (
            <button
              onClick={handleRemoveDate}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>◇</span>
              날짜 제거
            </button>
          )}

          {/* 태그 제거 (있을 때만) */}
          {hasTag && (
            <button
              onClick={handleRemoveTag}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>#</span>
              태그 제거
            </button>
          )}

          {/* 속성 패널 열기 */}
          {block.properties.length > 0 && (
            <button
              onClick={handleOpenPanel}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>⚙</span>
              속성 편집
            </button>
          )}

          {/* 고정/해제 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(block.id);
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
          >
            <span>{block.isPinned ? "•" : "◦"}</span>
            {block.isPinned ? "고정 해제" : "상단에 고정"}
          </button>

          {/* 타입 적용 */}
          {blockTypes.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTypeMenu((prev) => !prev);
                  setShowPropertyMenu(false);
                }}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span>☰</span>
                  타입 적용
                </span>
                <span>▶</span>
              </button>

              {showTypeMenu && (
                <div className="absolute left-full top-0 ml-1 bg-popover border border-border rounded-md shadow-md py-1 min-w-[120px]">
                  {blockTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={(e) => handleApplyType(e, type.id)}
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
                    >
                      <span>{type.icon}</span>
                      <span className="truncate">{type.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border my-1" />

          <button
            onClick={handleDelete}
            disabled={isOnly}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-destructive"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            삭제
          </button>
        </div>
      )}

      {/* 고정 표시 */}
      {block.isPinned && (
        <span
          className="absolute top-1.5 text-xs cursor-pointer hover:scale-110 transition-transform"
          style={{ left: `${indentPadding - 36}px` }}
          onClick={() => onTogglePin?.(block.id)}
          title="고정 해제"
        >
          •
        </span>
      )}

      {/* 토글 버튼 (하위 블록 있을 때) */}
      {hasChildren && (
        <button
          onClick={handleToggle}
          aria-label={block.isCollapsed ? "하위 블록 펼치기" : "하위 블록 접기"}
          aria-expanded={!block.isCollapsed}
          className="absolute top-2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded opacity-60 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:opacity-100"
          style={{ left: `${indentPadding - 20}px` }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${block.isCollapsed ? "" : "rotate-90"}`}
            aria-hidden="true"
          >
            <path d="M8 5l8 7-8 7V5z" />
          </svg>
        </button>
      )}

      {/* 블록 컨텐츠 영역 */}
      <div
        className="flex items-start gap-2"
        onDoubleClick={() => onOpenPropertyPanel?.(block.id)}
      >
        {/* 카테고리 아이콘 */}
        {parsedBlock.category && parsedBlock.icon && (
          <span
            className="mt-0.5 flex-shrink-0 text-sm"
            style={{ color: parsedBlock.color || undefined }}
            title={parsedBlock.category}
          >
            {parsedBlock.icon}
          </span>
        )}

        {/* 우선순위 표시 */}
        {hasPriority && priorityLevel !== "none" && (
          <span
            className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[priorityLevel] }}
            title={PRIORITY_LABELS[priorityLevel]}
          />
        )}

        {/* 체크박스 */}
        {hasCheckbox && (
          <button
            onClick={handleCheckboxToggle}
            aria-label={isChecked ? "완료 해제" : "완료 처리"}
            aria-pressed={isChecked}
            className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 focus-visible:ring-2 focus-visible:ring-ring ${
              isChecked
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-foreground"
            }`}
          >
            {isChecked && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </button>
        )}

        {/* 에디터 */}
        <div className="flex-1 px-1 py-0.5 rounded hover:bg-accent/50 focus-within:bg-accent/30">
          <EditorContent editor={editor} />
        </div>

        {/* 날짜 표시 */}
        {hasDate && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground">◇</span>
            <input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-pointer hover:text-foreground"
            />
          </div>
        )}

        {/* 반복 표시 */}
        {hasRepeat && repeatConfig && (
          <span
            className="text-xs text-muted-foreground flex items-center gap-0.5 flex-shrink-0"
            title={`${REPEAT_LABELS[repeatConfig.type]} (${repeatConfig.interval > 1 ? `${repeatConfig.interval}회마다` : ""})`}
          >
            ↻
            <span className="text-[10px]">{REPEAT_LABELS[repeatConfig.type]}</span>
          </span>
        )}

        {/* 태그 표시 */}
        {hasTag && blockTags.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
            {blockTags.map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 rounded text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 빠른 분류 버튼 (속성이 없는 블록 또는 인박스 뷰에서 호버 시 표시) */}
        {(isInboxView || block.properties.length === 0) && (frequentTags.length > 0 || blockTypes.length > 0) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* 자주 쓰는 태그 (이미 있는 태그 제외) */}
            {frequentTags
              .filter((tag) => !tagIds.includes(tag.id))
              .slice(0, 3)
              .map((tag) => (
                <button
                  key={tag.id}
                  onClick={(e) => handleQuickAddTag(e, tag.id)}
                  className="px-1.5 py-0.5 rounded text-[10px] text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: tag.color }}
                  title={`${tag.name} 태그 추가`}
                >
                  +{tag.name}
                </button>
              ))}

            {/* 자주 쓰는 타입 */}
            {blockTypes.slice(0, 2).map((type) => (
              <button
                key={type.id}
                onClick={(e) => handleQuickApplyType(e, type.id)}
                className="px-1.5 py-0.5 rounded text-[10px] bg-accent hover:bg-accent/80 transition-colors"
                title={`${type.name} 타입 적용`}
              >
                {type.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 슬래시 명령어 메뉴 */}
      {showSlashMenu && (
        <SlashMenu
          query={slashQuery}
          position={slashPosition}
          onAddProperty={handleSlashAddProperty}
          onApplyType={handleSlashApplyType}
          onClose={handleCloseSlashMenu}
          blockTypes={blockTypes}
        />
      )}
    </div>
  );
}
