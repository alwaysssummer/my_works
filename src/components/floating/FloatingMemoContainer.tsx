"use client";

import { FloatingMemo } from "@/types/memo";
import { FloatingMemoItem } from "./FloatingMemoItem";

interface FloatingMemoContainerProps {
  memos: FloatingMemo[];
  onUpdate: (id: string, updates: Partial<Omit<FloatingMemo, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  onClose: (memo: FloatingMemo) => void;
  onToggleMinimize: (id: string) => void;
}

export function FloatingMemoContainer({
  memos,
  onUpdate,
  onDelete,
  onClose,
  onToggleMinimize,
}: FloatingMemoContainerProps) {
  if (memos.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {memos.map((memo) => (
        <FloatingMemoItem
          key={memo.id}
          memo={memo}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={onClose}
          onToggleMinimize={onToggleMinimize}
        />
      ))}
    </div>
  );
}
