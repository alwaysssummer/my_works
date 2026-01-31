"use client";

import { Block } from "@/types/block";
import { parseBlockContent, getBlockTitle } from "@/lib/blockParser";
import { ChevronRight, Trash2, Check } from "lucide-react";

interface MobileBlockCardProps {
  block: Block;
  time?: string;
  badge?: string;
  variant?: "default" | "lesson" | "deadline";
  onClick?: () => void;
  showCheckbox?: boolean;
  onCheckboxToggle?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
}

export function MobileBlockCard({
  block,
  time,
  badge,
  variant = "default",
  onClick,
  showCheckbox = false,
  onCheckboxToggle,
  onDelete,
}: MobileBlockCardProps) {
  const parsed = parseBlockContent(block.content);
  const checkboxProp = block.properties.find(
    (p) => p.propertyType === "checkbox"
  );
  const checked =
    checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;

  const variantStyles = {
    default: "bg-card border-border",
    lesson: "bg-blue-50 border-blue-200",
    deadline: "bg-red-50 border-red-200",
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxToggle?.(block.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(block.id);
  };

  return (
    <div
      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg border ${variantStyles[variant]} transition-all`}
    >
      {showCheckbox && (
        <button
          onClick={handleCheckboxClick}
          className="flex-shrink-0 w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-colors active:scale-95"
          style={{
            borderColor: checked ? "hsl(var(--primary))" : "hsl(var(--border))",
            backgroundColor: checked ? "hsl(var(--primary))" : "transparent",
          }}
        >
          {checked && <Check className="w-2 h-2 text-primary-foreground" />}
        </button>
      )}
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-2 text-left active:scale-[0.98] transition-all min-w-0"
      >
        {time && (
          <span className="text-xs font-mono text-blue-600 w-11 flex-shrink-0">
            {time}
          </span>
        )}
        <span
          className={`flex-1 text-sm flex items-center gap-1 truncate ${
            checked ? "line-through text-muted-foreground" : ""
          }`}
        >
          {parsed.icon && (
            <span style={{ color: parsed.color || undefined }}>{parsed.icon}</span>
          )}
          {block.name || getBlockTitle(block.content, 40)}
        </span>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full flex-shrink-0">
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors active:scale-95"
          aria-label="삭제"
        >
          <Trash2 className="w-3 h-3 text-muted-foreground/60" />
        </button>
      )}
    </div>
  );
}
