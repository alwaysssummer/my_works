"use client";

import { useCallback, useMemo } from "react";
import { BlockProperty, EnrollmentRecord, PropertyValue } from "@/types/property";
import {
  generateMonthRange,
  getScheduledDate,
  getEnrollmentSummary,
} from "@/lib/propertyHelpers";

interface EnrollmentEditorProps {
  enrollmentProp: BlockProperty;
  onUpdate: (value: PropertyValue) => void;
  onRemove: () => void;
}

export function EnrollmentEditor({
  enrollmentProp,
  onUpdate,
  onRemove,
}: EnrollmentEditorProps) {
  const value = enrollmentProp.value;
  if (value.type !== "enrollment") return null;

  const { fee, startDate, dayOfMonth, records, grade } = value;

  const GRADE_OPTIONS = [
    { name: "중등", color: "#10b981" },
    { name: "고1", color: "#3b82f6" },
    { name: "고2", color: "#8b5cf6" },
    { name: "고3", color: "#ef4444" },
  ] as const;

  const months = useMemo(() => generateMonthRange(startDate), [startDate]);
  const summary = useMemo(() => getEnrollmentSummary(value), [value]);

  const updateField = useCallback(
    (partial: Partial<Extract<PropertyValue, { type: "enrollment" }>>) => {
      if (value.type !== "enrollment") return;
      onUpdate({ ...value, ...partial });
    },
    [value, onUpdate]
  );

  const updateRecord = useCallback(
    (month: string, updates: Partial<EnrollmentRecord>) => {
      if (value.type !== "enrollment") return;
      const existing = value.records[month] || { enrolled: false };
      onUpdate({
        ...value,
        records: {
          ...value.records,
          [month]: { ...existing, ...updates },
        },
      });
    },
    [value, onUpdate]
  );

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return `${y.slice(2)}.${m}`;
  };

  const formatDay = (dateStr: string) => {
    const parts = dateStr.split("-");
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="px-4 py-3 group">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">📋</span>
          <span className="text-sm text-muted-foreground">수강등록</span>
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >
          ✕
        </button>
      </div>

      {/* 학년 선택 */}
      <div className="ml-7 mb-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">학년</span>
        {GRADE_OPTIONS.map((g) => (
          <button
            key={g.name}
            onClick={() => updateField({ grade: grade === g.name ? undefined : g.name })}
            className="px-3 py-1 text-xs rounded-full transition-colors"
            style={{
              backgroundColor: grade === g.name ? g.color : `${g.color}20`,
              color: grade === g.name ? "white" : g.color,
            }}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* 설정 */}
      <div className="ml-7 space-y-2 mb-3">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">수업료</span>
            <input
              type="number"
              value={fee || ""}
              onChange={(e) => updateField({ fee: parseInt(e.target.value) || 0 })}
              placeholder="0"
              className="bg-accent/30 border border-border rounded px-2 py-1 text-xs w-20 text-right"
            />
            <span className="text-xs text-muted-foreground">만원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">등록일</span>
            <span className="text-xs text-muted-foreground">매월</span>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => {
                const v = Math.max(1, Math.min(31, parseInt(e.target.value) || 1));
                updateField({ dayOfMonth: v });
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
            value={startDate}
            onChange={(e) => {
              if (e.target.value) updateField({ startDate: e.target.value });
            }}
            className="bg-accent/30 border border-border rounded px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* 월별 테이블 */}
      {months.length > 0 && (
        <div className="ml-7 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
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
              {months.map((month) => {
                const record = records[month] || { enrolled: false };
                const scheduled = getScheduledDate(month, dayOfMonth);
                const monthFee = record.fee ?? fee;

                return (
                  <tr key={month} className="border-b border-border/50 hover:bg-accent/20">
                    <td className="py-1.5 px-2 text-muted-foreground">{formatMonth(month)}</td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={record.enrolled}
                        onChange={(e) => updateRecord(month, { enrolled: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground">{formatDay(scheduled)}</td>
                    <td className="py-1.5 px-2">
                      {record.enrolled ? (
                        <input
                          type="date"
                          value={record.actualDate || ""}
                          onChange={(e) => updateRecord(month, { actualDate: e.target.value })}
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
                            onChange={(e) => {
                              const v = e.target.value;
                              updateRecord(month, { fee: v ? parseInt(v) : undefined });
                            }}
                            placeholder={String(fee)}
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
      <div className="ml-7 mt-2 text-xs text-muted-foreground">
        등록 {summary.enrolledMonths}/{summary.totalMonths}개월 · 총 {summary.totalFee}만원
      </div>
    </div>
  );
}
