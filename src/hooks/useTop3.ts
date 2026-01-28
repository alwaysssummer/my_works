"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Block, Top3History } from "@/types/block";
import { BlockProperty } from "@/types/property";
import { getKoreanToday, toKoreanDateString } from "@/lib/dateFormat";

const MAX_TOP3 = 3;
const TOP3_HISTORY_KEY = "blocknote-top3-history";

export function useTop3(
  blocks: Block[],
  onUpdateBlock?: (updatedBlock: Block) => void
) {
  const [top3History, setTop3History] = useState<Top3History[]>([]);

  // 히스토리 로드
  useEffect(() => {
    const saved = localStorage.getItem(TOP3_HISTORY_KEY);
    if (saved) {
      try {
        setTop3History(JSON.parse(saved));
      } catch {
        setTop3History([]);
      }
    }
  }, []);

  // 히스토리 저장
  useEffect(() => {
    localStorage.setItem(TOP3_HISTORY_KEY, JSON.stringify(top3History));
  }, [top3History]);

  // 현재 TOP 3 블록 조회 (슬롯 인덱스 기준 정렬)
  const top3Blocks = useMemo(() => {
    const urgentBlocks = blocks.filter((block) =>
      block.properties.some((p) => p.propertyType === "urgent")
    );
    return urgentBlocks.sort((a, b) => {
      const urgentA = a.properties.find((p) => p.propertyType === "urgent");
      const urgentB = b.properties.find((p) => p.propertyType === "urgent");
      const slotA = urgentA?.value.type === "urgent" ? urgentA.value.slotIndex : 0;
      const slotB = urgentB?.value.type === "urgent" ? urgentB.value.slotIndex : 0;
      return slotA - slotB;
    });
  }, [blocks]);

  // 추가 가능 여부
  const canAddToTop3 = useMemo(() => top3Blocks.length < MAX_TOP3, [top3Blocks]);

  // 다음 빈 슬롯 찾기
  const getNextAvailableSlot = useCallback((): number => {
    const usedSlots = new Set(
      top3Blocks
        .map((b) => {
          const urgent = b.properties.find((p) => p.propertyType === "urgent");
          return urgent?.value.type === "urgent" ? urgent.value.slotIndex : -1;
        })
        .filter((i) => i >= 0)
    );

    for (let i = 0; i < MAX_TOP3; i++) {
      if (!usedSlots.has(i)) {
        return i;
      }
    }
    return -1;
  }, [top3Blocks]);

  // 블록이 TOP 3인지 확인
  const isTop3 = useCallback(
    (blockId: string): boolean => {
      return top3Blocks.some((b) => b.id === blockId);
    },
    [top3Blocks]
  );

  // TOP 3에 추가 (체크박스가 없으면 자동 추가)
  const addToTop3 = useCallback(
    (blockId: string, slotIndex?: number) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      // 이미 TOP 3인 경우 무시
      if (block.properties.some((p) => p.propertyType === "urgent")) return;

      // 최대 개수 초과 시 무시
      if (top3Blocks.length >= MAX_TOP3) return;

      const targetSlot = slotIndex ?? getNextAvailableSlot();
      if (targetSlot === -1) return;

      const newProperties: BlockProperty[] = [...block.properties];

      // 체크박스가 없으면 추가
      if (!newProperties.some((p) => p.propertyType === "checkbox")) {
        newProperties.push({
          id: crypto.randomUUID(),
          propertyType: "checkbox",
          name: "체크박스",
          value: { type: "checkbox" as const, checked: false },
        });
      }

      // urgent 속성 추가
      newProperties.push({
        id: crypto.randomUUID(),
        propertyType: "urgent",
        name: "긴급",
        value: {
          type: "urgent" as const,
          addedAt: getKoreanToday(),
          slotIndex: targetSlot,
        },
      });

      const updatedBlock: Block = {
        ...block,
        properties: newProperties,
        updatedAt: new Date(),
      };

      onUpdateBlock?.(updatedBlock);
    },
    [blocks, top3Blocks, getNextAvailableSlot, onUpdateBlock]
  );

  // TOP 3에서 제거
  const removeFromTop3 = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      const updatedBlock: Block = {
        ...block,
        properties: block.properties.filter((p) => p.propertyType !== "urgent"),
        updatedAt: new Date(),
      };

      onUpdateBlock?.(updatedBlock);
    },
    [blocks, onUpdateBlock]
  );

  // 만료된 TOP 3 처리 (자정 지난 항목 아카이브, 한국 시간)
  const processExpiredTop3 = useCallback(
    (blocksToProcess: Block[]): Block[] => {
      const today = getKoreanToday();
      const expiredItems: { id: string; content: string; completed: boolean }[] = [];

      const processedBlocks = blocksToProcess.map((block) => {
        const urgentProp = block.properties.find((p) => p.propertyType === "urgent");
        if (urgentProp?.value.type === "urgent" && urgentProp.value.addedAt < today) {
          const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
          const completed = checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;

          expiredItems.push({
            id: block.id,
            content: block.content,
            completed,
          });

          return {
            ...block,
            properties: block.properties.filter((p) => p.propertyType !== "urgent"),
          };
        }
        return block;
      });

      if (expiredItems.length > 0) {
        // 한국 시간 기준 어제 날짜
        const todayDate = new Date(getKoreanToday());
        todayDate.setDate(todayDate.getDate() - 1);
        const yesterdayStr = toKoreanDateString(todayDate);

        setTop3History((prev) => {
          const existing = prev.find((h) => h.date === yesterdayStr);
          if (existing) {
            return prev.map((h) =>
              h.date === yesterdayStr
                ? { ...h, blocks: [...h.blocks, ...expiredItems] }
                : h
            );
          }
          return [...prev, { date: yesterdayStr, blocks: expiredItems }];
        });
      }

      return processedBlocks;
    },
    []
  );

  return {
    // 상태
    top3Blocks,
    top3History,
    canAddToTop3,

    // 함수
    addToTop3,
    removeFromTop3,
    isTop3,
    getNextAvailableSlot,
    processExpiredTop3,

    // 히스토리 관리
    setTop3History,
  };
}
