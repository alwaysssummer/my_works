"use client";

import { useMemo } from "react";
import { Block } from "@/types/block";
import { Tag } from "@/types/property";
import { getTagIds } from "@/lib/propertyHelpers";

interface TagFilterChipsProps {
  blocks: Block[];
  tags: Tag[];
  activeTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  onCreateTag: (name: string, color?: string) => Tag;
}

export function TagFilterChips({
  blocks,
  tags,
  activeTagId,
  onSelectTag,
  onCreateTag,
}: TagFilterChipsProps) {
  // 블록에서 사용된 태그만 필터링 + 사용 횟수 정렬
  const usedTags = useMemo(() => {
    const tagUsage: Record<string, number> = {};
    blocks.forEach((block) => {
      const ids = getTagIds(block);
      ids.forEach((id: string) => {
        tagUsage[id] = (tagUsage[id] || 0) + 1;
      });
    });

    return tags
      .filter((tag) => tagUsage[tag.id] && tagUsage[tag.id] > 0)
      .map((tag) => ({ ...tag, usage: tagUsage[tag.id] || 0 }))
      .sort((a, b) => b.usage - a.usage);
  }, [blocks, tags]);

  if (usedTags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-background overflow-x-auto">
      {/* 전체 칩 */}
      <button
        onClick={() => onSelectTag(null)}
        className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
          activeTagId === null
            ? "bg-foreground text-background font-medium"
            : "bg-accent text-muted-foreground hover:bg-accent/80"
        }`}
      >
        전체
      </button>

      {/* 태그 칩들 */}
      {usedTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(activeTagId === tag.id ? null : tag.id)}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
            activeTagId === tag.id
              ? "font-medium"
              : "hover:opacity-80"
          }`}
          style={{
            backgroundColor: activeTagId === tag.id ? tag.color : `${tag.color}20`,
            color: activeTagId === tag.id ? "white" : tag.color,
          }}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
}
