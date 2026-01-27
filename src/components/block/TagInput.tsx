"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Tag, TAG_COLORS } from "@/types/property";

// 키보드 네비게이션을 위한 상태

interface TagInputProps {
  selectedTagIds: string[];
  allTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => Tag;
}

export function TagInput({
  selectedTagIds,
  allTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));
  const availableTags = allTags.filter((tag) => !selectedTagIds.includes(tag.id));
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // 입력값과 정확히 일치하는 태그가 있는지
  const exactMatch = allTags.find(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
  );
  const showCreateOption = inputValue.trim() && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTagClick = useCallback(
    (tagId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onAddTag(tagId);
      setInputValue("");
    },
    [onAddTag]
  );

  const handleRemoveTag = useCallback(
    (tagId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveTag(tagId);
    },
    [onRemoveTag]
  );

  const handleCreateTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!inputValue.trim()) return;
      const newTag = onCreateTag(inputValue.trim(), selectedColor);
      onAddTag(newTag.id);
      setInputValue("");
      setSelectedColor(TAG_COLORS[(TAG_COLORS.indexOf(selectedColor) + 1) % TAG_COLORS.length]);
    },
    [inputValue, selectedColor, onCreateTag, onAddTag]
  );

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    inputRef.current?.focus();
  }, []);

  // 하이라이트 인덱스 범위 제한
  useEffect(() => {
    const maxIndex = filteredTags.length + (showCreateOption ? 1 : 0) - 1;
    if (highlightedIndex > maxIndex) {
      setHighlightedIndex(Math.max(0, maxIndex));
    }
  }, [filteredTags.length, showCreateOption, highlightedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      const maxIndex = filteredTags.length + (showCreateOption ? 1 : 0) - 1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, maxIndex));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && isOpen) {
        e.preventDefault();
        if (highlightedIndex < filteredTags.length) {
          // 기존 태그 선택
          onAddTag(filteredTags[highlightedIndex].id);
        } else if (showCreateOption) {
          // 새 태그 생성
          const newTag = onCreateTag(inputValue.trim(), selectedColor);
          onAddTag(newTag.id);
          setSelectedColor(TAG_COLORS[(TAG_COLORS.indexOf(selectedColor) + 1) % TAG_COLORS.length]);
        }
        setInputValue("");
        setHighlightedIndex(0);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setInputValue("");
        setHighlightedIndex(0);
      } else if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
        // 마지막 태그 제거
        onRemoveTag(selectedTags[selectedTags.length - 1].id);
      }
    },
    [inputValue, filteredTags, showCreateOption, selectedColor, selectedTags, onAddTag, onRemoveTag, onCreateTag, isOpen, highlightedIndex]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* 선택된 태그들 + 입력 필드 */}
      <div
        onClick={handleInputClick}
        className="flex flex-wrap items-center gap-1 min-h-[24px] cursor-text"
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => handleRemoveTag(tag.id, e)}
              aria-label={`${tag.name} 태그 제거`}
              className="hover:bg-white/20 rounded-full w-3 h-3 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "태그 추가..." : ""}
          aria-label="태그 검색 및 추가"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
          className="flex-1 min-w-[60px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 드롭다운 */}
      {isOpen && (filteredTags.length > 0 || showCreateOption) && (
        <div
          className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-30 min-w-[180px] max-h-[200px] overflow-y-auto"
          role="listbox"
          aria-label="태그 목록"
        >
          {/* 기존 태그 목록 */}
          {filteredTags.map((tag, index) => (
            <button
              key={tag.id}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={(e) => handleTagClick(tag.id, e)}
              className={`w-full px-3 py-1.5 text-left flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                index === highlightedIndex ? "bg-accent" : "hover:bg-accent"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden="true"
              />
              <span className="text-sm">{tag.name}</span>
            </button>
          ))}

          {/* 새 태그 생성 옵션 */}
          {showCreateOption && (
            <>
              {filteredTags.length > 0 && <div className="border-t border-border" />}
              <div
                className={`px-3 py-2 ${highlightedIndex === filteredTags.length ? "bg-accent" : ""}`}
                role="option"
                aria-selected={highlightedIndex === filteredTags.length}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">새 태그 만들기:</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {inputValue}
                  </span>
                </div>
                <fieldset>
                  <legend className="sr-only">태그 색상 선택</legend>
                  <div className="flex items-center gap-1">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedColor(color);
                        }}
                        aria-label={`색상 ${color}`}
                        aria-pressed={selectedColor === color}
                        className={`w-4 h-4 rounded-full focus-visible:ring-2 focus-visible:ring-ring ${
                          selectedColor === color ? "ring-2 ring-offset-1 ring-foreground" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </fieldset>
                <button
                  onClick={handleCreateTag}
                  className="mt-2 w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  만들기
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
