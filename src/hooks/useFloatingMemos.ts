"use client";

import { useState, useEffect, useCallback } from "react";
import { FloatingMemo } from "@/types/memo";

const STORAGE_KEY = "blocknote-floating-memos";

const MEMO_COLORS: FloatingMemo["color"][] = ["yellow", "blue", "green", "pink"];

export function useFloatingMemos() {
  const [memos, setMemos] = useState<FloatingMemo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // localStorage에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMemos(JSON.parse(saved));
      } catch {
        setMemos([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // localStorage에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
    }
  }, [memos, isLoaded]);

  // 메모 추가 — 랜덤 위치 + 랜덤 색상
  const addMemo = useCallback((text: string) => {
    const newMemo: FloatingMemo = {
      id: crypto.randomUUID(),
      text,
      position: {
        x: 55 + Math.random() * 20, // 55~75%
        y: 15 + Math.random() * 30, // 15~45%
      },
      color: MEMO_COLORS[Math.floor(Math.random() * MEMO_COLORS.length)],
      minimized: false,
      createdAt: new Date().toISOString(),
    };
    setMemos((prev) => [...prev, newMemo]);
  }, []);

  // 메모 업데이트 (부분 갱신)
  const updateMemo = useCallback(
    (id: string, updates: Partial<Omit<FloatingMemo, "id" | "createdAt">>) => {
      setMemos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  // 메모 삭제
  const deleteMemo = useCallback((id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // 접기/펼치기 토글
  const toggleMinimize = useCallback((id: string) => {
    setMemos((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, minimized: !m.minimized } : m
      )
    );
  }, []);

  return { memos, addMemo, updateMemo, deleteMemo, toggleMinimize };
}
