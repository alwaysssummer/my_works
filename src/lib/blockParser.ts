/**
 * 블록 content에서 제목, 카테고리, 본문을 추출하는 유틸리티
 * - 저장 구조 변경 없이 렌더링/로직에서 활용
 * - 실시간 계산으로 content와 항상 동기화
 */

// 미리 정의된 카테고리 (첫 단어로 인식)
export const BLOCK_CATEGORIES = {
  학생: { icon: "○", color: "#3b82f6" },
  수업: { icon: "▢", color: "#22c55e" },
  행사: { icon: "◇", color: "#a855f7" },
  회의: { icon: "⇌", color: "#f97316" },
  메모: { icon: "≡", color: "#6b7280" },
  할일: { icon: "☑", color: "#ef4444" },
  일정: { icon: "◇", color: "#0ea5e9" },
  프로젝트: { icon: "▤", color: "#8b5cf6" },
  아이디어: { icon: "◈", color: "#eab308" },
} as const;

export type BlockCategory = keyof typeof BLOCK_CATEGORIES;

export interface ParsedBlock {
  category: BlockCategory | null;  // 첫 단어가 카테고리면 추출
  title: string;                   // 제목 (카테고리 제외한 첫 줄)
  body: string;                    // 본문 (첫 줄 제외)
  firstLine: string;               // 첫 줄 전체
  icon: string | null;             // 카테고리 아이콘
  color: string | null;            // 카테고리 색상
}

/**
 * HTML content에서 텍스트만 추출
 */
export function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    // SSR에서는 간단한 정규식 사용
    return html.replace(/<[^>]*>/g, "").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/**
 * 블록 content 파싱
 */
export function parseBlockContent(content: string): ParsedBlock {
  const text = stripHtml(content);
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      category: null,
      title: "",
      body: "",
      firstLine: "",
      icon: null,
      color: null,
    };
  }

  const firstLine = lines[0].trim();
  const body = lines.slice(1).join("\n").trim();

  // 첫 단어가 카테고리인지 확인
  const firstWord = firstLine.split(/\s+/)[0];
  const categoryKeys = Object.keys(BLOCK_CATEGORIES) as BlockCategory[];
  const matchedCategory = categoryKeys.find(
    (cat) => cat === firstWord || cat.toLowerCase() === firstWord.toLowerCase()
  );

  if (matchedCategory) {
    // 카테고리 발견 → 카테고리 제외한 나머지가 제목
    const titleWithoutCategory = firstLine.slice(firstWord.length).trim();
    const categoryInfo = BLOCK_CATEGORIES[matchedCategory];

    return {
      category: matchedCategory,
      title: titleWithoutCategory || matchedCategory, // 카테고리만 있으면 카테고리가 제목
      body,
      firstLine,
      icon: categoryInfo.icon,
      color: categoryInfo.color,
    };
  }

  // 카테고리 없음 → 첫 줄 전체가 제목
  return {
    category: null,
    title: firstLine,
    body,
    firstLine,
    icon: null,
    color: null,
  };
}

/**
 * 블록에서 표시용 제목 가져오기 (짧은 버전)
 */
export function getBlockTitle(content: string, maxLength: number = 50): string {
  const parsed = parseBlockContent(content);
  const title = parsed.title || "내용 없음";

  if (title.length > maxLength) {
    return title.slice(0, maxLength) + "...";
  }
  return title;
}

/**
 * 블록에서 카테고리 아이콘 가져오기
 */
export function getBlockIcon(content: string): string | null {
  const parsed = parseBlockContent(content);
  return parsed.icon;
}

/**
 * 블록 카테고리별로 그룹핑
 */
export function groupBlocksByCategory<T extends { content: string }>(
  blocks: T[]
): Record<BlockCategory | "기타", T[]> {
  const groups: Record<string, T[]> = { 기타: [] };

  // 카테고리 초기화
  for (const cat of Object.keys(BLOCK_CATEGORIES)) {
    groups[cat] = [];
  }

  for (const block of blocks) {
    const parsed = parseBlockContent(block.content);
    if (parsed.category) {
      groups[parsed.category].push(block);
    } else {
      groups["기타"].push(block);
    }
  }

  return groups as Record<BlockCategory | "기타", T[]>;
}

/**
 * 카테고리로 블록 필터링
 */
export function filterBlocksByCategory<T extends { content: string }>(
  blocks: T[],
  category: BlockCategory | null
): T[] {
  if (!category) return blocks;

  return blocks.filter((block) => {
    const parsed = parseBlockContent(block.content);
    return parsed.category === category;
  });
}
