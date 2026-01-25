"use client";

import { useState, useEffect, useCallback } from "react";
import { Block, createBlock } from "@/types/block";
import { BlockProperty, PropertyType, createPropertyValue } from "@/types/property";
import { mockBlocks } from "@/data/mockData";

const STORAGE_KEY = "blocknote-blocks";
const MAX_INDENT = 5;

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 로컬 스토리지에서 불러오기 (없으면 목업 데이터)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setBlocks(
            parsed.map((b: Block) => ({
              ...b,
              indent: b.indent ?? 0,
              isCollapsed: b.isCollapsed ?? false,
              properties: b.properties ?? [],
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
            }))
          );
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
          properties: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [newBlock, ...prev];
      }

      inheritedIndent = prev[index].indent;
      const newBlock: Block = {
        id: newBlockId,
        content: "",
        indent: inheritedIndent,
        isCollapsed: false,
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
  const addProperty = useCallback((blockId: string, propertyId: string, type: PropertyType) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        // 이미 같은 속성이 있으면 추가하지 않음
        if (block.properties.some((p) => p.propertyId === propertyId)) return block;

        const newProperty: BlockProperty = {
          propertyId,
          value: createPropertyValue(type),
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
  };
}
