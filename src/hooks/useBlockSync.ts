"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Block } from "@/types/block";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "blocknote-blocks";
const DEBOUNCE_MS = 500;

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// 앱 형식 → DB 형식 변환
// 참고: Supabase 테이블 스키마에 맞춰 필드 정의
function blockToDb(block: Block, sortOrder: number) {
  return {
    id: block.id,
    name: block.name,
    content: block.content,
    indent: block.indent,
    is_collapsed: block.isCollapsed,
    is_pinned: block.isPinned,
    column: block.column,
    properties: block.properties,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
    // is_deleted, deleted_at은 테이블에 없으므로 제외 (로컬에서만 관리)
  };
}

// DB 형식 → 앱 형식 변환
function dbToBlock(row: any): Block {
  return {
    id: row.id,
    name: row.name || "",
    content: row.content || "",
    indent: row.indent || 0,
    isCollapsed: row.is_collapsed || false,
    isPinned: row.is_pinned || false,
    isDeleted: row.is_deleted || false,
    column: row.column || "inbox",
    properties: row.properties || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

export function useBlockSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // debounce 타이머
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // 이전 블록 상태 (증분 동기화용)
  const prevBlocksRef = useRef<Block[]>([]);

  // 온라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase 연결 확인
  const checkSupabaseConnection = useCallback(async () => {
    // 환경변수가 없으면 연결 시도하지 않음
    if (!isSupabaseConfigured() || !supabase) {
      setIsSupabaseConnected(false);
      return false;
    }

    try {
      const { error } = await supabase
        .from("blocks")
        .select("id")
        .limit(1);

      setIsSupabaseConnected(!error);
      return !error;
    } catch {
      setIsSupabaseConnected(false);
      return false;
    }
  }, []);

  // 변경된 블록 감지
  const getChangedBlocks = useCallback((oldBlocks: Block[], newBlocks: Block[]): Block[] => {
    return newBlocks.filter(newBlock => {
      const oldBlock = oldBlocks.find(b => b.id === newBlock.id);
      if (!oldBlock) return true; // 새 블록
      return new Date(newBlock.updatedAt) > new Date(oldBlock.updatedAt);
    });
  }, []);

  // 삭제된 블록 ID 감지
  const getDeletedBlockIds = useCallback((oldBlocks: Block[], newBlocks: Block[]): string[] => {
    const newIds = new Set(newBlocks.map(b => b.id));
    return oldBlocks.filter(b => !newIds.has(b.id)).map(b => b.id);
  }, []);

  // 로컬 스토리지에 저장
  const saveToLocalStorage = useCallback((blocks: Block[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    } catch (err) {
      console.error("로컬 스토리지 저장 실패:", err);
    }
  }, []);

  // 로컬 스토리지에서 로드
  const loadFromLocalStorage = useCallback((): Block[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((b: any) => ({
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        }));
      }
    } catch (err) {
      console.error("로컬 스토리지 로드 실패:", err);
    }
    return [];
  }, []);

  // Supabase에 블록 동기화 (upsert 방식)
  const syncBlocks = useCallback(async (blocks: Block[], force = false) => {
    setSyncStatus('syncing');
    setLastError(null);

    // 항상 로컬 스토리지에 저장 (가장 먼저)
    saveToLocalStorage(blocks);

    // Supabase가 설정되지 않았으면 로컬만 저장
    if (!isSupabaseConfigured() || !supabase) {
      prevBlocksRef.current = blocks;
      setSyncStatus('synced');
      return;
    }

    // 오프라인이면 로컬만 저장
    if (!isOnline && !force) {
      setSyncStatus('synced');
      return;
    }

    try {
      // 변경된 블록만 upsert
      const changedBlocks = force
        ? blocks
        : getChangedBlocks(prevBlocksRef.current, blocks);

      if (changedBlocks.length > 0) {
        const dbBlocks = changedBlocks.map((block, index) => {
          const originalIndex = blocks.findIndex(b => b.id === block.id);
          return blockToDb(block, originalIndex);
        });

        const { error: upsertError } = await supabase
          .from("blocks")
          .upsert(dbBlocks, { onConflict: 'id' });

        if (upsertError) {
          console.error("Supabase upsert 실패:", upsertError.message);
          setSyncStatus('error');
          setLastError(upsertError.message);
          return;
        }
      }

      // 삭제된 블록 처리
      const deletedIds = getDeletedBlockIds(prevBlocksRef.current, blocks);
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("blocks")
          .delete()
          .in('id', deletedIds);

        if (deleteError) {
          console.error("Supabase delete 실패:", deleteError.message);
          setSyncStatus('error');
          setLastError(deleteError.message);
          return;
        }
      }

      // 이전 상태 업데이트
      prevBlocksRef.current = blocks;
      setSyncStatus('synced');
    } catch (err) {
      console.error("Supabase 동기화 실패:", err);
      setSyncStatus('error');
      setLastError(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  }, [isOnline, saveToLocalStorage, getChangedBlocks, getDeletedBlockIds]);

  // debounced 동기화
  const debouncedSync = useCallback((blocks: Block[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      syncBlocks(blocks);
    }, DEBOUNCE_MS);
  }, [syncBlocks]);

  // Supabase에서 블록 로드
  const loadFromSupabase = useCallback(async (): Promise<Block[] | null> => {
    // Supabase가 설정되지 않았으면 null 반환 (localStorage 사용)
    if (!isSupabaseConfigured() || !supabase) {
      console.log("Supabase 미설정 - localStorage 모드");
      setIsSupabaseConnected(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("*")
        .is("user_id", null)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Supabase 로드 오류:", error);
        return null;
      }

      if (data && data.length > 0) {
        const blocks = data.map(dbToBlock);
        prevBlocksRef.current = blocks;
        setIsSupabaseConnected(true);
        return blocks;
      }

      setIsSupabaseConnected(true);
      return [];
    } catch (err) {
      console.error("Supabase 로드 실패:", err);
      return null;
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    // 상태
    syncStatus,
    lastError,
    isOnline,
    isSupabaseConnected,

    // 동기화 함수
    syncBlocks,
    debouncedSync,

    // 유틸리티 함수
    getChangedBlocks,
    getDeletedBlockIds,
    saveToLocalStorage,
    loadFromLocalStorage,
    loadFromSupabase,
    checkSupabaseConnection,

    // 이전 블록 상태 설정 (초기 로드 후)
    setPrevBlocks: (blocks: Block[]) => {
      prevBlocksRef.current = blocks;
    },
  };
}
