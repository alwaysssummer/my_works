/**
 * 백링크 파서
 *
 * [[블록명]] 또는 [[ID|표시명]] 형식의 링크를 파싱
 */

import { Block } from "@/types/block";

// 백링크 정규식
export const BACKLINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// 백링크 정보
export interface BacklinkReference {
  raw: string; // 원본 텍스트 [[...]]
  target: string; // 블록명 또는 ID
  displayName?: string; // 표시명 (|로 구분)
  targetBlockId?: string; // 매칭된 블록 ID (resolve 후)
}

// 백링크 관계
export interface BacklinkRelation {
  sourceBlockId: string; // 링크를 포함하는 블록
  targetBlockId: string; // 링크되는 블록
  displayName?: string; // 표시명
}

/**
 * 텍스트에서 백링크 파싱
 */
export function parseBacklinks(text: string): BacklinkReference[] {
  const backlinks: BacklinkReference[] = [];
  let match;

  // 정규식 상태 초기화
  const regex = new RegExp(BACKLINK_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    backlinks.push({
      raw: match[0],
      target: match[1].trim(),
      displayName: match[2]?.trim(),
    });
  }

  return backlinks;
}

/**
 * 블록명 또는 ID로 블록 찾기
 */
export function resolveBacklink(
  target: string,
  blocks: Block[]
): Block | undefined {
  // 1. ID로 먼저 찾기
  const byId = blocks.find((b) => b.id === target);
  if (byId) return byId;

  // 2. 이름으로 찾기 (정확히 일치)
  const byName = blocks.find(
    (b) => b.name.toLowerCase() === target.toLowerCase()
  );
  if (byName) return byName;

  // 3. 이름으로 찾기 (부분 일치)
  const byPartialName = blocks.find((b) =>
    b.name.toLowerCase().includes(target.toLowerCase())
  );
  if (byPartialName) return byPartialName;

  return undefined;
}

/**
 * 백링크 참조 해결 (블록 ID 매핑)
 */
export function resolveBacklinks(
  references: BacklinkReference[],
  blocks: Block[]
): BacklinkReference[] {
  return references.map((ref) => {
    const block = resolveBacklink(ref.target, blocks);
    return {
      ...ref,
      targetBlockId: block?.id,
    };
  });
}

/**
 * 특정 블록을 참조하는 모든 블록 찾기 (역방향 링크)
 */
export function findBacklinksTo(
  targetBlockId: string,
  blocks: Block[]
): BacklinkRelation[] {
  const relations: BacklinkRelation[] = [];
  const targetBlock = blocks.find((b) => b.id === targetBlockId);

  if (!targetBlock) return relations;

  for (const block of blocks) {
    if (block.id === targetBlockId) continue;

    // 블록의 name과 content에서 백링크 파싱
    const textToSearch = `${block.name} ${block.content}`;
    const refs = parseBacklinks(textToSearch);

    for (const ref of refs) {
      // 블록명 또는 ID가 타겟과 일치하는지 확인
      const isMatch =
        ref.target.toLowerCase() === targetBlock.name.toLowerCase() ||
        ref.target === targetBlockId;

      if (isMatch) {
        relations.push({
          sourceBlockId: block.id,
          targetBlockId: targetBlockId,
          displayName: ref.displayName,
        });
      }
    }
  }

  return relations;
}

/**
 * 블록이 특정 블록을 참조하는지 확인
 */
export function hasBacklinkTo(
  sourceBlock: Block,
  targetBlockId: string,
  blocks: Block[]
): boolean {
  const targetBlock = blocks.find((b) => b.id === targetBlockId);
  if (!targetBlock) return false;

  const textToSearch = `${sourceBlock.name} ${sourceBlock.content}`;
  const refs = parseBacklinks(textToSearch);

  return refs.some(
    (ref) =>
      ref.target.toLowerCase() === targetBlock.name.toLowerCase() ||
      ref.target === targetBlockId
  );
}

/**
 * 백링크 구문을 표시 텍스트로 변환
 */
export function replaceBacklinksWithDisplay(text: string): string {
  return text.replace(BACKLINK_REGEX, (_, target, displayName) => {
    return displayName?.trim() || target.trim();
  });
}

/**
 * 백링크 구문을 링크 HTML로 변환
 */
export function replaceBacklinksWithLinks(
  text: string,
  blocks: Block[]
): string {
  return text.replace(BACKLINK_REGEX, (match, target, displayName) => {
    const block = resolveBacklink(target, blocks);
    const label = displayName?.trim() || target.trim();

    if (block) {
      return `<a href="#block-${block.id}" class="backlink" data-block-id="${block.id}">${label}</a>`;
    }

    // 매칭 안 됨: 빨간색으로 표시
    return `<span class="backlink-unresolved">${label}</span>`;
  });
}

/**
 * 블록의 모든 아웃바운드 링크 수집
 */
export function getOutboundLinks(
  block: Block,
  blocks: Block[]
): BacklinkRelation[] {
  const relations: BacklinkRelation[] = [];
  const textToSearch = `${block.name} ${block.content}`;
  const refs = parseBacklinks(textToSearch);

  for (const ref of refs) {
    const targetBlock = resolveBacklink(ref.target, blocks);
    if (targetBlock) {
      relations.push({
        sourceBlockId: block.id,
        targetBlockId: targetBlock.id,
        displayName: ref.displayName,
      });
    }
  }

  return relations;
}
