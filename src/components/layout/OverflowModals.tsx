"use client";

import { useState, useCallback } from "react";
import { DEFAULT_PROPERTIES } from "@/types/property";
import { TYPE_COLORS, TYPE_ICONS } from "@/types/blockType";
import { VIEW_ICONS as CUSTOM_VIEW_ICONS, VIEW_COLORS } from "@/types/customView";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// 타입 생성 모달
export function TypeCreateModal({
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

  const { containerRef } = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: onClose,
  });

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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="type-modal-title"
    >
      <div
        ref={containerRef}
        className="bg-background rounded-lg shadow-xl w-80 max-h-[80vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 id="type-modal-title" className="font-medium">새 타입 만들기</h2>
          <button
            onClick={onClose}
            aria-label="모달 닫기"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="type-name" className="block text-sm font-medium mb-1">이름</label>
            <input
              id="type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 학생, 수업, 루틴"
              className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">아이콘</legend>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="아이콘 선택">
              {TYPE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  aria-pressed={selectedIcon === icon}
                  className={`w-8 h-8 flex items-center justify-center rounded text-lg focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedIcon === icon
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">색상</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="색상 선택">
              {TYPE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  aria-pressed={selectedColor === color}
                  className={`w-6 h-6 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedColor === color ? "ring-2 ring-offset-2 ring-foreground" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">포함할 속성</legend>
            <div className="space-y-1" role="group" aria-label="속성 선택">
              {DEFAULT_PROPERTIES.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => toggleProperty(prop.id)}
                  aria-pressed={selectedProperties.includes(prop.id)}
                  className={`w-full px-3 py-2 text-left text-sm rounded border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring ${
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
          </fieldset>

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
export function ViewCreateModal({
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

  const { containerRef } = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: onClose,
  });

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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-modal-title"
    >
      <div
        ref={containerRef}
        className="bg-background rounded-lg shadow-xl w-80 max-h-[80vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 id="view-modal-title" className="font-medium">새 뷰 만들기</h2>
          <button
            onClick={onClose}
            aria-label="모달 닫기"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="view-name" className="block text-sm font-medium mb-1">이름</label>
            <input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 할일, 학생, 수업"
              className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">아이콘</legend>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="아이콘 선택">
              {CUSTOM_VIEW_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  aria-pressed={selectedIcon === icon}
                  className={`w-8 h-8 flex items-center justify-center rounded text-lg focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedIcon === icon
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">색상</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="색상 선택">
              {VIEW_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  aria-pressed={selectedColor === color}
                  className={`w-6 h-6 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selectedColor === color ? "ring-2 ring-offset-2 ring-foreground" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">
              표시할 블록 (선택한 속성 중 하나라도 있으면)
            </legend>
            <div className="space-y-1" role="group" aria-label="속성 선택">
              {DEFAULT_PROPERTIES.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => toggleProperty(prop.id)}
                  aria-pressed={selectedProperties.includes(prop.id)}
                  className={`w-full px-3 py-2 text-left text-sm rounded border flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring ${
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
          </fieldset>

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
