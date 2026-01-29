"use client";

import { useCallback } from "react";
import { Block } from "@/types/block";
import { BlockProperty, PropertyType, createPropertyValue, DEFAULT_PROPERTIES } from "@/types/property";

// 기존 propertyId를 기본 이름으로 매핑
function getDefaultPropertyName(propertyId: string): string {
  const prop = DEFAULT_PROPERTIES.find((p) => p.id === propertyId);
  return prop?.name || propertyId;
}

/**
 * 블록 속성 관련 액션을 제공하는 훅
 */
export function useBlockProperties(
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) {
  // 블록에 속성 추가
  const addProperty = useCallback(
    (
      blockId: string,
      propertyType: PropertyType,
      name?: string,
      initialValue?: BlockProperty["value"]
    ) => {
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
    },
    [setBlocks]
  );

  // 블록 속성 값 업데이트
  const updateProperty = useCallback(
    (blockId: string, propertyId: string, value: BlockProperty["value"]) => {
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
    },
    [setBlocks]
  );

  // 블록 속성 값 업데이트 (propertyType 기반)
  const updatePropertyByType = useCallback(
    (
      blockId: string,
      propertyType: PropertyType,
      value: BlockProperty["value"]
    ) => {
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
    },
    [setBlocks]
  );

  // 속성 이름 업데이트
  const updatePropertyName = useCallback(
    (blockId: string, propertyId: string, name: string) => {
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
    },
    [setBlocks]
  );

  // 블록에서 속성 제거
  const removeProperty = useCallback(
    (blockId: string, propertyId: string) => {
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
    },
    [setBlocks]
  );

  // 블록에서 속성 제거 (propertyType 기반)
  const removePropertyByType = useCallback(
    (blockId: string, propertyType: PropertyType) => {
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
    },
    [setBlocks]
  );

  // 블록에 타입 적용
  const applyType = useCallback(
    (blockId: string, propertyTypes: PropertyType[], names?: string[]) => {
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== blockId) return block;

          const newProperties = [...block.properties];

          propertyTypes.forEach((propertyType, index) => {
            if (newProperties.some((p) => p.propertyType === propertyType))
              return;

            const propName =
              names?.[index] || getDefaultPropertyName(propertyType);
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
    },
    [setBlocks]
  );

  return {
    addProperty,
    updateProperty,
    updatePropertyByType,
    updatePropertyName,
    removeProperty,
    removePropertyByType,
    applyType,
  };
}
