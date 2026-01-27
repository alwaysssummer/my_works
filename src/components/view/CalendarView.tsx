"use client";

import { useState, useMemo, useCallback } from "react";
import { Block } from "@/types/block";
import { groupBlocksByDate } from "@/hooks/useView";
import { X, Plus, Clock, User, RotateCcw } from "lucide-react";
import { getBlockTitle } from "@/lib/blockParser";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

// 일정 추가 모달 컴포넌트
function CalendarAddModal({
  date,
  content,
  studentId,
  time,
  isRepeat,
  students,
  onContentChange,
  onStudentIdChange,
  onTimeChange,
  onIsRepeatChange,
  onSubmit,
  onClose,
  formatDate,
}: {
  date: string;
  content: string;
  studentId: string;
  time: string;
  isRepeat: boolean;
  students: StudentInfo[];
  onContentChange: (v: string) => void;
  onStudentIdChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onIsRepeatChange: (v: boolean) => void;
  onSubmit: () => void;
  onClose: () => void;
  formatDate: (d: string) => string;
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
      aria-labelledby="calendar-add-modal-title"
    >
      <div
        ref={containerRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 id="calendar-add-modal-title" className="font-semibold">
            <span aria-hidden="true">◇</span> {formatDate(date)}
          </h3>
          <button
            onClick={onClose}
            aria-label="모달 닫기"
            className="p-1 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 내용 입력 */}
          <div>
            <label htmlFor="cal-content" className="block text-sm font-medium mb-1">내용</label>
            <input
              id="cal-content"
              type="text"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="일정 또는 수업명 입력..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  onSubmit();
                }
              }}
            />
          </div>

          {/* 학생 선택 */}
          <div>
            <label htmlFor="cal-student" className="block text-sm font-medium mb-1 flex items-center gap-1">
              <User className="w-4 h-4" aria-hidden="true" />
              학생 (선택하면 수업)
            </label>
            <select
              id="cal-student"
              value={studentId}
              onChange={(e) => onStudentIdChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">선택 안함 (일반 일정)</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {studentId && (
              <p className="mt-1 text-xs text-green-600" aria-live="polite">
                → 수업으로 등록됩니다
              </p>
            )}
          </div>

          {/* 시간 선택 */}
          <div>
            <label htmlFor="cal-time" className="block text-sm font-medium mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" aria-hidden="true" />
              시간 (선택)
            </label>
            <input
              id="cal-time"
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* 반복 설정 (학생 선택 시에만) */}
          {studentId && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="cal-repeat"
                  type="checkbox"
                  checked={isRepeat}
                  onChange={(e) => onIsRepeatChange(e.target.checked)}
                  className="w-4 h-4 rounded border-border focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-sm flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  매주 반복 (정규 수업)
                </span>
              </label>
              {isRepeat && (
                <p className="mt-1 text-xs text-blue-600 ml-6" aria-live="polite">
                  → 정규 수업으로 등록됩니다
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!content.trim()}
            className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

interface StudentInfo {
  id: string;
  name: string;
}

interface CalendarViewProps {
  blocks: Block[];
  selectedDate?: string;
  students?: StudentInfo[];
  onSelectDate: (date: string) => void;
  onAddSchedule?: (date: string, content: string, studentId?: string, isRepeat?: boolean, time?: string) => void;
}

export function CalendarView({
  blocks,
  selectedDate,
  students = [],
  onSelectDate,
  onAddSchedule,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // 일정 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDate, setAddModalDate] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addStudentId, setAddStudentId] = useState<string>("");
  const [addTime, setAddTime] = useState("");
  const [addIsRepeat, setAddIsRepeat] = useState(false);

  const blocksByDate = useMemo(() => groupBlocksByDate(blocks), [blocks]);

  // 기간 일정 (endDate가 있는 블록)
  const periodBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const dateProp = b.properties.find((p) => p.propertyType === "date");
      return dateProp?.value.type === "date" && dateProp.value.endDate;
    });
  }, [blocks]);

  // 특정 날짜에 걸쳐있는 기간 일정
  const getPeriodBlocksForDate = useCallback(
    (date: string) => {
      return periodBlocks.filter((b) => {
        const dateProp = b.properties.find((p) => p.propertyType === "date");
        if (dateProp?.value.type === "date" && dateProp.value.endDate) {
          return date >= dateProp.value.date && date <= dateProp.value.endDate;
        }
        return false;
      });
    },
    [periodBlocks]
  );

  const today = new Date().toISOString().split("T")[0];

  // 현재 월의 날짜들 생성
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = 일요일

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // 이전 달의 마지막 날들
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: prevDate.toISOString().split("T")[0],
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // 현재 달
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: date.toISOString().split("T")[0],
        day: i,
        isCurrentMonth: true,
      });
    }

    // 다음 달의 첫 날들 (6주 채우기)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate.toISOString().split("T")[0],
        day: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    onSelectDate(today);
  }, [today, onSelectDate]);

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback(
    (date: string) => {
      if (onAddSchedule) {
        // 일정 추가 모달 열기
        setAddModalDate(date);
        setAddContent("");
        setAddStudentId("");
        setAddTime("");
        setAddIsRepeat(false);
        setShowAddModal(true);
      } else {
        onSelectDate(date);
      }
    },
    [onAddSchedule, onSelectDate]
  );

  // 일정 추가 제출
  const handleAddSubmit = useCallback(() => {
    if (!addContent.trim() || !onAddSchedule) return;
    onAddSchedule(
      addModalDate,
      addContent.trim(),
      addStudentId || undefined,
      addIsRepeat,
      addTime || undefined
    );
    setShowAddModal(false);
  }, [addModalDate, addContent, addStudentId, addIsRepeat, addTime, onAddSchedule]);

  // 블록 내용 추출
  const getPlainText = (html: string) => {
    if (typeof window === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  // 날짜 포맷 (Intl API 사용)
  const formatDate = (dateStr: string) => {
    return formatDateUtil(dateStr, { month: "long", day: "numeric" });
  };

  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ];

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          aria-label="이전 달"
          className="p-2 hover:bg-accent rounded focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true">◀</span>
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" aria-live="polite">
            {currentMonth.year}년 {monthNames[currentMonth.month]}
          </h2>
          <button
            onClick={goToToday}
            aria-label="오늘 날짜로 이동"
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded focus-visible:ring-2 focus-visible:ring-ring"
          >
            오늘
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          aria-label="다음 달"
          className="p-2 hover:bg-accent rounded focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true">▶</span>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="캘린더">
        {calendarDays.map(({ date, day, isCurrentMonth }, index) => {
          const blocksOnDate = blocksByDate[date] || [];
          const periodBlocksOnDate = getPeriodBlocksForDate(date);
          const hasBlocks = blocksOnDate.length > 0 || periodBlocksOnDate.length > 0;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayOfWeek = index % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          const eventCount = blocksOnDate.length + periodBlocksOnDate.length;

          return (
            <button
              key={date}
              onClick={() => handleDateClick(date)}
              role="gridcell"
              aria-label={`${currentMonth.month + 1}월 ${day}일${isToday ? ", 오늘" : ""}${eventCount > 0 ? `, ${eventCount}개 일정` : ""}`}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`
                relative p-2 h-20 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring
                ${isCurrentMonth ? "" : "opacity-40"}
                ${isToday ? "ring-2 ring-primary" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"}
                ${!isSelected && isSunday ? "text-red-500" : ""}
                ${!isSelected && isSaturday ? "text-blue-500" : ""}
              `}
            >
              <span className="block text-left">{day}</span>

              {/* 기간 일정 막대 */}
              {periodBlocksOnDate.length > 0 && (
                <div className="absolute top-7 left-0 right-0 space-y-0.5 px-0.5">
                  {periodBlocksOnDate.slice(0, 2).map((block) => {
                    const dateProp = block.properties.find((p) => p.propertyType === "date");
                    const isStart = dateProp?.value.type === "date" && dateProp.value.date === date;
                    const isEnd = dateProp?.value.type === "date" && dateProp.value.endDate === date;

                    return (
                      <div
                        key={block.id}
                        className={`h-4 bg-blue-500 text-white text-[10px] leading-4 truncate
                          ${isStart ? "rounded-l pl-1" : ""}
                          ${isEnd ? "rounded-r pr-1" : ""}
                          ${!isStart && !isEnd ? "" : ""}
                        `}
                        style={{
                          marginLeft: isStart ? "0" : "-4px",
                          marginRight: isEnd ? "0" : "-4px",
                        }}
                      >
                        {isStart && getBlockTitle(block.content, 8)}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 단일 날짜 일정 점 */}
              {blocksOnDate.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {blocksOnDate.slice(0, 3).map((block, i) => {
                    // 수업(학생 연결)인지 확인
                    const hasPerson = block.properties.some((p) => p.propertyType === "person");
                    return (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-primary-foreground"
                            : hasPerson
                            ? "bg-green-500"
                            : "bg-primary"
                        }`}
                      />
                    );
                  })}
                  {blocksOnDate.length > 3 && (
                    <span className="text-[10px]">+{blocksOnDate.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 일정 추가 모달 */}
      {showAddModal && (
        <CalendarAddModal
          date={addModalDate}
          content={addContent}
          studentId={addStudentId}
          time={addTime}
          isRepeat={addIsRepeat}
          students={students}
          onContentChange={setAddContent}
          onStudentIdChange={setAddStudentId}
          onTimeChange={setAddTime}
          onIsRepeatChange={setAddIsRepeat}
          onSubmit={handleAddSubmit}
          onClose={() => setShowAddModal(false)}
          formatDate={formatDate}
        />
      )}

    </div>
  );
}
