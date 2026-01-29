"use client";

import { useMemo } from "react";
import { useBlockData } from "@/contexts/BlockContext";
import { Block } from "@/types/block";
import {
  findBacklinksTo,
  getOutboundLinks,
  BacklinkRelation,
} from "@/lib/backlinkParser";

/**
 * 백링크 훅
 *
 * 특정 블록으로 들어오는 백링크와 나가는 링크를 관리
 */
export function useBacklinks(blockId: string, blocks?: Block[]) {
  const data = useBlockData();
  const sourceBlocks = blocks ?? data.blocks;

  // 현재 블록
  const currentBlock = useMemo(() => {
    return sourceBlocks.find((b) => b.id === blockId);
  }, [sourceBlocks, blockId]);

  // 이 블록을 참조하는 블록들 (인바운드 - 역방향 링크)
  const inboundLinks = useMemo((): BacklinkRelation[] => {
    if (!currentBlock) return [];
    return findBacklinksTo(blockId, sourceBlocks);
  }, [blockId, sourceBlocks, currentBlock]);

  // 이 블록이 참조하는 블록들 (아웃바운드)
  const outboundLinks = useMemo((): BacklinkRelation[] => {
    if (!currentBlock) return [];
    return getOutboundLinks(currentBlock, sourceBlocks);
  }, [currentBlock, sourceBlocks]);

  // 인바운드 링크의 소스 블록들
  const inboundBlocks = useMemo((): Block[] => {
    return inboundLinks
      .map((link) => sourceBlocks.find((b) => b.id === link.sourceBlockId))
      .filter((b): b is Block => b !== undefined);
  }, [inboundLinks, sourceBlocks]);

  // 아웃바운드 링크의 타겟 블록들
  const outboundBlocks = useMemo((): Block[] => {
    return outboundLinks
      .map((link) => sourceBlocks.find((b) => b.id === link.targetBlockId))
      .filter((b): b is Block => b !== undefined);
  }, [outboundLinks, sourceBlocks]);

  return {
    // 관계
    inboundLinks,
    outboundLinks,
    // 블록 배열
    inboundBlocks,
    outboundBlocks,
    // 카운트
    inboundCount: inboundLinks.length,
    outboundCount: outboundLinks.length,
    // 현재 블록
    currentBlock,
  };
}

/**
 * 전체 블록의 백링크 그래프 생성
 */
export function useBacklinkGraph(blocks?: Block[]) {
  const data = useBlockData();
  const sourceBlocks = blocks ?? data.blocks;

  // 모든 블록의 백링크 관계
  const allRelations = useMemo((): BacklinkRelation[] => {
    const relations: BacklinkRelation[] = [];

    for (const block of sourceBlocks) {
      const outbound = getOutboundLinks(block, sourceBlocks);
      relations.push(...outbound);
    }

    return relations;
  }, [sourceBlocks]);

  // 블록별 인바운드 카운트
  const inboundCounts = useMemo((): Map<string, number> => {
    const counts = new Map<string, number>();

    for (const rel of allRelations) {
      const current = counts.get(rel.targetBlockId) || 0;
      counts.set(rel.targetBlockId, current + 1);
    }

    return counts;
  }, [allRelations]);

  // 가장 많이 참조되는 블록들
  const mostReferenced = useMemo((): { block: Block; count: number }[] => {
    const sorted = Array.from(inboundCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return sorted
      .map(([id, count]) => {
        const block = sourceBlocks.find((b) => b.id === id);
        return block ? { block, count } : null;
      })
      .filter((item): item is { block: Block; count: number } => item !== null);
  }, [inboundCounts, sourceBlocks]);

  return {
    allRelations,
    inboundCounts,
    mostReferenced,
    totalRelations: allRelations.length,
  };
}
