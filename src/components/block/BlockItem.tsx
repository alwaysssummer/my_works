"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Block } from "@/types/block";
import { DEFAULT_PROPERTIES, PropertyType, Tag, PRIORITY_COLORS, PRIORITY_LABELS, PriorityLevel, RepeatConfig, REPEAT_LABELS } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { SlashMenu } from "./SlashMenu";

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
  onAddProperty: (id: string, propertyId: string, type: PropertyType) => void;
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
}: BlockItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });

  // 체크박스 속성 찾기
  const checkboxProperty = block.properties.find((p) => p.propertyId === "checkbox");
  const hasCheckbox = !!checkboxProperty;
  const isChecked = checkboxProperty?.value.type === "checkbox" && checkboxProperty.value.checked;

  // 날짜 속성 찾기
  const dateProperty = block.properties.find((p) => p.propertyId === "date");
  const hasDate = !!dateProperty;
  const dateValue = dateProperty?.value.type === "date" ? dateProperty.value.date : "";

  // 태그 속성 찾기
  const tagProperty = block.properties.find((p) => p.propertyId === "tag");
  const hasTag = !!tagProperty;
  const tagIds = tagProperty?.value.type === "tag" ? tagProperty.value.tagIds : [];
  const blockTags = allTags.filter((tag) => tagIds.includes(tag.id));

  // 우선순위 속성 찾기
  const priorityProperty = block.properties.find((p) => p.propertyId === "priority");
  const hasPriority = !!priorityProperty;
  const priorityLevel: PriorityLevel = priorityProperty?.value.type === "priority" ? priorityProperty.value.level : "none";

  // 반복 속성 찾기
  const repeatProperty = block.properties.find((p) => p.propertyId === "repeat");
  const hasRepeat = !!repeatProperty;
  const repeatConfig: RepeatConfig | null = repeatProperty?.value.type === "repeat" ? repeatProperty.value.config : null;

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onUpdateProperty(block.id, "date", {
        type: "date",
        date: e.target.value,
      });
    },
    [block.id, onUpdateProperty]
  );

  const handleRemoveDate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveProperty(block.id, "date");
      setShowMenu(false);
    },
    [block.id, onRemoveProperty]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
    ],
    content: block.content,
    editorProps: {
      attributes: {
        class: `outline-none min-h-[1.5em] ${isChecked ? "line-through text-muted-foreground" : ""}`,
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
          if (hasCheckbox) {
            onUpdateProperty(block.id, "checkbox", {
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
        onUpdateProperty(block.id, "checkbox", {
          type: "checkbox",
          checked: !isChecked,
        });
      }
    },
    [block.id, checkboxProperty, isChecked, onUpdateProperty]
  );

  const handleAddProperty = useCallback(
    (e: React.MouseEvent, propertyId: string, type: PropertyType) => {
      e.stopPropagation();
      onAddProperty(block.id, propertyId, type);
      setShowMenu(false);
      setShowPropertyMenu(false);
    },
    [block.id, onAddProperty]
  );

  const handleRemoveCheckbox = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveProperty(block.id, "checkbox");
      setShowMenu(false);
    },
    [block.id, onRemoveProperty]
  );

  const handleRemoveTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveProperty(block.id, "tag");
      setShowMenu(false);
    },
    [block.id, onRemoveProperty]
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
    (propertyId: string, type: PropertyType) => {
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
      onAddProperty(block.id, propertyId, type);
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

  // 이미 추가된 속성 제외
  const availableProperties = DEFAULT_PROPERTIES.filter(
    (prop) => !block.properties.some((p) => p.propertyId === prop.id)
  );

  return (
    <div
      className="group relative py-1"
      style={{ paddingLeft: `${indentPadding}px` }}
    >
      {/* 블록 메뉴 버튼 (호버 시 표시) */}
      <div
        className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
        style={{ marginLeft: `${indentPadding - 24}px` }}
      >
        <button
          onClick={handleMenuClick}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="18" r="2" />
          </svg>
        </button>

        <div className="w-4 h-4 flex items-center justify-center text-muted-foreground cursor-grab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
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
          {/* 속성 추가 */}
          {availableProperties.length > 0 && (
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
                  {availableProperties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={(e) => handleAddProperty(e, prop.id, prop.type)}
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
                    >
                      <span>{prop.icon}</span>
                      {prop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 체크박스 제거 (있을 때만) */}
          {hasCheckbox && (
            <button
              onClick={handleRemoveCheckbox}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>☐</span>
              체크박스 제거
            </button>
          )}

          {/* 날짜 제거 (있을 때만) */}
          {hasDate && (
            <button
              onClick={handleRemoveDate}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>📅</span>
              날짜 제거
            </button>
          )}

          {/* 태그 제거 (있을 때만) */}
          {hasTag && (
            <button
              onClick={handleRemoveTag}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>🏷️</span>
              태그 제거
            </button>
          )}

          {/* 속성 패널 열기 */}
          {block.properties.length > 0 && (
            <button
              onClick={handleOpenPanel}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span>⚙️</span>
              속성 편집
            </button>
          )}

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
                  <span>📋</span>
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

      {/* 토글 버튼 (하위 블록 있을 때) */}
      {hasChildren && (
        <button
          onClick={handleToggle}
          className="absolute top-2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded opacity-60 hover:opacity-100"
          style={{ left: `${indentPadding - 20}px` }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${block.isCollapsed ? "" : "rotate-90"}`}
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
            className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
              isChecked
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-foreground"
            }`}
          >
            {isChecked && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
            <span className="text-xs text-muted-foreground">📅</span>
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
            🔄
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
