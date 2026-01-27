import { BlockProperty } from "./property";

// 블록이 위치하는 열
export type BlockColumn = "focus" | "queue" | "inbox";

export interface Block {
  id: string;
  content: string;
  indent: number; // 들여쓰기 레벨 (0, 1, 2, ...)
  isCollapsed: boolean; // 접힘 상태
  isPinned: boolean; // 고정 상태 (상단에 표시)
  column: BlockColumn; // 블록이 위치하는 열
  properties: BlockProperty[]; // 블록에 연결된 속성들
  createdAt: Date;
  updatedAt: Date;
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

export function createBlock(content: string = "", indent: number = 0, column: BlockColumn = "inbox"): Block {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
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
