"use client";

import { useState, useCallback } from "react";
import { View, ViewType, VIEW_LABELS, VIEW_ICONS } from "@/types/view";
import { Tag, DEFAULT_PROPERTIES } from "@/types/property";
import { BlockType, TYPE_COLORS, TYPE_ICONS } from "@/types/blockType";

interface SidebarProps {
  currentView: View;
  onChangeView: (type: ViewType, tagId?: string) => void;
  tags: Tag[];
  blockTypes: BlockType[];
  blockCounts: {
    all: number;
    today: number;
    todo: number;
    todoCompleted: number;
  };
  onCreateType: (name: string, propertyIds: string[], icon?: string, color?: string) => BlockType;
  onDeleteType: (id: string) => void;
}

export function Sidebar({
  currentView,
  onChangeView,
  tags,
  blockTypes,
  blockCounts,
  onCreateType,
  onDeleteType,
}: SidebarProps) {
  const [showTypeModal, setShowTypeModal] = useState(false);
  const mainViews: ViewType[] = ["all", "today", "todo", "calendar"];

  return (
    <aside className="w-60 h-screen border-r border-border bg-sidebar flex flex-col">
      {/* 로고 영역 */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          BlockNote
        </h1>
      </div>

      {/* 뷰 목록 */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          뷰
        </div>

        {mainViews.map((viewType) => {
          const isActive = currentView.type === viewType && !currentView.tagId;
          let count: number | undefined;

          if (viewType === "all") count = blockCounts.all;
          else if (viewType === "today") count = blockCounts.today;
          else if (viewType === "todo") count = blockCounts.todo - blockCounts.todoCompleted;

          return (
            <button
              key={viewType}
              onClick={() => onChangeView(viewType)}
              className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{VIEW_ICONS[viewType]}</span>
                {VIEW_LABELS[viewType]}
              </span>
              {count !== undefined && count > 0 && (
                <span className="text-xs text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}

        {/* 태그 섹션 */}
        <div className="px-3 py-1.5 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          태그
        </div>

        {tags.length > 0 ? (
          tags.map((tag) => {
            const isActive = currentView.type === "tag" && currentView.tagId === tag.id;

            return (
              <button
                key={tag.id}
                onClick={() => onChangeView("tag", tag.id)}
                className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center gap-2 transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate">{tag.name}</span>
              </button>
            );
          })
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            아직 태그가 없어요
          </div>
        )}

        {/* 타입 섹션 */}
        <div className="px-3 py-1.5 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>타입</span>
          <button
            onClick={() => setShowTypeModal(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            +
          </button>
        </div>

        {blockTypes.length > 0 ? (
          blockTypes.map((type) => (
            <div
              key={type.id}
              className="group w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between hover:bg-sidebar-accent/50 text-sidebar-foreground"
            >
              <span className="flex items-center gap-2">
                <span>{type.icon}</span>
                <span className="truncate">{type.name}</span>
              </span>
              <button
                onClick={() => onDeleteType(type.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            아직 타입이 없어요
          </div>
        )}
      </nav>

      {/* 하단 설정 */}
      <div className="p-2 border-t border-border space-y-1">
        <button className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground flex items-center gap-2">
          <span>⚙️</span>
          설정
        </button>
        <button
          onClick={() => {
            if (confirm("모든 데이터를 초기화하고 샘플 데이터를 불러올까요?")) {
              localStorage.removeItem("blocknote-blocks");
              localStorage.removeItem("blocknote-tags");
              localStorage.removeItem("blocknote-types");
              window.location.reload();
            }
          }}
          className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-sidebar-accent text-sidebar-foreground flex items-center gap-2"
        >
          <span>🔄</span>
          샘플 데이터 불러오기
        </button>
      </div>

      {/* 타입 생성 모달 */}
      {showTypeModal && (
        <TypeCreateModal
          onClose={() => setShowTypeModal(false)}
          onCreate={(name, propertyIds, icon, color) => {
            onCreateType(name, propertyIds, icon, color);
            setShowTypeModal(false);
          }}
        />
      )}
    </aside>
  );
}

// 타입 생성 모달
function TypeCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, propertyIds: string[], icon: string, color: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(TYPE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(TYPE_COLORS[0]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      onCreate(name.trim(), selectedProperties, selectedIcon, selectedColor);
    },
    [name, selectedProperties, selectedIcon, selectedColor, onCreate]
  );

  const toggleProperty = useCallback((propId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-80 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">새 타입 만들기</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 학생, 수업, 루틴"
              className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* 아이콘 */}
          <div>
            <label className="block text-sm font-medium mb-1">아이콘</label>
            <div className="flex flex-wrap gap-1">
              {TYPE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-lg ${
                    selectedIcon === icon
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium mb-1">색상</label>
            <div className="flex gap-1">
              {TYPE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full ${
                    selectedColor === color ? "ring-2 ring-offset-2 ring-foreground" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 속성 선택 */}
          <div>
            <label className="block text-sm font-medium mb-1">포함할 속성</label>
            <div className="space-y-1">
              {DEFAULT_PROPERTIES.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => toggleProperty(prop.id)}
                  className={`w-full px-3 py-2 text-left text-sm rounded border flex items-center gap-2 ${
                    selectedProperties.includes(prop.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span>{prop.icon}</span>
                  {prop.name}
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-border rounded hover:bg-accent"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
