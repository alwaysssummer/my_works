"use client";

import { useState, useMemo, useCallback } from "react";
import { Block } from "@/types/block";
import { groupBlocksByDate } from "@/hooks/useView";
import { X, Plus, Clock, User, RotateCcw } from "lucide-react";
import { getBlockTitle } from "@/lib/blockParser";

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

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
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
          className="p-2 hover:bg-accent rounded"
        >
          ◀
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {currentMonth.year}년 {monthNames[currentMonth.month]}
          </h2>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
          >
            오늘
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-accent rounded"
        >
          ▶
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
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, day, isCurrentMonth }, index) => {
          const blocksOnDate = blocksByDate[date] || [];
          const periodBlocksOnDate = getPeriodBlocksForDate(date);
          const hasBlocks = blocksOnDate.length > 0 || periodBlocksOnDate.length > 0;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayOfWeek = index % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <button
              key={date}
              onClick={() => handleDateClick(date)}
              className={`
                relative p-2 h-20 rounded text-sm transition-colors
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">📅 {formatDate(addModalDate)}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 내용 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1">내용</label>
                <input
                  type="text"
                  value={addContent}
                  onChange={(e) => setAddContent(e.target.value)}
                  placeholder="일정 또는 수업명 입력..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      handleAddSubmit();
                    }
                  }}
                />
              </div>

              {/* 학생 선택 */}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  학생 (선택하면 수업)
                </label>
                <select
                  value={addStudentId}
                  onChange={(e) => setAddStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">선택 안함 (일반 일정)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {addStudentId && (
                  <p className="mt-1 text-xs text-green-600">
                    → 수업으로 등록됩니다
                  </p>
                )}
              </div>

              {/* 시간 선택 */}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  시간 (선택)
                </label>
                <input
                  type="time"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* 반복 설정 (학생 선택 시에만) */}
              {addStudentId && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addIsRepeat}
                      onChange={(e) => setAddIsRepeat(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <RotateCcw className="w-4 h-4" />
                      매주 반복 (정규 수업)
                    </span>
                  </label>
                  {addIsRepeat && (
                    <p className="mt-1 text-xs text-blue-600 ml-6">
                      → 정규 수업으로 등록됩니다
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={!addContent.trim()}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
