import { Block } from "@/types/block";
import { Tag } from "@/types/property";
import { BlockType } from "@/types/blockType";
import { getKoreanNow, toKoreanDateString } from "@/lib/dateFormat";

// 오늘 날짜 (한국 시간)
const today = toKoreanDateString(getKoreanNow());
const tomorrow = (() => { const d = getKoreanNow(); d.setDate(d.getDate() + 1); return toKoreanDateString(d); })();
const nextWeek = (() => { const d = getKoreanNow(); d.setDate(d.getDate() + 7); return toKoreanDateString(d); })();

// 태그 목업
export const mockTags: Tag[] = [
  { id: "tag-1", name: "수업", color: "#3b82f6" },
  { id: "tag-2", name: "과제", color: "#f59e0b" },
  { id: "tag-3", name: "시험", color: "#ef4444" },
  { id: "tag-4", name: "고등부", color: "#8b5cf6" },
  { id: "tag-5", name: "중등부", color: "#10b981" },
  { id: "tag-6", name: "토익", color: "#ec4899" },
];

// 타입 목업
export const mockBlockTypes: BlockType[] = [
  {
    id: "type-1",
    name: "학생",
    icon: "○",
    color: "#3b82f6",
    propertyIds: ["contact", "tag", "memo"],
    createdAt: new Date(),
  },
  {
    id: "type-2",
    name: "수업",
    icon: "▢",
    color: "#10b981",
    propertyIds: ["date", "repeat", "tag"],
    createdAt: new Date(),
  },
  {
    id: "type-3",
    name: "할일",
    icon: "☑",
    color: "#f59e0b",
    propertyIds: ["checkbox", "date", "priority"],
    createdAt: new Date(),
  },
];

// 블록 목업
export const mockBlocks: Block[] = [
  // 포커스 열 - 오늘 집중할 것
  {
    id: "block-1",
    name: "",
    content: "<p>김민준 수능특강 3강 복습 확인</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "focus",
    properties: [
      { id: "prop-1-1", propertyType: "checkbox", name: "완료", value: { type: "checkbox", checked: false } },
      { id: "prop-1-2", propertyType: "date", name: "날짜", value: { type: "date", date: today } },
      { id: "prop-1-3", propertyType: "priority", name: "우선순위", value: { type: "priority", level: "high" } },
      { id: "prop-1-4", propertyType: "tag", name: "태그", value: { type: "tag", tagIds: ["tag-4"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-3",
    name: "",
    content: "<p>중등부 단어 시험지 출력</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "focus",
    properties: [
      { id: "prop-3-1", propertyType: "checkbox", name: "완료", value: { type: "checkbox", checked: false } },
      { id: "prop-3-2", propertyType: "date", name: "날짜", value: { type: "date", date: today } },
      { id: "prop-3-3", propertyType: "priority", name: "우선순위", value: { type: "priority", level: "medium" } },
      { id: "prop-3-4", propertyType: "tag", name: "태그", value: { type: "tag", tagIds: ["tag-5", "tag-3"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 대기 열 - 분류된 블록들
  {
    id: "block-2",
    name: "",
    content: "<p>이서연 토익 모의고사 채점</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "queue",
    properties: [
      { id: "prop-2-1", propertyType: "checkbox", name: "완료", value: { type: "checkbox", checked: true } },
      { id: "prop-2-2", propertyType: "date", name: "날짜", value: { type: "date", date: today } },
      { id: "prop-2-3", propertyType: "tag", name: "태그", value: { type: "tag", tagIds: ["tag-6"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-4",
    name: "",
    content: "<p>박지훈 문법 오답노트 확인</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "queue",
    properties: [
      { id: "prop-4-1", propertyType: "checkbox", name: "완료", value: { type: "checkbox", checked: false } },
      { id: "prop-4-2", propertyType: "date", name: "날짜", value: { type: "date", date: tomorrow } },
      { id: "prop-4-3", propertyType: "priority", name: "우선순위", value: { type: "priority", level: "low" } },
      { id: "prop-4-4", propertyType: "tag", name: "태그", value: { type: "tag", tagIds: ["tag-2", "tag-4"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 인박스 - 미분류
  {
    id: "block-5",
    name: "",
    content: "<p>다음 주 시험 범위 공지하기</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "inbox",
    properties: [
      { id: "prop-5-1", propertyType: "date", name: "날짜", value: { type: "date", date: nextWeek } },
      { id: "prop-5-2", propertyType: "tag", name: "태그", value: { type: "tag", tagIds: ["tag-3"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-6",
    name: "",
    content: "<p>새 교재 주문 확인</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "inbox",
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-7",
    name: "",
    content: "<p>학부모 상담 일정 조율</p>",
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    isDeleted: false,
    column: "inbox",
    properties: [
      { id: "prop-7-1", propertyType: "priority", name: "우선순위", value: { type: "priority", level: "high" } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
