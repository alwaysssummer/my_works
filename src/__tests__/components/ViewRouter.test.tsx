import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ViewRouter } from '@/components/layout/ViewRouter'
import { View } from '@/types/view'

// 모든 뷰 컴포넌트 모킹
vi.mock('@/components/view/StudentListView', () => ({
  StudentListView: () => <div data-testid="student-list-view">StudentListView</div>,
}))

vi.mock('@/components/view/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-view">Dashboard</div>,
}))

vi.mock('@/components/view/WeeklySchedule', () => ({
  WeeklySchedule: () => <div data-testid="weekly-view">WeeklySchedule</div>,
}))

vi.mock('@/components/view/CalendarView', () => ({
  CalendarView: () => <div data-testid="calendar-view">CalendarView</div>,
}))

vi.mock('@/components/layout/Editor', () => ({
  Editor: () => <div data-testid="editor-view">Editor</div>,
}))

// 기본 props 생성
const createDefaultProps = () => ({
  blocks: [],
  filteredBlocks: [],
  isLoaded: true,
  viewTitle: '테스트',
  tags: [],
  blockTypes: [],
  top3Blocks: [],
  top3History: [],
  students: [],
  settings: { weeklyStartHour: 9, weeklyEndHour: 18, weeklyDays: [1, 2, 3, 4, 5] },
  frequentTags: [],
  selectedBlockIds: new Set<string>(),
  isSelectionMode: false,
  // 함수들
  onAddBlock: vi.fn(),
  onUpdateBlock: vi.fn(),
  onDeleteBlock: vi.fn(),
  onSelectBlock: vi.fn(),
  onAddStudent: vi.fn(),
  onAddToTop3: vi.fn(),
  onRemoveFromTop3: vi.fn(),
  onToggleCheckbox: vi.fn(),
  onAddProperty: vi.fn(),
  onCalendarSelectDate: vi.fn(),
  onAddSchedule: vi.fn(),
  // Editor 전용
  onIndentBlock: vi.fn(),
  onOutdentBlock: vi.fn(),
  onToggleCollapse: vi.fn(),
  hasChildren: vi.fn(),
  isChildOfCollapsed: vi.fn(),
  getPrevBlockId: vi.fn(),
  getNextBlockId: vi.fn(),
  onUpdateProperty: vi.fn(),
  onUpdatePropertyByType: vi.fn(),
  onUpdateBlockName: vi.fn(),
  onUpdatePropertyName: vi.fn(),
  onRemoveProperty: vi.fn(),
  onRemovePropertyByType: vi.fn(),
  onCreateTag: vi.fn(),
  onApplyType: vi.fn(),
  onMoveBlockUp: vi.fn(),
  onMoveBlockDown: vi.fn(),
  onDuplicateBlock: vi.fn(),
  onDeleteCompletedTodos: vi.fn(),
  onClearSelection: vi.fn(),
  triggerQuickInput: vi.fn(),
  onTogglePin: vi.fn(),
  onMoveToColumn: vi.fn(),
  onToggleSelectionMode: vi.fn(),
  onToggleBlockSelection: vi.fn(),
  onSelectAllBlocks: vi.fn(),
  onClearBlockSelection: vi.fn(),
  onDeleteSelectedBlocks: vi.fn(),
})

describe('ViewRouter', () => {
  describe('뷰 타입별 렌더링', () => {
    it('students 뷰: StudentListView 렌더링', () => {
      const view: View = { type: 'students' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('student-list-view')).toBeInTheDocument()
    })

    it('dashboard 뷰: Dashboard 렌더링', () => {
      const view: View = { type: 'dashboard' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
    })

    it('weekly 뷰: WeeklySchedule 렌더링', () => {
      const view: View = { type: 'weekly' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('weekly-view')).toBeInTheDocument()
    })

    it('calendar 뷰 (날짜 없음): CalendarView 렌더링', () => {
      const view: View = { type: 'calendar' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
    })

    it('기본 뷰 (all, today, todo 등): Editor 렌더링', () => {
      const view: View = { type: 'all' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('editor-view')).toBeInTheDocument()
    })

    it('tag 뷰: Editor 렌더링', () => {
      const view: View = { type: 'tag', tagId: 'tag-1' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('editor-view')).toBeInTheDocument()
    })

    it('calendar 뷰 (날짜 있음): Editor 렌더링', () => {
      const view: View = { type: 'calendar', date: '2025-01-25' }
      render(<ViewRouter view={view} {...createDefaultProps()} />)

      expect(screen.getByTestId('editor-view')).toBeInTheDocument()
    })
  })
})
