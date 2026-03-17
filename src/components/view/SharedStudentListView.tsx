"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Block, BlockProperty } from "@/types/block";
import { ChevronLeft, ChevronRight, Search, X, Users, BookOpen, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMonthlyBillingSummary, getEnrollmentData } from "@/lib/propertyHelpers";

const GRADE_TABS = [
  { name: "중등", color: "#10b981" },
  { name: "고1", color: "#3b82f6" },
  { name: "고2", color: "#8b5cf6" },
  { name: "고3", color: "#ef4444" },
] as const;

function getStudentGrade(block: Block): string | undefined {
  const enrollProp = block.properties.find(p => p.propertyType === "enrollment");
  if (enrollProp?.value?.type === "enrollment") return enrollProp.value.grade;
  return undefined;
}

function getKoreanToday(): string {
  const d = new Date();
  const korean = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = korean.getFullYear();
  const m = String(korean.getMonth() + 1).padStart(2, "0");
  const day = String(korean.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getKoreanNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

interface SharedStudentListViewProps {
  blocks: Block[];
}

export function SharedStudentListView({ blocks }: SharedStudentListViewProps) {
  // 로컬 상태로 관리 (optimistic update)
  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocks);

  // 학생 블록만 필터링
  const studentBlocks = useMemo(() => {
    return localBlocks.filter((b) =>
      b.properties.some((p) => p.propertyType === "contact")
    );
  }, [localBlocks]);

  // Supabase 직접 업데이트 헬퍼
  const updateBlockProperties = useCallback(async (blockId: string, properties: BlockProperty[]) => {
    if (!supabase) return;
    await supabase
      .from("blocks")
      .update({ properties, updated_at: new Date().toISOString() })
      .eq("id", blockId);
  }, []);

  const getPlainText = (html: string) => {
    if (typeof window === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  // 학생의 수업 수 계산
  const getLessonCount = useCallback((studentId: string) => {
    return localBlocks.filter((b) => {
      const personProp = b.properties.find((p) => p.propertyType === "person");
      return personProp?.value?.type === "person" && personProp.value.blockIds.includes(studentId);
    }).length;
  }, [localBlocks]);

  // 검색 & 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [sortByDate, setSortByDate] = useState(false);

  // 날짜 유틸리티
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const isDateInRange = (dateStr: string | undefined, start: Date, end: Date) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date >= start && date <= end;
  };

  // 총 학생 수 & 이번달 신규
  const totalStats = useMemo(() => {
    const thisMonth = getKoreanToday().slice(0, 7);
    const newThisMonth = studentBlocks.filter((b) => {
      if (!b.createdAt) return false;
      const createdDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      const createdStr = new Date(createdDate.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
        .toISOString().slice(0, 7);
      return createdStr === thisMonth;
    }).length;
    return { total: studentBlocks.length, newThisMonth };
  }, [studentBlocks]);

  // 이번주 수업 횟수
  const weeklyLessons = useMemo(() => {
    const today = getKoreanNow();
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);

    return localBlocks.filter((b) => {
      const dateProp = b.properties.find((p) => p.propertyType === "date");
      const personProp = b.properties.find((p) => p.propertyType === "person");
      if (!dateProp || !personProp) return false;

      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;

      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [localBlocks]);

  // 지난주 수업 횟수
  const lastWeekLessons = useMemo(() => {
    const today = getKoreanNow();
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekStart = getWeekStart(lastWeekDate);
    const weekEnd = getWeekEnd(lastWeekDate);

    return localBlocks.filter((b) => {
      const dateProp = b.properties.find((p) => p.propertyType === "date");
      const personProp = b.properties.find((p) => p.propertyType === "person");
      if (!dateProp || !personProp) return false;

      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;

      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [localBlocks]);

  // 수강료 현황
  const [billingMonth, setBillingMonth] = useState(() => getKoreanToday().slice(0, 7));

  const billingSummary = useMemo(() => {
    return getMonthlyBillingSummary(studentBlocks, billingMonth);
  }, [studentBlocks, billingMonth]);

  const handlePrevMonth = useCallback(() => {
    setBillingMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const nm = m === 1 ? 12 : m - 1;
      const ny = m === 1 ? y - 1 : y;
      return `${ny}-${String(nm).padStart(2, "0")}`;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setBillingMonth((prev) => {
      const [y, m] = prev.split("-").map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      return `${ny}-${String(nm).padStart(2, "0")}`;
    });
  }, []);

  // 결제 토글 핸들러
  const handleTogglePayment = useCallback((student: Block, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;

    const value = enrollProp.value;
    const existing = value.records[billingMonth] || { enrolled: false };
    const newProperties = student.properties.map(p =>
      p.id === enrollProp.id
        ? {
            ...p,
            value: {
              ...value,
              records: {
                ...value.records,
                [billingMonth]: {
                  ...existing,
                  enrolled: !existing.enrolled,
                  ...(!existing.enrolled ? { actualDate: getKoreanToday() } : {}),
                },
              },
            },
          }
        : p
    ) as BlockProperty[];

    // Optimistic update
    setLocalBlocks(prev => prev.map(b => b.id === student.id ? { ...b, properties: newProperties } : b));
    updateBlockProperties(student.id, newProperties);
  }, [billingMonth, updateBlockProperties]);

  // 전미결 클릭: 가장 오래된 미결제 월을 결제 처리
  const handlePayPrevMonth = useCallback((student: Block, unpaidMonth: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;

    const value = enrollProp.value;
    const existing = value.records[unpaidMonth] || { enrolled: false };
    const newProperties = student.properties.map(p =>
      p.id === enrollProp.id
        ? {
            ...p,
            value: {
              ...value,
              records: {
                ...value.records,
                [unpaidMonth]: {
                  ...existing,
                  enrolled: true,
                  actualDate: getKoreanToday(),
                },
              },
            },
          }
        : p
    ) as BlockProperty[];

    // Optimistic update
    setLocalBlocks(prev => prev.map(b => b.id === student.id ? { ...b, properties: newProperties } : b));
    updateBlockProperties(student.id, newProperties);
  }, [updateBlockProperties]);

  // 학년별 분포
  const tagDistribution = useMemo(() => {
    const dist: Record<string, { count: number; color: string }> = {};
    GRADE_TABS.forEach((g) => {
      dist[g.name] = { count: 0, color: g.color };
    });
    dist["미지정"] = { count: 0, color: "#9CA3AF" };

    studentBlocks.forEach((b) => {
      const grade = getStudentGrade(b);
      if (grade && dist[grade]) {
        dist[grade].count += 1;
      } else {
        dist["미지정"].count += 1;
      }
    });

    return Object.entries(dist)
      .map(([name, data]) => ({ name, ...data }))
      .filter((d) => d.count > 0);
  }, [studentBlocks]);

  // 이전 미결제 월 확인
  const getFirstUnpaidPrevMonth = useCallback((enrollValue: { startDate: string; records: Record<string, { enrolled: boolean }> }, currentBillingMonth: string): string | null => {
    const startMonth = enrollValue.startDate.slice(0, 7);
    if (startMonth >= currentBillingMonth) return null;

    let [y, m] = startMonth.split("-").map(Number);
    const [endY, endM] = currentBillingMonth.split("-").map(Number);

    while (y < endY || (y === endY && m < endM)) {
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;
      if (enrollValue.records[monthKey]?.enrolled !== true) {
        return monthKey;
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return null;
  }, []);

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    return studentBlocks
      .filter((s) => {
        if (searchQuery) {
          const displayName = (s.name || getPlainText(s.content)).toLowerCase();
          if (!displayName.includes(searchQuery.toLowerCase())) return false;
        }
        if (selectedGrade !== null) {
          const gradeName = GRADE_TABS[selectedGrade].name;
          if (getStudentGrade(s) !== gradeName) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortByDate) {
          const getDayOfMonth = (s: Block) => {
            const ep = s.properties.find(p => p.propertyType === "enrollment");
            return ep?.value?.type === "enrollment" ? ep.value.dayOfMonth : 99;
          };
          return getDayOfMonth(a) - getDayOfMonth(b);
        }
        const getGradeIndex = (s: Block) => {
          const grade = getStudentGrade(s);
          if (!grade) return GRADE_TABS.length;
          const idx = GRADE_TABS.findIndex(g => g.name === grade);
          return idx === -1 ? GRADE_TABS.length : idx;
        };
        const gradeA = getGradeIndex(a);
        const gradeB = getGradeIndex(b);
        if (gradeA !== gradeB) return gradeA - gradeB;
        return getLessonCount(b.id) - getLessonCount(a.id);
      });
  }, [studentBlocks, searchQuery, selectedGrade, getLessonCount, sortByDate]);

  const maxTagCount = Math.max(...tagDistribution.map((t) => t.count), 1);
  const weekDiff = weeklyLessons - lastWeekLessons;

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* 상단 안내 배너 */}
      <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 text-center">
        <span className="text-sm text-blue-700 font-medium">
          공유된 학생 목록
        </span>
      </div>

      {/* 모바일 컴팩트 요약 바 */}
      <div className="lg:hidden px-4 py-2 border-b border-border bg-card flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{billingSummary.totalFee}({billingSummary.activeCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-green-600 font-medium">{billingSummary.paidFee}({billingSummary.paidCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className={`font-medium ${billingSummary.unpaidFee > 0 ? "text-red-500" : "text-green-600"}`}>{billingSummary.unpaidFee}({billingSummary.activeCount - billingSummary.paidCount})</span>
        <span className="text-muted-foreground">만원</span>
      </div>

      {/* 2단 레이아웃: 목록 + 통계 */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 좌: 학생 목록 */}
        <div className="flex-1 flex flex-col">
          {/* 학년 탭 필터 */}
          <div className="border-b border-border">
            <div className="flex">
              <button
                onClick={() => setSelectedGrade(null)}
                className={`flex-1 py-2.5 text-sm text-center transition-colors relative ${
                  selectedGrade === null
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                전체
                <span className="ml-1 text-xs opacity-70">{studentBlocks.length}</span>
                {selectedGrade === null && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
              {GRADE_TABS.map((grade, idx) => {
                const count = studentBlocks.filter((b) => getStudentGrade(b) === grade.name).length;
                return (
                  <button
                    key={grade.name}
                    onClick={() => setSelectedGrade(selectedGrade === idx ? null : idx)}
                    className={`flex-1 py-2.5 text-sm text-center transition-colors relative ${
                      selectedGrade === idx
                        ? "font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={selectedGrade === idx ? { color: grade.color } : undefined}
                  >
                    {grade.name}
                    <span className="ml-1 text-xs opacity-70">{count}</span>
                    {selectedGrade === idx && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: grade.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 검색 */}
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 목록 헤더 */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-3">
            <span className="text-sm text-muted-foreground flex-1">
              전체 {filteredStudents.length}명
            </span>
            <button
              onClick={() => setSortByDate(prev => !prev)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                sortByDate
                  ? "bg-blue-100 text-blue-600 font-medium"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              날짜별
            </button>
            <span className="text-xs text-muted-foreground">
              {parseInt(billingMonth.split("-")[1], 10)}월 결제
            </span>
          </div>

          {/* 학생 목록 */}
          <div className="divide-y divide-border flex-1 overflow-auto">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const lessonCount = getLessonCount(student.id);

                const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
                const enrollValue = enrollProp?.value?.type === "enrollment" ? enrollProp.value : null;
                const isPaid = enrollValue ? enrollValue.records[billingMonth]?.enrolled === true : false;
                const firstUnpaidPrev = enrollValue ? getFirstUnpaidPrevMonth(enrollValue, billingMonth) : null;

                return (
                  <div
                    key={student.id}
                    className="px-4 py-1.5 flex items-center gap-3"
                  >
                    {/* 이름 */}
                    <span className="font-medium truncate shrink-0">
                      {student.name || getPlainText(student.content) || "이름 없음"}
                    </span>
                    {/* 학년 배지 */}
                    {(() => {
                      const grade = getStudentGrade(student);
                      const gradeTab = grade ? GRADE_TABS.find(g => g.name === grade) : null;
                      return gradeTab ? (
                        <span
                          className="px-2 py-0.5 text-xs rounded-full shrink-0"
                          style={{
                            backgroundColor: `${gradeTab.color}20`,
                            color: gradeTab.color,
                          }}
                        >
                          {gradeTab.name}
                        </span>
                      ) : null;
                    })()}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {lessonCount}회
                    </span>
                    {enrollValue && (
                      <>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {enrollValue.fee}만원·{enrollValue.dayOfMonth}일
                        </span>
                        {firstUnpaidPrev && (
                          <button
                            onClick={(e) => handlePayPrevMonth(student, firstUnpaidPrev, e)}
                            className="ml-auto px-2 py-0.5 text-xs rounded-full font-medium transition-colors shrink-0 bg-orange-100 text-orange-600 hover:bg-orange-200"
                            title={`${parseInt(firstUnpaidPrev.split("-")[1], 10)}월 미결제`}
                          >
                            전미결
                          </button>
                        )}
                        <button
                          onClick={(e) => handleTogglePayment(student, e)}
                          className={`${firstUnpaidPrev ? "" : "ml-auto "}px-2 py-0.5 text-xs rounded-full font-medium transition-colors shrink-0 ${
                            isPaid
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-50 text-red-500 hover:bg-red-100"
                          }`}
                        >
                          {isPaid ? "✓ 결제" : "미결제"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            ) : studentBlocks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">등록된 학생이 없어요</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">검색 결과가 없어요</p>
              </div>
            )}
          </div>
        </div>

        {/* 우: 통계 사이드바 (데스크톱) */}
        <aside className="hidden lg:block w-[22rem] border-l border-border lg:overflow-auto shrink-0">
          <div className="sticky top-0 p-4 space-y-4">
            {/* 요약 통계 카드 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">총 학생</span>
                </div>
                <div className="text-xl font-bold">{totalStats.total}명</div>
                {totalStats.newThisMonth > 0 && (
                  <div className="text-xs text-green-600">+{totalStats.newThisMonth} 이번달</div>
                )}
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="text-xs">이번주 수업</span>
                </div>
                <div className="text-xl font-bold">{weeklyLessons}회</div>
                <div className={`text-xs ${weekDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {weekDiff >= 0 ? "+" : ""}{weekDiff} 지난주 대비
                </div>
              </div>
            </div>

            {/* 수강료 현황 */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                  수강료
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-0.5 rounded hover:bg-accent transition-colors"
                    aria-label="이전 월"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm font-medium min-w-[4rem] text-center">
                    {parseInt(billingMonth.split("-")[1], 10)}월
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-0.5 rounded hover:bg-accent transition-colors"
                    aria-label="다음 월"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {billingSummary.activeCount > 0 ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">총 수강료</span>
                      <span className="font-medium">{billingSummary.totalFee}만원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">결제</span>
                      <span className="font-medium text-green-600">{billingSummary.paidFee}만원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">미결제</span>
                      <span className={`font-medium ${billingSummary.unpaidFee > 0 ? "text-red-500" : "text-green-600"}`}>
                        {billingSummary.unpaidFee > 0 ? `${billingSummary.unpaidFee}만원` : "완납"}
                      </span>
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>결제 현황</span>
                      <span>{billingSummary.paidCount}/{billingSummary.activeCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-green-500"
                        style={{
                          width: `${(billingSummary.paidCount / billingSummary.activeCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  수강료 데이터가 없어요
                </p>
              )}
            </div>

            {/* 학년별 분포 */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <span>▦</span> 학년별 분포
              </h3>
              {tagDistribution.length > 0 ? (
                <div className="space-y-2">
                  {tagDistribution.map(({ name, count, color }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs w-12 truncate">{name}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${(count / maxTagCount) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {count}명
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  학년이 지정된 학생이 없어요
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
