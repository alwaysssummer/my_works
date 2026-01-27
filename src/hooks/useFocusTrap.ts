"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseFocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusOnClose?: boolean;
}

/**
 * 모달, 다이얼로그 등에서 포커스를 가두는 훅
 * - Tab 키로 순환 탐색
 * - ESC 키로 닫기
 * - 열릴 때 첫 요소로 포커스 이동
 * - 닫힐 때 이전 포커스 복원
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  enabled = true,
  onEscape,
  initialFocusRef,
  returnFocusOnClose = true,
}: UseFocusTrapOptions = {}) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 포커스 가능한 요소들 찾기
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'a[href]:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
      '[contenteditable="true"]:not([aria-hidden="true"])',
    ].join(", ");

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter(
      (el) =>
        el.offsetParent !== null && // 보이는 요소만
        !el.closest('[aria-hidden="true"]') // 숨겨진 조상 없음
    );
  }, []);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키 처리
      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      // Tab 키 트랩
      if (e.key === "Tab") {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        // Shift+Tab: 처음에서 마지막으로
        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // Tab: 마지막에서 처음으로
        else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
        // 컨테이너 밖에 포커스가 있으면 첫 요소로
        else if (
          containerRef.current &&
          !containerRef.current.contains(activeElement)
        ) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onEscape, getFocusableElements]);

  // 초기 포커스 설정
  useEffect(() => {
    if (!enabled) return;

    // 이전 포커스 저장
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 초기 포커스 설정
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          // 포커스 가능한 요소가 없으면 컨테이너 자체에 포커스
          containerRef.current?.focus();
        }
      }
    };

    // 렌더링 완료 후 포커스 설정
    requestAnimationFrame(setInitialFocus);

    // 클린업: 이전 포커스 복원
    return () => {
      if (returnFocusOnClose && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled, initialFocusRef, returnFocusOnClose, getFocusableElements]);

  return { containerRef, getFocusableElements };
}
