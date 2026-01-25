"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Block } from "@/types/block";

interface SearchModalProps {
  blocks: Block[];
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockId: string) => void;
}

export function SearchModal({
  blocks,
  isOpen,
  onClose,
  onSelectBlock,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return blocks
      .filter((block) => {
        // HTML 태그 제거 후 텍스트에서 검색
        const text = block.content.replace(/<[^>]*>/g, "").toLowerCase();
        return text.includes(lowerQuery);
      })
      .slice(0, 10); // 최대 10개
  }, [blocks, query]);

  // 모달 열릴 때 포커스
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // 선택 인덱스 범위 제한
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  // 키보드 이벤트
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            onSelectBlock(searchResults[selectedIndex].id);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [searchResults, selectedIndex, onSelectBlock, onClose]
  );

  // 블록 내용 미리보기 (HTML 태그 제거)
  const getPreview = (content: string) => {
    const text = content.replace(/<[^>]*>/g, "");
    return text.length > 60 ? text.slice(0, 60) + "..." : text || "(빈 블록)";
  };

  // 검색어 하이라이트
  const highlightQuery = (text: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-2xl w-[500px] max-h-[60vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="블록 검색..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded text-muted-foreground">
              ESC
            </kbd>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              검색어를 입력하세요
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              결과 없음
            </div>
          ) : (
            <div className="py-1">
              {searchResults.map((block, index) => (
                <button
                  key={block.id}
                  onClick={() => {
                    onSelectBlock(block.id);
                    onClose();
                  }}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 ${
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="text-muted-foreground">📝</span>
                  <span className="flex-1 truncate">
                    {highlightQuery(getPreview(block.content))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단 힌트 */}
        {searchResults.length > 0 && (
          <div className="px-3 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-muted rounded">↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd>
              선택
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
