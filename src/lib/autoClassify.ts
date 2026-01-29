/**
 * GTD 자동 분류 시스템
 *
 * 속성 조합에 따라 블록을 자동 분류:
 * - 미분류: 속성 없음
 * - 학생: contact 속성
 * - 수업: person + date 속성
 * - 할일: checkbox 속성
 * - 루틴: repeat 속성
 */

import { Block } from "@/types/block";
import { PropertyType } from "@/types/property";

// GTD 분류 타입
export type ClassificationType =
  | "unclassified" // 미분류
  | "student" // 학생
  | "lesson" // 수업
  | "todo" // 할일
  | "routine"; // 루틴

// 분류 정보
export interface Classification {
  type: ClassificationType;
  label: string;
  icon: string;
  priority: number; // 정렬 우선순위 (낮을수록 상단)
}

// 분류 정의
export const CLASSIFICATIONS: Record<ClassificationType, Classification> = {
  unclassified: {
    type: "unclassified",
    label: "미분류",
    icon: "□",
    priority: 0, // 가장 위에
  },
  student: {
    type: "student",
    label: "학생",
    icon: "○",
    priority: 1,
  },
  lesson: {
    type: "lesson",
    label: "수업",
    icon: "◇",
    priority: 2,
  },
  todo: {
    type: "todo",
    label: "할일",
    icon: "☐",
    priority: 3,
  },
  routine: {
    type: "routine",
    label: "루틴",
    icon: "↻",
    priority: 4,
  },
};

// 분류 순서 (UI 표시용)
export const CLASSIFICATION_ORDER: ClassificationType[] = [
  "unclassified",
  "student",
  "lesson",
  "todo",
  "routine",
];

/**
 * 블록에 특정 속성이 있는지 확인
 */
function hasPropertyType(block: Block, type: PropertyType): boolean {
  return block.properties?.some((p) => p.propertyType === type) ?? false;
}

/**
 * 블록을 GTD 분류
 */
export function classifyBlock(block: Block): ClassificationType {
  const props = block.properties || [];

  // 속성 없음 → 미분류
  if (props.length === 0) {
    return "unclassified";
  }

  // 분류 우선순위 (먼저 매칭되면 반환)
  // 1. contact → 학생
  if (hasPropertyType(block, "contact")) {
    return "student";
  }

  // 2. person + date → 수업
  if (hasPropertyType(block, "person") && hasPropertyType(block, "date")) {
    return "lesson";
  }

  // 3. repeat → 루틴
  if (hasPropertyType(block, "repeat")) {
    return "routine";
  }

  // 4. checkbox → 할일
  if (hasPropertyType(block, "checkbox")) {
    return "todo";
  }

  // 기타 속성이 있지만 위 조건에 안 맞으면 미분류
  return "unclassified";
}

/**
 * 블록 배열을 GTD 분류별로 그룹화
 */
export function groupBlocksByClassification(
  blocks: Block[]
): Map<ClassificationType, Block[]> {
  const groups = new Map<ClassificationType, Block[]>();

  // 빈 그룹 초기화
  for (const type of CLASSIFICATION_ORDER) {
    groups.set(type, []);
  }

  // 분류
  for (const block of blocks) {
    const classification = classifyBlock(block);
    groups.get(classification)!.push(block);
  }

  return groups;
}

/**
 * 분류별 블록 수 계산
 */
export function countByClassification(
  blocks: Block[]
): Record<ClassificationType, number> {
  const counts: Record<ClassificationType, number> = {
    unclassified: 0,
    student: 0,
    lesson: 0,
    todo: 0,
    routine: 0,
  };

  for (const block of blocks) {
    const classification = classifyBlock(block);
    counts[classification]++;
  }

  return counts;
}

/**
 * 분류별 정렬 함수 (각 분류 내에서의 정렬)
 */
export function sortBlocksInClassification(
  blocks: Block[],
  classification: ClassificationType
): Block[] {
  switch (classification) {
    case "unclassified":
      // 최신순 (먼저 정리하라는 의미)
      return [...blocks].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    case "student":
      // 이름순
      return [...blocks].sort((a, b) => a.name.localeCompare(b.name, "ko"));

    case "lesson":
      // 날짜순 (가까운 순)
      return [...blocks].sort((a, b) => {
        const dateA = a.properties?.find((p) => p.propertyType === "date");
        const dateB = b.properties?.find((p) => p.propertyType === "date");
        const valA =
          dateA?.value.type === "date" ? dateA.value.date : "9999-12-31";
        const valB =
          dateB?.value.type === "date" ? dateB.value.date : "9999-12-31";
        return valA.localeCompare(valB);
      });

    case "todo":
      // 우선순위순 → 날짜순
      return [...blocks].sort((a, b) => {
        // 우선순위
        const priorityA = a.properties?.find(
          (p) => p.propertyType === "priority"
        );
        const priorityB = b.properties?.find(
          (p) => p.propertyType === "priority"
        );
        const levelOrder = { high: 0, medium: 1, low: 2, none: 3 };
        const pA =
          priorityA?.value.type === "priority"
            ? levelOrder[priorityA.value.level]
            : 3;
        const pB =
          priorityB?.value.type === "priority"
            ? levelOrder[priorityB.value.level]
            : 3;
        if (pA !== pB) return pA - pB;

        // 날짜
        const dateA = a.properties?.find((p) => p.propertyType === "date");
        const dateB = b.properties?.find((p) => p.propertyType === "date");
        const valA =
          dateA?.value.type === "date" ? dateA.value.date : "9999-12-31";
        const valB =
          dateB?.value.type === "date" ? dateB.value.date : "9999-12-31";
        return valA.localeCompare(valB);
      });

    case "routine":
      // 이름순
      return [...blocks].sort((a, b) => a.name.localeCompare(b.name, "ko"));

    default:
      return blocks;
  }
}

/**
 * 블록이 특정 분류에 속하는지 확인
 */
export function isBlockInClassification(
  block: Block,
  classification: ClassificationType
): boolean {
  return classifyBlock(block) === classification;
}

/**
 * 분류 정보 가져오기
 */
export function getClassificationInfo(
  type: ClassificationType
): Classification {
  return CLASSIFICATIONS[type];
}
