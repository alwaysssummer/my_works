"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, TAG_COLORS } from "@/types/property";
import { mockTags } from "@/data/mockData";

const STORAGE_KEY = "blocknote-tags";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 로컬 스토리지에서 불러오기 (없으면 목업 데이터)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTags(parsed.length > 0 ? parsed : mockTags);
      } catch {
        setTags(mockTags);
      }
    } else {
      setTags(mockTags);
    }
    setIsLoaded(true);
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    }
  }, [tags, isLoaded]);

  // 태그 생성
  const createTag = useCallback((name: string, color?: string) => {
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: color || TAG_COLORS[tags.length % TAG_COLORS.length],
    };
    setTags((prev) => [...prev, newTag]);
    return newTag;
  }, [tags.length]);

  // 태그 수정
  const updateTag = useCallback((id: string, updates: Partial<Omit<Tag, "id">>) => {
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      )
    );
  }, []);

  // 태그 삭제
  const deleteTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  }, []);

  // ID로 태그 찾기
  const getTagById = useCallback(
    (id: string) => tags.find((tag) => tag.id === id),
    [tags]
  );

  // 여러 ID로 태그들 찾기
  const getTagsByIds = useCallback(
    (ids: string[]) => tags.filter((tag) => ids.includes(tag.id)),
    [tags]
  );

  return {
    tags,
    isLoaded,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagsByIds,
  };
}
