import { useMemo, useCallback } from "react";
import { Block } from "@/types/block";
import { getKoreanNow, toKoreanDateString } from "@/lib/dateFormat";
import {
  isStudentBlock,
  getPropertyByType,
  getPersonBlockIds,
  getDateValue,
  getRepeatConfig,
} from "@/lib/propertyHelpers";

export interface StudentInfo {
  id: string;
  name: string;
  regularLessonCount: number;
  irregularLessonCount: number;
}

/**
 * 이번 주 범위 계산 (월요일 ~ 일요일)
 */
function getWeekRange() {
  const now = getKoreanNow();
  const day = now.getDay();
  // 일요일(0)이면 -6, 아니면 1 - day
  const diff = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * 특정 요일의 이번 주 날짜 구하기 (0: 일요일 ~ 6: 토요일)
 */
function getDateForWeekday(weekStart: Date, weekday: number): Date {
  const result = new Date(weekStart);
  // weekStart는 월요일(1)이므로, weekday와의 차이 계산
  // 월요일(1)=0, 화요일(2)=1, ..., 일요일(0)=6
  const dayOffset = weekday === 0 ? 6 : weekday - 1;
  result.setDate(weekStart.getDate() + dayOffset);
  return result;
}

/**
 * HTML에서 텍스트만 추출
 */
function getPlainText(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/**
 * 학생 관련 로직을 분리한 훅
 */
export function useStudents(blocks: Block[]) {
  // 학생 블록 필터링 (contact 속성 있는 블록)
  const studentBlocks = useMemo(() => {
    return blocks.filter(isStudentBlock);
  }, [blocks]);

  // 학생 목록 + 주간 수업 수 계산
  const students = useMemo((): StudentInfo[] => {
    const { weekStart, weekEnd } = getWeekRange();
    const weekStartStr = toKoreanDateString(weekStart);
    const weekEndStr = toKoreanDateString(weekEnd);

    // 수업 블록 목록 (person + date 속성이 있는 블록)
    const lessonBlocks = blocks.filter(
      (b) =>
        getPropertyByType(b, "person") !== undefined &&
        getPropertyByType(b, "date") !== undefined
    );

    return studentBlocks.map((studentBlock) => {
      let regularCount = 0;
      let irregularCount = 0;

      lessonBlocks.forEach((lesson) => {
        const linkedBlockIds = getPersonBlockIds(lesson);
        if (!linkedBlockIds.includes(studentBlock.id)) return;

        const dateValue = getDateValue(lesson);
        if (!dateValue) return;

        const repeatConfig = getRepeatConfig(lesson);

        if (!repeatConfig) {
          // 비정규 수업: 날짜가 이번 주 범위 내면 +1
          if (dateValue >= weekStartStr && dateValue <= weekEndStr) {
            irregularCount++;
          }
        } else if (repeatConfig.type === "weekly") {
          // 정규 수업: 해당 요일이 이번 주에 있으면 +1
          const weekdays = repeatConfig.weekdays || [];
          weekdays.forEach((day: number) => {
            const targetDate = getDateForWeekday(weekStart, day);
            const targetDateStr = toKoreanDateString(targetDate);
            // 원본 날짜 이후인 경우에만 카운트
            if (targetDateStr >= dateValue) {
              regularCount++;
            }
          });
        }
      });

      return {
        id: studentBlock.id,
        name: studentBlock.name || getPlainText(studentBlock.content) || "이름 없음",
        regularLessonCount: regularCount,
        irregularLessonCount: irregularCount,
      };
    });
  }, [blocks, studentBlocks]);

  // 학생 ID로 학생 정보 찾기
  const getStudentById = useCallback(
    (studentId: string): StudentInfo | undefined => {
      return students.find((s) => s.id === studentId);
    },
    [students]
  );

  // 특정 학생의 총 수업 수
  const getTotalLessons = useCallback(
    (studentId: string): number => {
      const student = getStudentById(studentId);
      if (!student) return 0;
      return student.regularLessonCount + student.irregularLessonCount;
    },
    [getStudentById]
  );

  // 학생 이름으로 검색
  const searchStudents = useCallback(
    (query: string): StudentInfo[] => {
      if (!query.trim()) return students;
      const lowerQuery = query.toLowerCase();
      return students.filter((s) =>
        s.name.toLowerCase().includes(lowerQuery)
      );
    },
    [students]
  );

  return {
    studentBlocks,
    students,
    getStudentById,
    getTotalLessons,
    searchStudents,
  };
}
