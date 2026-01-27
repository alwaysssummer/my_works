/**
 * 빠른 입력 파싱 유틸리티
 *
 * 지원하는 구문:
 * - #태그: 태그 자동 추가 (여러 개 가능)
 * - @오늘/@내일/@모레/@다음주: 날짜 자동 추가
 * - [] 또는 /할일: 체크박스 자동 추가
 */

export interface ParsedInput {
  content: string;      // 구문 제거된 순수 텍스트
  tags: string[];       // 추출된 태그 이름들
  date: string | null;  // ISO 형식 날짜 (YYYY-MM-DD)
  hasCheckbox: boolean; // 체크박스 추가 여부
}

// 날짜 키워드와 계산 함수
const DATE_KEYWORDS: Record<string, () => string> = {
  "오늘": () => {
    return new Date().toISOString().split("T")[0];
  },
  "내일": () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  },
  "모레": () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  },
  "다음주": () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  },
  "이번주": () => {
    // 이번 주 일요일
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + (7 - day));
    return d.toISOString().split("T")[0];
  },
};

/**
 * 빠른 입력 텍스트를 파싱합니다.
 * @param text 입력 텍스트
 * @returns 파싱 결과
 */
export function parseQuickInput(text: string): ParsedInput {
  let content = text.trim();
  const tags: string[] = [];
  let date: string | null = null;
  let hasCheckbox = false;

  // 1. 체크박스 인식 ([] 또는 /할일)
  // [] 패턴 - 문자열 시작에서만
  if (content.startsWith("[]")) {
    hasCheckbox = true;
    content = content.slice(2).trim();
  }
  // /할일 패턴 - 문자열 시작에서만
  else if (content.startsWith("/할일")) {
    hasCheckbox = true;
    content = content.slice(3).trim();
  }

  // 2. 날짜 키워드 인식 (@오늘, @내일, @모레, @다음주, @이번주)
  const dateKeywords = Object.keys(DATE_KEYWORDS).join("|");
  const dateRegex = new RegExp(`@(${dateKeywords})`, "g");
  const dateMatches = content.match(dateRegex);

  if (dateMatches && dateMatches.length > 0) {
    // 첫 번째 날짜 키워드만 사용
    const keyword = dateMatches[0].slice(1); // @ 제거
    if (DATE_KEYWORDS[keyword]) {
      date = DATE_KEYWORDS[keyword]();
    }
  }
  // 모든 날짜 키워드 제거
  content = content.replace(dateRegex, "").trim();

  // 3. 태그 인식 (#태그)
  // 유니코드 문자와 숫자, 언더스코어 지원
  const tagRegex = /#([\p{L}\p{N}_]+)/gu;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];
    if (tagName && !tags.includes(tagName)) {
      tags.push(tagName);
    }
  }
  // 태그 구문 제거
  content = content.replace(tagRegex, "").trim();

  // 4. 연속된 공백 정리
  content = content.replace(/\s+/g, " ").trim();

  return {
    content,
    tags,
    date,
    hasCheckbox,
  };
}

/**
 * 파싱 결과가 속성을 가지고 있는지 확인
 */
export function hasQuickProperties(parsed: ParsedInput): boolean {
  return parsed.tags.length > 0 || parsed.date !== null || parsed.hasCheckbox;
}
