"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useBlockContext } from "@/contexts/BlockContext";
import { MobileQuickInput } from "./MobileQuickInput";
import { MobileBlockCard } from "./MobileBlockCard";
import { MobileBlockDetail } from "./MobileBlockDetail";
import {
  formatDateWithWeekday,
  getKoreanNow,
  getKoreanToday,
  toKoreanDateString,
  calculateDday,
} from "@/lib/dateFormat";
import { shouldBlockAppearOnDate } from "@/lib/propertyHelpers";
import { Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";

export function MobileTodayView() {
  const { blocks, updateProperty, addProperty, addBlockWithTop3, softDeleteBlock } = useBlockContext();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [slotInputValue, setSlotInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);

  // 날짜 이동 상태
  const [dateOffset, setDateOffset] = useState(0);

  const today = getKoreanToday();

  // 선택된 날짜 (오늘 + offset)
  const selectedDate = useMemo(() => {
    if (dateOffset === 0) return today;
    const date = new Date(today);
    date.setDate(date.getDate() + dateOffset);
    return toKoreanDateString(date);
  }, [today, dateOffset]);

  const isSelectedToday = dateOffset === 0;

  // 선택된 날짜의 표시 문자열
  const selectedDateLabel = useMemo(() => {
    const date = new Date(selectedDate);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getMonth() + 1}/${date.getDate()} (${dayNames[date.getDay()]})`;
  }, [selectedDate]);

  // 화면 로드시 입력창 자동 포커스
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 슬롯 입력 모드시 포커스
  useEffect(() => {
    if (editingSlot !== null) {
      slotInputRef.current?.focus();
    }
  }, [editingSlot]);

  // 삭제되지 않은 활성 블록만 필터링
  const activeBlocks = useMemo(() => {
    return blocks.filter((b) => !b.isDeleted);
  }, [blocks]);

  // TOP 3 (urgent 속성 기반, 슬롯 인덱스 정렬)
  const top3Blocks = useMemo(() => {
    return activeBlocks
      .filter((block) =>
        block.properties.some((p) => p.propertyType === "urgent")
      )
      .sort((a, b) => {
        const urgentA = a.properties.find((p) => p.propertyType === "urgent");
        const urgentB = b.properties.find((p) => p.propertyType === "urgent");
        const slotA = urgentA?.value.type === "urgent" ? urgentA.value.slotIndex : 0;
        const slotB = urgentB?.value.type === "urgent" ? urgentB.value.slotIndex : 0;
        return slotA - slotB;
      });
  }, [activeBlocks]);

  // 선택 날짜 마감 (person 속성 없는 날짜 블록, 반복 일정 포함)
  const todayDeadlines = useMemo(() => {
    return activeBlocks.filter((block) => {
      const hasPerson = block.properties.some(
        (p) => p.propertyType === "person"
      );
      return shouldBlockAppearOnDate(block, selectedDate) && !hasPerson;
    });
  }, [activeBlocks, selectedDate]);

  // 선택 날짜 수업 (person 속성 + 날짜, 반복 일정 포함)
  const todayLessons = useMemo(() => {
    return activeBlocks
      .filter((block) => {
        const hasPerson = block.properties.some((p) => p.propertyType === "person");
        return shouldBlockAppearOnDate(block, selectedDate) && hasPerson;
      })
      .sort((a, b) => {
        const timeA = a.properties.find((p) => p.propertyType === "date")?.value;
        const timeB = b.properties.find((p) => p.propertyType === "date")?.value;
        if (timeA?.type === "date" && timeB?.type === "date") {
          return (timeA.time || "").localeCompare(timeB.time || "");
        }
        return 0;
      });
  }, [activeBlocks, selectedDate]);

  // 최근 기록 (최신순, 20개)
  const recentBlocks = useMemo(() => {
    return [...activeBlocks]
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 20);
  }, [activeBlocks]);

  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId)
    : null;

  // TOP 3 체크박스 토글
  const handleTop3Toggle = useCallback((blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const checkboxProp = block.properties.find(
      (p) => p.propertyType === "checkbox"
    );
    if (checkboxProp && checkboxProp.value.type === "checkbox") {
      updateProperty(blockId, checkboxProp.id, {
        type: "checkbox",
        checked: !checkboxProp.value.checked,
      });
    }
  }, [blocks, updateProperty]);

  // 오늘 수업 체크박스 토글
  const handleLessonCheckboxToggle = useCallback((blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
    if (checkboxProp && checkboxProp.value.type === "checkbox") {
      updateProperty(blockId, checkboxProp.id, {
        type: "checkbox",
        checked: !checkboxProp.value.checked,
      });
    } else {
      addProperty(blockId, "checkbox", "완료", { type: "checkbox", checked: true });
    }
  }, [blocks, updateProperty, addProperty]);

  // TOP 3 슬롯 입력 핸들러
  const handleSlotInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, slotIndex: number) => {
    if (e.key === "Enter" && slotInputValue.trim()) {
      e.preventDefault();
      addBlockWithTop3(slotInputValue.trim(), slotIndex);
      setSlotInputValue("");
      setEditingSlot(null);
    }
    if (e.key === "Escape") {
      setSlotInputValue("");
      setEditingSlot(null);
    }
  }, [slotInputValue, addBlockWithTop3]);

  // 슬롯 클릭 핸들러
  const handleEmptySlotClick = useCallback((index: number) => {
    setEditingSlot(index);
    setSlotInputValue("");
  }, []);

  // 삭제 핸들러
  const handleDelete = useCallback((blockId: string) => {
    softDeleteBlock(blockId);
  }, [softDeleteBlock]);

  if (selectedBlock) {
    return (
      <MobileBlockDetail
        block={selectedBlock}
        onClose={() => setSelectedBlockId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 날짜 헤더 */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {formatDateWithWeekday(getKoreanNow())}
          </h1>
        </div>
      </header>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto px-4 pt-3 pb-20 space-y-4">
        {/* TOP 3 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">★</span>
            <h2 className="text-sm font-medium">오늘의 TOP 3</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => {
              const block = top3Blocks[index];
              if (block) {
                const isChecked = block.properties.some(
                  (p) =>
                    p.propertyType === "checkbox" &&
                    p.value.type === "checkbox" &&
                    p.value.checked
                );
                return (
                  <button
                    key={block.id}
                    onClick={() => handleTop3Toggle(block.id)}
                    className={`relative p-2 rounded-lg border text-left transition-all active:scale-95 min-h-[52px] ${
                      isChecked
                        ? "bg-muted/50 border-border text-muted-foreground line-through"
                        : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-primary/50"
                        }`}
                      >
                        {isChecked && (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-medium line-clamp-2 leading-tight">
                        {block.name}
                      </span>
                    </div>
                    <div className="absolute top-0.5 right-1.5 text-[10px] text-muted-foreground">
                      {index + 1}
                    </div>
                  </button>
                );
              }
              // 빈 슬롯: 인라인 입력 또는 + 버튼
              if (editingSlot === index) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="p-2 rounded-lg border border-primary/30 bg-primary/5 min-h-[52px]"
                  >
                    <input
                      ref={slotInputRef}
                      type="text"
                      value={slotInputValue}
                      onChange={(e) => setSlotInputValue(e.target.value)}
                      onKeyDown={(e) => handleSlotInputKeyDown(e, index)}
                      onBlur={() => {
                        setEditingSlot(null);
                        setSlotInputValue("");
                      }}
                      placeholder="할 일 입력..."
                      className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                  </div>
                );
              }
              return (
                <button
                  key={`empty-${index}`}
                  onClick={() => handleEmptySlotClick(index)}
                  className="p-2 rounded-lg border border-dashed border-border/50 flex items-center justify-center min-h-[52px] hover:bg-muted/30 transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
        </section>

        {/* 일정 날짜 네비게이션 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">⏱</span>
              <h2 className="text-sm font-medium">
                {isSelectedToday ? "오늘 일정" : `${selectedDateLabel} 일정`}
              </h2>
              <span className="text-xs text-muted-foreground">
                ({todayDeadlines.length + todayLessons.length}건)
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {!isSelectedToday && (
                <button
                  onClick={() => setDateOffset(0)}
                  className="px-1.5 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  오늘
                </button>
              )}
              <button
                onClick={() => setDateOffset((prev) => prev - 1)}
                aria-label="이전 날짜"
                className="p-1 rounded hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium min-w-[60px] text-center">
                {selectedDateLabel}
              </span>
              <button
                onClick={() => setDateOffset((prev) => prev + 1)}
                aria-label="다음 날짜"
                className="p-1 rounded hover:bg-accent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 일정 없음 안내 */}
        {todayDeadlines.length === 0 && todayLessons.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {isSelectedToday ? "오늘 예정된 일정이 없어요" : `${selectedDateLabel}에 예정된 일정이 없어요`}
          </div>
        )}

        {/* 마감 */}
        {todayDeadlines.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⏰</span>
              <h2 className="text-sm font-medium">마감</h2>
              <span className="text-xs text-muted-foreground">
                ({todayDeadlines.length}건)
              </span>
            </div>
            <div className="space-y-1">
              {todayDeadlines.map((block) => {
                const dateProp = block.properties.find((p) => p.propertyType === "date");
                const dateStr = dateProp?.value.type === "date" ? dateProp.value.date : "";
                const dday = dateStr ? calculateDday(dateStr, selectedDate) : null;
                return (
                  <MobileBlockCard
                    key={block.id}
                    block={block}
                    variant="deadline"
                    badge={dday ? dday.label : "D-day"}
                    onClick={() => setSelectedBlockId(block.id)}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* 수업 */}
        {todayLessons.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">○</span>
              <h2 className="text-sm font-medium">수업</h2>
              <span className="text-xs text-muted-foreground">
                ({todayLessons.length}건)
              </span>
            </div>
            <div className="space-y-1">
              {todayLessons.map((block) => {
                const dateProp = block.properties.find(
                  (p) => p.propertyType === "date"
                );
                const time =
                  dateProp?.value.type === "date"
                    ? dateProp.value.time
                    : undefined;

                return (
                  <MobileBlockCard
                    key={block.id}
                    block={block}
                    time={time}
                    variant="lesson"
                    onClick={() => setSelectedBlockId(block.id)}
                    showCheckbox={true}
                    onCheckboxToggle={handleLessonCheckboxToggle}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* 최근 기록 */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">↻</span>
            <h2 className="text-sm font-medium">최근 기록</h2>
          </div>
          {recentBlocks.length > 0 ? (
            <div className="space-y-1">
              {recentBlocks.map((block) => (
                <MobileBlockCard
                  key={block.id}
                  block={block}
                  onClick={() => setSelectedBlockId(block.id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              아직 기록이 없어요
            </div>
          )}
        </section>
      </div>

      {/* 하단 고정 입력창 */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom">
        <MobileQuickInput ref={inputRef} autoFocus />
      </div>
    </div>
  );
}
