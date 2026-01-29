"use client";

import { useCallback } from "react";
import { Block } from "@/types/block";

const MAX_INDENT = 5;

/**
 * 블록 네비게이션 및 들여쓰기 관련 훅
 */
export function useBlockNavigation(
  blocks: Block[],
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) {
  // 들여쓰기 (Tab)
  const indentBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index === -1) return prev;
        if (index === 0) return prev;

        const block = prev[index];
        const prevBlock = prev[index - 1];

        if (block.indent >= prevBlock.indent + 1) return prev;
        if (block.indent >= MAX_INDENT) return prev;

        return prev.map((b) =>
          b.id === id
            ? { ...b, indent: b.indent + 1, updatedAt: new Date() }
            : b
        );
      });
    },
    [setBlocks]
  );

  // 내어쓰기 (Shift+Tab)
  const outdentBlock = useCallback(
    (id: string) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === id && b.indent > 0
            ? { ...b, indent: b.indent - 1, updatedAt: new Date() }
            : b
        )
      );
    },
    [setBlocks]
  );

  // 토글 접기/펼치기
  const toggleCollapse = useCallback(
    (id: string) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, isCollapsed: !b.isCollapsed, updatedAt: new Date() }
            : b
        )
      );
    },
    [setBlocks]
  );

  // 특정 블록의 하위 블록인지 확인
  const isChildOfCollapsed = useCallback(
    (blockIndex: number) => {
      if (blockIndex === 0) return false;

      const block = blocks[blockIndex];
      for (let i = blockIndex - 1; i >= 0; i--) {
        const prevBlock = blocks[i];
        if (prevBlock.indent < block.indent) {
          if (prevBlock.isCollapsed) return true;
        }
        if (prevBlock.indent < block.indent - 1) {
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

  // 이전 블록 ID 가져오기
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

  // 다음 블록 ID 가져오기
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

  return {
    indentBlock,
    outdentBlock,
    toggleCollapse,
    isChildOfCollapsed,
    hasChildren,
    getPrevBlockId,
    getNextBlockId,
  };
}
