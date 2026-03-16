// 뷰 타입
export type ViewType = "all" | "todo" | "tag" | "calendar" | "weekly" | "custom" | "dashboard" | "students" | "deadline" | "tasks";

// 탭 타입
export type TabType = "schedule" | "tasks" | "students";

export interface View {
  type: ViewType;
  tagId?: string; // 태그별 뷰일 때 선택된 태그
  date?: string; // 캘린더 뷰에서 선택된 날짜
  customViewId?: string; // 커스텀 뷰 ID
  studentId?: string; // 학생 상세 뷰일 때 선택된 학생 블록 ID
}

export const VIEW_LABELS: Record<ViewType, string> = {
  dashboard: "대시보드",
  all: "전체",
  todo: "할일",
  tag: "태그",
  calendar: "캘린더",
  weekly: "주간 시간표",
  custom: "커스텀",
  students: "학생 목록",
  deadline: "마감일",
  tasks: "할일",
};

export const VIEW_ICONS: Record<ViewType, string> = {
  dashboard: "⌂",
  all: "☰",
  todo: "☑",
  tag: "#",
  calendar: "◇",
  weekly: "▦",
  custom: "▤",
  students: "○",
  deadline: "⏰",
  tasks: "☐",
};

// 탭 ↔ ViewType 매핑
export const TAB_TO_VIEW: Record<TabType, ViewType> = {
  schedule: "weekly",
  tasks: "tasks",
  students: "students",
};

export const TAB_LABELS: Record<TabType, string> = {
  schedule: "시간표",
  tasks: "할일",
  students: "학생",
};

export const TAB_ICONS: Record<TabType, string> = {
  schedule: "▦",
  tasks: "☐",
  students: "○",
};
