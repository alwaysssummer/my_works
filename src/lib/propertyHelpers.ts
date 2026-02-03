import { Block } from "@/types/block";
import { BlockProperty, PropertyType, Tag, TAG_COLORS } from "@/types/property";


/**
 * 속성 타입으로 블록에서 속성 찾기
 */
export function getPropertyByType(
  block: Block,
  propertyType: PropertyType
): BlockProperty | undefined {
  return block.properties.find((p) => p.propertyType === propertyType);
}

/**
 * 블록에 특정 타입의 속성이 있는지 확인
 */
export function hasPropertyType(
  block: Block,
  propertyType: PropertyType
): boolean {
  return block.properties.some((p) => p.propertyType === propertyType);
}

/**
 * 블록의 모든 속성을 타입별로 추출
 */
export function extractAllProperties(block: Block) {
  return {
    checkbox: getPropertyByType(block, "checkbox"),
    date: getPropertyByType(block, "date"),
    tag: getPropertyByType(block, "tag"),
    priority: getPropertyByType(block, "priority"),
    repeat: getPropertyByType(block, "repeat"),
    person: getPropertyByType(block, "person"),
    contact: getPropertyByType(block, "contact"),
    memo: getPropertyByType(block, "memo"),
    urgent: getPropertyByType(block, "urgent"),
    duration: getPropertyByType(block, "duration"),
  };
}

/**
 * 체크박스 속성 값 추출
 */
export function getCheckboxValue(block: Block): boolean {
  const prop = getPropertyByType(block, "checkbox");
  return prop?.value?.type === "checkbox" && prop.value.checked;
}

/**
 * 날짜 속성 값 추출
 */
export function getDateValue(block: Block): string {
  const prop = getPropertyByType(block, "date");
  return prop?.value?.type === "date" ? prop.value.date : "";
}

/**
 * 태그 ID 목록 추출
 */
export function getTagIds(block: Block): string[] {
  const prop = getPropertyByType(block, "tag");
  return prop?.value?.type === "tag" ? prop.value.tagIds : [];
}

/**
 * 우선순위 값 추출
 */
export function getPriorityLevel(block: Block): "high" | "medium" | "low" | "none" {
  const prop = getPropertyByType(block, "priority");
  return prop?.value?.type === "priority" ? prop.value.level : "none";
}

/**
 * 반복 설정 추출
 */
export function getRepeatConfig(block: Block) {
  const prop = getPropertyByType(block, "repeat");
  return prop?.value?.type === "repeat" ? prop.value.config : null;
}

/**
 * 연락처 정보 추출
 */
export function getContactInfo(block: Block): { phone: string; email: string } {
  const prop = getPropertyByType(block, "contact");
  if (prop?.value?.type === "contact") {
    return {
      phone: prop.value.phone || "",
      email: prop.value.email || "",
    };
  }
  return { phone: "", email: "" };
}

/**
 * 메모 텍스트 추출
 */
export function getMemoText(block: Block): string {
  const prop = getPropertyByType(block, "memo");
  return prop?.value?.type === "memo" ? prop.value.text : "";
}

/**
 * 긴급(TOP 3) 슬롯 인덱스 추출
 */
export function getUrgentSlot(block: Block): number | undefined {
  const prop = getPropertyByType(block, "urgent");
  return prop?.value?.type === "urgent" ? prop.value.slotIndex : undefined;
}

/**
 * 수업 시간(분) 추출
 */
export function getDurationMinutes(block: Block): number {
  const prop = getPropertyByType(block, "duration");
  return prop?.value?.type === "duration" ? prop.value.minutes : 0;
}

/**
 * 사람 연결 블록 ID 추출
 */
export function getPersonBlockIds(block: Block): string[] {
  const prop = getPropertyByType(block, "person");
  return prop?.value?.type === "person" ? prop.value.blockIds : [];
}

/**
 * 태그 이름으로 기존 태그 찾기 (대소문자 무시)
 */
export function findTagByName(allTags: Tag[], tagName: string): Tag | undefined {
  return allTags.find(
    (t) => t.name.toLowerCase() === tagName.toLowerCase()
  );
}

/**
 * 태그 찾기 또는 생성 (옵션)
 * @param allTags 전체 태그 목록
 * @param tagName 찾을 태그 이름
 * @param onCreate 태그 생성 함수 (없으면 생성하지 않음)
 * @returns 찾거나 생성된 태그, 또는 null
 */
export function findOrCreateTag(
  allTags: Tag[],
  tagName: string,
  onCreate?: (name: string, color: string) => Tag
): Tag | null {
  const existing = findTagByName(allTags, tagName);
  if (existing) return existing;

  if (onCreate) {
    const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
    return onCreate(tagName, color);
  }

  return null;
}

/**
 * 블록 내용에서 텍스트만 추출 (HTML 태그 제거)
 */
export function getBlockPlainText(block: Block): string {
  return block.content.replace(/<[^>]*>/g, "").trim();
}

/**
 * 블록이 학생인지 확인 (contact 속성 존재)
 */
export function isStudentBlock(block: Block): boolean {
  return hasPropertyType(block, "contact");
}

/**
 * 블록이 완료된 할일인지 확인
 */
export function isCompletedTodo(block: Block): boolean {
  return getCheckboxValue(block);
}

/**
 * 블록이 할일인지 확인 (체크박스 속성 존재)
 */
export function isTodoBlock(block: Block): boolean {
  return hasPropertyType(block, "checkbox");
}

/**
 * 블록이 TOP 3에 있는지 확인
 */
export function isInTop3(block: Block): boolean {
  return hasPropertyType(block, "urgent");
}

/**
 * 블록이 특정 날짜에 표시되어야 하는지 판단 (반복 일정 포함)
 * WeeklySchedule.tsx의 반복 로직과 동일한 기준 적용
 */
export function shouldBlockAppearOnDate(block: Block, dateStr: string): boolean {
  const dateProp = block.properties.find((p) => p.propertyType === "date");
  if (!dateProp || dateProp.value.type !== "date" || !dateProp.value.date) return false;

  const originalDate = dateProp.value.date;

  // 원본 날짜와 일치하면 표시
  if (originalDate === dateStr) return true;

  // 반복 설정 확인
  const repeatProp = block.properties.find((p) => p.propertyType === "repeat");
  const repeatConfig = repeatProp?.value?.type === "repeat" ? repeatProp.value.config : null;
  if (!repeatConfig || dateStr <= originalDate) return false;

  // 종료 날짜 지났으면 미표시
  if (repeatConfig.endDate && dateStr > repeatConfig.endDate) return false;

  if (repeatConfig.type === "daily") return true;

  if (repeatConfig.type === "weekly") {
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    return repeatConfig.weekdays?.includes(dayOfWeek) ?? false;
  }

  if (repeatConfig.type === "monthly") {
    const originalDay = new Date(originalDate + "T00:00:00").getDate();
    const targetDay = new Date(dateStr + "T00:00:00").getDate();
    return originalDay === targetDay;
  }

  if (repeatConfig.type === "yearly") {
    const orig = new Date(originalDate + "T00:00:00");
    const target = new Date(dateStr + "T00:00:00");
    return orig.getMonth() === target.getMonth() && orig.getDate() === target.getDate();
  }

  return false;
}
