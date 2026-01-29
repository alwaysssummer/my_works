"use client";

import { useMemo } from "react";
import { useBlockData } from "@/contexts/BlockContext";
import { Block } from "@/types/block";
import {
  ClassificationType,
  CLASSIFICATION_ORDER,
  groupBlocksByClassification,
  sortBlocksInClassification,
  countByClassification,
  getClassificationInfo,
} from "@/lib/autoClassify";

/**
 * GTD 분류 훅
 *
 * 블록 배열을 GTD 스타일로 분류:
 * - 미분류 → 학생 → 수업 → 할일 → 루틴
 */
export function useClassification(blocks?: Block[]) {
  const data = useBlockData();

  // 직접 전달된 blocks 또는 context의 blocks 사용
  const sourceBlocks = blocks ?? data.blocks;

  // 분류별 그룹화
  const groupedBlocks = useMemo(() => {
    const groups = groupBlocksByClassification(sourceBlocks);

    // 각 그룹 내 정렬 적용
    for (const type of CLASSIFICATION_ORDER) {
      const blocks = groups.get(type) || [];
      groups.set(type, sortBlocksInClassification(blocks, type));
    }

    return groups;
  }, [sourceBlocks]);

  // 분류별 카운트
  const counts = useMemo(() => {
    return countByClassification(sourceBlocks);
  }, [sourceBlocks]);

  // 총 블록 수
  const totalCount = useMemo(() => {
    return sourceBlocks.length;
  }, [sourceBlocks]);

  // 미분류 블록 수
  const unclassifiedCount = useMemo(() => {
    return counts.unclassified;
  }, [counts]);

  // 분류 섹션 데이터 (UI 렌더링용)
  const sections = useMemo(() => {
    return CLASSIFICATION_ORDER.map((type) => ({
      type,
      info: getClassificationInfo(type),
      blocks: groupedBlocks.get(type) || [],
      count: counts[type],
    }));
  }, [groupedBlocks, counts]);

  // 빈 분류 제외한 섹션
  const nonEmptySections = useMemo(() => {
    return sections.filter((s) => s.count > 0);
  }, [sections]);

  return {
    groupedBlocks,
    counts,
    totalCount,
    unclassifiedCount,
    sections,
    nonEmptySections,
    classificationOrder: CLASSIFICATION_ORDER,
  };
}

/**
 * 특정 분류의 블록만 가져오기
 */
export function useBlocksByClassification(
  type: ClassificationType,
  blocks?: Block[]
) {
  const data = useBlockData();
  const sourceBlocks = blocks ?? data.blocks;

  const filteredBlocks = useMemo(() => {
    const groups = groupBlocksByClassification(sourceBlocks);
    const typeBlocks = groups.get(type) || [];
    return sortBlocksInClassification(typeBlocks, type);
  }, [sourceBlocks, type]);

  return filteredBlocks;
}
