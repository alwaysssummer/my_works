"use client";

import { useCallback } from "react";
import { Block, BlockColumn } from "@/types/block";

/**
 * 블록 CRUD 관련 액션을 제공하는 훅
 * setBlocks를 받아서 블록 추가/수정/삭제 함수를 반환
 */
export function useBlockCRUD(
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) {
  // 블록 추가 (options로 name/content 지정 가능)
  const addBlock = useCallback(
    (afterId?: string, options?: { name?: string; content?: string }) => {
      const newBlockId = crypto.randomUUID();
      const initialName = options?.name || "";
      const initialContent = options?.content || "";

      setBlocks((prev) => {
        let inheritedIndent = 0;

        if (!afterId || prev.length === 0) {
          const newBlock: Block = {
            id: newBlockId,
            name: initialName,
            content: initialContent,
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
            name: initialName,
            content: initialContent,
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
          name: initialName,
          content: initialContent,
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
    },
    [setBlocks]
  );

  // 블록 수정
  const updateBlock = useCallback(
    (id: string, content: string) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, content, updatedAt: new Date() } : block
        )
      );
    },
    [setBlocks]
  );

  // 블록 삭제
  const deleteBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    },
    [setBlocks]
  );

  // 블록 이름 업데이트
  const updateBlockName = useCallback(
    (blockId: string, name: string) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, name, updatedAt: new Date() } : block
        )
      );
    },
    [setBlocks]
  );

  // 블록 위로 이동
  const moveBlockUp = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index <= 0) return prev;

        const newBlocks = [...prev];
        [newBlocks[index - 1], newBlocks[index]] = [
          newBlocks[index],
          newBlocks[index - 1],
        ];
        return newBlocks;
      });
    },
    [setBlocks]
  );

  // 블록 아래로 이동
  const moveBlockDown = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index === -1 || index >= prev.length - 1) return prev;

        const newBlocks = [...prev];
        [newBlocks[index], newBlocks[index + 1]] = [
          newBlocks[index + 1],
          newBlocks[index],
        ];
        return newBlocks;
      });
    },
    [setBlocks]
  );

  // 블록 복제
  const duplicateBlock = useCallback(
    (id: string) => {
      const newBlockId = crypto.randomUUID();

      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index === -1) return prev;

        const original = prev[index];
        const duplicate: Block = {
          ...original,
          id: newBlockId,
          properties: original.properties.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, duplicate);
        return newBlocks;
      });

      return newBlockId;
    },
    [setBlocks]
  );

  // 블록 고정/해제 토글
  const togglePin = useCallback(
    (id: string) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id
            ? { ...block, isPinned: !block.isPinned, updatedAt: new Date() }
            : block
        )
      );
    },
    [setBlocks]
  );

  // 블록을 다른 열로 이동
  const moveToColumn = useCallback(
    (id: string, column: BlockColumn) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, column, updatedAt: new Date() } : block
        )
      );
    },
    [setBlocks]
  );

  // 완료된 할일 일괄 삭제
  const deleteCompletedTodos = useCallback(() => {
    setBlocks((prev) =>
      prev.filter((block) => {
        const checkbox = block.properties.find(
          (p) => p.propertyType === "checkbox"
        );
        return !(
          checkbox?.value.type === "checkbox" && checkbox.value.checked
        );
      })
    );
  }, [setBlocks]);

  return {
    addBlock,
    updateBlock,
    deleteBlock,
    updateBlockName,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    togglePin,
    moveToColumn,
    deleteCompletedTodos,
  };
}
