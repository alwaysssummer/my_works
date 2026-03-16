import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { UnifiedInput } from '@/components/input/UnifiedInput'

// imageStorage 모킹
const mockSaveImage = vi.fn()
const mockGetImage = vi.fn()
const mockDeleteImage = vi.fn()

vi.mock('@/lib/imageStorage', () => ({
  saveImage: (...args: unknown[]) => mockSaveImage(...args),
  getImage: (...args: unknown[]) => mockGetImage(...args),
  deleteImage: (...args: unknown[]) => mockDeleteImage(...args),
}))

// BlockContext 모킹
const mockAddBlock = vi.fn(() => 'new-block-id')
const mockAddProperty = vi.fn()
const mockTogglePin = vi.fn()

vi.mock('@/contexts/BlockContext', () => ({
  useBlockActions: () => ({
    addBlock: mockAddBlock,
    addProperty: mockAddProperty,
    togglePin: mockTogglePin,
  }),
}))

// unifiedInputProcessor 모킹
vi.mock('@/lib/unifiedInputProcessor', () => ({
  processUnifiedInput: (text: string) => ({
    name: text,
    content: '',
    properties: {
      cleanText: text,
      hasCheckbox: false,
      date: null,
      tags: [],
      priority: null,
    },
  }),
}))

vi.mock('@/lib/parseQuickInput', () => ({
  parseQuickInput: (text: string) => ({
    cleanText: text,
    hasCheckbox: false,
    date: null,
    tags: [],
    priority: null,
  }),
  hasQuickProperties: () => false,
}))

vi.mock('@/lib/blockDefaults', () => ({
  processBlockInput: vi.fn(),
}))

/**
 * 이미지 붙여넣기 이벤트 생성 헬퍼
 */
function createPasteEventWithImage() {
  const file = new File(['fake-image-data'], 'test.png', { type: 'image/png' })
  return {
    items: [
      {
        type: 'image/png',
        getAsFile: () => file,
      },
    ],
  }
}

/** 포커스 → textarea 확장 후 textarea 반환 */
async function focusAndGetTextarea() {
  const input = screen.getByPlaceholderText('입력...')
  await act(async () => {
    fireEvent.focus(input)
  })
  // 포커스 후 input + textarea 둘 다 존재. textarea를 직접 선택
  const textarea = document.querySelector('textarea')!
  return textarea
}

describe('UnifiedInput 이미지 붙여넣기', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveImage.mockResolvedValue('test-image-id')
    mockGetImage.mockResolvedValue('blob:http://localhost/fake-url')
  })

  it('textarea에 이미지 붙여넣기 시 미리보기 표시', async () => {
    render(<UnifiedInput />)
    const textarea = await focusAndGetTextarea()

    await act(async () => {
      fireEvent.paste(textarea, { clipboardData: createPasteEventWithImage() })
    })

    await waitFor(() => {
      expect(mockSaveImage).toHaveBeenCalledTimes(1)
      expect(mockGetImage).toHaveBeenCalledWith('test-image-id')
    })

    await waitFor(() => {
      expect(screen.getByTestId('image-preview-area')).toBeInTheDocument()
      expect(screen.getByAltText('image-test-image-id')).toBeInTheDocument()
    })
  })

  it('이미지 삭제 버튼 클릭 시 미리보기에서 제거', async () => {
    render(<UnifiedInput />)
    const textarea = await focusAndGetTextarea()

    await act(async () => {
      fireEvent.paste(textarea, { clipboardData: createPasteEventWithImage() })
    })

    await waitFor(() => {
      expect(screen.getByTestId('image-preview-area')).toBeInTheDocument()
    })

    const removeButton = screen.getByTestId('remove-image-test-image-id')
    await act(async () => {
      fireEvent.click(removeButton)
    })

    await waitFor(() => {
      expect(mockDeleteImage).toHaveBeenCalledWith('test-image-id')
    })

    expect(screen.queryByTestId('image-preview-area')).not.toBeInTheDocument()
  })

  it('Ctrl+Enter 제출 시 이미지가 content에 포함', async () => {
    render(<UnifiedInput />)
    const textarea = await focusAndGetTextarea()

    // 텍스트 입력
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '테스트 메모' } })
    })

    // 이미지 붙여넣기
    await act(async () => {
      fireEvent.paste(textarea, { clipboardData: createPasteEventWithImage() })
    })

    await waitFor(() => {
      expect(screen.getByTestId('image-preview-area')).toBeInTheDocument()
    })

    // Ctrl+Enter로 제출
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    })

    expect(mockAddBlock).toHaveBeenCalledWith(undefined, {
      name: '테스트 메모',
      content: '<img src="blob:http://localhost/fake-url" alt="image-test-image-id">',
    })
  })

  it('취소 시 붙여넣기된 이미지 정리', async () => {
    render(<UnifiedInput />)
    const textarea = await focusAndGetTextarea()

    await act(async () => {
      fireEvent.paste(textarea, { clipboardData: createPasteEventWithImage() })
    })

    await waitFor(() => {
      expect(screen.getByTestId('image-preview-area')).toBeInTheDocument()
    })

    // 닫기 버튼 클릭
    const cancelButton = screen.getByText('닫기')
    await act(async () => {
      fireEvent.click(cancelButton)
    })

    await waitFor(() => {
      expect(mockDeleteImage).toHaveBeenCalledWith('test-image-id')
    })
  })
})
