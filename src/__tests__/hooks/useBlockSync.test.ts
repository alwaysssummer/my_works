import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBlockSync } from '@/hooks/useBlockSync'
import { Block } from '@/types/block'

// Supabase 모킹
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}))

// 테스트용 블록 생성
const createTestBlock = (id: string, content: string): Block => ({
  id,
  name: '',
  content: `<p>${content}</p>`,
  indent: 0,
  isCollapsed: false,
  isPinned: false,
  column: 'inbox',
  properties: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useBlockSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // localStorage 모킹
    const storage: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] || null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('초기화', () => {
    it('초기 상태: 동기화 상태는 idle', () => {
      const { result } = renderHook(() => useBlockSync())

      expect(result.current.syncStatus).toBe('idle')
    })

    it('isOnline 상태 제공', () => {
      const { result } = renderHook(() => useBlockSync())

      expect(typeof result.current.isOnline).toBe('boolean')
    })

    it('isSupabaseConnected 상태 제공', () => {
      const { result } = renderHook(() => useBlockSync())

      expect(typeof result.current.isSupabaseConnected).toBe('boolean')
    })
  })

  describe('블록 동기화', () => {
    it('syncBlocks 함수 제공', () => {
      const { result } = renderHook(() => useBlockSync())

      expect(typeof result.current.syncBlocks).toBe('function')
    })

    it('syncBlocks 호출 시 상태가 syncing으로 변경', async () => {
      const { result } = renderHook(() => useBlockSync())
      const blocks = [createTestBlock('1', '테스트')]

      act(() => {
        result.current.syncBlocks(blocks)
      })

      expect(result.current.syncStatus).toBe('syncing')
    })

    it('동기화 성공 시 상태가 synced로 변경', async () => {
      const { result } = renderHook(() => useBlockSync())
      const blocks = [createTestBlock('1', '테스트')]

      await act(async () => {
        await result.current.syncBlocks(blocks)
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })
    })
  })

  describe('증분 동기화', () => {
    it('변경된 블록만 감지', () => {
      const { result } = renderHook(() => useBlockSync())

      const oldBlocks = [
        createTestBlock('1', '원본'),
        createTestBlock('2', '유지'),
      ]
      const newBlocks = [
        { ...createTestBlock('1', '수정됨'), updatedAt: new Date(Date.now() + 1000) },
        createTestBlock('2', '유지'),
      ]

      const changed = result.current.getChangedBlocks(oldBlocks, newBlocks)

      expect(changed.length).toBe(1)
      expect(changed[0].id).toBe('1')
    })

    it('새로 추가된 블록 감지', () => {
      const { result } = renderHook(() => useBlockSync())

      const oldBlocks = [createTestBlock('1', '기존')]
      const newBlocks = [
        createTestBlock('1', '기존'),
        createTestBlock('2', '신규'),
      ]

      const changed = result.current.getChangedBlocks(oldBlocks, newBlocks)

      expect(changed.length).toBe(1)
      expect(changed[0].id).toBe('2')
    })

    it('삭제된 블록 ID 감지', () => {
      const { result } = renderHook(() => useBlockSync())

      const oldBlocks = [
        createTestBlock('1', '유지'),
        createTestBlock('2', '삭제될'),
      ]
      const newBlocks = [createTestBlock('1', '유지')]

      const deletedIds = result.current.getDeletedBlockIds(oldBlocks, newBlocks)

      expect(deletedIds.length).toBe(1)
      expect(deletedIds[0]).toBe('2')
    })
  })

  describe('debounce', () => {
    it('debounce 시간 내 여러 호출은 마지막 것만 실행', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useBlockSync())

      const blocks1 = [createTestBlock('1', '첫번째')]
      const blocks2 = [createTestBlock('1', '두번째')]
      const blocks3 = [createTestBlock('1', '세번째')]

      act(() => {
        result.current.debouncedSync(blocks1)
        result.current.debouncedSync(blocks2)
        result.current.debouncedSync(blocks3)
      })

      // debounce 시간 전에는 실행 안됨
      expect(result.current.syncStatus).toBe('idle')

      // debounce 시간 후 실행
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      vi.useRealTimers()
    })
  })

  describe('로컬 스토리지 폴백', () => {
    it('항상 로컬 스토리지에 저장', async () => {
      const { result } = renderHook(() => useBlockSync())
      const blocks = [createTestBlock('1', '테스트')]

      await act(async () => {
        result.current.saveToLocalStorage(blocks)
      })

      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('로컬 스토리지에서 로드', () => {
      const blocks = [createTestBlock('1', '저장된 블록')]
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(blocks))

      const { result } = renderHook(() => useBlockSync())
      const loaded = result.current.loadFromLocalStorage()

      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('1')
    })
  })

  describe('에러 처리', () => {
    it('동기화 실패 시 상태가 error로 변경', async () => {
      // Supabase 에러 모킹
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: '네트워크 오류' } })),
      } as any)

      const { result } = renderHook(() => useBlockSync())
      const blocks = [createTestBlock('1', '테스트')]

      await act(async () => {
        await result.current.syncBlocks(blocks)
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('error')
      })
    })

    it('에러 메시지 제공', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn(() => Promise.resolve({ data: null, error: { message: '테스트 에러' } })),
      } as any)

      const { result } = renderHook(() => useBlockSync())
      const blocks = [createTestBlock('1', '테스트')]

      await act(async () => {
        await result.current.syncBlocks(blocks)
      })

      await waitFor(() => {
        expect(result.current.lastError).toBe('테스트 에러')
      })
    })
  })
})
