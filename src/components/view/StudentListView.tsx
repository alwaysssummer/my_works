"use client";

import { useMemo, useState, useEffect } from "react";
import { Block } from "@/types/block";
import { BlockType } from "@/types/blockType";
import { Tag } from "@/types/property";
import { Plus, Phone, Mail, ChevronRight, Search, X, Users, BookOpen, UserPlus, Trophy } from "lucide-react";
import { useListNavigation } from "@/hooks/useListNavigation";

interface StudentListViewProps {
  blocks: Block[];
  blockTypes: BlockType[];
  tags: Tag[];
  onSelectBlock: (blockId: string) => void;
  onAddStudent: () => void;
}

export function StudentListView({
  blocks,
  blockTypes,
  tags,
  onSelectBlock,
  onAddStudent,
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

  // 학생의 태그 가져오기
  const getStudentTags = (block: Block) => {
    const tagProp = block.properties.find((p) => p.propertyType === "tag");
    if (tagProp?.value?.type === "tag") {
      return tagProp.value.tagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter(Boolean) as Tag[];
    }
    return [];
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  // 1) 총 학생 수 & 이번달 신규
  const totalStats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const newThisMonth = studentBlocks.filter((b) => {
      if (!b.createdAt) return false;
      const createdStr = b.createdAt instanceof Date
        ? b.createdAt.toISOString()
        : String(b.createdAt);
      return createdStr.slice(0, 7) === thisMonth;
    }).length;
    return { total: studentBlocks.length, newThisMonth };
  }, [studentBlocks]);

  // 2) 이번주 수업 횟수
  const weeklyLessons = useMemo(() => {
    const today = new Date();
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

  // 지난주 수업 횟수 (비교용)
  const lastWeekLessons = useMemo(() => {
    const today = new Date();
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

  // 3) 연락처 등록 비율
  const contactStats = useMemo(() => {
    const withContact = studentBlocks.filter((b) => {
      const contact = b.properties.find((p) => p.propertyType === "contact");
      return contact?.value?.type === "contact" && (contact.value.phone || contact.value.email);
    }).length;
    return { count: withContact, total: studentBlocks.length };
  }, [studentBlocks]);

  // 4) 태그별 분포
  const tagDistribution = useMemo(() => {
    const dist: Record<string, { count: number; color: string }> = {};
    studentBlocks.forEach((b) => {
      const tagProp = b.properties.find((p) => p.propertyType === "tag");
      if (tagProp?.value?.type === "tag" && tagProp.value.tagIds.length > 0) {
        tagProp.value.tagIds.forEach((id) => {
          const tag = tags.find((t) => t.id === id);
          if (tag) {
            if (!dist[tag.name]) {
              dist[tag.name] = { count: 0, color: tag.color };
            }
            dist[tag.name].count += 1;
          }
        });
      } else {
        if (!dist["기타"]) {
          dist["기타"] = { count: 0, color: "#9CA3AF" };
        }
        dist["기타"].count += 1;
      }
    });
    return Object.entries(dist)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [studentBlocks, tags]);

  // 5) 수업 TOP 3
  const topStudents = useMemo(() => {
    return studentBlocks
      .map((s) => ({ student: s, count: getLessonCount(s.id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [studentBlocks, blocks]);

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    return studentBlocks
      .filter((s) => {
        if (searchQuery) {
          const displayName = (s.name || getPlainText(s.content)).toLowerCase();
          if (!displayName.includes(searchQuery.toLowerCase())) return false;
        }
        if (selectedTag) {
          const tagProp = s.properties.find((p) => p.propertyType === "tag");
          if (tagProp?.value?.type !== "tag" || !tagProp.value.tagIds.includes(selectedTag)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => getLessonCount(b.id) - getLessonCount(a.id));
  }, [studentBlocks, searchQuery, selectedTag]);

  // 사용 가능한 태그 목록 (필터용)
  const availableTags = useMemo(() => {
    const tagIds = new Set<string>();
    studentBlocks.forEach((b) => {
      const tagProp = b.properties.find((p) => p.propertyType === "tag");
      if (tagProp?.value?.type === "tag") {
        tagProp.value.tagIds.forEach((id) => tagIds.add(id));
      }
    });
    return tags.filter((t) => tagIds.has(t.id));
  }, [studentBlocks, tags]);

  const maxTagCount = Math.max(...tagDistribution.map((t) => t.count), 1);

  const weekDiff = weeklyLessons - lastWeekLessons;
  const contactRate = contactStats.total > 0
    ? Math.round((contactStats.count / contactStats.total) * 100)
    : 0;

  // 키보드 탐색 훅
  const { focusedId, listRef } = useListNavigation({
    items: filteredStudents,
    onSelect: onSelectBlock,
    enabled: true,
  });

  return (
    <main className="flex-1 h-screen overflow-auto bg-background">
      {/* 헤더 */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span className="font-medium">학생 대시보드</span>
        </div>
        <button
          onClick={onAddStudent}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          학생 추가
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 섹션 1: 요약 통계 카드 4개 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 총 학생 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">총 학생</span>
            </div>
            <div className="text-2xl font-bold">{totalStats.total}명</div>
            {totalStats.newThisMonth > 0 && (
              <div className="text-xs text-green-600">+{totalStats.newThisMonth} 이번달</div>
            )}
          </div>

          {/* 이번주 수업 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">이번주 수업</span>
            </div>
            <div className="text-2xl font-bold">{weeklyLessons}회</div>
            <div className={`text-xs ${weekDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
              {weekDiff >= 0 ? "+" : ""}{weekDiff} 지난주 대비
            </div>
          </div>

          {/* 연락처 등록 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-sm">연락처 등록</span>
            </div>
            <div className="text-2xl font-bold">{contactRate}%</div>
            <div className="text-xs text-muted-foreground">
              {contactStats.count}/{contactStats.total}명
            </div>
          </div>

          {/* 신규 학생 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">신규 학생</span>
            </div>
            <div className="text-2xl font-bold">{totalStats.newThisMonth}명</div>
            <div className="text-xs text-muted-foreground">이번달</div>
          </div>
        </section>

        {/* 섹션 2: 차트 영역 (2열) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 태그별 분포 막대 그래프 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <span>📊</span> 태그별 학생 분포
            </h3>
            {tagDistribution.length > 0 ? (
              <div className="space-y-3">
                {tagDistribution.map(({ name, count, color }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm w-16 truncate">{name}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${(count / maxTagCount) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}명
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                태그가 지정된 학생이 없어요
              </p>
            )}
          </div>

          {/* 수업 TOP 3 */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              수업 많은 학생 TOP 3
            </h3>
            {topStudents.length > 0 ? (
              <div className="space-y-3">
                {topStudents.map((item, i) => {
                  const studentTags = getStudentTags(item.student);
                  const name = item.student.name || getPlainText(item.student.content) || "이름 없음";
                  const tagText = studentTags.length > 0 ? studentTags[0].name : "";

                  return (
                    <div
                      key={item.student.id}
                      onClick={() => onSelectBlock(item.student.id)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <span className={`text-lg font-bold ${
                        i === 0 ? "text-yellow-500" :
                        i === 1 ? "text-gray-400" :
                        "text-amber-700"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{name}</span>
                        {tagText && (
                          <span className="text-xs text-muted-foreground">({tagText})</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {item.count}회
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                수업 기록이 없어요
              </p>
            )}
          </div>
        </section>

        {/* 섹션 3: 학생 목록 */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          {/* 목록 헤더 */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-medium flex items-center gap-2">
              <span>📋</span> 전체 학생 목록
              <span className="text-sm text-muted-foreground font-normal">
                ({filteredStudents.length}명)
              </span>
            </h3>
            <div className="flex gap-2">
              {/* 검색 입력 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* 태그 필터 */}
              <select
                value={selectedTag || ""}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 태그</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 학생 목록 (1열) */}
          <div ref={listRef} className="divide-y divide-border">
            {filteredStudents.length > 0 ? (
              <>
                {filteredStudents.map((student) => {
                  const studentTags = getStudentTags(student);
                  const contact = getContact(student);
                  const lessonCount = getLessonCount(student.id);
                  const isFocused = student.id === focusedId;

                  return (
                    <div
                      key={student.id}
                      data-list-item
                      onClick={() => onSelectBlock(student.id)}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 group ${
                        isFocused
                          ? "bg-primary/10 ring-2 ring-inset ring-primary/50"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      {/* 이름 */}
                      <span className="font-medium flex-1 truncate">
                        {student.name || getPlainText(student.content) || "이름 없음"}
                      </span>

                      {/* 태그 (첫번째만) */}
                      {studentTags.length > 0 && (
                        <span
                          className="px-2 py-0.5 text-xs rounded-full shrink-0"
                          style={{
                            backgroundColor: `${studentTags[0].color}20`,
                            color: studentTags[0].color,
                          }}
                        >
                          {studentTags[0].name}
                        </span>
                      )}

                      {/* 수업 횟수 */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {lessonCount}회
                      </span>

                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  );
                })}
              </>
            ) : studentBlocks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">👤</div>
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
        </section>
      </div>
    </main>
  );
}
