"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Block, BlockColumn, createBlock, Top3History } from "@/types/block";
import { BlockProperty, PropertyType, createPropertyValue } from "@/types/property";
import { mockBlocks } from "@/data/mockData";

const STORAGE_KEY = "blocknote-blocks";
const TOP3_HISTORY_KEY = "blocknote-top3-history";
const MAX_INDENT = 5;
const MAX_TOP3 = 3;

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [top3History, setTop3History] = useState<Top3History[]>([]);

  // 로컬 스토리지에서 불러오기 (없으면 목업 데이터)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedHistory = localStorage.getItem(TOP3_HISTORY_KEY);

    // TOP 3 히스토리 불러오기
    if (savedHistory) {
      try {
        setTop3History(JSON.parse(savedHistory));
      } catch {
        setTop3History([]);
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          // slotIndex 마이그레이션을 위한 카운터
          let slotCounter = 0;

          let loadedBlocks = parsed.map((b: Block) => ({
            ...b,
            indent: b.indent ?? 0,
            isCollapsed: b.isCollapsed ?? false,
            isPinned: b.isPinned ?? false,
            column: b.column ?? "inbox",
            properties: (b.properties ?? []).map((p: BlockProperty) => {
              // urgent 속성에 slotIndex가 없으면 추가 (마이그레이션)
              if (p.propertyId === "urgent" && p.value.type === "urgent" && p.value.slotIndex === undefined) {
                return {
                  ...p,
                  value: {
                    ...p.value,
                    slotIndex: slotCounter++,
                  },
                };
              }
              return p;
            }),
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          }));

          // 자정 지난 TOP 3 아카이브 처리
          const today = new Date().toISOString().split("T")[0];
          const expiredTop3: { id: string; content: string; completed: boolean }[] = [];

          loadedBlocks = loadedBlocks.map((block: Block) => {
            const urgentProp = block.properties.find((p: BlockProperty) => p.propertyId === "urgent");
            if (urgentProp?.value.type === "urgent" && urgentProp.value.addedAt < today) {
              // 자정 지난 TOP 3 → 아카이브 대상
              const checkboxProp = block.properties.find((p: BlockProperty) => p.propertyId === "checkbox");
              const completed = checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;

              expiredTop3.push({
                id: block.id,
                content: block.content,
                completed,
              });

              // urgent 속성 제거
              return {
                ...block,
                properties: block.properties.filter((p: BlockProperty) => p.propertyId !== "urgent"),
              };
            }
            return block;
          });

          // 어제 날짜로 히스토리에 추가
          if (expiredTop3.length > 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            setTop3History((prev) => {
              // 같은 날짜가 있으면 병합
              const existing = prev.find((h) => h.date === yesterdayStr);
              if (existing) {
                return prev.map((h) =>
                  h.date === yesterdayStr
                    ? { ...h, blocks: [...h.blocks, ...expiredTop3] }
                    : h
                );
              }
              return [...prev, { date: yesterdayStr, blocks: expiredTop3 }];
            });
          }

          setBlocks(loadedBlocks);
        } else {
          setBlocks(mockBlocks);
        }
      } catch {
        setBlocks(mockBlocks);
      }
    } else {
      setBlocks(mockBlocks);
    }
    setIsLoaded(true);
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    }
  }, [blocks, isLoaded]);

  // TOP 3 히스토리 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(TOP3_HISTORY_KEY, JSON.stringify(top3History));
    }
  }, [top3History, isLoaded]);

  // 현재 TOP 3 블록 조회 (슬롯 인덱스 기준 정렬)
  const top3Blocks = useMemo(() => {
    const urgentBlocks = blocks.filter((block) =>
      block.properties.some((p) => p.propertyId === "urgent")
    );
    // slotIndex 기준으로 정렬
    return urgentBlocks.sort((a, b) => {
      const urgentA = a.properties.find((p) => p.propertyId === "urgent");
      const urgentB = b.properties.find((p) => p.propertyId === "urgent");
      const slotA = urgentA?.value.type === "urgent" ? urgentA.value.slotIndex : 0;
      const slotB = urgentB?.value.type === "urgent" ? urgentB.value.slotIndex : 0;
      return slotA - slotB;
    });
  }, [blocks]);

  // TOP 3에 추가 (체크박스가 없으면 자동 추가)
  const addToTop3 = useCallback((blockId: string, slotIndex?: number) => {
    setBlocks((prev) => {
      // 이미 TOP 3가 3개면 추가 불가
      const currentTop3 = prev.filter((b) =>
        b.properties.some((p) => p.propertyId === "urgent")
      );

      if (currentTop3.length >= MAX_TOP3) {
        return prev;
      }

      // slotIndex가 지정되지 않으면 빈 슬롯 중 가장 작은 인덱스 사용
      let targetSlot = slotIndex;
      if (targetSlot === undefined) {
        const usedSlots = new Set(
          currentTop3
            .map((b) => {
              const urgent = b.properties.find((p) => p.propertyId === "urgent");
              return urgent?.value.type === "urgent" ? urgent.value.slotIndex : -1;
            })
            .filter((i) => i >= 0)
        );
        for (let i = 0; i < MAX_TOP3; i++) {
          if (!usedSlots.has(i)) {
            targetSlot = i;
            break;
          }
        }
      }

      return prev.map((block) => {
        if (block.id !== blockId) return block;
        // 이미 urgent 속성이 있으면 스킵
        if (block.properties.some((p) => p.propertyId === "urgent")) return block;

        const newProperties = [...block.properties];

        // 체크박스가 없으면 추가
        if (!newProperties.some((p) => p.propertyId === "checkbox")) {
          newProperties.push({
            propertyId: "checkbox",
            value: { type: "checkbox" as const, checked: false },
          });
        }

        // urgent 속성 추가 (슬롯 인덱스 포함)
        newProperties.push({
          propertyId: "urgent",
          value: {
            type: "urgent" as const,
            addedAt: new Date().toISOString().split("T")[0],
            slotIndex: targetSlot ?? 0,
          },
        });

        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      });
    });
  }, []);

  // TOP 3에서 제거
  const removeFromTop3 = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.filter((p) => p.propertyId !== "urgent"),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 추가 (afterId 없으면 맨 위에, 있으면 해당 블록 뒤에)
  const addBlock = useCallback((afterId?: string) => {
    const newBlockId = crypto.randomUUID();

    setBlocks((prev) => {
      let inheritedIndent = 0;

      // afterId 없으면 맨 위에 추가
      if (!afterId || prev.length === 0) {
        const newBlock: Block = {
          id: newBlockId,
          content: "",
          indent: inheritedIndent,
          isCollapsed: false,
          isPinned: false,
          column: "inbox",
          properties: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [newBlock, ...prev];
      }

      const index = prev.findIndex((b) => b.id === afterId);
      if (index === -1) {
        const newBlock: Block = {
          id: newBlockId,
          content: "",
          indent: inheritedIndent,
          isCollapsed: false,
          isPinned: false,
          column: "inbox",
          properties: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [newBlock, ...prev];
      }

      inheritedIndent = prev[index].indent;
      const inheritedColumn = prev[index].column;
      const newBlock: Block = {
        id: newBlockId,
        content: "",
        indent: inheritedIndent,
        isCollapsed: false,
        isPinned: false,
        column: inheritedColumn,
        properties: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    return newBlockId;
  }, []);

  // 블록 수정
  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, content, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 블록 삭제
  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // 들여쓰기 (Tab)
  const indentBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      // 첫 번째 블록은 들여쓰기 불가
      if (index === 0) return prev;

      const block = prev[index];
      const prevBlock = prev[index - 1];

      // 이전 블록보다 최대 1단계만 더 들여쓰기 가능
      if (block.indent >= prevBlock.indent + 1) return prev;
      // 최대 들여쓰기 제한
      if (block.indent >= MAX_INDENT) return prev;

      return prev.map((b) =>
        b.id === id
          ? { ...b, indent: b.indent + 1, updatedAt: new Date() }
          : b
      );
    });
  }, []);

  // 내어쓰기 (Shift+Tab)
  const outdentBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id && b.indent > 0
          ? { ...b, indent: b.indent - 1, updatedAt: new Date() }
          : b
      )
    );
  }, []);

  // 토글 접기/펼치기
  const toggleCollapse = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, isCollapsed: !b.isCollapsed, updatedAt: new Date() }
          : b
      )
    );
  }, []);

  // 특정 블록의 하위 블록인지 확인 (접힌 블록의 하위 블록 숨기기용)
  const isChildOfCollapsed = useCallback(
    (blockIndex: number) => {
      if (blockIndex === 0) return false;

      const block = blocks[blockIndex];
      // 이전 블록들을 역순으로 확인
      for (let i = blockIndex - 1; i >= 0; i--) {
        const prevBlock = blocks[i];
        // 같은 레벨이거나 상위 레벨을 만나면
        if (prevBlock.indent < block.indent) {
          // 그 블록이 접혀있으면 숨겨야 함
          if (prevBlock.isCollapsed) return true;
          // 아니면 계속 상위로 확인
        }
        if (prevBlock.indent < block.indent - 1) {
          // 더 상위 블록에서 접힘 확인
          continue;
        }
      }
      return false;
    },
    [blocks]
  );

  // 하위 블록이 있는지 확인
  const hasChildren = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index === -1 || index === blocks.length - 1) return false;

      const block = blocks[index];
      const nextBlock = blocks[index + 1];
      return nextBlock.indent > block.indent;
    },
    [blocks]
  );

  // 이전 블록 ID 가져오기 (보이는 블록 기준)
  const getPrevBlockId = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      for (let i = index - 1; i >= 0; i--) {
        if (!isChildOfCollapsed(i)) {
          return blocks[i].id;
        }
      }
      return null;
    },
    [blocks, isChildOfCollapsed]
  );

  // 다음 블록 ID 가져오기 (보이는 블록 기준)
  const getNextBlockId = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      for (let i = index + 1; i < blocks.length; i++) {
        if (!isChildOfCollapsed(i)) {
          return blocks[i].id;
        }
      }
      return null;
    },
    [blocks, isChildOfCollapsed]
  );

  // 블록에 속성 추가
  // typeOrValue: PropertyType(문자열) 또는 PropertyValue(객체)
  const addProperty = useCallback((blockId: string, propertyId: string, typeOrValue: PropertyType | BlockProperty["value"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        // 이미 같은 속성이 있으면 추가하지 않음
        if (block.properties.some((p) => p.propertyId === propertyId)) return block;

        // typeOrValue가 문자열이면 PropertyType, 객체면 PropertyValue
        const value = typeof typeOrValue === "string"
          ? createPropertyValue(typeOrValue)
          : typeOrValue;

        const newProperty: BlockProperty = {
          propertyId,
          value,
        };
        return {
          ...block,
          properties: [...block.properties, newProperty],
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 속성 값 업데이트
  const updateProperty = useCallback((blockId: string, propertyId: string, value: BlockProperty["value"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.map((p) =>
            p.propertyId === propertyId ? { ...p, value } : p
          ),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록에서 속성 제거
  const removeProperty = useCallback((blockId: string, propertyId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.filter((p) => p.propertyId !== propertyId),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록에 타입 적용 (속성들 일괄 추가)
  const applyType = useCallback((blockId: string, propertyIds: string[], types: PropertyType[]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;

        const newProperties = [...block.properties];

        propertyIds.forEach((propertyId, index) => {
          // 이미 같은 속성이 있으면 스킵
          if (newProperties.some((p) => p.propertyId === propertyId)) return;

          newProperties.push({
            propertyId,
            value: createPropertyValue(types[index]),
          });
        });

        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 위로 이동
  const moveBlockUp = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index <= 0) return prev;

      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, []);

  // 블록 아래로 이동
  const moveBlockDown = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;

      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, []);

  // 블록 복제
  const duplicateBlock = useCallback((id: string) => {
    const newBlockId = crypto.randomUUID();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const original = prev[index];
      const duplicate: Block = {
        ...original,
        id: newBlockId,
        properties: original.properties.map((p) => ({ ...p })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, duplicate);
      return newBlocks;
    });

    return newBlockId;
  }, []);

  // 완료된 할일 일괄 삭제
  const deleteCompletedTodos = useCallback(() => {
    setBlocks((prev) =>
      prev.filter((block) => {
        const checkbox = block.properties.find((p) => p.propertyId === "checkbox");
        // 체크박스가 없거나 체크되지 않은 블록만 유지
        return !(checkbox?.value.type === "checkbox" && checkbox.value.checked);
      })
    );
  }, []);

  // 블록 고정/해제 토글
  const togglePin = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, isPinned: !block.isPinned, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 블록을 다른 열로 이동
  const moveToColumn = useCallback((id: string, column: BlockColumn) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, column, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  return {
    blocks,
    isLoaded,
    addBlock,
    updateBlock,
    deleteBlock,
    indentBlock,
    outdentBlock,
    toggleCollapse,
    hasChildren,
    isChildOfCollapsed,
    getPrevBlockId,
    getNextBlockId,
    addProperty,
    updateProperty,
    removeProperty,
    applyType,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    deleteCompletedTodos,
    togglePin,
    moveToColumn,
    // TOP 3 관련
    top3Blocks,
    top3History,
    addToTop3,
    removeFromTop3,
  };
}
