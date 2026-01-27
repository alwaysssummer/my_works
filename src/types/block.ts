import { BlockProperty } from "./property";

// BlockProperty 재export
export type { BlockProperty };

// 블록이 위치하는 열
export type BlockColumn = "focus" | "queue" | "inbox";

export interface Block {
  id: string;
  name: string; // 블록 이름 (목록에 표시됨)
  content: string;
  indent: number; // 들여쓰기 레벨 (0, 1, 2, ...)
  isCollapsed: boolean; // 접힘 상태
  isPinned: boolean; // 고정 상태 (상단에 표시)
  column: BlockColumn; // 블록이 위치하는 열
  properties: BlockProperty[]; // 블록에 연결된 속성들
  createdAt: Date;
  updatedAt: Date;
}

// 블록 표시 이름 가져오기 (name 없으면 content 첫줄)
export function getBlockDisplayName(block: Block): string {
  if (block.name && block.name.trim()) {
    return block.name.trim();
  }
  // fallback: content의 첫 번째 줄 (HTML 태그 제거)
  const plainText = block.content.replace(/<[^>]*>/g, '').trim();
  const firstLine = plainText.split('\n')[0]?.trim();
  return firstLine || '(제목 없음)';
}

// TOP 3 히스토리 (아카이브된 기록)
export interface Top3History {
  date: string; // 아카이브된 날짜 (YYYY-MM-DD)
  blocks: {
    id: string;
    content: string;
    completed: boolean; // 완료 여부
  }[];
}

export function createBlock(content: string = "", indent: number = 0, column: BlockColumn = "inbox", name: string = ""): Block {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name,
    content,
    indent,
    isCollapsed: false,
    isPinned: false,
    column,
    properties: [],
    createdAt: now,
    updatedAt: now,
  };
}
