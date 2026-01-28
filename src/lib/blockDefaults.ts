/**
 * 블록 입력 처리 유틸리티
 * - 빠른 입력 시 name(제목)에 먼저 저장
 * - 긴 입력은 자동 분할
 */

export const BLOCK_INPUT_THRESHOLDS = {
  NAME_MAX_LENGTH: 30,      // name 최대 길이 (한글 기준 한 줄)
  MULTILINE_SPLIT: true,    // 줄바꿈 시 자동 분할
};

export interface ProcessedInput {
  name: string;           // 블록 제목
  content: string;        // 블록 본문 (HTML)
  wasAutoSplit: boolean;  // 분할 여부
}

/**
 * 입력 텍스트를 name/content로 분할
 *
 * 규칙:
 * - 짧은 입력 (30자 이하, 한 줄): name에 전체, content 비움
 * - 긴 입력 (30자 초과): name은 첫 30자+…, content에 전체 (HTML)
 * - 여러 줄 OR 붙여넣기: name은 첫 줄 (30자), content에 전체 (HTML)
 */
export function processBlockInput(text: string, isPaste: boolean = false): ProcessedInput {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      name: "",
      content: "",
      wasAutoSplit: false,
    };
  }

  const lines = trimmed.split("\n");
  const hasMultipleLines = lines.length > 1;
  const firstLine = lines[0].trim();
  const isLong = firstLine.length > BLOCK_INPUT_THRESHOLDS.NAME_MAX_LENGTH;

  // 여러 줄이거나 붙여넣기인 경우
  if (hasMultipleLines || isPaste) {
    // 첫 줄에서 name 추출 (30자 제한)
    const name = isLong
      ? firstLine.slice(0, BLOCK_INPUT_THRESHOLDS.NAME_MAX_LENGTH) + "…"
      : firstLine;

    // 전체 내용을 HTML로 변환
    const contentHtml = lines
      .map((line) => `<p>${escapeHtml(line.trim()) || "<br>"}</p>`)
      .join("");

    return {
      name,
      content: contentHtml,
      wasAutoSplit: true,
    };
  }

  // 단일 줄인 경우
  if (isLong) {
    // 긴 단일 줄: name은 잘라서, content에 전체
    return {
      name: firstLine.slice(0, BLOCK_INPUT_THRESHOLDS.NAME_MAX_LENGTH) + "…",
      content: `<p>${escapeHtml(firstLine)}</p>`,
      wasAutoSplit: true,
    };
  }

  // 짧은 단일 줄: name에만 저장, content 비움
  return {
    name: firstLine,
    content: "",
    wasAutoSplit: false,
  };
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
