import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBlockSelection } from '@/hooks/useBlockSelection'

describe('useBlockSelection', () => {
  it('초기 상태: 선택 모드 꺼짐, 선택된 블록 없음', () => {
    const { result } = renderHook(() => useBlockSelection())

    expect(result.current.isSelectionMode).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('선택 모드 토글', () => {
    const { result } = renderHook(() => useBlockSelection())

    act(() => {
      result.current.toggleSelectionMode()
    })

    expect(result.current.isSelectionMode).toBe(true)

    act(() => {
      result.current.toggleSelectionMode()
    })

    expect(result.current.isSelectionMode).toBe(false)
  })

  it('개별 블록 선택/해제', () => {
    const { result } = renderHook(() => useBlockSelection())

    // 선택
    act(() => {
      result.current.toggleBlock('block-1')
    })

    expect(result.current.selectedIds.has('block-1')).toBe(true)

    // 해제
    act(() => {
      result.current.toggleBlock('block-1')
    })

    expect(result.current.selectedIds.has('block-1')).toBe(false)
  })

  it('여러 블록 선택', () => {
    const { result } = renderHook(() => useBlockSelection())

    act(() => {
      result.current.toggleBlock('block-1')
      result.current.toggleBlock('block-2')
      result.current.toggleBlock('block-3')
    })

    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has('block-1')).toBe(true)
    expect(result.current.selectedIds.has('block-2')).toBe(true)
    expect(result.current.selectedIds.has('block-3')).toBe(true)
  })

  it('전체 선택', () => {
    const { result } = renderHook(() => useBlockSelection())
    const blockIds = ['block-1', 'block-2', 'block-3', 'block-4']

    act(() => {
      result.current.selectAll(blockIds)
    })

    expect(result.current.selectedIds.size).toBe(4)
    blockIds.forEach(id => {
      expect(result.current.selectedIds.has(id)).toBe(true)
    })
  })

  it('선택 해제 (clear)', () => {
    const { result } = renderHook(() => useBlockSelection())

    act(() => {
      result.current.toggleBlock('block-1')
      result.current.toggleBlock('block-2')
    })

    expect(result.current.selectedIds.size).toBe(2)

    act(() => {
      result.current.clear()
    })

    expect(result.current.selectedIds.size).toBe(0)
  })

  it('선택 모드 끄면 선택도 해제', () => {
    const { result } = renderHook(() => useBlockSelection())

    // 선택 모드 켜고 블록 선택
    act(() => {
      result.current.toggleSelectionMode()
      result.current.toggleBlock('block-1')
      result.current.toggleBlock('block-2')
    })

    expect(result.current.isSelectionMode).toBe(true)
    expect(result.current.selectedIds.size).toBe(2)

    // 선택 모드 끄기
    act(() => {
      result.current.toggleSelectionMode()
    })

    expect(result.current.isSelectionMode).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('선택된 블록 개수 반환', () => {
    const { result } = renderHook(() => useBlockSelection())

    expect(result.current.selectedCount).toBe(0)

    act(() => {
      result.current.toggleBlock('block-1')
      result.current.toggleBlock('block-2')
    })

    expect(result.current.selectedCount).toBe(2)
  })

  it('특정 블록이 선택되었는지 확인', () => {
    const { result } = renderHook(() => useBlockSelection())

    expect(result.current.isSelected('block-1')).toBe(false)

    act(() => {
      result.current.toggleBlock('block-1')
    })

    expect(result.current.isSelected('block-1')).toBe(true)
    expect(result.current.isSelected('block-2')).toBe(false)
  })
})
