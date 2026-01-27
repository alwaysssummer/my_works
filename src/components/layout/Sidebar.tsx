"use client";

import { useState, useCallback } from "react";
import { View, ViewType, VIEW_LABELS, VIEW_ICONS } from "@/types/view";
import { Tag, DEFAULT_PROPERTIES } from "@/types/property";
import { BlockType, TYPE_COLORS, TYPE_ICONS } from "@/types/blockType";
import { CustomView, VIEW_ICONS as CUSTOM_VIEW_ICONS, VIEW_COLORS } from "@/types/customView";
import { Block } from "@/types/block";
import { ChevronDown, ChevronRight } from "lucide-react";

interface StudentInfo {
  id: string;
  name: string;
}

interface SidebarProps {
  currentView: View;
  onChangeView: (type: ViewType, tagId?: string, customViewId?: string) => void;
  onSelectCustomView: (customViewId: string) => void;
  tags: Tag[];
  blockTypes: BlockType[];
  customViews: CustomView[];
  students: StudentInfo[];
  blockCounts: {
    all: number;
  };
  onCreateType: (name: string, propertyIds: string[], icon?: string, color?: string) => BlockType;
  onDeleteType: (id: string) => void;
  onCreateView: (name: string, icon: string, color: string, propertyIds: string[]) => CustomView;
  onDeleteView: (id: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export function Sidebar({
  currentView,
  onChangeView,
  onSelectCustomView,
  tags,
  blockTypes,
  customViews,
  students,
  blockCounts,
  onCreateType,
  onDeleteType,
  onCreateView,
  onDeleteView,
  onSelectStudent,
}: SidebarProps) {
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isStudentExpanded, setIsStudentExpanded] = useState(true);

  // 기본 뷰 (전체, 캘린더, 주간 시간표)
  const mainViews: ViewType[] = ["all", "calendar", "weekly"];

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
        {/* 대시보드 (항상 최상단) */}
        <button
          onClick={() => onChangeView("dashboard")}
          className={`w-full px-3 py-2.5 text-left text-sm rounded-md flex items-center gap-2 transition-colors ${
            currentView.type === "dashboard"
              ? "bg-orange-100 text-orange-700 font-medium"
              : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
          }`}
        >
          <span>{VIEW_ICONS["dashboard"]}</span>
          {VIEW_LABELS["dashboard"]}
        </button>

        {/* 기본 뷰 */}
        <div className="px-3 py-1.5 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          기본
        </div>

        {mainViews.map((viewType) => {
          const isActive =
            currentView.type === viewType &&
            !currentView.tagId &&
            !currentView.customViewId;

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
              {viewType === "all" && blockCounts.all > 0 && (
                <span className="text-xs text-muted-foreground">
                  {blockCounts.all}
                </span>
              )}
            </button>
          );
        })}

        {/* 학생 섹션 */}
        <div className="px-3 py-1.5 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <button
            onClick={() => onChangeView("students")}
            className={`flex items-center gap-1 hover:text-foreground ${
              currentView.type === "students" ? "text-foreground" : ""
            }`}
          >
            <span>👤</span>
            <span>학생</span>
            <span className="text-muted-foreground ml-1">({students.length})</span>
          </button>
          <button
            onClick={() => setIsStudentExpanded(!isStudentExpanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isStudentExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>

        {isStudentExpanded && students.length > 0 && (
          <div className="space-y-0.5">
            {students.slice(0, 10).map((student) => {
              const displayName = student.name || "이름 없음";
              return (
                <button
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  className="w-full px-3 py-1.5 text-left text-sm rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground truncate pl-6"
                >
                  {displayName.length > 15 ? displayName.slice(0, 15) + "..." : displayName}
                </button>
              );
            })}
            {students.length > 10 && (
              <button
                onClick={() => onChangeView("students")}
                className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground pl-6"
              >
                +{students.length - 10}명 더보기
              </button>
            )}
          </div>
        )}

        {/* 커스텀 뷰 섹션 */}
        <div className="px-3 py-1.5 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>뷰</span>
          <button
            onClick={() => setShowViewModal(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            +
          </button>
        </div>

        {customViews.length > 0 ? (
          customViews.map((customView) => {
            const isActive =
              currentView.type === "custom" &&
              currentView.customViewId === customView.id;

            return (
              <div
                key={customView.id}
                className={`group w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
              >
                <button
                  onClick={() => onSelectCustomView(customView.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span>{customView.icon}</span>
                  <span className="truncate">{customView.name}</span>
                </button>
                <button
                  onClick={() => onDeleteView(customView.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs"
                >
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            + 버튼으로 뷰를 만들어보세요
          </div>
        )}

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
              localStorage.removeItem("blocknote-custom-views");
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

      {/* 뷰 생성 모달 */}
      {showViewModal && (
        <ViewCreateModal
          onClose={() => setShowViewModal(false)}
          onCreate={(name, icon, color, propertyIds) => {
            onCreateView(name, icon, color, propertyIds);
            setShowViewModal(false);
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

// 뷰 생성 모달
function ViewCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, icon: string, color: string, propertyIds: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(CUSTOM_VIEW_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(VIEW_COLORS[0]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || selectedProperties.length === 0) return;
      onCreate(name.trim(), selectedIcon, selectedColor, selectedProperties);
    },
    [name, selectedIcon, selectedColor, selectedProperties, onCreate]
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
          <h2 className="font-medium">새 뷰 만들기</h2>
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
              placeholder="예: 할일, 학생, 수업"
              className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* 아이콘 */}
          <div>
            <label className="block text-sm font-medium mb-1">아이콘</label>
            <div className="flex flex-wrap gap-1">
              {CUSTOM_VIEW_ICONS.map((icon) => (
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
              {VIEW_COLORS.map((color) => (
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
            <label className="block text-sm font-medium mb-1">
              표시할 블록 (선택한 속성 중 하나라도 있으면)
            </label>
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
              disabled={!name.trim() || selectedProperties.length === 0}
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
