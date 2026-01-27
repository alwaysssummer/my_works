import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertyEditor } from '@/components/property/PropertyEditor'
import { BlockProperty } from '@/types/property'

describe('PropertyEditor', () => {
  const mockOnUpdate = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('체크박스 속성', () => {
    const checkboxProperty: BlockProperty = {
      id: 'prop-1',
      propertyType: 'checkbox',
      name: '완료',
      value: { type: 'checkbox', checked: false },
    }

    it('체크박스 렌더링', () => {
      render(
        <PropertyEditor
          property={checkboxProperty}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('체크박스 클릭 시 onUpdate 호출', () => {
      render(
        <PropertyEditor
          property={checkboxProperty}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnUpdate).toHaveBeenCalledWith({
        type: 'checkbox',
        checked: true,
      })
    })
  })

  describe('날짜 속성', () => {
    const dateProperty: BlockProperty = {
      id: 'prop-2',
      propertyType: 'date',
      name: '날짜',
      value: { type: 'date', date: '2025-01-25' },
    }

    it('날짜 표시', () => {
      render(
        <PropertyEditor
          property={dateProperty}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText(/2025-01-25|1월 25일/)).toBeInTheDocument()
    })
  })

  describe('태그 속성', () => {
    const tagProperty: BlockProperty = {
      id: 'prop-3',
      propertyType: 'tag',
      name: '태그',
      value: { type: 'tag', tagIds: ['tag-1'] },
    }

    it('태그 렌더링', () => {
      const tags = [{ id: 'tag-1', name: '중요', color: '#ff0000' }]

      render(
        <PropertyEditor
          property={tagProperty}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
          tags={tags}
        />
      )

      expect(screen.getByText('중요')).toBeInTheDocument()
    })
  })

  describe('우선순위 속성', () => {
    const priorityProperty: BlockProperty = {
      id: 'prop-4',
      propertyType: 'priority',
      name: '우선순위',
      value: { type: 'priority', level: 'high' },
    }

    it('우선순위 표시', () => {
      render(
        <PropertyEditor
          property={priorityProperty}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText(/높음|High|●/i)).toBeInTheDocument()
    })
  })

  describe('삭제 버튼', () => {
    const property: BlockProperty = {
      id: 'prop-1',
      propertyType: 'checkbox',
      name: '완료',
      value: { type: 'checkbox', checked: false },
    }

    it('삭제 버튼 표시 (showRemove=true)', () => {
      render(
        <PropertyEditor
          property={property}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
          showRemove={true}
        />
      )

      const removeButton = screen.getByRole('button', { name: /삭제|제거|×/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('삭제 버튼 클릭 시 onRemove 호출', () => {
      render(
        <PropertyEditor
          property={property}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
          showRemove={true}
        />
      )

      const removeButton = screen.getByRole('button', { name: /삭제|제거|×/i })
      fireEvent.click(removeButton)

      expect(mockOnRemove).toHaveBeenCalled()
    })
  })

  describe('읽기 전용 모드', () => {
    const property: BlockProperty = {
      id: 'prop-1',
      propertyType: 'checkbox',
      name: '완료',
      value: { type: 'checkbox', checked: false },
    }

    it('readonly 시 체크박스 비활성화', () => {
      render(
        <PropertyEditor
          property={property}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
          readonly={true}
        />
      )

      expect(screen.getByRole('checkbox')).toBeDisabled()
    })
  })
})
