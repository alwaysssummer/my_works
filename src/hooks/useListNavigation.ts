"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseListNavigationProps {
  items: { id: string }[];
  onSelect: (id: string) => void;
  enabled?: boolean;
}

/**
 * 목록 키보드 탐색 훅
 * - ↑/k: 이전 항목으로 포커스 이동
 * - ↓/j: 다음 항목으로 포커스 이동
 * - Enter: 포커스된 항목 선택
 * - Escape: 선택 해제
 */
export function useListNavigation({
  items,
  onSelect,
  enabled = true,
}: UseListNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // 현재 포커스된 항목의 ID
  const focusedId = focusedIndex >= 0 ? items[focusedIndex]?.id : null;

  // 입력 중인지 확인
  const isTyping = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === "input" || tagName === "textarea" || tagName === "select";
    const isEditable = activeElement.getAttribute("contenteditable") === "true";

    return isInput || isEditable;
  }, []);

  // 포커스된 항목이 화면에 보이도록 스크롤
  const scrollToFocusedItem = useCallback((index: number) => {
    if (!listRef.current) return;

    const container = listRef.current;
    const items = container.querySelectorAll("[data-list-item]");
    const item = items[index] as HTMLElement;

    if (item) {
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  // 포커스 인덱스 변경 시 스크롤
  useEffect(() => {
    if (focusedIndex >= 0) {
      scrollToFocusedItem(focusedIndex);
    }
  }, [focusedIndex, scrollToFocusedItem]);

  // 아이템 목록이 변경되면 포커스 인덱스 조정
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items.length, focusedIndex]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중이면 무시
      if (isTyping()) return;

      switch (e.key) {
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setFocusedIndex((i) => {
            // 처음 진입 시 마지막 항목, 아니면 이전 항목
            if (i === -1) return items.length - 1;
            return Math.max(0, i - 1);
          });
          break;

        case "ArrowDown":
        case "j":
          e.preventDefault();
          setFocusedIndex((i) => {
            // 처음 진입 시 첫 항목, 아니면 다음 항목
            if (i === -1) return 0;
            return Math.min(items.length - 1, i + 1);
          });
          break;

        case "Enter":
          if (focusedId) {
            e.preventDefault();
            onSelect(focusedId);
          }
          break;

        case "Escape":
          e.preventDefault();
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, focusedId, onSelect, enabled, isTyping]);

  // 포커스 초기화 함수
  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  return {
    focusedIndex,
    focusedId,
    setFocusedIndex,
    resetFocus,
    listRef,
  };
}
