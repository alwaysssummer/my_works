// 뷰 타입
export type ViewType = "all" | "today" | "todo" | "tag" | "calendar";

export interface View {
  type: ViewType;
  tagId?: string; // 태그별 뷰일 때 선택된 태그
  date?: string; // 캘린더 뷰에서 선택된 날짜
}

export const VIEW_LABELS: Record<ViewType, string> = {
  all: "전체",
  today: "오늘",
  todo: "할일",
  tag: "태그",
  calendar: "캘린더",
};

export const VIEW_ICONS: Record<ViewType, string> = {
  all: "📋",
  today: "☀️",
  todo: "✅",
  tag: "🏷️",
  calendar: "📅",
};
