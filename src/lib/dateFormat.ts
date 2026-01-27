/**
 * 국제화된 날짜 포맷팅 유틸리티
 * Intl.DateTimeFormat을 사용하여 로케일에 맞는 날짜 형식 제공
 */

// 기본 로케일 (한국어)
const DEFAULT_LOCALE = "ko-KR";

/**
 * 날짜를 로케일에 맞게 포맷팅
 * @param date - Date 객체 또는 ISO 날짜 문자열
 * @param options - Intl.DateTimeFormatOptions
 * @param locale - 로케일 (기본: ko-KR)
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  locale: string = DEFAULT_LOCALE
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * 간단한 날짜 포맷 (월/일)
 */
export function formatShortDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  return formatDate(date, { month: "numeric", day: "numeric" }, locale);
}

/**
 * 요일 포함 날짜 포맷
 */
export function formatDateWithWeekday(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  return formatDate(
    date,
    { year: "numeric", month: "long", day: "numeric", weekday: "long" },
    locale
  );
}

/**
 * 시간 포맷
 */
export function formatTime(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  return formatDate(date, { hour: "2-digit", minute: "2-digit" }, locale);
}

/**
 * 상대 시간 표시 (예: "3일 전", "방금 전")
 */
export function formatRelativeDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  // Intl.RelativeTimeFormat 사용 (지원되는 경우)
  if (typeof Intl !== "undefined" && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (diffSec < 60) return rtf.format(-diffSec, "second");
    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    if (diffHour < 24) return rtf.format(-diffHour, "hour");
    if (diffDay < 7) return rtf.format(-diffDay, "day");
    if (diffWeek < 4) return rtf.format(-diffWeek, "week");
    if (diffMonth < 12) return rtf.format(-diffMonth, "month");
    return rtf.format(-diffYear, "year");
  }

  // 폴백 (한국어)
  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffWeek < 4) return `${diffWeek}주 전`;
  if (diffMonth < 12) return `${diffMonth}개월 전`;
  return `${diffYear}년 전`;
}

/**
 * 오늘/내일/어제 등 친근한 날짜 표현
 */
export function formatFriendlyDate(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateObj);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 한국어 친근한 표현
  if (locale.startsWith("ko")) {
    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "내일";
    if (diffDays === -1) return "어제";
    if (diffDays === 2) return "모레";
    if (diffDays === -2) return "그저께";
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}일 후`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}일 전`;
  }

  // 일반 형식으로 폴백
  return formatShortDate(dateObj, locale);
}

/**
 * ISO 날짜 문자열을 로컬 형식으로 변환
 * @param isoDate - YYYY-MM-DD 형식
 */
export function formatISODate(
  isoDate: string,
  locale: string = DEFAULT_LOCALE
): string {
  if (!isoDate) return "";
  return formatFriendlyDate(isoDate, locale);
}

/**
 * 숫자를 로케일에 맞게 포맷팅
 */
export function formatNumber(
  num: number,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(
  num: number,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(num);
}
