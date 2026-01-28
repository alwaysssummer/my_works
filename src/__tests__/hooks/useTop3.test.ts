import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTop3 } from '@/hooks/useTop3'
import { Block } from '@/types/block'

// 테스트용 블록 생성
const createTestBlock = (id: string, content: string, hasUrgent = false, slotIndex = 0): Block => ({
  id,
  name: '',
  content: `<p>${content}</p>`,
  indent: 0,
  isCollapsed: false,
  isPinned: false,
  column: 'inbox',
  properties: hasUrgent ? [{
    id: `urgent-${id}`,
    propertyType: 'urgent' as const,
    name: '긴급',
    value: {
      type: 'urgent' as const,
      addedAt: new Date().toISOString().split('T')[0],
      slotIndex,
    },
  }] : [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

// 체크박스가 있는 블록 생성
const createBlockWithCheckbox = (id: string, content: string, checked = false, hasUrgent = false): Block => ({
  ...createTestBlock(id, content, hasUrgent),
  properties: [
    {
      id: `checkbox-${id}`,
      propertyType: 'checkbox' as const,
      name: '체크박스',
      value: { type: 'checkbox' as const, checked },
    },
    ...(hasUrgent ? [{
      id: `urgent-${id}`,
      propertyType: 'urgent' as const,
      name: '긴급',
      value: {
        type: 'urgent' as const,
        addedAt: new Date().toISOString().split('T')[0],
        slotIndex: 0,
      },
    }] : []),
  ],
})

describe('useTop3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // localStorage 모킹
    const storage: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] || null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value
    })
  })

  describe('초기화', () => {
    it('빈 배열로 초기화', () => {
      const { result } = renderHook(() => useTop3([]))

      expect(result.current.top3Blocks).toEqual([])
      expect(result.current.top3History).toEqual([])
    })

    it('urgent 속성이 있는 블록만 top3Blocks에 포함', () => {
      const blocks = [
        createTestBlock('1', '일반 블록'),
        createTestBlock('2', 'TOP 3 블록', true, 0),
        createTestBlock('3', '또 다른 일반'),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.top3Blocks).toHaveLength(1)
      expect(result.current.top3Blocks[0].id).toBe('2')
    })
  })

  describe('TOP 3 제한', () => {
    it('최대 3개까지만 추가 가능', () => {
      const blocks = [
        createTestBlock('1', '첫 번째', true, 0),
        createTestBlock('2', '두 번째', true, 1),
        createTestBlock('3', '세 번째', true, 2),
        createTestBlock('4', '네 번째 후보'),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.top3Blocks).toHaveLength(3)
      expect(result.current.canAddToTop3).toBe(false)
    })

    it('3개 미만이면 추가 가능', () => {
      const blocks = [
        createTestBlock('1', '첫 번째', true, 0),
        createTestBlock('2', '두 번째', true, 1),
        createTestBlock('3', '후보'),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.top3Blocks).toHaveLength(2)
      expect(result.current.canAddToTop3).toBe(true)
    })
  })

  describe('슬롯 인덱스 정렬', () => {
    it('slotIndex 기준으로 정렬됨', () => {
      const blocks = [
        createTestBlock('3', '세 번째', true, 2),
        createTestBlock('1', '첫 번째', true, 0),
        createTestBlock('2', '두 번째', true, 1),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.top3Blocks[0].id).toBe('1')
      expect(result.current.top3Blocks[1].id).toBe('2')
      expect(result.current.top3Blocks[2].id).toBe('3')
    })
  })

  describe('TOP 3 추가', () => {
    it('addToTop3 함수 제공', () => {
      const blocks = [createTestBlock('1', '테스트')]
      const { result } = renderHook(() => useTop3(blocks))

      expect(typeof result.current.addToTop3).toBe('function')
    })

    it('addToTop3 호출 시 urgent 속성 생성', () => {
      const blocks = [createTestBlock('1', '테스트')]
      const onUpdate = vi.fn()

      const { result } = renderHook(() => useTop3(blocks, onUpdate))

      act(() => {
        result.current.addToTop3('1')
      })

      expect(onUpdate).toHaveBeenCalled()
      const updatedBlock = onUpdate.mock.calls[0][0]
      expect(updatedBlock.properties.some((p: any) => p.propertyType === 'urgent')).toBe(true)
    })

    it('체크박스가 없으면 자동 추가', () => {
      const blocks = [createTestBlock('1', '테스트')]
      const onUpdate = vi.fn()

      const { result } = renderHook(() => useTop3(blocks, onUpdate))

      act(() => {
        result.current.addToTop3('1')
      })

      const updatedBlock = onUpdate.mock.calls[0][0]
      expect(updatedBlock.properties.some((p: any) => p.propertyType === 'checkbox')).toBe(true)
    })

    it('이미 TOP 3인 블록은 추가 안함', () => {
      const blocks = [createTestBlock('1', '이미 TOP 3', true, 0)]
      const onUpdate = vi.fn()

      const { result } = renderHook(() => useTop3(blocks, onUpdate))

      act(() => {
        result.current.addToTop3('1')
      })

      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('TOP 3 제거', () => {
    it('removeFromTop3 호출 시 urgent 속성 제거', () => {
      const blocks = [createTestBlock('1', 'TOP 3 블록', true, 0)]
      const onUpdate = vi.fn()

      const { result } = renderHook(() => useTop3(blocks, onUpdate))

      act(() => {
        result.current.removeFromTop3('1')
      })

      expect(onUpdate).toHaveBeenCalled()
      const updatedBlock = onUpdate.mock.calls[0][0]
      expect(updatedBlock.properties.some((p: any) => p.propertyType === 'urgent')).toBe(false)
    })
  })

  describe('블록이 TOP 3인지 확인', () => {
    it('isTop3 함수 제공', () => {
      const blocks = [
        createTestBlock('1', 'TOP 3', true, 0),
        createTestBlock('2', '일반'),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.isTop3('1')).toBe(true)
      expect(result.current.isTop3('2')).toBe(false)
    })
  })

  describe('빈 슬롯 찾기', () => {
    it('getNextAvailableSlot으로 다음 빈 슬롯 반환', () => {
      const blocks = [
        createTestBlock('1', '슬롯 0', true, 0),
        createTestBlock('2', '슬롯 2', true, 2),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.getNextAvailableSlot()).toBe(1)
    })

    it('모든 슬롯 사용 시 -1 반환', () => {
      const blocks = [
        createTestBlock('1', '슬롯 0', true, 0),
        createTestBlock('2', '슬롯 1', true, 1),
        createTestBlock('3', '슬롯 2', true, 2),
      ]

      const { result } = renderHook(() => useTop3(blocks))

      expect(result.current.getNextAvailableSlot()).toBe(-1)
    })
  })
})
