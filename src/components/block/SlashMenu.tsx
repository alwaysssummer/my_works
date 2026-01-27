"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_PROPERTIES, PropertyType } from "@/types/property";
import { BlockType } from "@/types/blockType";

interface SlashMenuItem {
  id: string;
  icon: string;
  name: string;
  description: string;
  action: () => void;
}

interface SlashMenuProps {
  query: string;
  position: { top: number; left: number };
  onAddProperty: (propertyType: PropertyType) => void;
  onApplyType: (typeId: string) => void;
  onClose: () => void;
  blockTypes: BlockType[];
}

export function SlashMenu({
  query,
  position,
  onAddProperty,
  onApplyType,
  onClose,
  blockTypes,
}: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 메뉴 항목 생성
  const menuItems: SlashMenuItem[] = useMemo(() => {
    const items: SlashMenuItem[] = [];

    // 속성 추가 명령어
    DEFAULT_PROPERTIES.forEach((prop) => {
      items.push({
        id: prop.id,
        icon: prop.icon,
        name: prop.name,
        description: `${prop.name} 속성 추가`,
        action: () => onAddProperty(prop.type),
      });
    });

    // 타입 적용 명령어
    blockTypes.forEach((type) => {
      items.push({
        id: `type-${type.id}`,
        icon: type.icon,
        name: `타입: ${type.name}`,
        description: `${type.name} 타입 속성 일괄 적용`,
        action: () => onApplyType(type.id),
      });
    });

    return items;
  }, [onAddProperty, onApplyType, blockTypes]);

  // 검색 필터링
  const filteredItems = useMemo(() => {
    if (!query) return menuItems;
    const lowerQuery = query.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
    );
  }, [menuItems, query]);

  // 선택 인덱스 범위 제한
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex, onClose]);

  if (filteredItems.length === 0) {
    return (
      <div
        className="fixed bg-popover border border-border rounded-lg shadow-lg py-2 px-3 z-50"
        style={{ top: position.top, left: position.left }}
        role="listbox"
        aria-label="명령어 메뉴"
      >
        <p className="text-sm text-muted-foreground" role="option" aria-disabled="true">결과 없음</p>
      </div>
    );
  }

  return (
    <div
      className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="명령어 메뉴"
      aria-activedescendant={filteredItems[selectedIndex]?.id}
    >
      <div className="px-3 py-1.5 text-xs text-muted-foreground uppercase" aria-hidden="true">
        명령어
      </div>
      {filteredItems.map((item, index) => (
        <button
          key={item.id}
          id={item.id}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
            index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          <span className="text-lg" aria-hidden="true">{item.icon}</span>
          <div className="flex-1">
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">
              {item.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
