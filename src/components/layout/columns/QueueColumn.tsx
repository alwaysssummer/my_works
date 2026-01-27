"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/types/block";
import { Tag } from "@/types/property";
import { DraggableBlock } from "./DraggableBlock";

interface QueueColumnProps {
  blocks: Block[];
  allTags: Tag[];
  onOpenDetail: (id: string) => void;
}

export function QueueColumn({
  blocks,
  allTags,
  onOpenDetail,
}: QueueColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "queue" });

  // 블록을 속성별로 그룹화
  const groupedBlocks = useMemo(() => {
    const groups: {
      students: Block[];
      classes: Block[];
      todos: Block[];
      others: Block[];
    } = {
      students: [],
      classes: [],
      todos: [],
      others: [],
    };

    blocks.forEach((block) => {
      const hasContact = block.properties.some((p) => p.propertyType === "contact");
      const hasRepeat = block.properties.some((p) => p.propertyType === "repeat");
      const hasCheckbox = block.properties.some((p) => p.propertyType === "checkbox");

      if (hasContact) {
        groups.students.push(block);
      } else if (hasRepeat) {
        groups.classes.push(block);
      } else if (hasCheckbox) {
        groups.todos.push(block);
      } else {
        groups.others.push(block);
      }
    });

    return groups;
  }, [blocks]);

  const sections = [
    { key: "students", label: "○ 학생", blocks: groupedBlocks.students },
    { key: "classes", label: "▢ 수업", blocks: groupedBlocks.classes },
    { key: "todos", label: "☑ 할일", blocks: groupedBlocks.todos },
    { key: "others", label: "≡ 기타", blocks: groupedBlocks.others },
  ].filter((section) => section.blocks.length > 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[360px] h-full flex flex-col transition-colors ${
        isOver ? "bg-primary/5" : "bg-background"
      }`}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <span className="text-lg">☰</span>
          대기
          <span className="text-xs text-muted-foreground font-normal">
            ({blocks.length})
          </span>
        </h2>
      </div>

      {/* 블록 목록 */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {sections.map((section) => (
          <div key={section.key}>
            <div className="text-xs text-muted-foreground mb-2 font-medium">
              {section.label} ({section.blocks.length})
            </div>
            <div className="space-y-2">
              {section.blocks.map((block) => (
                <DraggableBlock
                  key={block.id}
                  block={block}
                  allTags={allTags}
                  onOpenDetail={onOpenDetail}
                  isCompact
                />
              ))}
            </div>
          </div>
        ))}

        {/* 빈 상태 */}
        {blocks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">분류된 블록이</p>
            <p className="text-sm">여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
