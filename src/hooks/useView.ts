"use client";

import { useState, useCallback } from "react";
import { View, ViewType } from "@/types/view";
import { Block } from "@/types/block";
import { CustomView } from "@/types/customView";

export function useView() {
  const [view, setView] = useState<View>({ type: "dashboard" });

  // 뷰 변경
  const changeView = useCallback(
    (type: ViewType, tagId?: string, customViewId?: string) => {
      setView({ type, tagId, customViewId });
    },
    []
  );

  // 캘린더 날짜 선택
  const selectDate = useCallback((date: string) => {
    setView({ type: "calendar", date });
  }, []);

  // 커스텀 뷰 선택
  const selectCustomView = useCallback((customViewId: string) => {
    setView({ type: "custom", customViewId });
  }, []);

  return {
    view,
    changeView,
    selectDate,
    selectCustomView,
  };
}

// 뷰에 따라 블록 필터링
export function filterBlocksByView(
  blocks: Block[],
  view: View,
  getTagsByIds: (ids: string[]) => { id: string; name: string }[],
  customViews?: CustomView[]
): Block[] {
  switch (view.type) {
    case "all":
      return blocks;

    case "tag":
      // 특정 태그가 있는 블록
      if (!view.tagId) return blocks;
      return blocks.filter((block) => {
        const tagProperty = block.properties.find((p) => p.propertyId === "tag");
        if (tagProperty?.value.type === "tag") {
          return tagProperty.value.tagIds.includes(view.tagId!);
        }
        return false;
      });

    case "calendar":
      // 선택된 날짜의 블록
      if (!view.date) {
        // 날짜가 있는 모든 블록
        return blocks.filter((block) =>
          block.properties.some((p) => p.propertyId === "date")
        );
      }
      return blocks.filter((block) => {
        const dateProperty = block.properties.find((p) => p.propertyId === "date");
        return dateProperty?.value.type === "date" && dateProperty.value.date === view.date;
      });

    case "custom":
      // 커스텀 뷰: 지정된 속성 중 하나라도 있으면 표시 (OR 조건)
      if (!view.customViewId || !customViews) return blocks;
      const customView = customViews.find((v) => v.id === view.customViewId);
      if (!customView || customView.propertyIds.length === 0) return blocks;

      return blocks.filter((block) =>
        customView.propertyIds.some((propId) =>
          block.properties.some((p) => p.propertyId === propId)
        )
      );

    default:
      return blocks;
  }
}

// 월별 블록 그룹화 (캘린더용)
export function groupBlocksByDate(blocks: Block[]): Record<string, Block[]> {
  const grouped: Record<string, Block[]> = {};

  blocks.forEach((block) => {
    const dateProperty = block.properties.find((p) => p.propertyId === "date");
    if (dateProperty?.value.type === "date" && dateProperty.value.date) {
      const date = dateProperty.value.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(block);
    }
  });

  return grouped;
}
