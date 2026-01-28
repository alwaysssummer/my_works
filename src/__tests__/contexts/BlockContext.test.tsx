import { describe, it, expect, vi } from 'vitest'
import { render, screen, renderHook } from '@testing-library/react'
import { BlockProvider, useBlockContext } from '@/contexts/BlockContext'
import { Block } from '@/types/block'

// useBlocks 모킹
const mockBlocks: Block[] = [
  {
    id: '1',
    name: '',
    content: '<p>테스트 블록</p>',
    indent: 0,
    isCollapsed: false,
    isPinned: false,
    column: 'inbox',
    properties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockUseBlocks = {
  blocks: mockBlocks,
  isLoaded: true,
  syncStatus: 'synced' as const,
  syncError: null,
  isOnline: true,
  isSupabaseConnected: true,
  useSupabase: true,
  addBlock: vi.fn(() => 'new-id'),
  updateBlock: vi.fn(),
  deleteBlock: vi.fn(),
  indentBlock: vi.fn(),
  outdentBlock: vi.fn(),
  toggleCollapse: vi.fn(),
  hasChildren: vi.fn(() => false),
  isChildOfCollapsed: vi.fn(() => false),
  getPrevBlockId: vi.fn(() => null),
  getNextBlockId: vi.fn(() => null),
  addProperty: vi.fn(),
  updateProperty: vi.fn(),
  updatePropertyByType: vi.fn(),
  updatePropertyName: vi.fn(),
  removeProperty: vi.fn(),
  removePropertyByType: vi.fn(),
  updateBlockName: vi.fn(),
  applyType: vi.fn(),
  moveBlockUp: vi.fn(),
  moveBlockDown: vi.fn(),
  duplicateBlock: vi.fn(() => 'dup-id'),
  deleteCompletedTodos: vi.fn(),
  togglePin: vi.fn(),
  moveToColumn: vi.fn(),
  top3Blocks: [],
  top3History: [],
  addToTop3: vi.fn(),
  removeFromTop3: vi.fn(),
  selectedBlockIds: new Set<string>(),
  isSelectionMode: false,
  toggleSelectionMode: vi.fn(),
  toggleBlockSelection: vi.fn(),
  selectAllBlocks: vi.fn(),
  clearSelection: vi.fn(),
  deleteSelectedBlocks: vi.fn(),
}

vi.mock('@/hooks/useBlocks', () => ({
  useBlocks: () => mockUseBlocks,
}))

describe('BlockContext', () => {
  describe('BlockProvider', () => {
    it('children을 렌더링', () => {
      render(
        <BlockProvider>
          <div data-testid="child">테스트</div>
        </BlockProvider>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('useBlockContext', () => {
    it('블록 데이터 제공', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlockProvider>{children}</BlockProvider>
      )

      const { result } = renderHook(() => useBlockContext(), { wrapper })

      expect(result.current.blocks).toEqual(mockBlocks)
      expect(result.current.isLoaded).toBe(true)
    })

    it('CRUD 함수 제공', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlockProvider>{children}</BlockProvider>
      )

      const { result } = renderHook(() => useBlockContext(), { wrapper })

      expect(typeof result.current.addBlock).toBe('function')
      expect(typeof result.current.updateBlock).toBe('function')
      expect(typeof result.current.deleteBlock).toBe('function')
    })

    it('동기화 상태 제공', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlockProvider>{children}</BlockProvider>
      )

      const { result } = renderHook(() => useBlockContext(), { wrapper })

      expect(result.current.syncStatus).toBe('synced')
      expect(result.current.isOnline).toBe(true)
    })

    it('선택 관련 함수 제공', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlockProvider>{children}</BlockProvider>
      )

      const { result } = renderHook(() => useBlockContext(), { wrapper })

      expect(result.current.selectedBlockIds).toBeInstanceOf(Set)
      expect(typeof result.current.toggleSelectionMode).toBe('function')
    })

    it('TOP 3 관련 제공', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlockProvider>{children}</BlockProvider>
      )

      const { result } = renderHook(() => useBlockContext(), { wrapper })

      expect(Array.isArray(result.current.top3Blocks)).toBe(true)
      expect(typeof result.current.addToTop3).toBe('function')
    })

    it('Provider 없이 사용 시 에러', () => {
      // 콘솔 에러 억제
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useBlockContext())
      }).toThrow('useBlockContext must be used within a BlockProvider')

      consoleSpy.mockRestore()
    })
  })
})
