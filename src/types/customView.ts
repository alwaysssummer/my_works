// 커스텀 뷰 타입

export interface CustomView {
  id: string;
  name: string;
  icon: string;
  color: string;
  propertyIds: string[]; // OR 조건: 이 중 하나라도 있으면 표시
  createdAt: Date;
}

// 뷰 아이콘 옵션
export const VIEW_ICONS = [
  "☰", "☑", "○", "◎", "▢", "≡", "◇", "◉",
  "▣", "⌂", "◈", "△", "☆", "♡", "▲", "•",
];

// 뷰 색상 옵션
export const VIEW_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6b7280", // gray
];

// 기본 커스텀 뷰
export const DEFAULT_CUSTOM_VIEWS: Omit<CustomView, "createdAt">[] = [
  {
    id: "view-todo",
    name: "할일",
    icon: "☑",
    color: "#f59e0b",
    propertyIds: ["checkbox"],
  },
  {
    id: "view-schedule",
    name: "일정",
    icon: "◇",
    color: "#3b82f6",
    propertyIds: ["date"],
  },
];
