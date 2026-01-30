"use client";

import { Block } from "@/types/block";
import { parseBlockContent, getBlockTitle } from "@/lib/blockParser";
import { ChevronRight } from "lucide-react";

interface MobileBlockCardProps {
  block: Block;
  time?: string;
  badge?: string;
  variant?: "default" | "lesson" | "deadline";
  onClick?: () => void;
}

export function MobileBlockCard({
  block,
  time,
  badge,
  variant = "default",
  onClick,
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

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg border ${variantStyles[variant]} active:scale-[0.98] transition-all text-left`}
    >
      {time && (
        <span className="text-xs font-mono text-blue-600 w-11 flex-shrink-0">
          {time}
        </span>
      )}
      <span
        className={`flex-1 text-sm flex items-center gap-1 ${
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
  );
}
