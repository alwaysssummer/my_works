"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Block, Top3History } from "@/types/block";
import { X, Plus, ChevronRight, Clock, Flame, Search } from "lucide-react";
import { parseBlockContent, getBlockTitle } from "@/lib/blockParser";
import { useListNavigation } from "@/hooks/useListNavigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatDateWithWeekday, getKoreanNow, getKoreanToday, toKoreanDateString, calculateDday } from "@/lib/dateFormat";
import { processBlockInput } from "@/lib/blockDefaults";

// TOP 3 선택 모달 컴포넌트
function Top3SelectorModal({
  availableBlocks,
  editingSlotIndex,
  onSelect,
  onClose,
}: {
  availableBlocks: Block[];
  editingSlotIndex: number | null;
  onSelect: (blockId: string) => void;
  onClose: () => void;
}) {
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: onClose,
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="top3-selector-title"
    >
      <div
        ref={containerRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 id="top3-selector-title" className="font-semibold">TOP 3에 추가할 항목 선택</h3>
          <button
            onClick={onClose}
            aria-label="모달 닫기"
            className="p-1 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-2 overflow-y-auto max-h-[400px]" role="listbox" aria-label="선택 가능한 블록">
          {availableBlocks.length > 0 ? (
            availableBlocks.slice(0, 20).map((block) => {
              const parsed = parseBlockContent(block.content);
              return (
                <button
                  key={block.id}
                  role="option"
                  aria-selected={false}
                  onClick={() => onSelect(block.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="text-sm line-clamp-2 flex items-center gap-1">
                    {parsed.icon && (
                      <span aria-hidden="true" style={{ color: parsed.color || undefined }}>{parsed.icon}</span>
                    )}
                    {getBlockTitle(block.content, 40)}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              추가할 수 있는 항목이 없어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  blocks: Block[];
  top3Blocks: Block[];
  top3History: Top3History[];
  onAddToTop3: (blockId: string, slotIndex?: number) => void;
  onRemoveFromTop3: (blockId: string) => void;
  onAddBlock: (afterId?: string, options?: { name?: string; content?: string }) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onUpdateBlockName: (id: string, name: string) => void;
  onToggleCheckbox: (blockId: string, checked: boolean) => void;
  onSelectBlock: (blockId: string) => void;
}

export function Dashboard({
  blocks,
  top3Blocks,
  top3History,
  onAddToTop3,
  onRemoveFromTop3,
  onAddBlock,
  onUpdateBlock,
  onUpdateBlockName,
  onToggleCheckbox,
  onSelectBlock,
}: DashboardProps) {
  const [quickMemo, setQuickMemo] = useState("");
  const [showTop3Selector, setShowTop3Selector] = useState(false);
  // TOP 3 직접 입력 상태
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [directInput, setDirectInput] = useState("");
  const directInputRef = useRef<HTMLInputElement>(null);

  // 입력창 포커스
  useEffect(() => {
    if (editingSlotIndex !== null && directInputRef.current) {
      directInputRef.current.focus();
    }
  }, [editingSlotIndex]);

  // 직접 입력으로 TOP 3 추가
  const handleDirectInputSubmit = () => {
    if (!directInput.trim()) {
      setEditingSlotIndex(null);
      setDirectInput("");
      return;
    }
    // 입력 처리 (name/content 분할)
    const processed = processBlockInput(directInput.trim());
    // 새 블록 생성 (name/content를 옵션으로 전달하여 동기적으로 설정)
    const newBlockId = onAddBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });
    // TOP 3에 추가 (슬롯 인덱스 전달)
    onAddToTop3(newBlockId, editingSlotIndex ?? undefined);
    // 상태 초기화
    setEditingSlotIndex(null);
    setDirectInput("");
  };

  // 슬롯 인덱스에 해당하는 블록 찾기
  const getBlockForSlot = (slotIndex: number): Block | undefined => {
    return top3Blocks.find((block) => {
      const urgent = block.properties.find((p) => p.propertyType === "urgent");
      return urgent?.value.type === "urgent" && urgent.value.slotIndex === slotIndex;
    });
  };

  // 직접 입력 취소
  const handleDirectInputCancel = () => {
    setEditingSlotIndex(null);
    setDirectInput("");
  };

  // 오늘 날짜 (한국 시간)
  const today = getKoreanToday();

  // 어제 날짜 (한국 시간)
  const yesterday = useMemo(() => {
    const date = new Date(getKoreanToday());
    date.setDate(date.getDate() - 1);
    return toKoreanDateString(date);
  }, []);

  // 어제의 TOP 3 기록
  const yesterdayTop3 = useMemo(() => {
    return top3History.find((h) => h.date === yesterday);
  }, [top3History, yesterday]);

  // 오늘 일정 - 마감과 수업 분리
  const todayData = useMemo(() => {
    const todayBlocks = blocks.filter((block) => {
      const dateProp = block.properties.find((p) => p.propertyType === "date");
      return dateProp?.value.type === "date" && dateProp.value.date === today;
    });

    // 수업 (person 속성이 있는 것) - 시간순 정렬
    const lessons = todayBlocks
      .filter((b) => b.properties.some((p) => p.propertyType === "person"))
      .sort((a, b) => {
        const timeA = a.properties.find((p) => p.propertyType === "date")?.value;
        const timeB = b.properties.find((p) => p.propertyType === "date")?.value;
        if (timeA?.type === "date" && timeB?.type === "date") {
          return (timeA.time || "").localeCompare(timeB.time || "");
        }
        return 0;
      });

    // 마감 (person 속성이 없는 것)
    const deadlines = todayBlocks.filter(
      (b) => !b.properties.some((p) => p.propertyType === "person")
    );

    return { lessons, deadlines };
  }, [blocks, today]);

  // 다가오는 마감 (오늘 제외, 7일 이내)
  const upcomingDeadlines = useMemo(() => {
    return blocks
      .filter((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        if (dateProp?.value.type !== "date" || !dateProp.value.date) return false;
        // person 속성이 있으면 수업이므로 제외
        if (block.properties.some((p) => p.propertyType === "person")) return false;
        const dday = calculateDday(dateProp.value.date);
        return !dday.isPast && !dday.isToday && dday.days <= 7;
      })
      .map((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        const dateStr = dateProp!.value.type === "date" ? dateProp!.value.date : "";
        return { block, dateStr, dday: calculateDday(dateStr) };
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .slice(0, 5);
  }, [blocks]);

  // 하위 호환성을 위한 todaySchedule
  const todaySchedule = useMemo(() => {
    return [...todayData.deadlines, ...todayData.lessons];
  }, [todayData]);

  // TOP 3에 추가할 수 있는 블록 (이미 TOP 3가 아닌 것)
  const availableBlocks = useMemo(() => {
    const top3Ids = new Set(top3Blocks.map((b) => b.id));
    return blocks.filter((b) => !top3Ids.has(b.id) && b.content.trim());
  }, [blocks, top3Blocks]);

  // 빠른 메모 추가
  const handleQuickMemoSubmit = () => {
    if (!quickMemo.trim()) return;
    // 입력 처리 (name/content 분할)
    const processed = processBlockInput(quickMemo.trim());
    // 새 블록 생성 (name/content를 옵션으로 전달하여 동기적으로 설정)
    onAddBlock(undefined, {
      name: processed.name,
      content: processed.content,
    });
    setQuickMemo("");
  };

  // 블록 내용에서 텍스트만 추출
  const getPlainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  // 체크박스 토글
  const handleCheckboxToggle = (block: Block) => {
    const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
    if (checkboxProp?.value.type === "checkbox") {
      onToggleCheckbox(block.id, !checkboxProp.value.checked);
    }
  };

  // TOP 3가 완료되었는지 확인
  const isCompleted = (block: Block) => {
    const checkboxProp = block.properties.find((p) => p.propertyType === "checkbox");
    return checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;
  };

  // 오늘 일정 키보드 탐색
  const { focusedId, listRef } = useListNavigation({
    items: todaySchedule,
    onSelect: onSelectBlock,
    enabled: !showTop3Selector && editingSlotIndex === null,
  });

  return (
    <main className="flex-1 h-screen overflow-auto bg-background">
      {/* 헤더 */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">⌂</span>
          <h1 className="font-medium">대시보드</h1>
        </div>
        <time dateTime={today} className="text-sm text-muted-foreground">
          {formatDateWithWeekday(getKoreanNow())}
        </time>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* TOP 3 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">오늘의 TOP 3</h2>
              <span className="text-xs text-muted-foreground ml-2">
                23:59에 자동 아카이브
              </span>
            </div>
            {top3Blocks.length < 3 && (
              <button
                onClick={() => setShowTop3Selector(true)}
                aria-label="TOP 3에 항목 추가"
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                추가
              </button>
            )}
          </div>

          {/* TOP 3 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => {
              const block = getBlockForSlot(index);
              if (block) {
                const completed = isCompleted(block);
                return (
                  <div
                    key={block.id}
                    className={`relative p-4 rounded-xl border-2 ${
                      completed
                        ? "border-green-200 bg-green-50"
                        : "border-orange-200 bg-orange-50"
                    } transition-all hover:shadow-md cursor-pointer group`}
                    onClick={() => onSelectBlock(block.id)}
                  >
                    {/* 번호 뱃지 */}
                    <div
                      className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        completed ? "bg-green-500" : "bg-orange-500"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromTop3(block.id);
                      }}
                      aria-label="TOP 3에서 제거"
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>

                    {/* 체크박스 */}
                    <div className="flex items-start gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckboxToggle(block);
                        }}
                        aria-label={completed ? "완료 해제" : "완료 처리"}
                        aria-pressed={completed}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                          completed
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-orange-300 hover:border-orange-500"
                        }`}
                      >
                        {completed && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
                      {(() => {
                        const parsed = parseBlockContent(block.content);
                        return (
                          <span
                            className={`text-sm leading-tight flex items-center gap-1 ${
                              completed ? "line-through text-gray-400" : "text-gray-700"
                            }`}
                          >
                            {parsed.icon && (
                              <span style={{ color: parsed.color || undefined }}>{parsed.icon}</span>
                            )}
                            {block.name || getBlockTitle(block.content, 40)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              }

              // 빈 슬롯
              const isEditing = editingSlotIndex === index;
              return (
                <div
                  key={`empty-${index}`}
                  onClick={() => {
                    if (!isEditing) {
                      setEditingSlotIndex(index);
                      setDirectInput("");
                    }
                  }}
                  className={`p-4 rounded-xl border-2 ${
                    isEditing
                      ? "border-orange-400 bg-orange-50"
                      : "border-dashed border-gray-200 bg-gray-50/50 hover:border-orange-300 hover:bg-orange-50/30"
                  } min-h-[100px] transition-colors ${!isEditing ? "cursor-pointer" : ""}`}
                >
                  {isEditing ? (
                    // 직접 입력 모드
                    <div className="h-full flex flex-col justify-center">
                      <div className="relative">
                        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-orange-500">
                          {index + 1}
                        </div>
                        <input
                          ref={directInputRef}
                          type="text"
                          value={directInput}
                          onChange={(e) => setDirectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              handleDirectInputSubmit();
                            } else if (e.key === "Escape") {
                              handleDirectInputCancel();
                            }
                          }}
                          onBlur={() => {
                            // 약간의 딜레이 후 취소 (버튼 클릭 허용)
                            setTimeout(() => {
                              if (!directInput.trim()) {
                                handleDirectInputCancel();
                              }
                            }, 150);
                          }}
                          placeholder="긴급한 일 입력..."
                          className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>Enter: 추가 / ESC: 취소</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTop3Selector(true);
                            setEditingSlotIndex(null);
                          }}
                          className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                        >
                          <Search className="w-3 h-3" />
                          기존 블록 선택
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 기본 상태
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Plus className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-xs">TOP {index + 1}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 어제의 TOP 3 성취 */}
          {yesterdayTop3 && yesterdayTop3.blocks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">▦ 어제의 성취</span>
                <span className="text-xs text-muted-foreground">
                  ({yesterdayTop3.blocks.filter((b) => b.completed).length}/{yesterdayTop3.blocks.length} 완료)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {yesterdayTop3.blocks.map((block, index) => (
                  <div
                    key={`${block.id}-${index}`}
                    className={`px-3 py-2 rounded-lg text-xs ${
                      block.completed
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span className="mr-1">{block.completed ? "☑" : "□"}</span>
                    <span className={block.completed ? "" : "line-through"}>
                      {block.content.length > 25
                        ? block.content.slice(0, 25) + "..."
                        : block.content || "내용 없음"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 오늘 일정 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">오늘 일정</h2>
            <span className="text-sm text-muted-foreground">
              ({todayData.deadlines.length + todayData.lessons.length}건)
            </span>
          </div>

          {todayData.deadlines.length === 0 && todayData.lessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              오늘 예정된 일정이 없어요
            </div>
          ) : (
            <div className="space-y-4">
              {/* 오늘 마감 */}
              {todayData.deadlines.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                    <span>⏰</span> 마감
                  </div>
                  <div className="space-y-2">
                    {todayData.deadlines.map((block) => {
                      const checkboxProp = block.properties.find(
                        (p) => p.propertyType === "checkbox"
                      );
                      const checked =
                        checkboxProp?.value.type === "checkbox" &&
                        checkboxProp.value.checked;
                      const isFocused = block.id === focusedId;

                      return (
                        <div
                          key={block.id}
                          data-list-item
                          onClick={() => onSelectBlock(block.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border bg-red-50 cursor-pointer transition-colors ${
                            isFocused
                              ? "border-red-400 ring-2 ring-red-200"
                              : "border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {(() => {
                            const parsed = parseBlockContent(block.content);
                            return (
                              <span
                                className={`flex-1 text-sm flex items-center gap-1 ${
                                  checked ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {parsed.icon && (
                                  <span style={{ color: parsed.color || undefined }}>{parsed.icon}</span>
                                )}
                                {block.name || getBlockTitle(block.content, 50)}
                              </span>
                            );
                          })()}
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                            D-day
                          </span>
                          <ChevronRight className="w-4 h-4 text-red-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 오늘 수업 */}
              {todayData.lessons.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                    <span>○</span> 수업
                  </div>
                  <div ref={listRef} className="space-y-2">
                    {todayData.lessons.map((block) => {
                      const dateProp = block.properties.find((p) => p.propertyType === "date");
                      const time =
                        dateProp?.value.type === "date" ? dateProp.value.time : undefined;
                      const checkboxProp = block.properties.find(
                        (p) => p.propertyType === "checkbox"
                      );
                      const checked =
                        checkboxProp?.value.type === "checkbox" &&
                        checkboxProp.value.checked;
                      const isFocused = block.id === focusedId;

                      return (
                        <div
                          key={block.id}
                          data-list-item
                          onClick={() => onSelectBlock(block.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-colors ${
                            isFocused
                              ? "border-primary bg-primary/10 ring-2 ring-primary/50"
                              : "border-border hover:bg-accent/50"
                          }`}
                        >
                          {time && (
                            <span className="text-sm font-mono text-blue-600 w-14">
                              {time}
                            </span>
                          )}
                          {(() => {
                            const parsed = parseBlockContent(block.content);
                            return (
                              <span
                                className={`flex-1 text-sm flex items-center gap-1 ${
                                  checked ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {parsed.icon && (
                                  <span style={{ color: parsed.color || undefined }}>{parsed.icon}</span>
                                )}
                                {block.name || getBlockTitle(block.content, 50)}
                              </span>
                            );
                          })()}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 다가오는 마감 섹션 */}
        {upcomingDeadlines.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⏰</span>
              <h2 className="text-lg font-semibold">다가오는 마감</h2>
            </div>

            <div className="space-y-2">
              {upcomingDeadlines.map(({ block, dateStr, dday }) => {
                const dateObj = new Date(dateStr);
                const dayName = ["일", "월", "화", "수", "목", "금", "토"][dateObj.getDay()];
                const checkboxProp = block.properties.find(
                  (p) => p.propertyType === "checkbox"
                );
                const checked =
                  checkboxProp?.value.type === "checkbox" &&
                  checkboxProp.value.checked;

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
                    <span className="text-sm text-muted-foreground w-20">
                      {dateObj.getMonth() + 1}/{dateObj.getDate()} ({dayName})
                    </span>
                    <span
                      className={`flex-1 text-sm ${
                        checked ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {block.name || getBlockTitle(block.content, 40)}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        dday.days <= 3
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {dday.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 빠른 메모 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">◈</span>
            <h2 className="text-lg font-semibold">빠른 메모</h2>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={quickMemo}
              onChange={(e) => setQuickMemo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  handleQuickMemoSubmit();
                }
              }}
              placeholder="생각나는 거 바로 입력..."
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              onClick={handleQuickMemoSubmit}
              disabled={!quickMemo.trim()}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>

      {/* TOP 3 선택 모달 */}
      {showTop3Selector && (
        <Top3SelectorModal
          availableBlocks={availableBlocks}
          editingSlotIndex={editingSlotIndex}
          onSelect={(blockId) => {
            onAddToTop3(blockId, editingSlotIndex ?? undefined);
            setShowTop3Selector(false);
            setEditingSlotIndex(null);
          }}
          onClose={() => setShowTop3Selector(false)}
        />
      )}
    </main>
  );
}
