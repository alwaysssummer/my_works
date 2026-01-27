// 블록 타입 (속성 템플릿)
export interface BlockType {
  id: string;
  name: string;
  icon: string;
  color: string;
  propertyIds: string[]; // 이 타입에 포함될 속성들
  createdAt: Date;
}

// 기본 제공 타입
export const DEFAULT_BLOCK_TYPES: Omit<BlockType, "id" | "createdAt">[] = [
  {
    name: "학생",
    icon: "○",
    color: "#3b82f6",
    propertyIds: ["contact", "tag", "memo"],
  },
  {
    name: "수업",
    icon: "▢",
    color: "#22c55e",
    propertyIds: ["date", "checkbox", "person"],
  },
  {
    name: "루틴",
    icon: "↻",
    color: "#f97316",
    propertyIds: ["checkbox", "repeat"],
  },
];

// 타입 색상 옵션
export const TYPE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
];

// 타입 아이콘 옵션
export const TYPE_ICONS = [
  "○", "◎", "▢", "≡", "◇", "↻", "☆", "▣",
  "⌂", "◈", "◉", "•", "△", "▷", "✉", "☎",
];
