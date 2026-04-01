"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Block, BlockProperty } from "@/types/block";
import { PropertyValue, EnrollmentRecord } from "@/types/property";
import { ChevronLeft, ChevronRight, Search, X, Users, BookOpen, DollarSign, ArrowLeft, Phone, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMonthlyBillingSummary, generateMonthRange, getScheduledDate, getEnrollmentSummary } from "@/lib/propertyHelpers";

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

// ─── 학생 상세 편집 패널 ─────────────────────────────────
interface StudentDetailProps {
  student: Block;
  allBlocks: Block[];
  onUpdate: (blockId: string, properties: BlockProperty[]) => void;
  onUpdateName: (blockId: string, name: string) => void;
  onBack: () => void;
}

function StudentDetail({ student, allBlocks, onUpdate, onUpdateName, onBack }: StudentDetailProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(student.name || "");

  // student 변경 시 이름 동기화
  useEffect(() => {
    setNameValue(student.name || "");
    setEditingName(false);
  }, [student.id, student.name]);

  const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
  const enrollValue = enrollProp?.value?.type === "enrollment" ? enrollProp.value : null;
  const contactProp = student.properties.find(p => p.propertyType === "contact");
  const contactValue = contactProp?.value?.type === "contact" ? contactProp.value : null;

  const months = useMemo(() => enrollValue ? generateMonthRange(enrollValue.startDate) : [], [enrollValue]);
  const summary = useMemo(() => enrollValue ? getEnrollmentSummary(enrollValue) : null, [enrollValue]);

  // 수업 수 계산
  const lessonCount = useMemo(() => {
    return allBlocks.filter(b => {
      const personProp = b.properties.find(p => p.propertyType === "person");
      return personProp?.value?.type === "person" && personProp.value.blockIds.includes(student.id);
    }).length;
  }, [allBlocks, student.id]);

  const updateEnrollmentField = useCallback((partial: Partial<Extract<PropertyValue, { type: "enrollment" }>>) => {
    if (!enrollProp || !enrollValue) return;
    const newProps = student.properties.map(p =>
      p.id === enrollProp.id ? { ...p, value: { ...enrollValue, ...partial } } : p
    ) as BlockProperty[];
    onUpdate(student.id, newProps);
  }, [student, enrollProp, enrollValue, onUpdate]);

  const updateRecord = useCallback((month: string, updates: Partial<EnrollmentRecord>) => {
    if (!enrollProp || !enrollValue) return;
    const existing = enrollValue.records[month] || { enrolled: false };
    const newProps = student.properties.map(p =>
      p.id === enrollProp.id
        ? { ...p, value: { ...enrollValue, records: { ...enrollValue.records, [month]: { ...existing, ...updates } } } }
        : p
    ) as BlockProperty[];
    onUpdate(student.id, newProps);
  }, [student, enrollProp, enrollValue, onUpdate]);

  const updateContactField = useCallback((partial: Partial<{ phone: string; email: string }>) => {
    if (!contactProp || !contactValue) return;
    const newProps = student.properties.map(p =>
      p.id === contactProp.id ? { ...p, value: { ...contactValue, ...partial } } : p
    ) as BlockProperty[];
    onUpdate(student.id, newProps);
  }, [student, contactProp, contactValue, onUpdate]);

  const handleNameSave = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== student.name) {
      onUpdateName(student.id, trimmed);
    }
    setEditingName(false);
  }, [nameValue, student, onUpdateName]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y.slice(2)}.${m}`;
  };

  const formatDay = (dateStr: string) => {
    const parts = dateStr.split("-");
    return `${parts[1]}/${parts[2]}`;
  };

  const grade = getStudentGrade(student);
  const gradeTab = grade ? GRADE_TABS.find(g => g.name === grade) : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="lg:hidden p-1 -ml-1 hover:bg-accent rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={e => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") setEditingName(false); }}
              className="text-lg font-bold w-full bg-transparent border-b-2 border-blue-500 outline-none py-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-lg font-bold truncate text-left hover:text-blue-600 transition-colors"
            >
              {student.name || "이름 없음"}
            </button>
          )}
        </div>
        {gradeTab && (
          <span
            className="px-3 py-1 text-xs rounded-full shrink-0 font-medium"
            style={{ backgroundColor: `${gradeTab.color}20`, color: gradeTab.color }}
          >
            {gradeTab.name}
          </span>
        )}
        <span className="text-sm text-muted-foreground shrink-0">{lessonCount}회</span>
      </div>

      {/* 본문 스크롤 영역 */}
      <div className="flex-1 overflow-auto">
        {/* 연락처 섹션 */}
        {contactValue && (
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">연락처</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="tel"
                  value={contactValue.phone || ""}
                  onChange={e => updateContactField({ phone: e.target.value })}
                  placeholder="전화번호"
                  className="flex-1 text-sm bg-accent/30 border border-border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={contactValue.email || ""}
                  onChange={e => updateContactField({ email: e.target.value })}
                  placeholder="이메일"
                  className="flex-1 text-sm bg-accent/30 border border-border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 수강등록 섹션 */}
        {enrollValue && (
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <span>📋</span> 수강등록
            </h3>

            {/* 학년 선택 */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">학년</span>
              {GRADE_TABS.map(g => (
                <button
                  key={g.name}
                  onClick={() => updateEnrollmentField({ grade: enrollValue.grade === g.name ? undefined : g.name })}
                  className="px-3 py-1 text-xs rounded-full transition-colors"
                  style={{
                    backgroundColor: enrollValue.grade === g.name ? g.color : `${g.color}20`,
                    color: enrollValue.grade === g.name ? "white" : g.color,
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* 설정 */}
            <div className="space-y-2 mb-3">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">수업료</span>
                  <input
                    type="number"
                    value={enrollValue.fee || ""}
                    onChange={e => updateEnrollmentField({ fee: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="bg-accent/30 border border-border rounded px-2 py-1 text-xs w-20 text-right"
                  />
                  <span className="text-xs text-muted-foreground">만원</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">등록일 매월</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={enrollValue.dayOfMonth}
                    onChange={e => {
                      const v = Math.max(1, Math.min(31, parseInt(e.target.value) || 1));
                      updateEnrollmentField({ dayOfMonth: v });
                    }}
                    className="bg-accent/30 border border-border rounded px-2 py-1 text-xs w-14 text-right"
                  />
                  <span className="text-xs text-muted-foreground">일</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">최초등록</span>
                <input
                  type="date"
                  value={enrollValue.startDate}
                  onChange={e => { if (e.target.value) updateEnrollmentField({ startDate: e.target.value }); }}
                  className="bg-accent/30 border border-border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>

            {/* 월별 테이블 */}
            {months.length > 0 && (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-xs border-collapse min-w-[360px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-1 px-2 text-left font-normal">월</th>
                      <th className="py-1 px-1 text-center font-normal w-8">✓</th>
                      <th className="py-1 px-2 text-left font-normal">예정일</th>
                      <th className="py-1 px-2 text-left font-normal">실제등록일</th>
                      <th className="py-1 px-2 text-right font-normal">수업료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map(month => {
                      const record = enrollValue.records[month] || { enrolled: false };
                      const scheduled = getScheduledDate(month, enrollValue.dayOfMonth);
                      const monthFee = record.fee ?? enrollValue.fee;

                      return (
                        <tr key={month} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="py-1.5 px-2 text-muted-foreground">{formatMonth(month)}</td>
                          <td className="py-1.5 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={record.enrolled}
                              onChange={e => updateRecord(month, {
                                enrolled: e.target.checked,
                                ...(e.target.checked ? { actualDate: getKoreanToday() } : {}),
                              })}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-muted-foreground">{formatDay(scheduled)}</td>
                          <td className="py-1.5 px-2">
                            {record.enrolled ? (
                              <input
                                type="date"
                                value={record.actualDate || ""}
                                onChange={e => updateRecord(month, { actualDate: e.target.value })}
                                className="bg-transparent border-b border-border/50 text-xs w-28 outline-none focus:border-blue-500"
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {record.enrolled ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={record.fee ?? ""}
                                  onChange={e => {
                                    const v = e.target.value;
                                    updateRecord(month, { fee: v ? parseInt(v) : undefined });
                                  }}
                                  placeholder={String(enrollValue.fee)}
                                  className="bg-transparent border-b border-border/50 text-xs w-12 text-right outline-none focus:border-blue-500"
                                />
                                <span className="text-muted-foreground">만원</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{monthFee}만원</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 요약 */}
            {summary && (
              <div className="mt-2 text-xs text-muted-foreground">
                등록 {summary.enrolledMonths}/{summary.totalMonths}개월 · 총 {summary.totalFee}만원
              </div>
            )}
          </div>
        )}

        {/* 수강등록 속성이 없는 경우 */}
        {!enrollValue && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            수강등록 정보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 뷰 ─────────────────────────────────────────────
export function SharedStudentListView({ blocks }: SharedStudentListViewProps) {
  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocks);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentBlocks = useMemo(() => {
    return localBlocks.filter(b => b.properties.some(p => p.propertyType === "contact"));
  }, [localBlocks]);

  // Supabase 업데이트 헬퍼
  const updateBlockProperties = useCallback(async (blockId: string, properties: BlockProperty[]) => {
    // Optimistic update
    setLocalBlocks(prev => prev.map(b => b.id === blockId ? { ...b, properties } : b));
    if (!supabase) return;
    await supabase.from("blocks").update({ properties, updated_at: new Date().toISOString() }).eq("id", blockId);
  }, []);

  const updateBlockName = useCallback(async (blockId: string, name: string) => {
    setLocalBlocks(prev => prev.map(b => b.id === blockId ? { ...b, name } : b));
    if (!supabase) return;
    await supabase.from("blocks").update({ name, updated_at: new Date().toISOString() }).eq("id", blockId);
  }, []);

  const getPlainText = (html: string) => {
    if (typeof window === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const getLessonCount = useCallback((studentId: string) => {
    return localBlocks.filter(b => {
      const personProp = b.properties.find(p => p.propertyType === "person");
      return personProp?.value?.type === "person" && personProp.value.blockIds.includes(studentId);
    }).length;
  }, [localBlocks]);

  // 검색 & 필터
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

  // 통계
  const totalStats = useMemo(() => {
    const thisMonth = getKoreanToday().slice(0, 7);
    const newThisMonth = studentBlocks.filter(b => {
      if (!b.createdAt) return false;
      const createdDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      const createdStr = new Date(createdDate.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
        .toISOString().slice(0, 7);
      return createdStr === thisMonth;
    }).length;
    return { total: studentBlocks.length, newThisMonth };
  }, [studentBlocks]);

  const weeklyLessons = useMemo(() => {
    const today = getKoreanNow();
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);
    return localBlocks.filter(b => {
      const dateProp = b.properties.find(p => p.propertyType === "date");
      const personProp = b.properties.find(p => p.propertyType === "person");
      if (!dateProp || !personProp) return false;
      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;
      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [localBlocks]);

  const lastWeekLessons = useMemo(() => {
    const today = getKoreanNow();
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekStart = getWeekStart(lastWeekDate);
    const weekEnd = getWeekEnd(lastWeekDate);
    return localBlocks.filter(b => {
      const dateProp = b.properties.find(p => p.propertyType === "date");
      const personProp = b.properties.find(p => p.propertyType === "person");
      if (!dateProp || !personProp) return false;
      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;
      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [localBlocks]);

  // 수강료
  const [billingMonth, setBillingMonth] = useState(() => getKoreanToday().slice(0, 7));
  const billingSummary = useMemo(() => getMonthlyBillingSummary(studentBlocks, billingMonth), [studentBlocks, billingMonth]);

  const handlePrevMonth = useCallback(() => {
    setBillingMonth(prev => {
      const [y, m] = prev.split("-").map(Number);
      const nm = m === 1 ? 12 : m - 1;
      const ny = m === 1 ? y - 1 : y;
      return `${ny}-${String(nm).padStart(2, "0")}`;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setBillingMonth(prev => {
      const [y, m] = prev.split("-").map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      return `${ny}-${String(nm).padStart(2, "0")}`;
    });
  }, []);

  // 결제 토글
  const handleTogglePayment = useCallback((student: Block, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;
    const value = enrollProp.value;
    const existing = value.records[billingMonth] || { enrolled: false };
    const newProperties = student.properties.map(p =>
      p.id === enrollProp.id
        ? { ...p, value: { ...value, records: { ...value.records, [billingMonth]: { ...existing, enrolled: !existing.enrolled, ...(!existing.enrolled ? { actualDate: getKoreanToday() } : {}) } } } }
        : p
    ) as BlockProperty[];
    setLocalBlocks(prev => prev.map(b => b.id === student.id ? { ...b, properties: newProperties } : b));
    if (supabase) supabase.from("blocks").update({ properties: newProperties, updated_at: new Date().toISOString() }).eq("id", student.id);
  }, [billingMonth]);

  // 전미결 결제
  const handlePayPrevMonth = useCallback((student: Block, unpaidMonth: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;
    const value = enrollProp.value;
    const existing = value.records[unpaidMonth] || { enrolled: false };
    const newProperties = student.properties.map(p =>
      p.id === enrollProp.id
        ? { ...p, value: { ...value, records: { ...value.records, [unpaidMonth]: { ...existing, enrolled: true, actualDate: getKoreanToday() } } } }
        : p
    ) as BlockProperty[];
    setLocalBlocks(prev => prev.map(b => b.id === student.id ? { ...b, properties: newProperties } : b));
    if (supabase) supabase.from("blocks").update({ properties: newProperties, updated_at: new Date().toISOString() }).eq("id", student.id);
  }, []);

  // 학년별 분포
  const tagDistribution = useMemo(() => {
    const dist: Record<string, { count: number; color: string }> = {};
    GRADE_TABS.forEach(g => { dist[g.name] = { count: 0, color: g.color }; });
    dist["미지정"] = { count: 0, color: "#9CA3AF" };
    studentBlocks.forEach(b => {
      const grade = getStudentGrade(b);
      if (grade && dist[grade]) dist[grade].count += 1;
      else dist["미지정"].count += 1;
    });
    return Object.entries(dist).map(([name, data]) => ({ name, ...data })).filter(d => d.count > 0);
  }, [studentBlocks]);

  // 이전 미결제 월
  const getFirstUnpaidPrevMonth = useCallback((enrollValue: { startDate: string; records: Record<string, { enrolled: boolean }> }, currentBillingMonth: string): string | null => {
    const startMonth = enrollValue.startDate.slice(0, 7);
    if (startMonth >= currentBillingMonth) return null;
    let [y, m] = startMonth.split("-").map(Number);
    const [endY, endM] = currentBillingMonth.split("-").map(Number);
    while (y < endY || (y === endY && m < endM)) {
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;
      if (enrollValue.records[monthKey]?.enrolled !== true) return monthKey;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return null;
  }, []);

  // 필터링
  const filteredStudents = useMemo(() => {
    return studentBlocks
      .filter(s => {
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

  const maxTagCount = Math.max(...tagDistribution.map(t => t.count), 1);
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

  // 선택된 학생 블록
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return localBlocks.find(b => b.id === selectedStudentId) || null;
  }, [selectedStudentId, localBlocks]);

  // 모바일에서 학생 선택 시 상세 화면 표시
  const showDetail = selectedStudent !== null;
  const showMobileDetail = isMobile && showDetail;

  return (
    <main className="min-h-screen bg-background">
      {/* 상단 안내 배너 */}
      <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 text-center">
        <span className="text-sm text-blue-700 font-medium">
          공유된 학생 목록
        </span>
      </div>

      {/* 모바일: 학생 상세 전체화면 */}
      {showMobileDetail && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-center">
              <span className="text-sm text-blue-700 font-medium">학생 정보</span>
            </div>
            <StudentDetail
              student={selectedStudent}
              allBlocks={localBlocks}
              onUpdate={updateBlockProperties}
              onUpdateName={updateBlockName}
              onBack={() => setSelectedStudentId(null)}
            />
          </div>
        </div>
      )}

      {/* 모바일 컴팩트 요약 바 */}
      <div className="lg:hidden px-4 py-2 border-b border-border bg-card flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{billingSummary.totalFee}({billingSummary.activeCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-green-600 font-medium">{billingSummary.paidFee}({billingSummary.paidCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className={`font-medium ${billingSummary.unpaidFee > 0 ? "text-red-500" : "text-green-600"}`}>{billingSummary.unpaidFee}({billingSummary.activeCount - billingSummary.paidCount})</span>
        <span className="text-muted-foreground">만원</span>
      </div>

      {/* 2~3단 레이아웃 */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 좌: 학생 목록 */}
        <div className={`flex-1 flex flex-col ${showDetail && !isMobile ? "lg:max-w-sm lg:shrink-0" : ""}`}>
          {/* 학년 탭 */}
          <div className="border-b border-border">
            <div className="flex">
              <button
                onClick={() => setSelectedGrade(null)}
                className={`flex-1 py-2.5 text-sm text-center transition-colors relative ${selectedGrade === null ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                전체<span className="ml-1 text-xs opacity-70">{studentBlocks.length}</span>
                {selectedGrade === null && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
              {GRADE_TABS.map((grade, idx) => {
                const count = studentBlocks.filter(b => getStudentGrade(b) === grade.name).length;
                return (
                  <button
                    key={grade.name}
                    onClick={() => setSelectedGrade(selectedGrade === idx ? null : idx)}
                    className={`flex-1 py-2.5 text-sm text-center transition-colors relative ${selectedGrade === idx ? "font-medium" : "text-muted-foreground hover:text-foreground"}`}
                    style={selectedGrade === idx ? { color: grade.color } : undefined}
                  >
                    {grade.name}<span className="ml-1 text-xs opacity-70">{count}</span>
                    {selectedGrade === idx && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: grade.color }} />}
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
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 목록 헤더 */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-3">
            <span className="text-sm text-muted-foreground flex-1">전체 {filteredStudents.length}명</span>
            <button
              onClick={() => setSortByDate(prev => !prev)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${sortByDate ? "bg-blue-100 text-blue-600 font-medium" : "text-muted-foreground hover:bg-accent"}`}
            >
              날짜별
            </button>
            <span className="text-xs text-muted-foreground">{parseInt(billingMonth.split("-")[1], 10)}월 결제</span>
          </div>

          {/* 학생 목록 */}
          <div className="divide-y divide-border flex-1 overflow-auto">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => {
                const lessonCount = getLessonCount(student.id);
                const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
                const enrollValue = enrollProp?.value?.type === "enrollment" ? enrollProp.value : null;
                const isPaid = enrollValue ? enrollValue.records[billingMonth]?.enrolled === true : false;
                const firstUnpaidPrev = enrollValue ? getFirstUnpaidPrevMonth(enrollValue, billingMonth) : null;
                const isSelected = selectedStudentId === student.id;

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`px-4 py-1.5 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="font-medium truncate shrink-0">
                      {student.name || getPlainText(student.content) || "이름 없음"}
                    </span>
                    {(() => {
                      const grade = getStudentGrade(student);
                      const gradeTab = grade ? GRADE_TABS.find(g => g.name === grade) : null;
                      return gradeTab ? (
                        <span className="px-2 py-0.5 text-xs rounded-full shrink-0" style={{ backgroundColor: `${gradeTab.color}20`, color: gradeTab.color }}>
                          {gradeTab.name}
                        </span>
                      ) : null;
                    })()}
                    <span className="text-xs text-muted-foreground shrink-0">{lessonCount}회</span>
                    {enrollValue && (
                      <>
                        <span className="text-xs text-muted-foreground shrink-0">{enrollValue.fee}만원·{enrollValue.dayOfMonth}일</span>
                        {firstUnpaidPrev && (
                          <button
                            onClick={e => handlePayPrevMonth(student, firstUnpaidPrev, e)}
                            className="ml-auto px-2 py-0.5 text-xs rounded-full font-medium transition-colors shrink-0 bg-orange-100 text-orange-600 hover:bg-orange-200"
                            title={`${parseInt(firstUnpaidPrev.split("-")[1], 10)}월 미결제`}
                          >
                            전미결
                          </button>
                        )}
                        <button
                          onClick={e => handleTogglePayment(student, e)}
                          className={`${firstUnpaidPrev ? "" : "ml-auto "}px-2 py-0.5 text-xs rounded-full font-medium transition-colors shrink-0 ${isPaid ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                        >
                          {isPaid ? "✓ 결제" : "미결제"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            ) : studentBlocks.length === 0 ? (
              <div className="text-center py-12"><p className="text-muted-foreground">등록된 학생이 없어요</p></div>
            ) : (
              <div className="text-center py-8"><p className="text-muted-foreground">검색 결과가 없어요</p></div>
            )}
          </div>
        </div>

        {/* 중앙: 학생 상세 (데스크톱) */}
        {showDetail && !isMobile && selectedStudent && (
          <div className="hidden lg:flex flex-col flex-1 border-l border-border overflow-hidden">
            <StudentDetail
              key={selectedStudentId}
              student={selectedStudent}
              allBlocks={localBlocks}
              onUpdate={updateBlockProperties}
              onUpdateName={updateBlockName}
              onBack={() => setSelectedStudentId(null)}
            />
          </div>
        )}

        {/* 데스크톱에서 미선택 시 안내 */}
        {!showDetail && (
          <div className="hidden lg:flex flex-col flex-1 border-l border-border items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">←</div>
              <p className="text-sm">학생을 선택하면 상세 정보를 볼 수 있어요</p>
            </div>
          </div>
        )}

        {/* 우: 통계 사이드바 (데스크톱) */}
        <aside className="hidden lg:block w-[22rem] border-l border-border lg:overflow-auto shrink-0">
          <div className="sticky top-0 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Users className="w-3.5 h-3.5" /><span className="text-xs">총 학생</span>
                </div>
                <div className="text-xl font-bold">{totalStats.total}명</div>
                {totalStats.newThisMonth > 0 && <div className="text-xs text-green-600">+{totalStats.newThisMonth} 이번달</div>}
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <BookOpen className="w-3.5 h-3.5" /><span className="text-xs">이번주 수업</span>
                </div>
                <div className="text-xl font-bold">{weeklyLessons}회</div>
                <div className={`text-xs ${weekDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {weekDiff >= 0 ? "+" : ""}{weekDiff} 지난주 대비
                </div>
              </div>
            </div>

            {/* 수강료 */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />수강료
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="p-0.5 rounded hover:bg-accent transition-colors" aria-label="이전 월">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm font-medium min-w-[4rem] text-center">{parseInt(billingMonth.split("-")[1], 10)}월</span>
                  <button onClick={handleNextMonth} className="p-0.5 rounded hover:bg-accent transition-colors" aria-label="다음 월">
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
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>결제 현황</span><span>{billingSummary.paidCount}/{billingSummary.activeCount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all bg-green-500" style={{ width: `${(billingSummary.paidCount / billingSummary.activeCount) * 100}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">수강료 데이터가 없어요</p>
              )}
            </div>

            {/* 학년별 분포 */}
            <div className="p-3 rounded-xl border border-border bg-card">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><span>▦</span> 학년별 분포</h3>
              {tagDistribution.length > 0 ? (
                <div className="space-y-2">
                  {tagDistribution.map(({ name, count, color }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs w-12 truncate">{name}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full rounded transition-all" style={{ width: `${(count / maxTagCount) * 100}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}명</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">학년이 지정된 학생이 없어요</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
