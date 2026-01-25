"use client";

import { useState, useCallback, useMemo } from "react";
import { View, ViewType } from "@/types/view";
import { Block } from "@/types/block";

export function useView() {
  const [view, setView] = useState<View>({ type: "all" });

  // 뷰 변경
  const changeView = useCallback((type: ViewType, tagId?: string) => {
    setView({ type, tagId });
  }, []);

  // 캘린더 날짜 선택
  const selectDate = useCallback((date: string) => {
    setView({ type: "calendar", date });
  }, []);

  return {
    view,
    changeView,
    selectDate,
  };
}

// 뷰에 따라 블록 필터링
export function filterBlocksByView(
  blocks: Block[],
  view: View,
  getTagsByIds: (ids: string[]) => { id: string; name: string }[]
): Block[] {
  const today = new Date().toISOString().split("T")[0];

  switch (view.type) {
    case "all":
      return blocks;

    case "today":
      // 오늘 날짜인 블록 + 미완료 체크박스 블록
      return blocks.filter((block) => {
        const dateProperty = block.properties.find((p) => p.propertyId === "date");
        const checkboxProperty = block.properties.find((p) => p.propertyId === "checkbox");

        // 오늘 날짜인 블록
        if (dateProperty?.value.type === "date" && dateProperty.value.date === today) {
          return true;
        }

        // 미완료 체크박스가 있고, 날짜가 오늘 이전인 블록 (오버듀)
        if (checkboxProperty?.value.type === "checkbox" && !checkboxProperty.value.checked) {
          if (dateProperty?.value.type === "date" && dateProperty.value.date <= today) {
            return true;
          }
        }

        return false;
      });

    case "todo":
      // 체크박스가 있는 블록
      return blocks.filter((block) =>
        block.properties.some((p) => p.propertyId === "checkbox")
      );

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
