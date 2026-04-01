"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FloatingMemo } from "@/types/memo";
import { X, Minus } from "lucide-react";

const COLOR_MAP: Record<FloatingMemo["color"], { bg: string; header: string; border: string }> = {
  yellow: { bg: "bg-amber-50", header: "bg-amber-100/80", border: "border-amber-200" },
  blue:   { bg: "bg-sky-50",   header: "bg-sky-100/80",   border: "border-sky-200" },
  green:  { bg: "bg-emerald-50", header: "bg-emerald-100/80", border: "border-emerald-200" },
  pink:   { bg: "bg-pink-50",  header: "bg-pink-100/80",  border: "border-pink-200" },
};

const COLOR_DOTS: { color: FloatingMemo["color"]; cls: string }[] = [
  { color: "yellow", cls: "bg-amber-300" },
  { color: "blue",   cls: "bg-sky-300" },
  { color: "green",  cls: "bg-emerald-300" },
  { color: "pink",   cls: "bg-pink-300" },
];

interface FloatingMemoItemProps {
  memo: FloatingMemo;
  onUpdate: (id: string, updates: Partial<Omit<FloatingMemo, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  onClose: (memo: FloatingMemo) => void;
  onToggleMinimize: (id: string) => void;
}

export function FloatingMemoItem({ memo, onUpdate, onDelete, onClose, onToggleMinimize }: FloatingMemoItemProps) {
  const colors = COLOR_MAP[memo.color];
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textarea 자동 높이
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 300) + "px";
  }, []);

  useEffect(() => {
    if (!memo.minimized) adjustHeight();
  }, [memo.text, memo.minimized, adjustHeight]);

  // 드래그 시작 (mouse)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const rect = (e.currentTarget.closest("[data-memo]") as HTMLElement).getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // 드래그 시작 (touch)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      const rect = (e.currentTarget.closest("[data-memo]") as HTMLElement).getBoundingClientRect();
      dragOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    },
    []
  );

  // 드래그 이동 + 종료
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(0, Math.min(90, ((clientX - dragOffset.current.x) / vw) * 100));
      const y = Math.max(0, Math.min(85, ((clientY - dragOffset.current.y) / vh) * 100));
      onUpdate(memo.id, { position: { x, y } });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, memo.id, onUpdate]);

  const firstLine = memo.text.split("\n")[0] || "빈 메모";

  return (
    <div
      data-memo
      className={`absolute pointer-events-auto ${colors.bg} ${colors.border} border rounded-lg shadow-lg transition-shadow hover:shadow-xl`}
      style={{
        left: `${memo.position.x}%`,
        top: `${memo.position.y}%`,
        width: memo.minimized ? "180px" : "360px",
        maxWidth: "calc(100vw - 16px)",
        transform: isDragging ? "scale(1.03)" : undefined,
        zIndex: isDragging ? 100 : undefined,
      }}
    >
      {/* 헤더 — 드래그 핸들 */}
      <div
        className={`flex items-center justify-between px-2 py-1 ${colors.header} rounded-t-lg cursor-grab active:cursor-grabbing select-none`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 색상 선택 점 */}
        <div className="flex gap-1">
          {COLOR_DOTS.map((d) => (
            <button
              key={d.color}
              className={`w-3 h-3 rounded-full ${d.cls} ${
                memo.color === d.color ? "ring-1 ring-offset-1 ring-gray-400" : "opacity-50 hover:opacity-80"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(memo.id, { color: d.color });
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            className="p-0.5 text-gray-500 hover:text-gray-700 rounded"
            onClick={() => onClose(memo)}
            title="닫기 (대기에 저장)"
          >
            <Minus size={12} />
          </button>
          <button
            className="p-0.5 text-gray-500 hover:text-red-500 rounded"
            onClick={() => onDelete(memo.id)}
            title="삭제"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* 본문 */}
      {memo.minimized ? (
        <div
          className="px-2 py-1 text-xs text-gray-600 truncate cursor-pointer"
          onClick={() => onToggleMinimize(memo.id)}
        >
          {firstLine}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={memo.text}
          onChange={(e) => onUpdate(memo.id, { text: e.target.value })}
          onFocus={adjustHeight}
          className={`w-full px-2 py-1.5 text-xs leading-relaxed bg-transparent outline-none resize-none ${colors.bg}`}
          style={{ minHeight: "40px", maxHeight: "300px" }}
          placeholder="메모 입력..."
          rows={1}
        />
      )}
    </div>
  );
}
