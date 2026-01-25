"use client";

import { useState, useEffect, useCallback } from "react";
import { BlockType, TYPE_COLORS, TYPE_ICONS } from "@/types/blockType";
import { mockBlockTypes } from "@/data/mockData";

const STORAGE_KEY = "blocknote-types";

export function useBlockTypes() {
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 로컬 스토리지에서 불러오기 (없으면 목업 데이터)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setBlockTypes(
            parsed.map((t: BlockType) => ({
              ...t,
              createdAt: new Date(t.createdAt),
            }))
          );
        } else {
          setBlockTypes(mockBlockTypes);
        }
      } catch {
        setBlockTypes(mockBlockTypes);
      }
    } else {
      setBlockTypes(mockBlockTypes);
    }
    setIsLoaded(true);
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blockTypes));
    }
  }, [blockTypes, isLoaded]);

  // 타입 생성
  const createBlockType = useCallback(
    (
      name: string,
      propertyIds: string[],
      icon?: string,
      color?: string
    ): BlockType => {
      const newType: BlockType = {
        id: crypto.randomUUID(),
        name,
        icon: icon || TYPE_ICONS[blockTypes.length % TYPE_ICONS.length],
        color: color || TYPE_COLORS[blockTypes.length % TYPE_COLORS.length],
        propertyIds,
        createdAt: new Date(),
      };
      setBlockTypes((prev) => [...prev, newType]);
      return newType;
    },
    [blockTypes.length]
  );

  // 타입 수정
  const updateBlockType = useCallback(
    (id: string, updates: Partial<Omit<BlockType, "id" | "createdAt">>) => {
      setBlockTypes((prev) =>
        prev.map((type) => (type.id === id ? { ...type, ...updates } : type))
      );
    },
    []
  );

  // 타입 삭제
  const deleteBlockType = useCallback((id: string) => {
    setBlockTypes((prev) => prev.filter((type) => type.id !== id));
  }, []);

  // ID로 타입 찾기
  const getBlockTypeById = useCallback(
    (id: string) => blockTypes.find((type) => type.id === id),
    [blockTypes]
  );

  return {
    blockTypes,
    isLoaded,
    createBlockType,
    updateBlockType,
    deleteBlockType,
    getBlockTypeById,
  };
}
