/**
 * 통합 입력 처리 유틸리티
 *
 * GTD 스타일 입력 처리:
 * - 자동 확장 (30자 이하 → 30~100자 → 100자+)
 * - 제목/본문 자동 분리
 * - 속성 파싱 (parseQuickInput 통합)
 * - 백링크 파싱 ([[블록명]])
 */

import { parseQuickInput, ParsedInput } from "./parseQuickInput";

// 입력 임계값
export const INPUT_THRESHOLDS = {
  SINGLE_LINE: 30, // 한 줄 입력 최대 길이
  EXPANDED: 100, // 확장 입력 최대 길이 (이후 전체 페이지)
  NAME_MAX: 30, // 블록 제목 최대 길이
};

// 입력 모드
export type InputMode = "single" | "expanded" | "full";

// 백링크 정보
export interface BacklinkInfo {
  raw: string; // [[원본 텍스트]]
  blockName: string; // 블록명
  displayName?: string; // 표시명 (|로 구분)
}

// 처리된 입력 결과
export interface ProcessedUnifiedInput {
  // 블록 데이터
  name: string;
  content: string; // HTML
  // 속성 정보
  properties: ParsedInput;
  // 백링크
  backlinks: BacklinkInfo[];
  // 메타데이터
  wasAutoSplit: boolean;
  suggestedMode: InputMode;
}

// 백링크 정규식: [[블록명]] 또는 [[ID|표시명]]
const BACKLINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * 백링크 파싱
 */
export function parseBacklinks(text: string): BacklinkInfo[] {
  const backlinks: BacklinkInfo[] = [];
  let match;

  while ((match = BACKLINK_REGEX.exec(text)) !== null) {
    backlinks.push({
      raw: match[0],
      blockName: match[1].trim(),
      displayName: match[2]?.trim(),
    });
  }

  return backlinks;
}

/**
 * 백링크 구문을 표시 텍스트로 변환
 */
export function replaceBacklinksWithDisplay(text: string): string {
  return text.replace(BACKLINK_REGEX, (_, blockName, displayName) => {
    return displayName?.trim() || blockName.trim();
  });
}

/**
 * 입력 모드 결정
 */
export function determineInputMode(
  text: string,
  hasShiftEnter: boolean = false
): InputMode {
  const length = text.length;
  const hasMultipleLines = text.includes("\n");

  if (hasShiftEnter) return "full";
  if (length > INPUT_THRESHOLDS.EXPANDED || hasMultipleLines) return "full";
  if (length > INPUT_THRESHOLDS.SINGLE_LINE) return "expanded";
  return "single";
}

/**
 * HTML 특수 문자 이스케이프
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 텍스트를 HTML 단락으로 변환
 */
function textToHtml(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((line) => `<p>${escapeHtml(line.trim()) || "<br>"}</p>`)
    .join("");
}

/**
 * 통합 입력 처리
 *
 * @param text 원본 입력 텍스트
 * @param isPaste 붙여넣기 여부
 * @param forceFullPage 전체 페이지 강제 여부
 */
export function processUnifiedInput(
  text: string,
  isPaste: boolean = false,
  forceFullPage: boolean = false
): ProcessedUnifiedInput {
  const trimmed = text.trim();

  // 빈 입력
  if (!trimmed) {
    return {
      name: "",
      content: "",
      properties: {
        content: "",
        tags: [],
        date: null,
        hasCheckbox: false,
        priority: null,
      },
      backlinks: [],
      wasAutoSplit: false,
      suggestedMode: "single",
    };
  }

  // 1. 백링크 파싱
  const backlinks = parseBacklinks(trimmed);

  // 2. 속성 파싱 (백링크는 그대로 유지)
  const properties = parseQuickInput(trimmed);

  // 3. 입력 모드 결정
  const mode = forceFullPage ? "full" : determineInputMode(trimmed, false);

  // 4. 백링크 제거한 순수 콘텐츠
  const cleanContent = replaceBacklinksWithDisplay(properties.content);

  // 5. name/content 분리
  const lines = cleanContent.split("\n").filter((l) => l.trim());
  const firstLine = lines[0]?.trim() || "";
  const hasMultipleLines = lines.length > 1;
  const isLong = firstLine.length > INPUT_THRESHOLDS.NAME_MAX;

  let name: string;
  let content: string;
  let wasAutoSplit = false;

  if (isPaste || hasMultipleLines || isLong) {
    // 긴 입력 또는 여러 줄: 분할 필요
    name = isLong
      ? firstLine.slice(0, INPUT_THRESHOLDS.NAME_MAX) + "…"
      : firstLine;
    content = textToHtml(cleanContent);
    wasAutoSplit = true;
  } else {
    // 짧은 단일 줄
    name = firstLine;
    content = "";
    wasAutoSplit = false;
  }

  return {
    name,
    content,
    properties,
    backlinks,
    wasAutoSplit,
    suggestedMode: mode,
  };
}

/**
 * 여러 줄 입력을 개별 블록으로 분리
 * (Inbox 스타일 - 각 줄이 별개 블록)
 */
export function splitIntoMultipleBlocks(
  text: string
): ProcessedUnifiedInput[] {
  const lines = text.split("\n").filter((l) => l.trim());

  return lines.map((line) => processUnifiedInput(line.trim()));
}
