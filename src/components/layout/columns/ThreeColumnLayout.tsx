"use client";

import { useMemo, useCallback } from "react";
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  pointerWithin,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { Block, BlockColumn } from "@/types/block";
import { Tag, PropertyType } from "@/types/property";
import { FocusColumn } from "./FocusColumn";
import { QueueColumn } from "./QueueColumn";
import { InboxColumn } from "./InboxColumn";
import { DraggableBlock } from "./DraggableBlock";
import { useState } from "react";

interface ThreeColumnLayoutProps {
  blocks: Block[];
  allTags: Tag[];
  onAddBlock: () => string;
  onUpdateBlock: (id: string, content: string) => void;
  onMoveToColumn: (id: string, column: BlockColumn) => void;
  onOpenDetail: (id: string) => void;
  onAddProperty?: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: any) => void;
  onCreateTag?: (name: string, color: string) => Tag;
}

export function ThreeColumnLayout({
  blocks,
  allTags,
  onAddBlock,
  onUpdateBlock,
  onMoveToColumn,
  onOpenDetail,
  onAddProperty,
  onCreateTag,
}: ThreeColumnLayoutProps) {
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  // 센서 설정: 8px 이동 후에만 드래그 시작 (클릭과 드래그 구분)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // 열별 블록 분리
  const focusBlocks = useMemo(
    () => blocks.filter((b) => b.column === "focus"),
    [blocks]
  );
  const queueBlocks = useMemo(
    () => blocks.filter((b) => b.column === "queue"),
    [blocks]
  );
  const inboxBlocks = useMemo(
    () => blocks.filter((b) => b.column === "inbox"),
    [blocks]
  );

  // 드래그 시작
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const block = (event.active.data.current as { block?: Block })?.block;
      if (block) {
        setActiveBlock(block);
      }
    },
    []
  );

  // 드래그 종료
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBlock(null);

      const { active, over } = event;
      if (!over) return;

      const blockId = active.id as string;
      const targetColumn = over.id as BlockColumn;

      // 유효한 열인지 확인
      if (!["focus", "queue", "inbox"].includes(targetColumn)) return;

      // 같은 열이면 무시
      const block = blocks.find((b) => b.id === blockId);
      if (block?.column === targetColumn) return;

      onMoveToColumn(blockId, targetColumn);
    },
    [blocks, onMoveToColumn]
  );

  // 포커스용 addBlock (column을 focus로)
  const handleAddFocusBlock = useCallback(() => {
    const newId = onAddBlock();
    // 새 블록은 inbox로 생성되므로, 바로 focus로 이동
    setTimeout(() => {
      onMoveToColumn(newId, "focus");
    }, 0);
    return newId;
  }, [onAddBlock, onMoveToColumn]);

  // 수집용 addBlock (기본이 inbox라서 그대로)
  const handleAddInboxBlock = useCallback(() => {
    return onAddBlock();
  }, [onAddBlock]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <FocusColumn
          blocks={focusBlocks}
          allTags={allTags}
          onAddBlock={handleAddFocusBlock}
          onUpdateBlock={onUpdateBlock}
          onOpenDetail={onOpenDetail}
          onAddProperty={onAddProperty}
          onCreateTag={onCreateTag}
        />
        <InboxColumn
          blocks={inboxBlocks}
          allTags={allTags}
          onAddBlock={handleAddInboxBlock}
          onUpdateBlock={onUpdateBlock}
          onOpenDetail={onOpenDetail}
          onAddProperty={onAddProperty}
          onCreateTag={onCreateTag}
        />
        <QueueColumn
          blocks={queueBlocks}
          allTags={allTags}
          onOpenDetail={onOpenDetail}
        />
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {activeBlock && (
          <div className="opacity-80 rotate-3">
            <DraggableBlock
              block={activeBlock}
              allTags={allTags}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
