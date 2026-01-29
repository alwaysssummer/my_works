"use client";

import { useCallback } from "react";
import { useBlockActions } from "@/contexts/BlockContext";
import {
  processUnifiedInput,
  ProcessedUnifiedInput,
} from "@/lib/unifiedInputProcessor";

/**
 * 블록 생성 + 속성 추가 훅
 *
 * 통합 입력 처리 결과를 받아서:
 * 1. 블록 생성
 * 2. 파싱된 속성 자동 추가
 * 3. 백링크 처리 (TODO: Phase 3)
 */
export function useBlockCreation() {
  const { addBlock, addProperty } = useBlockActions();

  /**
   * 텍스트 입력을 처리하여 블록 생성
   */
  const createBlockFromText = useCallback(
    (
      text: string,
      options: {
        isPaste?: boolean;
        forceFullPage?: boolean;
        afterBlockId?: string;
      } = {}
    ): string | null => {
      const { isPaste = false, forceFullPage = false, afterBlockId } = options;

      // 입력 처리
      const processed = processUnifiedInput(text, isPaste, forceFullPage);

      if (!processed.name && !processed.content) {
        return null;
      }

      // 블록 생성
      const newBlockId = addBlock(afterBlockId, {
        name: processed.name,
        content: processed.content,
      });

      // 속성 추가
      addPropertiesFromParsed(newBlockId, processed);

      return newBlockId;
    },
    [addBlock]
  );

  /**
   * 파싱된 결과에서 속성 추가
   */
  const addPropertiesFromParsed = useCallback(
    (blockId: string, processed: ProcessedUnifiedInput) => {
      const { properties } = processed;

      // 1. 체크박스
      if (properties.hasCheckbox) {
        addProperty(blockId, "checkbox", "할일", {
          type: "checkbox",
          checked: false,
        });
      }

      // 2. 날짜
      if (properties.date) {
        addProperty(blockId, "date", "날짜", {
          type: "date",
          date: properties.date,
        });
      }

      // 3. 태그 (여러 개)
      if (properties.tags.length > 0) {
        addProperty(blockId, "tag", "태그", {
          type: "tag",
          tagIds: properties.tags,
        });
      }

      // 4. 우선순위
      if (properties.priority) {
        addProperty(blockId, "priority", "우선순위", {
          type: "priority",
          level: properties.priority,
        });
      }
    },
    [addProperty]
  );

  /**
   * 여러 줄 입력을 각각 별개 블록으로 생성
   */
  const createMultipleBlocksFromLines = useCallback(
    (
      text: string,
      options: {
        afterBlockId?: string;
      } = {}
    ): string[] => {
      const { afterBlockId } = options;
      const lines = text.split("\n").filter((l) => l.trim());
      const createdIds: string[] = [];

      let prevBlockId = afterBlockId;

      for (const line of lines) {
        const processed = processUnifiedInput(line.trim());

        if (!processed.name && !processed.content) {
          continue;
        }

        const newBlockId = addBlock(prevBlockId, {
          name: processed.name,
          content: processed.content,
        });

        addPropertiesFromParsed(newBlockId, processed);
        createdIds.push(newBlockId);
        prevBlockId = newBlockId;
      }

      return createdIds;
    },
    [addBlock, addPropertiesFromParsed]
  );

  /**
   * ProcessedUnifiedInput을 직접 받아서 블록 생성
   */
  const createBlockFromProcessed = useCallback(
    (
      processed: ProcessedUnifiedInput,
      options: { afterBlockId?: string } = {}
    ): string | null => {
      const { afterBlockId } = options;

      if (!processed.name && !processed.content) {
        return null;
      }

      const newBlockId = addBlock(afterBlockId, {
        name: processed.name,
        content: processed.content,
      });

      addPropertiesFromParsed(newBlockId, processed);

      return newBlockId;
    },
    [addBlock, addPropertiesFromParsed]
  );

  return {
    createBlockFromText,
    createBlockFromProcessed,
    createMultipleBlocksFromLines,
    addPropertiesFromParsed,
  };
}
