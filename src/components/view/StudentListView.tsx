"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Block } from "@/types/block";
import { BlockType } from "@/types/blockType";
import { Tag } from "@/types/property";
import { Plus, ChevronLeft, ChevronRight, Search, X, Users, BookOpen, Trash2, DollarSign, Link2, Check } from "lucide-react";
import { useListNavigation } from "@/hooks/useListNavigation";
import { getKoreanNow, getKoreanToday, toKoreanDateString } from "@/lib/dateFormat";
import { getMonthlyBillingSummary } from "@/lib/propertyHelpers";
import { useBlockActions } from "@/contexts/BlockContext";
import { useTags } from "@/hooks/useTags";
import { NoteView } from "@/components/view/NoteView";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createShareLink, getActiveShareLink } from "@/lib/shareLink";

const GRADE_TABS = [
  { name: "중등", color: "#10b981" },
  { name: "고1", color: "#3b82f6" },
  { name: "고2", color: "#8b5cf6" },
  { name: "고3", color: "#ef4444" },
] as const;

// 학생의 학년 가져오기 (enrollment.grade)
function getStudentGrade(block: Block): string | undefined {
  const enrollProp = block.properties.find(p => p.propertyType === "enrollment");
  if (enrollProp?.value?.type === "enrollment") return enrollProp.value.grade;
  return undefined;
}

interface StudentListViewProps {
  blocks: Block[];
  blockTypes: BlockType[];
  tags: Tag[];
  onSelectBlock: (blockId: string) => void;
  onAddStudent: () => void;
  // 일괄 작업 콜백 (향후 이동, 복사 등 확장 가능)
  onDeleteBlocks?: (blockIds: string[]) => void;
}

export function StudentListView({
  blocks,
  blockTypes,
  tags,
  onSelectBlock,
  onAddStudent,
  onDeleteBlocks,
}: StudentListViewProps) {
  // 학생 블록만 필터링 (contact 속성이 있는 블록을 학생으로 간주)
  const studentBlocks = useMemo(() => {
    return blocks.filter((b) =>
      b.properties.some((p) => p.propertyType === "contact")
    );
  }, [blocks]);

  // 블록 내용에서 텍스트만 추출
  const getPlainText = (html: string) => {
    if (typeof window === "undefined") return html;
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  // 학생의 연락처 가져오기
  const getContact = (block: Block) => {
    const contactProp = block.properties.find((p) => p.propertyType === "contact");
    if (contactProp?.value?.type === "contact") {
      return contactProp.value;
    }
    return null;
  };

  // 학생의 수업 수 계산
  const getLessonCount = (studentId: string) => {
    return blocks.filter((b) => {
      const personProp = b.properties.find((p) => p.propertyType === "person");
      return personProp?.value?.type === "person" && personProp.value.blockIds.includes(studentId);
    }).length;
  };

  // 검색 & 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  // 정렬 모드: 날짜별 보기
  const [sortByDate, setSortByDate] = useState(false);

  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 삭제 확인 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 공유 링크 상태
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // 초기 로드 시 기존 토큰 조회 (첫 클릭 속도 개선)
  useEffect(() => {
    if (isSupabaseConfigured()) {
      getActiveShareLink().then((link) => {
        if (link) setShareToken(link.token);
      });
    }
  }, []);

  const handleShareClick = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setShareLoading(true);
    const result = shareToken
      ? { token: shareToken }
      : await createShareLink();
    if (result) {
      setShareToken(result.token);
      const url = `${window.location.origin}/share/${result.token}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
    setShareLoading(false);
  }, [shareToken]);

  // 날짜 유틸리티 함수
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

  // 1) 총 학생 수 & 이번달 신규 (한국 시간)
  const totalStats = useMemo(() => {
    const thisMonth = getKoreanToday().slice(0, 7);
    const newThisMonth = studentBlocks.filter((b) => {
      if (!b.createdAt) return false;
      const createdStr = toKoreanDateString(b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt));
      return createdStr.slice(0, 7) === thisMonth;
    }).length;
    return { total: studentBlocks.length, newThisMonth };
  }, [studentBlocks]);

  // 2) 이번주 수업 횟수 (한국 시간)
  const weeklyLessons = useMemo(() => {
    const today = getKoreanNow();
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);

    return blocks.filter((b) => {
      const dateProp = b.properties.find((p) => p.propertyType === "date");
      const personProp = b.properties.find((p) => p.propertyType === "person");
      if (!dateProp || !personProp) return false;

      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;

      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [blocks]);

  // 지난주 수업 횟수 (비교용, 한국 시간)
  const lastWeekLessons = useMemo(() => {
    const today = getKoreanNow();
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekStart = getWeekStart(lastWeekDate);
    const weekEnd = getWeekEnd(lastWeekDate);

    return blocks.filter((b) => {
      const dateProp = b.properties.find((p) => p.propertyType === "date");
      const personProp = b.properties.find((p) => p.propertyType === "person");
      if (!dateProp || !personProp) return false;

      const dateValue = dateProp.value?.type === "date" ? dateProp.value.date : undefined;
      const hasStudent = personProp.value?.type === "person" && personProp.value.blockIds.length > 0;

      return hasStudent && isDateInRange(dateValue, weekStart, weekEnd);
    }).length;
  }, [blocks]);

  // 3) 수강료 현황
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

  // 4) 학년별 분포 (enrollment.grade 기반)
  const tagDistribution = useMemo(() => {
    const dist: Record<string, { count: number; color: string }> = {};
    // 학년별 초기화
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
          // 날짜별: dayOfMonth 오름차순 (등록일이 빠른 순), 없으면 마지막
          const getDayOfMonth = (s: Block) => {
            const ep = s.properties.find(p => p.propertyType === "enrollment");
            return ep?.value?.type === "enrollment" ? ep.value.dayOfMonth : 99;
          };
          return getDayOfMonth(a) - getDayOfMonth(b);
        }
        // 기본: 학년 순서 → 수업 수
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

  // 다중 선택 핸들러
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  }, [filteredStudents, selectedIds.size]);

  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 일괄 삭제 핸들러
  const handleDeleteSelected = useCallback(() => {
    if (onDeleteBlocks && selectedIds.size > 0) {
      onDeleteBlocks(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    }
  }, [onDeleteBlocks, selectedIds]);

  const isAllSelected = filteredStudents.length > 0 && selectedIds.size === filteredStudents.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredStudents.length;

  // Context에서 NoteView 액션 가져오기
  const actions = useBlockActions();
  const { tags: allTags, createTag, updateTag, deleteTag } = useTags();

  // 현재 billingMonth 이전에 미결제 월이 있는지 확인
  // startDate 월 ~ billingMonth 직전까지 순회하여 enrolled !== true인 첫 월 반환
  const getFirstUnpaidPrevMonth = useCallback((enrollValue: { startDate: string; records: Record<string, { enrolled: boolean }> }, currentBillingMonth: string): string | null => {
    const startMonth = enrollValue.startDate.slice(0, 7); // "YYYY-MM"
    if (startMonth >= currentBillingMonth) return null; // startDate가 현재 월 이후면 이전 미결제 없음

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

  const handleTogglePayment = useCallback((student: Block, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;

    const value = enrollProp.value;
    const existing = value.records[billingMonth] || { enrolled: false };

    actions.updateProperty(student.id, enrollProp.id, {
      ...value,
      records: {
        ...value.records,
        [billingMonth]: {
          ...existing,
          enrolled: !existing.enrolled,
          ...(!existing.enrolled ? { actualDate: getKoreanToday() } : {}),
        },
      },
    });
  }, [billingMonth, actions]);

  // 전미결 클릭: 가장 오래된 미결제 월을 결제 처리
  const handlePayPrevMonth = useCallback((student: Block, unpaidMonth: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
    if (!enrollProp || enrollProp.value?.type !== "enrollment") return;

    const value = enrollProp.value;
    const existing = value.records[unpaidMonth] || { enrolled: false };

    actions.updateProperty(student.id, enrollProp.id, {
      ...value,
      records: {
        ...value.records,
        [unpaidMonth]: {
          ...existing,
          enrolled: true,
          actualDate: getKoreanToday(),
        },
      },
    });
  }, [actions]);

  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 인라인 NoteView 선택 상태
  const [inlineStudentId, setInlineStudentId] = useState<string | null>(null);

  const inlineBlock = useMemo(() => {
    if (!inlineStudentId) return null;
    return blocks.find((b) => b.id === inlineStudentId) || null;
  }, [inlineStudentId, blocks]);

  // 삭제된 학생이면 선택 해제
  useEffect(() => {
    if (inlineStudentId && !blocks.find((b) => b.id === inlineStudentId)) {
      setInlineStudentId(null);
    }
  }, [blocks, inlineStudentId]);

  // 클릭 핸들러 분기
  const handleStudentClick = useCallback((studentId: string) => {
    const isSmallScreen = window.matchMedia("(max-width: 1023px)").matches;
    if (isSmallScreen) {
      onSelectBlock(studentId);
    } else {
      setInlineStudentId(studentId);
    }
  }, [onSelectBlock]);

  // 인라인 모드에서 삭제 시 다음 학생 자동 선택
  const handleInlineDelete = useCallback((blockId: string) => {
    const idx = filteredStudents.findIndex((s) => s.id === blockId);
    actions.deleteBlock(blockId);
    if (filteredStudents.length > 1) {
      const nextIdx = idx < filteredStudents.length - 1 ? idx + 1 : idx - 1;
      setInlineStudentId(filteredStudents[nextIdx]?.id || null);
    } else {
      setInlineStudentId(null);
    }
  }, [filteredStudents, actions]);

  // 태그 삭제 래퍼 (글로벌 태그 삭제 + 모든 블록에서 제거)
  const handleDeleteTag = useCallback((tagId: string) => {
    deleteTag(tagId);
    actions.removeTagFromAllBlocks(tagId);
  }, [deleteTag, actions]);

  // 키보드 탐색 훅
  const { focusedId, listRef } = useListNavigation({
    items: filteredStudents,
    onSelect: handleStudentClick,
    enabled: true,
  });

  return (
    <main className="flex-1 h-screen overflow-auto bg-background">
      {/* 모바일 컴팩트 요약 바 */}
      <div className="lg:hidden px-4 py-2 border-b border-border bg-card flex items-center justify-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{billingSummary.totalFee}({billingSummary.activeCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-green-600">{billingSummary.paidFee}({billingSummary.paidCount})</span>
        <span className="text-muted-foreground">/</span>
        <span className={billingSummary.unpaidFee > 0 ? "text-red-500" : "text-green-600"}>{billingSummary.unpaidFee}({billingSummary.activeCount - billingSummary.paidCount})</span>
        <span className="text-muted-foreground font-normal text-xs">만원</span>
      </div>

      {/* 3단 레이아웃 (데스크톱) / 1단 (모바일) */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* 좌: 학생 목록 */}
        <div className="lg:shrink-0 lg:overflow-auto flex flex-col transition-all lg:w-96">
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

          {/* 검색 + 학생추가 + 일괄 작업 */}
          <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
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
            <button
              onClick={onAddStudent}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
              title="학생 추가"
            >
              <Plus className="w-4 h-4" />
              <span className={inlineBlock ? "hidden" : ""}>학생 추가</span>
            </button>
            {/* 공유 버튼: 클릭 = 즉시 복사 */}
            <button
              onClick={handleShareClick}
              disabled={shareLoading}
              className={`flex items-center gap-1 px-2 py-1.5 text-sm border rounded-lg transition-colors shrink-0 ${
                shareCopied
                  ? "text-green-600 border-green-300 bg-green-50"
                  : "text-muted-foreground hover:text-foreground border-border hover:bg-accent"
              } disabled:opacity-50`}
              title={shareCopied ? "복사됨!" : "공유 링크 복사"}
            >
              {shareLoading ? (
                <Link2 className="w-4 h-4 animate-spin" />
              ) : shareCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
            </button>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">
                  {selectedIds.size}명 선택
                </span>
                {onDeleteBlocks && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    aria-label="선택한 학생 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
                <button
                  onClick={handleClearSelection}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors"
                >
                  선택 해제
                </button>
              </div>
            )}
          </div>

          {/* 목록 헤더 */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="w-5 h-5 border-2 border-border rounded flex items-center justify-center hover:border-blue-500 transition-colors"
              aria-label={isAllSelected ? "전체 선택 해제" : "전체 선택"}
            >
              {isAllSelected && <span className="text-blue-600 text-sm">✓</span>}
              {isSomeSelected && <span className="text-blue-600 text-xs">−</span>}
            </button>
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
          <div ref={listRef} className="divide-y divide-border flex-1 overflow-auto">
            {filteredStudents.length > 0 ? (
              <>
                {filteredStudents.map((student) => {
                  const contact = getContact(student);
                  const lessonCount = getLessonCount(student.id);
                  const isFocused = student.id === focusedId;

                  const enrollProp = student.properties.find(p => p.propertyType === "enrollment");
                  const enrollValue = enrollProp?.value?.type === "enrollment" ? enrollProp.value : null;
                  const isPaid = enrollValue ? enrollValue.records[billingMonth]?.enrolled === true : false;
                  const firstUnpaidPrev = enrollValue ? getFirstUnpaidPrevMonth(enrollValue, billingMonth) : null;

                  return (
                    <div
                      key={student.id}
                      data-list-item
                      onClick={() => handleStudentClick(student.id)}
                      className={`px-4 py-1.5 cursor-pointer transition-colors flex items-center gap-3 group ${
                        inlineStudentId === student.id
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : isFocused
                          ? "bg-primary/10 ring-2 ring-inset ring-primary/50"
                          : selectedIds.has(student.id)
                          ? "bg-blue-50"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      {/* 체크박스 */}
                      <button
                        onClick={(e) => handleToggleSelect(student.id, e)}
                        className={`w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-colors ${
                          selectedIds.has(student.id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-border hover:border-blue-500"
                        }`}
                        aria-label={selectedIds.has(student.id) ? "선택 해제" : "선택"}
                      >
                        {selectedIds.has(student.id) && (
                          <span className="text-white text-sm">✓</span>
                        )}
                      </button>

                      {/* 1줄 콘텐츠 영역 */}
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
                })}
              </>
            ) : studentBlocks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">○</div>
                <p className="text-muted-foreground mb-4">등록된 학생이 없어요</p>
                <button
                  onClick={onAddStudent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  첫 학생 추가하기
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">검색 결과가 없어요</p>
              </div>
            )}
          </div>
        </div>

        {/* 중앙: 인라인 NoteView (데스크톱 전용) */}
        <div className="hidden lg:flex flex-col flex-1 border-l border-border overflow-hidden">
          {inlineBlock ? (
            <>
              <NoteView
              key={inlineStudentId}
              variant="inline"
              block={inlineBlock}
              allTags={allTags}
              blockTypes={blockTypes}
              contextBlocks={blocks}
              onUpdateBlock={actions.updateBlock}
              onUpdateBlockName={actions.updateBlockName}
              onAddProperty={actions.addProperty}
              onUpdateProperty={actions.updateProperty}
              onUpdatePropertyName={actions.updatePropertyName}
              onRemoveProperty={actions.removeProperty}
              onCreateTag={createTag}
              onUpdateTag={updateTag}
              onDeleteTag={handleDeleteTag}
              onMoveToColumn={actions.moveToColumn}
              onDeleteBlock={handleInlineDelete}
              onClose={() => setInlineStudentId(null)}
            />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">←</div>
                <p className="text-sm">학생을 선택하면 여기에 상세 정보가 표시돼요</p>
              </div>
            </div>
          )}
        </div>

        {/* 우: 통계 사이드바 */}
        <aside className="hidden lg:block w-[22rem] border-l border-border lg:overflow-auto shrink-0">
          <div className="sticky top-0 p-4 space-y-4">
            {/* 요약 통계 카드 1x2 */}
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

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-background rounded-xl p-6 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-2">학생 삭제</h3>
            <p className="text-muted-foreground mb-4">
              선택한 {selectedIds.size}명의 학생을 삭제할까요?
              <br />
              <span className="text-sm text-red-500">이 작업은 되돌릴 수 없어요.</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
