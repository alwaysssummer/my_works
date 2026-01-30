"use client";

import { useState, useEffect } from "react";
import { Block } from "@/types/block";
import { useBlockContext } from "@/contexts/BlockContext";
import { parseBlockContent, getBlockTitle } from "@/lib/blockParser";
import { formatRelativeDate } from "@/lib/dateFormat";
import { ArrowLeft, Trash2, Check } from "lucide-react";

interface MobileBlockDetailProps {
  block: Block;
  onClose: () => void;
}

export function MobileBlockDetail({ block, onClose }: MobileBlockDetailProps) {
  const { updateBlock, updateBlockName, deleteBlock, updatePropertyByType } =
    useBlockContext();
  const [name, setName] = useState(block.name || "");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setName(block.name || "");
  }, [block.id, block.name]);

  const parsed = parseBlockContent(block.content);

  const checkboxProp = block.properties.find(
    (p) => p.propertyType === "checkbox"
  );
  const isChecked =
    checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;

  const dateProp = block.properties.find((p) => p.propertyType === "date");
  const dateValue = dateProp?.value.type === "date" ? dateProp.value : null;

  const tagProp = block.properties.find((p) => p.propertyType === "tag");
  const tagIds =
    tagProp?.value.type === "tag" ? tagProp.value.tagIds : [];

  const handleNameBlur = () => {
    if (name !== block.name) {
      updateBlockName(block.id, name);
    }
  };

  const handleToggleCheckbox = () => {
    if (checkboxProp) {
      updatePropertyByType(block.id, "checkbox", {
        type: "checkbox",
        checked: !isChecked,
      });
    }
  };

  const handleDelete = () => {
    if (isDeleting) {
      deleteBlock(block.id);
      onClose();
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-muted-foreground active:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로</span>
        </button>
        <button
          onClick={handleDelete}
          className={`p-2 rounded-lg transition-colors ${
            isDeleting
              ? "bg-red-500 text-white"
              : "text-muted-foreground active:text-red-500"
          }`}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 space-y-6">
        {/* 제목 */}
        <div className="flex items-start gap-3">
          {checkboxProp && (
            <button
              onClick={handleToggleCheckbox}
              className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isChecked
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground"
              }`}
            >
              {isChecked && <Check className="w-4 h-4" />}
            </button>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="제목 없음"
            className={`flex-1 text-xl font-semibold bg-transparent border-none outline-none ${
              isChecked ? "line-through text-muted-foreground" : ""
            }`}
          />
        </div>

        {/* 속성 */}
        <div className="space-y-3">
          {dateValue && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-16">날짜</span>
              <span>
                {dateValue.date}
                {dateValue.time && ` ${dateValue.time}`}
              </span>
            </div>
          )}

          {tagIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-16">태그</span>
              <div className="flex gap-1 flex-wrap">
                {tagIds.map((tagId) => (
                  <span
                    key={tagId}
                    className="px-2 py-0.5 rounded-full bg-muted text-xs"
                  >
                    {tagId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 본문 */}
        {block.content && (
          <div className="pt-4 border-t border-border">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        )}

        {/* 메타 정보 */}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground">
          <p>생성: {formatRelativeDate(block.createdAt)}</p>
          {block.updatedAt && block.updatedAt !== block.createdAt && (
            <p>수정: {formatRelativeDate(block.updatedAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
