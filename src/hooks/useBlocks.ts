"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Block, BlockColumn, Top3History } from "@/types/block";
import { BlockProperty, PropertyType, createPropertyValue, DEFAULT_PROPERTIES, LegacyBlockProperty } from "@/types/property";
import { mockBlocks } from "@/data/mockData";
import { useBlockSelection } from "./useBlockSelection";
import { useBlockSync } from "./useBlockSync";
import { getKoreanToday, toKoreanDateString } from "@/lib/dateFormat";

// 기존 propertyId를 기본 이름으로 매핑
function getDefaultPropertyName(propertyId: string): string {
  const prop = DEFAULT_PROPERTIES.find((p) => p.id === propertyId);
  return prop?.name || propertyId;
}

// 레거시 속성인지 확인 (propertyId가 있고 id가 없으면 레거시)
function isLegacyProperty(prop: BlockProperty | LegacyBlockProperty): prop is LegacyBlockProperty {
  return 'propertyId' in prop && !('id' in prop);
}

// 레거시 속성을 새 형식으로 변환
function migrateProperty(prop: BlockProperty | LegacyBlockProperty): BlockProperty {
  if (isLegacyProperty(prop)) {
    return {
      id: crypto.randomUUID(),
      propertyType: prop.propertyId as PropertyType,
      name: getDefaultPropertyName(prop.propertyId),
      value: prop.value,
    };
  }
  return prop;
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
    properties: (row.properties || []).map(migrateProperty),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

// 앱 형식 → DB 형식 변환
function blockToDb(block: Block, sortOrder: number) {
  return {
    id: block.id,
    name: block.name,
    content: block.content,
    indent: block.indent,
    is_collapsed: block.isCollapsed,
    is_pinned: block.isPinned,
    is_deleted: block.isDeleted,
    column: block.column,
    properties: block.properties,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
    deleted_at: block.deletedAt?.toISOString(),
  };
}

const STORAGE_KEY = "blocknote-blocks";
const TOP3_HISTORY_KEY = "blocknote-top3-history";
const MAX_INDENT = 5;
const MAX_TOP3 = 3;

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [top3History, setTop3History] = useState<Top3History[]>([]);
  const [useSupabase, setUseSupabase] = useState(false);

  // 다중 선택 (useBlockSelection 훅 사용)
  const {
    selectedIds: selectedBlockIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleBlock: toggleBlockSelection,
    selectAll: selectAllBlocks,
    clear: clearSelection,
  } = useBlockSelection();

  // 블록 동기화 (useBlockSync 훅 사용)
  const {
    syncStatus,
    lastError: syncError,
    isOnline,
    isSupabaseConnected,
    debouncedSync,
    loadFromSupabase,
    saveToLocalStorage,
    loadFromLocalStorage,
    setPrevBlocks,
  } = useBlockSync();

  // 초기화 완료 여부 (무한 루프 방지)
  const isInitializedRef = useRef(false);

  // TOP 3 만료 처리 함수 (한국 시간)
  const processExpiredTop3 = useCallback((loadedBlocks: Block[]) => {
    const today = getKoreanToday();
    const expiredTop3: { id: string; content: string; completed: boolean }[] = [];

    const processedBlocks = loadedBlocks.map((block: Block) => {
      const urgentProp = block.properties.find((p: BlockProperty) => p.propertyType === "urgent");
      if (urgentProp?.value.type === "urgent" && urgentProp.value.addedAt < today) {
        const checkboxProp = block.properties.find((p: BlockProperty) => p.propertyType === "checkbox");
        const completed = checkboxProp?.value.type === "checkbox" && checkboxProp.value.checked;

        expiredTop3.push({
          id: block.id,
          content: block.content,
          completed,
        });

        return {
          ...block,
          properties: block.properties.filter((p: BlockProperty) => p.propertyType !== "urgent"),
        };
      }
      return block;
    });

    if (expiredTop3.length > 0) {
      // 한국 시간 기준 어제 날짜
      const todayDate = new Date(getKoreanToday());
      todayDate.setDate(todayDate.getDate() - 1);
      const yesterdayStr = toKoreanDateString(todayDate);

      setTop3History((prev) => {
        // 이미 어제 날짜의 기록이 있으면 중복 추가하지 않음
        const existing = prev.find((h) => h.date === yesterdayStr);
        if (existing) {
          return prev;
        }
        return [...prev, { date: yesterdayStr, blocks: expiredTop3 }];
      });
    }

    return processedBlocks;
  }, []);

  // 초기 데이터 로드 (한 번만 실행)
  useEffect(() => {
    // 이미 초기화되었으면 스킵
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function loadData() {
      // TOP 3 히스토리 로드 (중복 제거)
      const savedHistory = localStorage.getItem(TOP3_HISTORY_KEY);
      if (savedHistory) {
        try {
          const parsed: Top3History[] = JSON.parse(savedHistory);
          // 각 날짜별 블록에서 중복 제거 (id 기준)
          const deduplicated = parsed.map((history) => ({
            ...history,
            blocks: history.blocks.filter(
              (block, index, self) =>
                index === self.findIndex((b) => b.id === block.id)
            ),
          }));
          setTop3History(deduplicated);
          // 중복이 제거되었으면 localStorage 업데이트
          if (JSON.stringify(parsed) !== JSON.stringify(deduplicated)) {
            localStorage.setItem(TOP3_HISTORY_KEY, JSON.stringify(deduplicated));
          }
        } catch {
          setTop3History([]);
        }
      }

      // Supabase에서 시도 (useBlockSync 사용)
      const supabaseBlocks = await loadFromSupabase();

      // 로컬 스토리지에서도 로드
      const localBlocks = loadFromLocalStorage();

      // 데이터 소스 결정: Supabase vs localStorage
      // 1. Supabase 미설정 → localStorage 사용
      // 2. Supabase 빈 상태 & localStorage 있음 → localStorage 사용 (초기 마이그레이션)
      // 3. 둘 다 있으면 → 더 최신 데이터 사용
      let blocksToUse: Block[] = [];
      let sourceType: 'supabase' | 'localStorage' | 'mock' = 'mock';

      if (supabaseBlocks !== null && supabaseBlocks.length > 0 && localBlocks.length > 0) {
        // 둘 다 데이터가 있음 → 가장 최근 updatedAt 비교
        const supabaseLatest = Math.max(...supabaseBlocks.map(b => new Date(b.updatedAt).getTime()));
        const localLatest = Math.max(...localBlocks.map(b => new Date(b.updatedAt).getTime()));

        if (localLatest > supabaseLatest) {
          console.log("localStorage가 더 최신 - localStorage 사용");
          blocksToUse = localBlocks;
          sourceType = 'localStorage';
          setUseSupabase(true); // Supabase 연결은 유지
        } else {
          console.log("Supabase에서 블록 로드:", supabaseBlocks.length);
          blocksToUse = supabaseBlocks;
          sourceType = 'supabase';
          setUseSupabase(true);
        }
      } else if (supabaseBlocks !== null && supabaseBlocks.length > 0) {
        // Supabase만 데이터 있음
        console.log("Supabase에서 블록 로드:", supabaseBlocks.length);
        blocksToUse = supabaseBlocks;
        sourceType = 'supabase';
        setUseSupabase(true);
      } else if (localBlocks.length > 0) {
        // localStorage만 데이터 있음 (또는 Supabase 미설정)
        console.log("localStorage에서 블록 로드:", localBlocks.length);
        blocksToUse = localBlocks;
        sourceType = 'localStorage';
        if (supabaseBlocks !== null) {
          // Supabase 연결은 됨 (빈 상태)
          setUseSupabase(true);
        }
      } else if (supabaseBlocks !== null) {
        // Supabase 연결됨 (빈 상태), localStorage도 없음
        console.log("Supabase 테이블 연결됨 (빈 상태)");
        setUseSupabase(true);
      }

      // 데이터가 있으면 처리
      if (blocksToUse.length > 0) {
        let slotCounter = 0;

        let loadedBlocks = blocksToUse.map((b: Block & { properties?: (BlockProperty | LegacyBlockProperty)[] }) => ({
          ...b,
          name: b.name ?? "",
          indent: b.indent ?? 0,
          isCollapsed: b.isCollapsed ?? false,
          isPinned: b.isPinned ?? false,
          column: b.column ?? "inbox",
          properties: (b.properties ?? []).map((p: BlockProperty | LegacyBlockProperty) => {
            let prop = migrateProperty(p);
            if (prop.propertyType === "urgent" && prop.value.type === "urgent" && prop.value.slotIndex === undefined) {
              return {
                ...prop,
                value: {
                  ...prop.value,
                  slotIndex: slotCounter++,
                },
              };
            }
            return prop;
          }),
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        }));

        const processedBlocks = processExpiredTop3(loadedBlocks);
        setBlocks(processedBlocks);
        setPrevBlocks(processedBlocks);
        setIsLoaded(true);
        return;
      }

      // 데이터가 없으면 mock 사용
      setBlocks(mockBlocks);
      setPrevBlocks(mockBlocks);
      setIsLoaded(true);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 블록 변경 시 저장 (useBlockSync의 debouncedSync 사용)
  useEffect(() => {
    if (isLoaded) {
      // debouncedSync가 로컬 스토리지 + Supabase 동기화 모두 처리
      debouncedSync(blocks);
    }
  }, [blocks, isLoaded, debouncedSync]);

  // TOP 3 히스토리 저장 (로컬만, 나중에 Supabase 추가 가능)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(TOP3_HISTORY_KEY, JSON.stringify(top3History));
    }
  }, [top3History, isLoaded]);

  // 현재 TOP 3 블록 조회 (슬롯 인덱스 기준 정렬)
  const top3Blocks = useMemo(() => {
    const urgentBlocks = blocks.filter((block) =>
      block.properties.some((p) => p.propertyType === "urgent")
    );
    return urgentBlocks.sort((a, b) => {
      const urgentA = a.properties.find((p) => p.propertyType === "urgent");
      const urgentB = b.properties.find((p) => p.propertyType === "urgent");
      const slotA = urgentA?.value.type === "urgent" ? urgentA.value.slotIndex : 0;
      const slotB = urgentB?.value.type === "urgent" ? urgentB.value.slotIndex : 0;
      return slotA - slotB;
    });
  }, [blocks]);

  // TOP 3에 추가 (체크박스가 없으면 자동 추가)
  const addToTop3 = useCallback((blockId: string, slotIndex?: number) => {
    setBlocks((prev) => {
      const currentTop3 = prev.filter((b) =>
        b.properties.some((p) => p.propertyType === "urgent")
      );

      if (currentTop3.length >= MAX_TOP3) {
        return prev;
      }

      let targetSlot = slotIndex;
      if (targetSlot === undefined) {
        const usedSlots = new Set(
          currentTop3
            .map((b) => {
              const urgent = b.properties.find((p) => p.propertyType === "urgent");
              return urgent?.value.type === "urgent" ? urgent.value.slotIndex : -1;
            })
            .filter((i) => i >= 0)
        );
        for (let i = 0; i < MAX_TOP3; i++) {
          if (!usedSlots.has(i)) {
            targetSlot = i;
            break;
          }
        }
      }

      return prev.map((block) => {
        if (block.id !== blockId) return block;
        if (block.properties.some((p) => p.propertyType === "urgent")) return block;

        const newProperties = [...block.properties];

        if (!newProperties.some((p) => p.propertyType === "checkbox")) {
          newProperties.push({
            id: crypto.randomUUID(),
            propertyType: "checkbox",
            name: "체크박스",
            value: { type: "checkbox" as const, checked: false },
          });
        }

        newProperties.push({
          id: crypto.randomUUID(),
          propertyType: "urgent",
          name: "긴급",
          value: {
            type: "urgent" as const,
            addedAt: getKoreanToday(),
            slotIndex: targetSlot ?? 0,
          },
        });

        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      });
    });
  }, []);

  // TOP 3 블록 생성 (블록 + urgent/checkbox 속성 한 번에 추가)
  const addBlockWithTop3 = useCallback((name: string, slotIndex: number) => {
    const newBlockId = crypto.randomUUID();

    setBlocks((prev) => {
      const currentTop3 = prev.filter((b) =>
        b.properties.some((p) => p.propertyType === "urgent")
      );

      if (currentTop3.length >= MAX_TOP3) {
        return prev;
      }

      const newBlock: Block = {
        id: newBlockId,
        name,
        content: "",
        indent: 0,
        isCollapsed: false,
        isPinned: false,
        isDeleted: false,
        column: "inbox",
        properties: [
          {
            id: crypto.randomUUID(),
            propertyType: "checkbox",
            name: "체크박스",
            value: { type: "checkbox" as const, checked: false },
          },
          {
            id: crypto.randomUUID(),
            propertyType: "urgent",
            name: "긴급",
            value: {
              type: "urgent" as const,
              addedAt: getKoreanToday(),
              slotIndex,
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return [newBlock, ...prev];
    });

    return newBlockId;
  }, []);

  // TOP 3에서 제거
  const removeFromTop3 = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.filter((p) => p.propertyType !== "urgent"),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 추가 (options로 name/content 지정 가능)
  const addBlock = useCallback((
    afterId?: string,
    options?: { name?: string; content?: string }
  ) => {
    const newBlockId = crypto.randomUUID();
    const initialName = options?.name || "";
    const initialContent = options?.content || "";

    setBlocks((prev) => {
      let inheritedIndent = 0;

      if (!afterId || prev.length === 0) {
        const newBlock: Block = {
          id: newBlockId,
          name: initialName,
          content: initialContent,
          indent: inheritedIndent,
          isCollapsed: false,
          isPinned: false,
          isDeleted: false,
          column: "inbox",
          properties: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [newBlock, ...prev];
      }

      const index = prev.findIndex((b) => b.id === afterId);
      if (index === -1) {
        const newBlock: Block = {
          id: newBlockId,
          name: initialName,
          content: initialContent,
          indent: inheritedIndent,
          isCollapsed: false,
          isPinned: false,
          isDeleted: false,
          column: "inbox",
          properties: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return [newBlock, ...prev];
      }

      inheritedIndent = prev[index].indent;
      const inheritedColumn = prev[index].column;
      const newBlock: Block = {
        id: newBlockId,
        name: initialName,
        content: initialContent,
        indent: inheritedIndent,
        isCollapsed: false,
        isPinned: false,
        isDeleted: false,
        column: inheritedColumn,
        properties: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    return newBlockId;
  }, []);

  // 블록 수정
  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, content, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 블록 삭제 (영구 삭제)
  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // 소프트 삭제 (휴지통으로 이동)
  const softDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, isDeleted: true, deletedAt: new Date(), updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 복원 (휴지통에서 꺼내기)
  const restoreBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, isDeleted: false, deletedAt: undefined, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 영구 삭제 (완전 제거)
  const permanentDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // 들여쓰기 (Tab)
  const indentBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      if (index === 0) return prev;

      const block = prev[index];
      const prevBlock = prev[index - 1];

      if (block.indent >= prevBlock.indent + 1) return prev;
      if (block.indent >= MAX_INDENT) return prev;

      return prev.map((b) =>
        b.id === id
          ? { ...b, indent: b.indent + 1, updatedAt: new Date() }
          : b
      );
    });
  }, []);

  // 내어쓰기 (Shift+Tab)
  const outdentBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id && b.indent > 0
          ? { ...b, indent: b.indent - 1, updatedAt: new Date() }
          : b
      )
    );
  }, []);

  // 토글 접기/펼치기
  const toggleCollapse = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, isCollapsed: !b.isCollapsed, updatedAt: new Date() }
          : b
      )
    );
  }, []);

  // 특정 블록의 하위 블록인지 확인
  const isChildOfCollapsed = useCallback(
    (blockIndex: number) => {
      if (blockIndex === 0) return false;

      const block = blocks[blockIndex];
      for (let i = blockIndex - 1; i >= 0; i--) {
        const prevBlock = blocks[i];
        if (prevBlock.indent < block.indent) {
          if (prevBlock.isCollapsed) return true;
        }
        if (prevBlock.indent < block.indent - 1) {
          continue;
        }
      }
      return false;
    },
    [blocks]
  );

  // 하위 블록이 있는지 확인
  const hasChildren = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index === -1 || index === blocks.length - 1) return false;

      const block = blocks[index];
      const nextBlock = blocks[index + 1];
      return nextBlock.indent > block.indent;
    },
    [blocks]
  );

  // 이전 블록 ID 가져오기
  const getPrevBlockId = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      for (let i = index - 1; i >= 0; i--) {
        if (!isChildOfCollapsed(i)) {
          return blocks[i].id;
        }
      }
      return null;
    },
    [blocks, isChildOfCollapsed]
  );

  // 다음 블록 ID 가져오기
  const getNextBlockId = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      for (let i = index + 1; i < blocks.length; i++) {
        if (!isChildOfCollapsed(i)) {
          return blocks[i].id;
        }
      }
      return null;
    },
    [blocks, isChildOfCollapsed]
  );

  // 블록에 속성 추가
  const addProperty = useCallback((blockId: string, propertyType: PropertyType, name?: string, initialValue?: BlockProperty["value"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;

        const value = initialValue ?? createPropertyValue(propertyType);
        const propertyName = name || getDefaultPropertyName(propertyType);

        const newProperty: BlockProperty = {
          id: crypto.randomUUID(),
          propertyType,
          name: propertyName,
          value,
        };
        return {
          ...block,
          properties: [...block.properties, newProperty],
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 속성 값 업데이트
  const updateProperty = useCallback((blockId: string, propertyId: string, value: BlockProperty["value"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.map((p) =>
            p.id === propertyId ? { ...p, value } : p
          ),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 속성 값 업데이트 (propertyType 기반)
  const updatePropertyByType = useCallback((blockId: string, propertyType: PropertyType, value: BlockProperty["value"]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        let updated = false;
        const newProperties = block.properties.map((p) => {
          if (!updated && p.propertyType === propertyType) {
            updated = true;
            return { ...p, value };
          }
          return p;
        });
        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 속성 이름 업데이트
  const updatePropertyName = useCallback((blockId: string, propertyId: string, name: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.map((p) =>
            p.id === propertyId ? { ...p, name } : p
          ),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록에서 속성 제거
  const removeProperty = useCallback((blockId: string, propertyId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          properties: block.properties.filter((p) => p.id !== propertyId),
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록에서 속성 제거 (propertyType 기반)
  const removePropertyByType = useCallback((blockId: string, propertyType: PropertyType) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        let removed = false;
        const newProperties = block.properties.filter((p) => {
          if (!removed && p.propertyType === propertyType) {
            removed = true;
            return false;
          }
          return true;
        });
        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 이름 업데이트
  const updateBlockName = useCallback((blockId: string, name: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, name, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 블록에 타입 적용
  const applyType = useCallback((blockId: string, propertyTypes: PropertyType[], names?: string[]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;

        const newProperties = [...block.properties];

        propertyTypes.forEach((propertyType, index) => {
          if (newProperties.some((p) => p.propertyType === propertyType)) return;

          const propName = names?.[index] || getDefaultPropertyName(propertyType);
          newProperties.push({
            id: crypto.randomUUID(),
            propertyType,
            name: propName,
            value: createPropertyValue(propertyType),
          });
        });

        return {
          ...block,
          properties: newProperties,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  // 블록 위로 이동
  const moveBlockUp = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index <= 0) return prev;

      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, []);

  // 블록 아래로 이동
  const moveBlockDown = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;

      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, []);

  // 블록 복제
  const duplicateBlock = useCallback((id: string) => {
    const newBlockId = crypto.randomUUID();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const original = prev[index];
      const duplicate: Block = {
        ...original,
        id: newBlockId,
        properties: original.properties.map((p) => ({
          ...p,
          id: crypto.randomUUID(),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, duplicate);
      return newBlocks;
    });

    return newBlockId;
  }, []);

  // 완료된 할일 일괄 삭제
  const deleteCompletedTodos = useCallback(() => {
    setBlocks((prev) =>
      prev.filter((block) => {
        const checkbox = block.properties.find((p) => p.propertyType === "checkbox");
        return !(checkbox?.value.type === "checkbox" && checkbox.value.checked);
      })
    );
  }, []);

  // 블록 고정/해제 토글
  const togglePin = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, isPinned: !block.isPinned, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 블록을 다른 열로 이동
  const moveToColumn = useCallback((id: string, column: BlockColumn) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id
          ? { ...block, column, updatedAt: new Date() }
          : block
      )
    );
  }, []);

  // 선택된 블록 일괄 삭제
  const deleteSelectedBlocks = useCallback(() => {
    setBlocks((prev) => prev.filter((block) => !selectedBlockIds.has(block.id)));
    clearSelection();
  }, [selectedBlockIds, clearSelection]);

  return {
    blocks,
    isLoaded,
    // 동기화 상태 (useBlockSync에서)
    syncStatus,
    syncError,
    isOnline,
    isSupabaseConnected,
    useSupabase, // 로컬 상태 (Supabase 사용 여부)
    addBlock,
    updateBlock,
    deleteBlock,
    softDeleteBlock,
    restoreBlock,
    permanentDeleteBlock,
    indentBlock,
    outdentBlock,
    toggleCollapse,
    hasChildren,
    isChildOfCollapsed,
    getPrevBlockId,
    getNextBlockId,
    addProperty,
    updateProperty,
    updatePropertyByType,
    updatePropertyName,
    removeProperty,
    removePropertyByType,
    updateBlockName,
    applyType,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    deleteCompletedTodos,
    togglePin,
    moveToColumn,
    // TOP 3 관련
    top3Blocks,
    top3History,
    addToTop3,
    addBlockWithTop3,
    removeFromTop3,
    // 다중 선택 관련
    selectedBlockIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleBlockSelection,
    selectAllBlocks,
    clearSelection,
    deleteSelectedBlocks,
  };
}
