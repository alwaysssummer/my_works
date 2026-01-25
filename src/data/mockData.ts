import { Block } from "@/types/block";
import { Tag } from "@/types/property";
import { BlockType } from "@/types/blockType";

// 오늘 날짜
const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

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
    icon: "👤",
    color: "#3b82f6",
    propertyIds: ["contact", "tag", "memo"],
    createdAt: new Date(),
  },
  {
    id: "type-2",
    name: "수업",
    icon: "📚",
    color: "#10b981",
    propertyIds: ["date", "repeat", "tag"],
    createdAt: new Date(),
  },
  {
    id: "type-3",
    name: "할일",
    icon: "✅",
    color: "#f59e0b",
    propertyIds: ["checkbox", "date", "priority"],
    createdAt: new Date(),
  },
];

// 블록 목업
export const mockBlocks: Block[] = [
  // 오늘 할일들
  {
    id: "block-1",
    content: "<p>김민준 수능특강 3강 복습 확인</p>",
    indent: 0,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: false } },
      { propertyId: "date", value: { type: "date", date: today } },
      { propertyId: "priority", value: { type: "priority", level: "high" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-4"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-2",
    content: "<p>이서연 토익 모의고사 채점</p>",
    indent: 0,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: true } },
      { propertyId: "date", value: { type: "date", date: today } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-6"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-3",
    content: "<p>중등부 단어 시험지 출력</p>",
    indent: 0,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: false } },
      { propertyId: "date", value: { type: "date", date: today } },
      { propertyId: "priority", value: { type: "priority", level: "medium" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-5", "tag-3"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 학생 정보
  {
    id: "block-10",
    content: "<h2>학생 목록</h2>",
    indent: 0,
    isCollapsed: false,
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-11",
    content: "<p>김민준 (고3)</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "contact", value: { type: "contact", phone: "010-1234-5678", email: "parent1@email.com" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-4"] } },
      { propertyId: "memo", value: { type: "memo", text: "수능 영어 집중 / 매주 화목 7시 / 문법 약함" } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-12",
    content: "<p>이서연 (직장인)</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "contact", value: { type: "contact", phone: "010-2345-6789", email: "seoyeon@company.com" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-6"] } },
      { propertyId: "memo", value: { type: "memo", text: "토익 900점 목표 / 매주 토 10시 / RC 파트 집중" } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-13",
    content: "<p>박지호 (중2)</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "contact", value: { type: "contact", phone: "010-3456-7890", email: "" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-5"] } },
      { propertyId: "memo", value: { type: "memo", text: "내신 대비 / 매주 월수금 5시 / 단어 암기 필요" } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-14",
    content: "<p>최유나 (고1)</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "contact", value: { type: "contact", phone: "010-4567-8901", email: "yuna_mom@email.com" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-4"] } },
      { propertyId: "memo", value: { type: "memo", text: "영어 기초 / 매주 화목 5시 / 독해력 향상 중" } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 이번주 수업 일정
  {
    id: "block-20",
    content: "<h2>이번주 수업</h2>",
    indent: 0,
    isCollapsed: false,
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-21",
    content: "<p>박지호 - 중등 문법 Unit 5</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "date", value: { type: "date", date: today } },
      { propertyId: "repeat", value: { type: "repeat", frequency: "weekly", dayOfWeek: 1 } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-1", "tag-5"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-22",
    content: "<p>김민준 - 수능특강 4강</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "date", value: { type: "date", date: tomorrow } },
      { propertyId: "repeat", value: { type: "repeat", frequency: "weekly", dayOfWeek: 2 } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-1", "tag-4"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-23",
    content: "<p>이서연 - 토익 RC Part 7 연습</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "date", value: { type: "date", date: nextWeek } },
      { propertyId: "repeat", value: { type: "repeat", frequency: "weekly", dayOfWeek: 6 } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-1", "tag-6"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 준비할 것
  {
    id: "block-30",
    content: "<h2>준비할 자료</h2>",
    indent: 0,
    isCollapsed: false,
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-31",
    content: "<p>고등부 모의고사 프린트 준비</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: false } },
      { propertyId: "date", value: { type: "date", date: tomorrow } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-4", "tag-3"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-32",
    content: "<p>토익 단어장 업데이트</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: false } },
      { propertyId: "priority", value: { type: "priority", level: "low" } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-6"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "block-33",
    content: "<p>중등부 문법 정리 노트 만들기</p>",
    indent: 1,
    isCollapsed: false,
    properties: [
      { propertyId: "checkbox", value: { type: "checkbox", checked: true } },
      { propertyId: "tag", value: { type: "tag", tagIds: ["tag-5"] } },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
