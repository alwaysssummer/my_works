"use client";

import { useState, useRef, useEffect } from "react";
import { TabType, TAB_LABELS, TAB_ICONS, ViewType } from "@/types/view";

interface TabBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  /** 시간표 탭 내 서브 모드 전환 */
  onChangeScheduleMode?: (mode: "weekly" | "calendar" | "deadline") => void;
  /** 현재 시간표 서브 모드 */
  scheduleMode?: "weekly" | "calendar" | "deadline";
  /** 더보기 메뉴 항목 클릭 */
  onOverflowAction?: (action: string) => void;
}

const TABS: TabType[] = ["schedule", "tasks", "students"];

const SCHEDULE_SUBMODES = [
  { key: "weekly" as const, icon: "▦", label: "주간" },
  { key: "calendar" as const, icon: "◇", label: "월간" },
  { key: "deadline" as const, icon: "⏰", label: "마감" },
];

export function TabBar({
  activeTab,
  onChangeTab,
  onChangeScheduleMode,
  scheduleMode = "weekly",
  onOverflowAction,
}: TabBarProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!showOverflow) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showOverflow]);

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center">
        {/* 3탭 */}
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onChangeTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span>{TAB_ICONS[tab]}</span>
                <span>{TAB_LABELS[tab]}</span>
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-t" />
              )}
            </button>
          );
        })}

        {/* 더보기 */}
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className={`px-4 py-2.5 text-sm transition-colors ${
              showOverflow
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="더보기 메뉴"
          >
            ⋯
          </button>

          {showOverflow && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              {[
                { key: "dashboard", icon: "⌂", label: "대시보드" },
                { key: "all", icon: "☰", label: "전체 보기" },
                { key: "calendar", icon: "◇", label: "캘린더" },
                { key: "deadline", icon: "⏰", label: "마감일" },
                { key: "divider1", icon: "", label: "" },
                { key: "custom", icon: "▤", label: "커스텀 뷰" },
                { key: "types", icon: "◈", label: "타입 관리" },
                { key: "divider2", icon: "", label: "" },
                { key: "settings", icon: "⚙", label: "설정" },
                { key: "sample", icon: "↻", label: "샘플 데이터" },
              ].map((item) =>
                item.key.startsWith("divider") ? (
                  <div key={item.key} className="my-1 border-t border-border" />
                ) : (
                  <button
                    key={item.key}
                    onClick={() => {
                      setShowOverflow(false);
                      onOverflowAction?.(item.key);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors"
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    {item.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* 시간표 탭 서브 모드 */}
      {activeTab === "schedule" && (
        <div className="flex items-center gap-1 px-4 pb-2">
          {SCHEDULE_SUBMODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => onChangeScheduleMode?.(mode.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                scheduleMode === mode.key
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
