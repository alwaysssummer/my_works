"use client";

import { useState, useEffect, useCallback } from "react";
import { ScheduleSettings, DEFAULT_SCHEDULE_SETTINGS } from "@/types/settings";

const STORAGE_KEY = "blocknote-settings";

export function useSettings() {
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SCHEDULE_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 로컬 스토리지에서 불러오기 (이전 설정 마이그레이션 포함)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 이전 기본값(14~22)이면 새 기본값(9~24)으로 마이그레이션
        if (parsed.startHour === 14 && parsed.endHour === 22) {
          parsed.startHour = DEFAULT_SCHEDULE_SETTINGS.startHour;
          parsed.endHour = DEFAULT_SCHEDULE_SETTINGS.endHour;
        }
        setSettings({ ...DEFAULT_SCHEDULE_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SCHEDULE_SETTINGS);
      }
    }
    setIsLoaded(true);
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // 설정 업데이트
  const updateSettings = useCallback((updates: Partial<ScheduleSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // 기본값으로 초기화
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SCHEDULE_SETTINGS);
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetSettings,
  };
}
