"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Block, BlockProperty, getBlockDisplayName } from "@/types/block";
import { PropertyType, Tag } from "@/types/property";
import { ScheduleSettings } from "@/types/settings";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getKoreanNow, getKoreanToday, toKoreanDateString, getKoreanTime, getKoreanDay } from "@/lib/dateFormat";
import { shouldBlockAppearOnDate } from "@/lib/propertyHelpers";

interface WeeklyScheduleProps {
  blocks: Block[];
  tags: Tag[];
  settings: ScheduleSettings;
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onUpdateBlockName: (id: string, name: string) => void;
  onAddProperty: (blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: BlockProperty["value"]) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string) => void;
  onChangeScheduleMode?: (mode: "weekly" | "calendar") => void;
}

interface ScheduleEvent {
  block: Block;
  date: string;
  startTime: string; // HH:mm
  duration: number; // 분
  studentName?: string;
}

const GRADE_ORDER = ["중등", "고1", "고2", "고3"];

function getStudentGrade(block: Block): string | undefined {
  const enrollProp = block.properties.find(p => p.propertyType === "enrollment");
  if (enrollProp?.value?.type === "enrollment") return enrollProp.value.grade;
  return undefined;
}

// 학년별 색상 (중등부/고등부 구분)
const GRADE_COLORS = {
  중등부: { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" },  // 연한 회색
  고등부: { bg: "#d1d5db", border: "#6b7280", text: "#111827" },  // 진한 회색
  미지정: { bg: "#e5e7eb", border: "#9ca3af", text: "#4b5563" },  // 기본 회색
  특별일정: { bg: "#fef3c7", border: "#eab308", text: "#854d0e" }, // 노란색
  일정: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },  // 파란색
  종일: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },  // 연한 빨간색
};

export function WeeklySchedule({
  blocks,
  tags,
  settings,
  onAddBlock,
  onUpdateBlock,
  onUpdateBlockName,
  onAddProperty,
  onUpdateProperty,
  onDeleteBlock,
  onSelectBlock,
  onChangeScheduleMode,
}: WeeklyScheduleProps) {
  // 현재 주의 시작일 (월요일 기준, 한국 시간)
  const [weekStart, setWeekStart] = useState(() => {
    const now = getKoreanNow();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 월요일로 맞춤
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // 수업 추가/수정 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState<{
    date: string;
    time: string;
    overlapCount?: number;
    timeRange?: { start: number; end: number } | null;
    overlappingEvents?: ScheduleEvent[];
    editingEvent?: ScheduleEvent;  // 수정 모드일 때 기존 일정
  } | null>(null);

  // 학생 블록 목록 (contact 속성이 있는 블록을 학생으로 간주, 학년순 정렬)
  const studentBlocks = useMemo(() => {
    return blocks
      .filter((b) => b.properties.some((p) => p.propertyType === "contact"))
      .sort((a, b) => {
        const getGradeIndex = (s: Block) => {
          const grade = getStudentGrade(s);
          if (!grade) return GRADE_ORDER.length;
          const idx = GRADE_ORDER.indexOf(grade);
          return idx === -1 ? GRADE_ORDER.length : idx;
        };
        const gradeA = getGradeIndex(a);
        const gradeB = getGradeIndex(b);
        if (gradeA !== gradeB) return gradeA - gradeB;
        return (a.name || "").localeCompare(b.name || "", "ko");
      });
  }, [blocks]);

  // 학생의 학년(enrollment.grade) 기반 색상 가져오기
  const getStudentGradeColor = useCallback((studentId: string | null) => {
    if (!studentId) return GRADE_COLORS.특별일정;

    const studentBlock = blocks.find(b => b.id === studentId);
    if (!studentBlock) return GRADE_COLORS.미지정;

    // enrollment.grade에서 학년 확인
    const enrollProp = studentBlock.properties.find(p => p.propertyType === "enrollment");
    if (enrollProp?.value?.type === "enrollment" && enrollProp.value.grade) {
      const grade = enrollProp.value.grade;
      if (grade === "중등") return GRADE_COLORS.중등부;
      if (grade.startsWith("고")) return GRADE_COLORS.고등부;
    }

    return GRADE_COLORS.미지정;
  }, [blocks]);

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 주간 날짜 배열 (월~일)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  // 모바일: 오늘 기준 2일만 표시
  const visibleDays = useMemo(() => {
    if (!isMobile) return weekDays;
    const now = getKoreanNow();
    const todayDate = new Date(now);
    todayDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    return [todayDate, tomorrow];
  }, [isMobile, weekDays]);

  // 시간 슬롯 배열 (10분 단위)
  const timeSlots = useMemo(() => {
    const slots: { time: string; hour: number; minute: number; isHour: boolean; isHalf: boolean }[] = [];
    for (let hour = settings.startHour; hour < settings.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          hour,
          minute,
          isHour: minute === 0,
          isHalf: minute === 30,
        });
      }
    }
    return slots;
  }, [settings.startHour, settings.endHour]);

  // 특정 날짜의 이벤트 가져오기 (반복 일정 포함)
  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = toKoreanDateString(date);
      const result: ScheduleEvent[] = [];

      blocks.forEach((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        if (!dateProp || dateProp.value.type !== "date" || !dateProp.value.time) return;

        if (shouldBlockAppearOnDate(block, dateStr)) {
          // 수업 시간 결정
          let duration = settings.defaultDuration;
          const blockDuration = block.properties.find((p) => p.propertyType === "duration");
          if (blockDuration?.value.type === "duration") {
            duration = blockDuration.value.minutes;
          } else {
            const personProp = block.properties.find((p) => p.propertyType === "person");
            const personValue = personProp?.value;
            if (personValue?.type === "person" && personValue.blockIds.length > 0) {
              const studentBlock = blocks.find((b) => b.id === personValue.blockIds[0]);
              const studentDuration = studentBlock?.properties.find((p) => p.propertyType === "duration");
              if (studentDuration?.value.type === "duration") {
                duration = studentDuration.value.minutes;
              }
            }
          }

          // 학생 이름 찾기
          let studentName: string | undefined;
          const personProp = block.properties.find((p) => p.propertyType === "person");
          const personValue = personProp?.value;
          if (personValue?.type === "person" && personValue.blockIds.length > 0) {
            const studentBlock = blocks.find((b) => b.id === personValue.blockIds[0]);
            if (studentBlock) {
              studentName = getBlockDisplayName(studentBlock);
            }
          }

          result.push({
            block,
            date: dateStr,
            startTime: dateProp.value.time,
            duration,
            studentName,
          });
        }
      });

      return result;
    },
    [blocks, settings.defaultDuration]
  );

  // 특정 날짜의 하루 종일 이벤트 가져오기 (time 없는 date 속성)
  const getAllDayEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = toKoreanDateString(date);
      return blocks.filter((block) => {
        const dateProp = block.properties.find((p) => p.propertyType === "date");
        if (!dateProp || dateProp.value.type !== "date") return false;
        if (dateProp.value.time) return false; // 시간 있으면 시간 그리드에 표시
        return shouldBlockAppearOnDate(block, dateStr);
      });
    },
    [blocks]
  );

  // 하루 종일 이벤트가 있는지 여부 (행 표시 조건)
  const hasAnyAllDayEvents = useMemo(() => {
    return visibleDays.some((date) => getAllDayEventsForDate(date).length > 0);
  }, [visibleDays, getAllDayEventsForDate]);

  // Google Calendar 스타일 열 배치 알고리즘
  const calculateEventLayout = useCallback((events: ScheduleEvent[]) => {
    if (events.length === 0) return new Map<string, { column: number; totalColumns: number }>();

    // 시작 시간순 정렬
    const sortedEvents = [...events].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime);
      const bStart = timeToMinutes(b.startTime);
      if (aStart !== bStart) return aStart - bStart;
      // 시작 시간이 같으면 긴 일정을 먼저
      return b.duration - a.duration;
    });

    // 각 이벤트의 열 위치 저장
    const eventColumns = new Map<string, number>();
    // 각 열의 끝 시간 추적
    const columnEnds: number[] = [];

    sortedEvents.forEach((event) => {
      const start = timeToMinutes(event.startTime);
      const end = start + event.duration;

      // 사용 가능한 가장 왼쪽 열 찾기
      let column = 0;
      while (column < columnEnds.length && columnEnds[column] > start) {
        column++;
      }

      // 열 할당
      eventColumns.set(event.block.id, column);
      columnEnds[column] = end;
    });

    // 각 이벤트가 속한 그룹의 최대 열 수 계산
    const result = new Map<string, { column: number; totalColumns: number }>();

    sortedEvents.forEach((event) => {
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = eventStart + event.duration;
      const column = eventColumns.get(event.block.id) || 0;

      // 이 이벤트와 겹치는 모든 이벤트 찾기
      let maxColumn = column;
      sortedEvents.forEach((other) => {
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = otherStart + other.duration;
        // 겹치는지 확인
        if (otherStart < eventEnd && otherEnd > eventStart) {
          const otherColumn = eventColumns.get(other.block.id) || 0;
          maxColumn = Math.max(maxColumn, otherColumn);
        }
      });

      result.set(event.block.id, {
        column,
        totalColumns: maxColumn + 1,
      });
    });

    return result;
  }, []);

  // 이벤트 위치 및 크기 계산 (Google Calendar 스타일)
  const getEventStyle = useCallback(
    (event: ScheduleEvent, layout: { column: number; totalColumns: number }) => {
      const [hours, minutes] = event.startTime.split(":").map(Number);
      const startMinutes = (hours - settings.startHour) * 60 + minutes;
      const slotHeight = 40 / 3; // 10분당 약 13.33px (30분당 40px 유지)
      const top = (startMinutes / 10) * slotHeight;
      const height = Math.max((event.duration / 10) * slotHeight, 20); // 최소 높이 20px

      const { column, totalColumns } = layout;
      const width = 100 / totalColumns;
      const left = width * column;

      return {
        top: `${top}px`,
        height: `${height}px`,
        width: `calc(${width}% - 4px)`,
        left: `calc(${left}% + 2px)`,
      };
    },
    [settings.startHour]
  );

  // 겹치는 이벤트 계산 (모달용)
  const getOverlapInfo = useCallback((events: ScheduleEvent[], targetEvent: ScheduleEvent) => {
    const targetStart = timeToMinutes(targetEvent.startTime);
    const targetEnd = targetStart + targetEvent.duration;

    const overlapping = events.filter((e) => {
      const start = timeToMinutes(e.startTime);
      const end = start + e.duration;
      return start < targetEnd && end > targetStart;
    });

    const index = overlapping.findIndex((e) => e.block.id === targetEvent.block.id);
    return { index, count: overlapping.length, overlapping };
  }, []);

  // 이전 주로 이동
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  }, []);

  // 다음 주로 이동
  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  }, []);

  // 오늘로 이동 (한국 시간)
  const goToToday = useCallback(() => {
    const now = getKoreanNow();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  }, []);

  // 과거 날짜 체크 (오늘 이전이면 true)
  const isPastDate = useCallback((dateStr: string) => {
    const today = getKoreanToday();
    return dateStr < today;
  }, []);

  // 수업 삭제 핸들러
  const handleDeleteLesson = useCallback((blockId: string, block: Block) => {
    const repeatProp = block.properties.find(p => p.propertyType === "repeat");
    const isRepeat = repeatProp?.value?.type === "repeat" && repeatProp.value.config;

    if (isRepeat) {
      // 반복 수업: 확인 후 전체 삭제
      if (confirm("이 반복 수업을 삭제하시겠습니까?\n모든 반복이 삭제됩니다.")) {
        onDeleteBlock(blockId);
      }
    } else {
      // 단순 수업: 바로 삭제
      onDeleteBlock(blockId);
    }
  }, [onDeleteBlock]);

  // 빈 영역 클릭 시 수업 추가 (겹치는 일정 수 계산 포함)
  const handleCellClick = useCallback((date: Date, time: string) => {
    const dateStr = toKoreanDateString(date);
    const events = getEventsForDate(date);

    // 클릭한 시간에 겹치는 일정 찾기
    const clickedMinutes = timeToMinutes(time);
    const overlappingEvents = events.filter((event) => {
      const start = timeToMinutes(event.startTime);
      const end = start + event.duration;
      return clickedMinutes >= start && clickedMinutes < end;
    });

    const overlapCount = overlappingEvents.length;

    // 겹치는 일정이 있으면 해당 일정들의 시간 범위 계산
    const timeRange = overlappingEvents.length > 0
      ? {
          start: Math.min(...overlappingEvents.map(e => timeToMinutes(e.startTime))),
          end: Math.max(...overlappingEvents.map(e => timeToMinutes(e.startTime) + e.duration))
        }
      : null;

    setAddModalData({ date: dateStr, time, overlapCount, timeRange, overlappingEvents });
    setShowAddModal(true);
  }, [getEventsForDate]);

  // 오늘 날짜 (한국 시간)
  const today = getKoreanToday();

  // 현재 시간 표시 (한국 시간 기준)
  const koreanTime = getKoreanTime();
  const currentMinutes = (koreanTime.hours - settings.startHour) * 60 + koreanTime.minutes;
  const isCurrentWeek = weekDays.some((d) => toKoreanDateString(d) === today);

  // 스크롤 컨테이너 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 시간표 진입 시 현재 시간 위치로 자동 스크롤
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isCurrentWeek) return;

    const scrollTarget = (currentMinutes / 10) * (40 / 3);
    const offset = 80;
    container.scrollTop = Math.max(0, scrollTarget - offset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentWeek]);

  // 주간 범위 텍스트
  const weekRangeText = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;

    if (startMonth === endMonth) {
      return `${start.getFullYear()}년 ${startMonth}월 ${start.getDate()}일 - ${end.getDate()}일`;
    }
    return `${start.getFullYear()}년 ${startMonth}월 ${start.getDate()}일 - ${endMonth}월 ${end.getDate()}일`;
  }, [weekDays]);

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const getDayName = (date: Date) => dayNames[date.getDay()];

  return (
    <main className="flex-1 h-screen overflow-hidden bg-background flex flex-col">
      {/* 헤더 */}
      <header className="h-14 flex items-center justify-center px-4 border-b border-border flex-shrink-0 relative">
        <button
          onClick={() => onChangeScheduleMode?.("calendar")}
          className="absolute left-4 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          title="월간 뷰로 전환"
        >
          Month
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {weekRangeText}
          </span>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            오늘
          </button>
        </div>
      </header>

      {/* 타임테이블 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <div className={isMobile ? "" : "min-w-[800px]"}>
          {/* 요일 헤더 */}
          <div className="flex border-b border-border sticky top-0 bg-background z-10">
            <div className="w-16 flex-shrink-0 border-r border-border" />
            {visibleDays.map((date) => {
              const dateStr = toKoreanDateString(date);
              const isToday = dateStr === today;
              const isSunday = date.getDay() === 0;
              const isSaturday = date.getDay() === 6;

              return (
                <div
                  key={dateStr}
                  className={`flex-1 py-2 text-center border-r border-border last:border-r-0 ${
                    isToday ? "bg-primary/10" : ""
                  }`}
                >
                  <div
                    className={`text-xs ${
                      isSunday
                        ? "text-red-500"
                        : isSaturday
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {getDayName(date)}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday
                        ? "text-primary"
                        : isSunday
                        ? "text-red-500"
                        : isSaturday
                        ? "text-blue-500"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하루 종일 이벤트 행 */}
          {hasAnyAllDayEvents && (
            <div className="flex border-b border-border">
              <div className="w-16 flex-shrink-0 border-r border-border flex items-center justify-end pr-2">
                <span className="text-xs text-muted-foreground font-medium">종일</span>
              </div>
              {visibleDays.map((date) => {
                const dateStr = toKoreanDateString(date);
                const allDayEvents = getAllDayEventsForDate(date);
                const isToday = dateStr === today;
                return (
                  <div
                    key={`allday-${dateStr}`}
                    className={`flex-1 border-r border-border last:border-r-0 p-1 min-h-[28px] flex flex-wrap gap-1 ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    {allDayEvents.map((block) => (
                      <button
                        key={block.id}
                        onClick={() => onSelectBlock(block.id)}
                        className="px-1.5 py-0.5 text-xs rounded truncate max-w-full cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: GRADE_COLORS.종일.bg,
                          borderLeft: `3px solid ${GRADE_COLORS.종일.border}`,
                          color: GRADE_COLORS.종일.text,
                        }}
                        title={getBlockDisplayName(block)}
                      >
                        {getBlockDisplayName(block)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* 시간 그리드 */}
          <div className="flex">
            {/* 시간 라벨 */}
            <div className="w-16 flex-shrink-0 border-r border-border">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.time}
                  className={`flex items-start justify-end pr-2 text-xs ${
                    slot.isHour
                      ? "font-bold text-foreground"
                      : slot.isHalf
                      ? "text-muted-foreground/70"
                      : ""
                  }`}
                  style={{
                    height: `${40 / 3}px`,
                    marginTop: index === 0 ? 0 : undefined
                  }}
                >
                  {slot.isHour ? slot.time : slot.isHalf ? slot.time : ""}
                </div>
              ))}
            </div>

            {/* 요일별 컬럼 */}
            {visibleDays.map((date, dayIndex) => {
              const dateStr = toKoreanDateString(date);
              const isToday = dateStr === today;
              const events = getEventsForDate(date);
              // Google Calendar 스타일 레이아웃 계산
              const eventLayout = calculateEventLayout(events);

              return (
                <div
                  key={dateStr}
                  className={`flex-1 relative border-r border-border last:border-r-0 ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                >
                  {/* 시간 슬롯 그리드 (10분 단위) */}
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className={`cursor-pointer transition-colors ${
                        slot.isHour
                          ? "border-t-2 border-border"
                          : slot.isHalf
                          ? "border-t border-border/50"
                          : "border-t border-dashed border-border/30"
                      } hover:bg-accent/40`}
                      style={{ height: `${40 / 3}px` }}
                      onClick={() => handleCellClick(date, slot.time)}
                    />
                  ))}

                  {/* 현재 시간 표시 */}
                  {isToday && isCurrentWeek && currentMinutes >= 0 && currentMinutes < (settings.endHour - settings.startHour) * 60 && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                      style={{
                        top: `${(currentMinutes / 10) * (40 / 3)}px`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                    </div>
                  )}

                  {/* 이벤트 블록 (Google Calendar 스타일) */}
                  {events.map((event) => {
                    const layout = eventLayout.get(event.block.id) || { column: 0, totalColumns: 1 };
                    const style = getEventStyle(event, layout);
                    const personProp = event.block.properties.find((p) => p.propertyType === "person");
                    const studentId = personProp?.value.type === "person" ? personProp.value.blockIds[0] : null;

                    // 정규/비정규 구분 (repeat 속성 여부)
                    const repeatProp = event.block.properties.find((p) => p.propertyType === "repeat");
                    const isRegular = repeatProp?.value.type === "repeat" && repeatProp.value.config !== null;

                    // 학생 연결 여부로 수업/일정 구분
                    const isLesson = studentId !== null;

                    // 색상 결정: 일정(학생 없음) → 파란색, 비정규 수업 → 노란색, 정규 수업 → 학년별
                    const color = !isLesson
                      ? GRADE_COLORS.일정
                      : !isRegular
                        ? GRADE_COLORS.특별일정
                        : getStudentGradeColor(studentId);

                    const bgColor = color.bg;
                    const borderColor = color.border;

                    // 과거 날짜인지 확인
                    const isPast = isPastDate(event.date);

                    return (
                      <div
                        key={event.block.id}
                        className="absolute rounded-md cursor-pointer transition-shadow hover:shadow-md overflow-hidden group"
                        style={{
                          ...style,
                          backgroundColor: bgColor,
                          borderLeft: `3px solid ${borderColor}`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // 이벤트 블록 클릭해도 모달 열림 (시작 시간은 이벤트 시작 시간)
                          handleCellClick(date, event.startTime);
                        }}
                      >
                        {/* 삭제 버튼 - 미래/오늘 수업만 표시 */}
                        {!isPast && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLesson(event.block.id, event.block);
                            }}
                            className="absolute top-0.5 right-0.5 w-4 h-4
                                       opacity-0 group-hover:opacity-100
                                       bg-white/80 rounded-full
                                       flex items-center justify-center
                                       text-muted-foreground hover:text-destructive hover:bg-white
                                       transition-opacity z-10"
                            aria-label="수업 삭제"
                          >
                            ×
                          </button>
                        )}
                        <div className="p-1 h-full flex flex-col overflow-hidden">
                          {/* 학생 이름 - 항상 표시 */}
                          <div
                            className="text-xs font-medium truncate leading-tight"
                            style={{ color: color.text }}
                            title={event.studentName || getBlockDisplayName(event.block) || "일정"}
                          >
                            {isLesson && isRegular && <span className="mr-0.5" title="정규 수업">↻</span>}
                            {event.studentName || getBlockDisplayName(event.block) || "일정"}
                          </div>
                          {/* 시간 - 공간 있을 때만 표시 */}
                          {event.duration >= 30 && (
                            <div
                              className="text-[10px] opacity-70 truncate"
                              style={{ color: color.text }}
                            >
                              {event.startTime}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 수업 추가/수정 모달 */}
      {showAddModal && addModalData && (
        <AddLessonModal
          date={addModalData.date}
          time={addModalData.time}
          overlapCount={addModalData.overlapCount}
          timeRange={addModalData.timeRange}
          overlappingEvents={addModalData.overlappingEvents}
          editingEvent={addModalData.editingEvent}
          studentBlocks={studentBlocks}
          settings={settings}
          blocks={blocks}
          onClose={() => {
            setShowAddModal(false);
            setAddModalData(null);
          }}
          onEditEvent={(event) => {
            // 수정 모드로 전환
            setAddModalData({
              ...addModalData,
              editingEvent: event,
              overlappingEvents: undefined,  // 수정 모드에서는 배너 숨김
            });
          }}
          onUpdate={(blockId, studentId, time, duration, isRegular) => {
            const block = blocks.find(b => b.id === blockId);
            if (!block) return;

            // 1. 날짜/시간 속성 업데이트
            const dateProp = block.properties.find(p => p.propertyType === "date");
            if (dateProp) {
              onUpdateProperty(blockId, dateProp.id, {
                type: "date",
                date: addModalData.date,
                time: time,
              });
            }

            // 2. 학생(person) 속성 업데이트
            const personProp = block.properties.find(p => p.propertyType === "person");
            if (personProp) {
              onUpdateProperty(blockId, personProp.id, {
                type: "person",
                blockIds: studentId ? [studentId] : [],
              });
            }

            // 3. 학생 이름으로 블록 이름 업데이트
            if (studentId) {
              const studentBlock = studentBlocks.find(b => b.id === studentId);
              if (studentBlock) {
                const studentName = getBlockDisplayName(studentBlock);
                onUpdateBlockName(blockId, studentName);
              }
            }

            // 4. 수업시간(duration) 업데이트
            const durationProp = block.properties.find(p => p.propertyType === "duration");
            if (durationProp) {
              onUpdateProperty(blockId, durationProp.id, {
                type: "duration",
                minutes: duration,
              });
            } else if (studentId) {
              // duration 속성이 없는 경우 학생 기본값과 다르면 추가
              const studentBlock = blocks.find(b => b.id === studentId);
              const studentDuration = studentBlock?.properties.find(p => p.propertyType === "duration");
              const studentDurationValue = studentDuration?.value.type === "duration" ? studentDuration.value.minutes : settings.defaultDuration;
              if (duration !== studentDurationValue) {
                onAddProperty(blockId, "duration", undefined, {
                  type: "duration",
                  minutes: duration,
                });
              }
            }

            // 5. 반복(repeat) 업데이트
            const repeatProp = block.properties.find(p => p.propertyType === "repeat");
            if (isRegular) {
              const lessonDate = new Date(addModalData.date);
              const repeatValue = {
                type: "repeat" as const,
                config: {
                  type: "weekly" as const,
                  interval: 1,
                  weekdays: [lessonDate.getDay()],
                },
              };
              if (repeatProp) {
                onUpdateProperty(blockId, repeatProp.id, repeatValue);
              } else {
                onAddProperty(blockId, "repeat", undefined, repeatValue);
              }
            } else if (repeatProp) {
              // 비정규로 변경 시 repeat 속성 제거 (null로 설정)
              onUpdateProperty(blockId, repeatProp.id, {
                type: "repeat",
                config: null,
              });
            }

            setShowAddModal(false);
            setAddModalData(null);
          }}
          onAdd={(studentId, time, duration, isRegular) => {
            // 새 블록 생성
            const newBlockId = onAddBlock();

            // 학생 이름 찾기
            const studentBlock = studentBlocks.find((b) => b.id === studentId);
            const studentName = studentBlock ? getBlockDisplayName(studentBlock) : "수업";

            // 블록 제목(name)에 학생 이름 설정
            onUpdateBlockName(newBlockId, studentName);

            // 날짜/시간 속성 추가
            onAddProperty(newBlockId, "date", undefined, {
              type: "date",
              date: addModalData.date,
              time: time,
            });

            // 학생 연결
            if (studentId) {
              onAddProperty(newBlockId, "person", undefined, {
                type: "person",
                blockIds: [studentId],
              });
            }

            // 수업 시간 (학생 기본값과 다른 경우만)
            if (studentBlock) {
              const studentDuration = studentBlock.properties.find((p) => p.propertyType === "duration");
              const studentDurationValue = studentDuration?.value.type === "duration" ? studentDuration.value.minutes : settings.defaultDuration;
              if (duration !== studentDurationValue) {
                onAddProperty(newBlockId, "duration", undefined, {
                  type: "duration",
                  minutes: duration,
                });
              }
            }

            // 정규 수업인 경우 repeat 속성 추가
            if (isRegular) {
              const lessonDate = new Date(addModalData.date);
              onAddProperty(newBlockId, "repeat", undefined, {
                type: "repeat",
                config: {
                  type: "weekly",
                  interval: 1,
                  weekdays: [lessonDate.getDay()], // 해당 요일 (0=일, 1=월, ..., 6=토)
                },
              });
            }

            setShowAddModal(false);
            setAddModalData(null);
          }}
          onAddEvent={(name, isAllDay, time, duration) => {
            const newBlockId = onAddBlock();
            onUpdateBlockName(newBlockId, name);

            // 하루 종일: date만 (time 없음), 시간 지정: date + time
            onAddProperty(newBlockId, "date", undefined, {
              type: "date",
              date: addModalData.date,
              ...(isAllDay ? {} : { time: time! }),
            });

            // 시간 지정이면 duration 추가
            if (!isAllDay && duration) {
              onAddProperty(newBlockId, "duration", undefined, {
                type: "duration",
                minutes: duration,
              });
            }

            setShowAddModal(false);
            setAddModalData(null);
          }}
        />
      )}
    </main>
  );
}

// 시간을 분으로 변환
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 수업 추가/수정 모달
function AddLessonModal({
  date,
  time,
  overlapCount,
  timeRange,
  overlappingEvents,
  editingEvent,
  studentBlocks,
  settings,
  blocks,
  onClose,
  onEditEvent,
  onUpdate,
  onAdd,
  onAddEvent,
}: {
  date: string;
  time: string;
  overlapCount?: number;
  timeRange?: { start: number; end: number } | null;
  overlappingEvents?: ScheduleEvent[];
  editingEvent?: ScheduleEvent;
  studentBlocks: Block[];
  settings: ScheduleSettings;
  blocks: Block[];
  onClose: () => void;
  onEditEvent: (event: ScheduleEvent) => void;
  onUpdate: (blockId: string, studentId: string, time: string, duration: number, isRegular: boolean) => void;
  onAdd: (studentId: string, time: string, duration: number, isRegular: boolean) => void;
  onAddEvent: (name: string, isAllDay: boolean, time?: string, duration?: number) => void;
}) {
  const isEditMode = !!editingEvent;

  // 수정 모드: 기존 값에서 학생 ID 추출
  const getInitialStudentId = () => {
    if (!editingEvent) return "";
    const personProp = editingEvent.block.properties.find(p => p.propertyType === "person");
    if (personProp?.value.type === "person" && personProp.value.blockIds.length > 0) {
      return personProp.value.blockIds[0];
    }
    return "";
  };

  // 수정 모드: 기존 반복 여부 확인
  const getInitialIsRegular = () => {
    if (!editingEvent) return true;
    const repeatProp = editingEvent.block.properties.find(p => p.propertyType === "repeat");
    return repeatProp?.value.type === "repeat" && repeatProp.value.config !== null;
  };

  type ModalTab = "lesson" | "event";
  const [activeTab, setActiveTab] = useState<ModalTab>("lesson");
  const [eventName, setEventName] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(getInitialStudentId);
  const [startTime, setStartTime] = useState(isEditMode ? editingEvent.startTime : time);
  const [duration, setDuration] = useState(isEditMode ? editingEvent.duration : settings.defaultDuration);
  const [isRegular, setIsRegular] = useState(getInitialIsRegular);

  // editingEvent가 변경될 때 state 업데이트 (수정 모드 전환 시)
  useEffect(() => {
    if (editingEvent) {
      setSelectedStudent(getInitialStudentId());
      setStartTime(editingEvent.startTime);
      setDuration(editingEvent.duration);
      setIsRegular(getInitialIsRegular());
    }
  }, [editingEvent]);

  // 클릭한 시간 기준 앞 3개 + 선택 시간 + 뒤 2개 (총 6개 버튼)
  const timeOptions = useMemo(() => {
    const clickedMinutes = timeToMinutes(time);
    const options: string[] = [];

    // 앞 3개: -30, -20, -10분 / 선택한 시간: 0 / 뒤 2개: +10, +20분
    for (let offset = -30; offset <= 20; offset += 10) {
      const m = clickedMinutes + offset;
      if (m >= 0 && m < 24 * 60) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        options.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
      }
    }

    return options;
  }, [time]);

  // 학생 선택 시 해당 학생의 기본 수업 시간으로 설정
  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const studentBlock = blocks.find((b) => b.id === studentId);
      const studentDuration = studentBlock?.properties.find((p) => p.propertyType === "duration");
      if (studentDuration?.value.type === "duration") {
        setDuration(studentDuration.value.minutes);
      } else {
        setDuration(settings.defaultDuration);
      }
    }
  };

  const dateObj = new Date(date);
  const dateText = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isEditMode ? (
          <h3 className="font-semibold text-lg mb-4">
            {editingEvent?.block.properties.some(p => p.propertyType === "person") ? "수업 수정" : "일정 수정"}
          </h3>
        ) : (
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("lesson")}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === "lesson"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              수업 추가
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("event")}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                activeTab === "event"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              일정 추가
            </button>
          </div>
        )}

        {/* 시간 충돌 경고 배너 - 기존 일정 클릭 시 수정 모드로 전환 */}
        {!isEditMode && overlappingEvents && overlappingEvents.length > 0 && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-800 mb-2">
              이 시간에 {overlappingEvents.length}개 일정이 있습니다
            </div>
            <div className="space-y-1">
              {overlappingEvents.map((event) => {
                const endMinutes = timeToMinutes(event.startTime) + event.duration;
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;
                const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;
                return (
                  <button
                    key={event.block.id}
                    onClick={() => onEditEvent(event)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-amber-100 text-sm text-amber-900 transition-colors"
                  >
                    {event.studentName || getBlockDisplayName(event.block) || "일정"} {event.startTime}~{endTime}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* 날짜 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
              {dateText}
            </div>
          </div>

          {(isEditMode || activeTab === "lesson") ? (
            <>
              {/* 학생 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학생
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">선택하세요</option>
                  {studentBlocks.map((student) => (
                    <option key={student.id} value={student.id}>
                      {getBlockDisplayName(student)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 시작 시간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 시간
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {timeOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStartTime(t)}
                      className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                        startTime === t
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 수업 시간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수업 시간
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {settings.durationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}분
                    </option>
                  ))}
                </select>
              </div>

              {/* 매주 반복 (정규 수업) */}
              <button
                type="button"
                onClick={() => setIsRegular(!isRegular)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    isRegular
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-400"
                  }`}
                >
                  {isRegular && "✓"}
                </span>
                <span className="text-sm text-gray-700">
                  매주 반복 (정규 수업)
                </span>
              </button>
            </>
          ) : (
            <>
              {/* 일정 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  일정 이름
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="일정 이름을 입력하세요"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* 종류: 하루 종일 / 시간 지정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종류
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAllDay(true)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      isAllDay
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    하루 종일
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllDay(false)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      !isAllDay
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    시간 지정
                  </button>
                </div>
              </div>

              {/* 시간 지정일 때만 시작 시간 + 소요 시간 */}
              {!isAllDay && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {timeOptions.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setStartTime(t)}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                            startTime === t
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      소요 시간
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {settings.durationOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}분
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (isEditMode && editingEvent) {
                onUpdate(editingEvent.block.id, selectedStudent, startTime, duration, isRegular);
              } else if (activeTab === "event") {
                onAddEvent(eventName.trim(), isAllDay, isAllDay ? undefined : startTime, isAllDay ? undefined : duration);
              } else {
                onAdd(selectedStudent, startTime, duration, isRegular);
              }
            }}
            disabled={activeTab === "lesson" || isEditMode ? !selectedStudent : !eventName.trim()}
            className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditMode ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
