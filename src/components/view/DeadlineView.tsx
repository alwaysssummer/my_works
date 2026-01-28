"use client";

import { useMemo, useState } from "react";
import { Block } from "@/types/block";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getBlockTitle } from "@/lib/blockParser";
import {
  getKoreanToday,
  calculateDday,
  isThisWeek,
  isNextWeek,
  formatDate,
} from "@/lib/dateFormat";

interface DeadlineViewProps {
  blocks: Block[];
  onSelectBlock: (blockId: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
}

interface DeadlineBlock {
  block: Block;
  dateStr: string;
  dday: ReturnType<typeof calculateDday>;
}

type SectionKey = "overdue" | "today" | "thisWeek" | "nextWeek" | "later";

export function DeadlineView({
  blocks,
  onSelectBlock,
  onToggleCheckbox,
}: DeadlineViewProps) {
  const today = getKoreanToday();

  // 섹션 접기 상태
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(
    new Set(["overdue"])
  );

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 날짜 속성이 있는 블록만 필터링하고 D-day 계산
  // person 속성이 있으면 수업이므로 제외
  const deadlineBlocks = useMemo(() => {
    return blocks
      .filter((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        if (!(dateProp?.value?.type === "date" && dateProp.value.date)) return false;
        // person 속성이 있으면 수업이므로 마감일에서 제외
        if (block.properties.some((p) => p.propertyType === "person")) return false;
        return true;
      })
      .map((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        const dateStr = dateProp!.value.type === "date" ? dateProp!.value.date : "";
        return {
          block,
          dateStr,
          dday: calculateDday(dateStr),
        } as DeadlineBlock;
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [blocks]);

  // 섹션별로 분류
  const sections = useMemo(() => {
    const overdue: DeadlineBlock[] = [];
    const todayBlocks: DeadlineBlock[] = [];
    const thisWeek: DeadlineBlock[] = [];
    const nextWeek: DeadlineBlock[] = [];
    const later: DeadlineBlock[] = [];

    deadlineBlocks.forEach((item) => {
      if (item.dday.isPast) {
        overdue.push(item);
      } else if (item.dday.isToday) {
        todayBlocks.push(item);
      } else if (isThisWeek(item.dateStr)) {
        thisWeek.push(item);
      } else if (isNextWeek(item.dateStr)) {
        nextWeek.push(item);
      } else {
        later.push(item);
      }
    });

    return { overdue, today: todayBlocks, thisWeek, nextWeek, later };
  }, [deadlineBlocks]);

  // 체크박스 상태 확인
  const isChecked = (block: Block) => {
    const checkbox = block.properties.find((p) => p.propertyType === "checkbox");
    return checkbox?.value?.type === "checkbox" && checkbox.value.checked;
  };

  // 섹션 렌더링
  const renderSection = (
    key: SectionKey,
    title: string,
    items: DeadlineBlock[],
    colorClass: string
  ) => {
    if (items.length === 0) return null;

    const isCollapsed = collapsedSections.has(key);

    return (
      <section className="mb-6">
        <button
          onClick={() => toggleSection(key)}
          className="flex items-center gap-2 w-full text-left mb-2 group"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
          <h2 className={`text-sm font-semibold ${colorClass}`}>
            {title} ({items.length})
          </h2>
        </button>

        {!isCollapsed && (
          <div className="space-y-2 ml-6">
            {items.map(({ block, dateStr, dday }) => {
              const checked = isChecked(block);
              const dateObj = new Date(dateStr);
              const dayName = ["일", "월", "화", "수", "목", "금", "토"][
                dateObj.getDay()
              ];

              return (
                <div
                  key={block.id}
                  onClick={() => onSelectBlock(block.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? "bg-muted/30 border-muted"
                      : "bg-card border-border hover:bg-accent/50"
                  }`}
                >
                  {/* 체크박스 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCheckbox(block.id, !checked);
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {checked && (
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* 날짜 */}
                  <div className="w-20 flex-shrink-0 text-sm">
                    <div className="text-muted-foreground">
                      {dateObj.getMonth() + 1}/{dateObj.getDate()} ({dayName})
                    </div>
                  </div>

                  {/* 제목 */}
                  <div
                    className={`flex-1 text-sm ${
                      checked ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {block.name || getBlockTitle(block.content, 50) || "제목 없음"}
                  </div>

                  {/* D-day */}
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      dday.isToday
                        ? "bg-red-100 text-red-700"
                        : dday.isPast
                        ? "bg-gray-100 text-gray-500"
                        : dday.days <= 3
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {dday.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="flex-1 h-screen overflow-auto bg-background">
      {/* 헤더 */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <h1 className="font-medium">마감일</h1>
          <span className="text-sm text-muted-foreground">
            ({deadlineBlocks.length}건)
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {deadlineBlocks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>마감일이 설정된 항목이 없습니다.</p>
            <p className="text-sm mt-2">블록에 날짜 속성을 추가하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <>
            {renderSection(
              "overdue",
              "지난 마감",
              sections.overdue,
              "text-gray-500"
            )}
            {renderSection(
              "today",
              "오늘",
              sections.today,
              "text-red-600"
            )}
            {renderSection(
              "thisWeek",
              "이번 주",
              sections.thisWeek,
              "text-orange-600"
            )}
            {renderSection(
              "nextWeek",
              "다음 주",
              sections.nextWeek,
              "text-blue-600"
            )}
            {renderSection(
              "later",
              "이후",
              sections.later,
              "text-gray-600"
            )}
          </>
        )}
      </div>
    </main>
  );
}
