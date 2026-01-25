import { BlockProperty } from "./property";

export interface Block {
  id: string;
  content: string;
  indent: number; // 들여쓰기 레벨 (0, 1, 2, ...)
  isCollapsed: boolean; // 접힘 상태
  properties: BlockProperty[]; // 블록에 연결된 속성들
  createdAt: Date;
  updatedAt: Date;
}

export function createBlock(content: string = "", indent: number = 0): Block {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    content,
    indent,
    isCollapsed: false,
    properties: [],
    createdAt: now,
    updatedAt: now,
  };
}
