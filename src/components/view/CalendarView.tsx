"use client";

import { useState, useMemo, useCallback } from "react";
import { Block } from "@/types/block";
import { groupBlocksByDate } from "@/hooks/useView";

interface CalendarViewProps {
  blocks: Block[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

export function CalendarView({ blocks, selectedDate, onSelectDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const blocksByDate = useMemo(() => groupBlocksByDate(blocks), [blocks]);

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
          const hasBlocks = blocksOnDate.length > 0;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayOfWeek = index % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`
                relative p-2 h-16 rounded text-sm transition-colors
                ${isCurrentMonth ? "" : "opacity-40"}
                ${isToday ? "ring-2 ring-primary" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"}
                ${!isSelected && isSunday ? "text-red-500" : ""}
                ${!isSelected && isSaturday ? "text-blue-500" : ""}
              `}
            >
              <span className="block">{day}</span>
              {hasBlocks && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {blocksOnDate.slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      }`}
                    />
                  ))}
                  {blocksOnDate.length > 3 && (
                    <span className="text-[10px]">+{blocksOnDate.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
