"use client";

import { useState, useCallback, useEffect } from "react";
import { CustomView, DEFAULT_CUSTOM_VIEWS } from "@/types/customView";

const STORAGE_KEY = "blocknote-custom-views";

export function useCustomViews() {
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 로컬스토리지에서 로드
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Date 문자열을 Date 객체로 변환
        const views = parsed.map((view: any) => ({
          ...view,
          createdAt: new Date(view.createdAt),
        }));
        setCustomViews(views);
      } catch (e) {
        console.error("Failed to parse custom views:", e);
        initializeDefaultViews();
      }
    } else {
      initializeDefaultViews();
    }
    setIsLoaded(true);
  }, []);

  // 기본 뷰로 초기화
  const initializeDefaultViews = () => {
    const defaultViews: CustomView[] = DEFAULT_CUSTOM_VIEWS.map((view) => ({
      ...view,
      createdAt: new Date(),
    }));
    setCustomViews(defaultViews);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultViews));
  };

  // 로컬스토리지에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customViews));
    }
  }, [customViews, isLoaded]);

  // 뷰 생성
  const createView = useCallback(
    (name: string, icon: string, color: string, propertyIds: string[]): CustomView => {
      const newView: CustomView = {
        id: `view-${Date.now()}`,
        name,
        icon,
        color,
        propertyIds,
        createdAt: new Date(),
      };
      setCustomViews((prev) => [...prev, newView]);
      return newView;
    },
    []
  );

  // 뷰 수정
  const updateView = useCallback(
    (id: string, updates: Partial<Omit<CustomView, "id" | "createdAt">>) => {
      setCustomViews((prev) =>
        prev.map((view) =>
          view.id === id ? { ...view, ...updates } : view
        )
      );
    },
    []
  );

  // 뷰 삭제
  const deleteView = useCallback((id: string) => {
    setCustomViews((prev) => prev.filter((view) => view.id !== id));
  }, []);

  // ID로 뷰 조회
  const getViewById = useCallback(
    (id: string): CustomView | undefined => {
      return customViews.find((view) => view.id === id);
    },
    [customViews]
  );

  return {
    customViews,
    isLoaded,
    createView,
    updateView,
    deleteView,
    getViewById,
  };
}
