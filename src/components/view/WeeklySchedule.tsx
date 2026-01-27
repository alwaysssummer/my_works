"use client";

import { useState, useMemo, useCallback } from "react";
import { Block } from "@/types/block";
import { ScheduleSettings } from "@/types/settings";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getBlockTitle } from "@/lib/blockParser";

interface WeeklyScheduleProps {
  blocks: Block[];
  settings: ScheduleSettings;
  onAddBlock: (afterId?: string) => string;
  onUpdateBlock: (id: string, content: string) => void;
  onAddProperty: (blockId: string, propertyId: string, type: string) => void;
  onUpdateProperty: (blockId: string, propertyId: string, value: unknown) => void;
  onSelectBlock: (blockId: string) => void;
}

interface ScheduleEvent {
  block: Block;
  date: string;
  startTime: string; // HH:mm
  duration: number; // 분
  studentName?: string;
}

// 학생 색상 팔레트
const STUDENT_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" }, // blue
  { bg: "#dcfce7", border: "#22c55e", text: "#166534" }, // green
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" }, // amber
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" }, // pink
  { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" }, // indigo
  { bg: "#fed7d7", border: "#f87171", text: "#991b1b" }, // red
  { bg: "#d1fae5", border: "#10b981", text: "#065f46" }, // emerald
  { bg: "#fef9c3", border: "#eab308", text: "#854d0e" }, // yellow
];

export function WeeklySchedule({
  blocks,
  settings,
  onAddBlock,
  onUpdateBlock,
  onAddProperty,
  onUpdateProperty,
  onSelectBlock,
}: WeeklyScheduleProps) {
  // 현재 주의 시작일 (월요일 기준)
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 월요일로 맞춤
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // 수업 추가 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalData, setAddModalData] = useState<{
    date: string;
    time: string;
  } | null>(null);

  // 학생 블록 목록 (person 속성이 있는 블록)
  const studentBlocks = useMemo(() => {
    return blocks.filter((b) =>
      b.properties.some((p) => p.propertyId === "person" || p.propertyId === "contact")
    );
  }, [blocks]);

  // 학생별 색상 매핑
  const studentColorMap = useMemo(() => {
    const map: Record<string, typeof STUDENT_COLORS[0]> = {};
    studentBlocks.forEach((block, index) => {
      map[block.id] = STUDENT_COLORS[index % STUDENT_COLORS.length];
    });
    return map;
  }, [studentBlocks]);

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

  // 시간 슬롯 배열
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = settings.startHour; hour < settings.endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, [settings.startHour, settings.endHour]);

  // 블록에서 수업 이벤트 추출
  const scheduleEvents = useMemo(() => {
    const events: ScheduleEvent[] = [];

    blocks.forEach((block) => {
      const dateProp = block.properties.find((p) => p.propertyId === "date");
      if (!dateProp || dateProp.value.type !== "date" || !dateProp.value.time) return;

      // 수업 시간 결정: 블록 duration > 학생 duration > 설정 기본값
      let duration = settings.defaultDuration;

      const blockDuration = block.properties.find((p) => p.propertyId === "duration");
      if (blockDuration?.value.type === "duration") {
        duration = blockDuration.value.minutes;
      } else {
        // 연결된 학생의 duration 확인
        const personProp = block.properties.find((p) => p.propertyId === "person");
        if (personProp?.value.type === "person" && personProp.value.blockIds.length > 0) {
          const studentBlock = blocks.find((b) => b.id === personProp.value.blockIds[0]);
          const studentDuration = studentBlock?.properties.find((p) => p.propertyId === "duration");
          if (studentDuration?.value.type === "duration") {
            duration = studentDuration.value.minutes;
          }
        }
      }

      // 학생 이름 찾기
      let studentName: string | undefined;
      const personProp = block.properties.find((p) => p.propertyId === "person");
      if (personProp?.value.type === "person" && personProp.value.blockIds.length > 0) {
        const studentBlock = blocks.find((b) => b.id === personProp.value.blockIds[0]);
        if (studentBlock) {
          studentName = studentBlock.content.replace(/<[^>]*>/g, "").trim() || undefined;
        }
      }

      events.push({
        block,
        date: dateProp.value.date,
        startTime: dateProp.value.time,
        duration,
        studentName,
      });
    });

    return events;
  }, [blocks, settings.defaultDuration]);

  // 특정 날짜의 이벤트 가져오기
  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return scheduleEvents.filter((e) => e.date === dateStr);
    },
    [scheduleEvents]
  );

  // 이벤트 위치 및 크기 계산
  const getEventStyle = useCallback(
    (event: ScheduleEvent, overlapIndex: number, overlapCount: number) => {
      const [hours, minutes] = event.startTime.split(":").map(Number);
      const startMinutes = (hours - settings.startHour) * 60 + minutes;
      const slotHeight = 40; // 30분당 40px
      const top = (startMinutes / 30) * slotHeight;
      const height = (event.duration / 30) * slotHeight;
      const width = 100 / overlapCount;
      const left = width * overlapIndex;

      return {
        top: `${top}px`,
        height: `${height}px`,
        width: `calc(${width}% - 4px)`,
        left: `calc(${left}% + 2px)`,
      };
    },
    [settings.startHour]
  );

  // 겹치는 이벤트 계산
  const getOverlapInfo = useCallback((events: ScheduleEvent[], targetEvent: ScheduleEvent) => {
    const targetStart = timeToMinutes(targetEvent.startTime);
    const targetEnd = targetStart + targetEvent.duration;

    const overlapping = events.filter((e) => {
      const start = timeToMinutes(e.startTime);
      const end = start + e.duration;
      return start < targetEnd && end > targetStart;
    });

    const index = overlapping.findIndex((e) => e.block.id === targetEvent.block.id);
    return { index, count: overlapping.length };
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

  // 오늘로 이동
  const goToToday = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  }, []);

  // 빈 영역 클릭 시 수업 추가
  const handleCellClick = useCallback((date: Date, time: string) => {
    const dateStr = date.toISOString().split("T")[0];
    setAddModalData({ date: dateStr, time });
    setShowAddModal(true);
  }, []);

  // 오늘 날짜
  const today = new Date().toISOString().split("T")[0];

  // 현재 시간 표시 (분 단위)
  const now = new Date();
  const currentMinutes = (now.getHours() - settings.startHour) * 60 + now.getMinutes();
  const isCurrentWeek = weekDays.some((d) => d.toISOString().split("T")[0] === today);

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

  const dayNames = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <main className="flex-1 h-screen overflow-hidden bg-background flex flex-col">
      {/* 헤더 */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📆</span>
          <span className="font-medium">주간 시간표</span>
        </div>
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
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* 요일 헤더 */}
          <div className="flex border-b border-border sticky top-0 bg-background z-10">
            <div className="w-16 flex-shrink-0 border-r border-border" />
            {weekDays.map((date, index) => {
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const isSunday = index === 6;
              const isSaturday = index === 5;

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
                    {dayNames[index]}
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

          {/* 시간 그리드 */}
          <div className="flex">
            {/* 시간 라벨 */}
            <div className="w-16 flex-shrink-0 border-r border-border">
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="h-10 flex items-start justify-end pr-2 text-xs text-muted-foreground"
                  style={{ marginTop: index === 0 ? 0 : undefined }}
                >
                  {time.endsWith(":00") && time}
                </div>
              ))}
            </div>

            {/* 요일별 컬럼 */}
            {weekDays.map((date, dayIndex) => {
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const events = getEventsForDate(date);

              return (
                <div
                  key={dateStr}
                  className={`flex-1 relative border-r border-border last:border-r-0 ${
                    isToday ? "bg-primary/5" : ""
                  }`}
                >
                  {/* 시간 슬롯 그리드 */}
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className={`h-10 border-b border-border/50 cursor-pointer hover:bg-accent/30 transition-colors ${
                        time.endsWith(":00") ? "border-b-border" : ""
                      }`}
                      onClick={() => handleCellClick(date, time)}
                    />
                  ))}

                  {/* 현재 시간 표시 */}
                  {isToday && isCurrentWeek && currentMinutes >= 0 && currentMinutes < (settings.endHour - settings.startHour) * 60 && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                      style={{
                        top: `${(currentMinutes / 30) * 40}px`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                    </div>
                  )}

                  {/* 이벤트 블록 */}
                  {events.map((event) => {
                    const { index, count } = getOverlapInfo(events, event);
                    const style = getEventStyle(event, index, count);
                    const personProp = event.block.properties.find((p) => p.propertyId === "person");
                    const studentId = personProp?.value.type === "person" ? personProp.value.blockIds[0] : null;

                    // 정규/비정규 구분 (repeat 속성 여부)
                    const repeatProp = event.block.properties.find((p) => p.propertyId === "repeat");
                    const isRegular = repeatProp?.value.type === "repeat" && repeatProp.value.config !== null;

                    // 학생 연결 여부로 수업/일정 구분
                    const isLesson = studentId !== null;

                    // 색상 결정: 학생 있으면 학생 색상, 없으면 일정 색상
                    const color = studentId
                      ? studentColorMap[studentId]
                      : { bg: "#f3f4f6", border: "#9ca3af", text: "#374151" }; // 일반 일정은 회색

                    // 비정규 수업은 연한 노란색 배경
                    const bgColor = isLesson && !isRegular
                      ? "#fef9c3" // 비정규 수업 - 연한 노란색
                      : color?.bg || "#dbeafe";
                    const borderColor = isLesson && !isRegular
                      ? "#eab308" // 비정규 수업 - 노란색 테두리
                      : color?.border || "#3b82f6";

                    return (
                      <div
                        key={event.block.id}
                        className="absolute rounded-md cursor-pointer transition-shadow hover:shadow-md overflow-hidden"
                        style={{
                          ...style,
                          backgroundColor: bgColor,
                          borderLeft: `3px solid ${borderColor}`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBlock(event.block.id);
                        }}
                      >
                        <div className="p-1.5 h-full">
                          <div className="flex items-center gap-1">
                            {/* 정규 수업 표시 */}
                            {isLesson && isRegular && (
                              <span className="text-[10px]" title="정규 수업">🔄</span>
                            )}
                            <div
                              className="text-xs font-medium truncate flex-1"
                              style={{ color: isLesson && !isRegular ? "#854d0e" : color?.text || "#1e40af" }}
                            >
                              {event.studentName ? (event.studentName.length > 15 ? event.studentName.slice(0, 15) + "..." : event.studentName) : getBlockTitle(event.block.content, 15) || "수업"}
                            </div>
                          </div>
                          <div
                            className="text-[10px] opacity-75"
                            style={{ color: isLesson && !isRegular ? "#854d0e" : color?.text || "#1e40af" }}
                          >
                            {event.startTime}
                            {isLesson && !isRegular && " (비정규)"}
                          </div>
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

      {/* 수업 추가 모달 */}
      {showAddModal && addModalData && (
        <AddLessonModal
          date={addModalData.date}
          time={addModalData.time}
          studentBlocks={studentBlocks}
          settings={settings}
          blocks={blocks}
          onClose={() => {
            setShowAddModal(false);
            setAddModalData(null);
          }}
          onAdd={(studentId, time, duration) => {
            // 새 블록 생성
            const newBlockId = onAddBlock();

            // 학생 이름 찾기
            const studentBlock = studentBlocks.find((b) => b.id === studentId);
            const studentName = studentBlock?.content.replace(/<[^>]*>/g, "").trim() || "수업";

            // 블록 내용 업데이트
            onUpdateBlock(newBlockId, studentName);

            // 날짜/시간 속성 추가
            onAddProperty(newBlockId, "date", "date");
            setTimeout(() => {
              onUpdateProperty(newBlockId, "date", {
                type: "date",
                date: addModalData.date,
                time: time,
              });
            }, 0);

            // 학생 연결
            if (studentId) {
              onAddProperty(newBlockId, "person", "person");
              setTimeout(() => {
                onUpdateProperty(newBlockId, "person", {
                  type: "person",
                  blockIds: [studentId],
                });
              }, 0);
            }

            // 수업 시간 (학생 기본값과 다른 경우만)
            if (studentBlock) {
              const studentDuration = studentBlock.properties.find((p) => p.propertyId === "duration");
              const studentDurationValue = studentDuration?.value.type === "duration" ? studentDuration.value.minutes : settings.defaultDuration;
              if (duration !== studentDurationValue) {
                onAddProperty(newBlockId, "duration", "duration");
                setTimeout(() => {
                  onUpdateProperty(newBlockId, "duration", {
                    type: "duration",
                    minutes: duration,
                  });
                }, 0);
              }
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

// 수업 추가 모달
function AddLessonModal({
  date,
  time,
  studentBlocks,
  settings,
  blocks,
  onClose,
  onAdd,
}: {
  date: string;
  time: string;
  studentBlocks: Block[];
  settings: ScheduleSettings;
  blocks: Block[];
  onClose: () => void;
  onAdd: (studentId: string, time: string, duration: number) => void;
}) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [startTime, setStartTime] = useState(time);
  const [duration, setDuration] = useState(settings.defaultDuration);

  // 학생 선택 시 해당 학생의 기본 수업 시간으로 설정
  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const studentBlock = blocks.find((b) => b.id === studentId);
      const studentDuration = studentBlock?.properties.find((p) => p.propertyId === "duration");
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-lg mb-4">수업 추가</h3>

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
                  {student.content.replace(/<[^>]*>/g, "").trim() || "이름 없음"}
                </option>
              ))}
            </select>
          </div>

          {/* 시작 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 시간
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
            onClick={() => onAdd(selectedStudent, startTime, duration)}
            disabled={!selectedStudent}
            className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
