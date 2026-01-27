// 속성 타입
export type PropertyType =
  | "checkbox"
  | "date"
  | "tag"
  | "text"
  | "number"
  | "select"
  | "person"
  | "repeat"
  | "priority"
  | "contact"
  | "memo"
  | "urgent" // TOP 3 긴급 할일
  | "duration"; // 수업 시간 (분)

// 속성 정의
export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  icon: string;
  config?: Record<string, unknown>; // 타입별 추가 설정
}

// 블록에 연결된 속성 값
export interface BlockProperty {
  id: string;              // 고유 ID (UUID)
  propertyType: PropertyType;  // 타입 (checkbox, date 등)
  name: string;            // 사용자 지정 이름 ("완료 여부", "시작일" 등)
  value: PropertyValue;
}

// 기존 호환성을 위한 레거시 타입
export interface LegacyBlockProperty {
  propertyId: string;
  value: PropertyValue;
}

// 우선순위 레벨
export type PriorityLevel = "high" | "medium" | "low" | "none";

// 반복 타입
export type RepeatType = "daily" | "weekly" | "monthly" | "yearly";

// 반복 설정
export interface RepeatConfig {
  type: RepeatType;
  interval: number; // 매 n일/주/월/년
  endDate?: string; // 종료 날짜
  weekdays?: number[]; // 주간 반복 시 요일 (0=일요일)
}

// 속성 값 타입
export type PropertyValue =
  | { type: "checkbox"; checked: boolean }
  | { type: "date"; date: string; endDate?: string; time?: string; endTime?: string }
  | { type: "tag"; tagIds: string[] }
  | { type: "text"; text: string }
  | { type: "number"; value: number }
  | { type: "select"; selected: string }
  | { type: "person"; blockIds: string[] } // 연결된 블록 ID들
  | { type: "repeat"; config: RepeatConfig | null }
  | { type: "priority"; level: PriorityLevel }
  | { type: "contact"; phone?: string; email?: string }
  | { type: "memo"; text: string }
  | { type: "urgent"; addedAt: string; slotIndex: number } // TOP 3 추가된 날짜, 슬롯 위치 (0, 1, 2)
  | { type: "duration"; minutes: number }; // 수업 시간 (분)

// 기본 제공 속성
export const DEFAULT_PROPERTIES: PropertyDefinition[] = [
  {
    id: "checkbox",
    name: "체크박스",
    type: "checkbox",
    icon: "☐",
  },
  {
    id: "date",
    name: "날짜",
    type: "date",
    icon: "📅",
  },
  {
    id: "tag",
    name: "태그",
    type: "tag",
    icon: "🏷️",
  },
  {
    id: "priority",
    name: "우선순위",
    type: "priority",
    icon: "⚡",
  },
  {
    id: "repeat",
    name: "반복",
    type: "repeat",
    icon: "🔄",
  },
  {
    id: "person",
    name: "사람 연결",
    type: "person",
    icon: "👤",
  },
  {
    id: "contact",
    name: "연락처",
    type: "contact",
    icon: "📞",
  },
  {
    id: "memo",
    name: "메모",
    type: "memo",
    icon: "📝",
  },
  {
    id: "urgent",
    name: "긴급",
    type: "urgent",
    icon: "🔥",
  },
  {
    id: "duration",
    name: "수업 시간",
    type: "duration",
    icon: "⏱️",
  },
];

// 우선순위 라벨
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
  none: "없음",
};

// 우선순위 색상
export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#3b82f6",
  none: "#6b7280",
};

// 반복 라벨
export const REPEAT_LABELS: Record<RepeatType, string> = {
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  yearly: "매년",
};

// 태그 정의
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// 기본 태그 색상
export const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

// 속성 값 생성 헬퍼
export function createPropertyValue(type: PropertyType): PropertyValue {
  switch (type) {
    case "checkbox":
      return { type: "checkbox", checked: false };
    case "date":
      return { type: "date", date: new Date().toISOString().split("T")[0] };
    case "tag":
      return { type: "tag", tagIds: [] };
    case "text":
      return { type: "text", text: "" };
    case "number":
      return { type: "number", value: 0 };
    case "select":
      return { type: "select", selected: "" };
    case "person":
      return { type: "person", blockIds: [] };
    case "repeat":
      return { type: "repeat", config: null };
    case "priority":
      return { type: "priority", level: "none" };
    case "contact":
      return { type: "contact" };
    case "memo":
      return { type: "memo", text: "" };
    case "urgent":
      return { type: "urgent", addedAt: new Date().toISOString().split("T")[0], slotIndex: 0 };
    case "duration":
      return { type: "duration", minutes: 50 }; // 기본 50분
  }
}
