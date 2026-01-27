# BlockNote 리팩토링 계획 (TDD 방식)

## 현재 상태 요약

| 영역 | 문제점 | 영향도 |
|------|--------|--------|
| useBlocks.ts | 338줄, 5개 이상의 책임 | 높음 |
| AppLayout.tsx | 480줄, 30개+ props 드릴링 | 높음 |
| NoteView.tsx | 727줄, 12개 useState | 높음 |
| Supabase | 전체 DELETE+INSERT, RLS 없음 | 높음 |
| 테스트 | 0개 | 중간 |

---

## Phase 1: 핵심 훅 분리 (TDD)

### 1.1 useBlockSelection 분리

**테스트 먼저:**
```typescript
// __tests__/hooks/useBlockSelection.test.ts
describe('useBlockSelection', () => {
  it('선택 모드 토글', () => {})
  it('개별 블록 선택/해제', () => {})
  it('전체 선택', () => {})
  it('선택 해제', () => {})
  it('선택 모드 끄면 선택도 해제', () => {})
})
```

**구현:**
```typescript
// src/hooks/useBlockSelection.ts
export function useBlockSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  return { selectedIds, isSelectionMode, toggle, selectAll, clear }
}
```

**파일:** `src/hooks/useBlockSelection.ts` (신규)

---

### 1.2 useBlockSync 분리 (Supabase 동기화)

**테스트 먼저:**
```typescript
// __tests__/hooks/useBlockSync.test.ts
describe('useBlockSync', () => {
  it('연결 상태 확인', () => {})
  it('블록 배열 upsert', () => {})
  it('단일 블록 업데이트', () => {})
  it('블록 삭제', () => {})
  it('오프라인 시 로컬만 저장', () => {})
  it('debounce 동작', () => {})
})
```

**구현:**
```typescript
// src/hooks/useBlockSync.ts
export function useBlockSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'synced'|'syncing'|'error'>('synced')

  const upsertBlocks = async (blocks: Block[]) => {}
  const deleteBlocks = async (ids: string[]) => {}

  return { isOnline, syncStatus, upsertBlocks, deleteBlocks }
}
```

**파일:** `src/hooks/useBlockSync.ts` (신규)

---

### 1.3 useTop3 분리

**테스트 먼저:**
```typescript
// __tests__/hooks/useTop3.test.ts
describe('useTop3', () => {
  it('TOP3에 추가 (최대 3개)', () => {})
  it('TOP3에서 제거', () => {})
  it('자정 지나면 히스토리로 이동', () => {})
  it('슬롯 인덱스 자동 할당', () => {})
})
```

**파일:** `src/hooks/useTop3.ts` (신규)

---

## Phase 2: Supabase 최적화

### 2.1 upsert 방식으로 변경

**현재 (비효율):**
```typescript
await supabase.from("blocks").delete().is("user_id", null)
await supabase.from("blocks").insert(dbBlocks)
```

**개선:**
```typescript
await supabase.from("blocks").upsert(dbBlocks, {
  onConflict: 'id',
  ignoreDuplicates: false
})
```

### 2.2 변경된 블록만 동기화

**테스트:**
```typescript
describe('incremental sync', () => {
  it('변경된 블록만 업데이트', () => {})
  it('삭제된 블록만 삭제', () => {})
})
```

**구현:**
```typescript
// 이전 상태와 비교
const changedBlocks = blocks.filter(b => {
  const prev = prevBlocksRef.current.find(p => p.id === b.id)
  return !prev || prev.updatedAt < b.updatedAt
})
```

---

## Phase 3: 컴포넌트 분리

### 3.1 ViewRouter 분리

**현재 AppLayout.tsx:**
```tsx
{view.type === "students" ? <StudentListView />
  : view.type === "dashboard" ? <Dashboard />
  : view.type === "weekly" ? <WeeklySchedule />
  : view.type === "calendar" ? <CalendarView />
  : <Editor />}
```

**개선:**
```typescript
// src/components/layout/ViewRouter.tsx
export function ViewRouter({ view, ...props }) {
  const Component = VIEW_COMPONENTS[view.type]
  return <Component {...props} />
}
```

### 3.2 Context API 도입

**테스트:**
```typescript
describe('BlockContext', () => {
  it('블록 데이터 제공', () => {})
  it('CRUD 함수 제공', () => {})
  it('Provider 없으면 에러', () => {})
})
```

**구현:**
```typescript
// src/contexts/BlockContext.tsx
const BlockContext = createContext<BlockContextValue | null>(null)

export function BlockProvider({ children }) {
  const blocks = useBlocks()
  return <BlockContext.Provider value={blocks}>{children}</BlockContext.Provider>
}

export function useBlockContext() {
  const ctx = useContext(BlockContext)
  if (!ctx) throw new Error('BlockProvider 필요')
  return ctx
}
```

---

## Phase 4: 공통 컴포넌트 추출

### 4.1 PropertyEditor 컴포넌트

**현재 중복:**
- NoteView.tsx: 날짜/태그/우선순위 선택 UI
- BlockDetailModal.tsx: 동일한 UI
- PropertyPanel.tsx: 동일한 UI

**개선:**
```typescript
// src/components/property/PropertyEditor.tsx
interface PropertyEditorProps {
  property: BlockProperty
  onUpdate: (value: PropertyValue) => void
  onRemove: () => void
}

export function PropertyEditor({ property, onUpdate, onRemove }: PropertyEditorProps) {
  switch (property.propertyType) {
    case 'checkbox': return <CheckboxEditor {...} />
    case 'date': return <DateEditor {...} />
    case 'tag': return <TagEditor {...} />
    case 'priority': return <PriorityEditor {...} />
    // ...
  }
}
```

### 4.2 드롭다운 상태 통합

**현재 NoteView.tsx:**
```typescript
const [showDatePicker, setShowDatePicker] = useState(false)
const [showTagInput, setShowTagInput] = useState(false)
const [showPriorityPicker, setShowPriorityPicker] = useState(false)
// ... 더 많음
```

**개선:**
```typescript
type ActiveDropdown = 'date' | 'tag' | 'priority' | 'repeat' | null
const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null)
```

---

## Phase 5: 제네릭 훅 통합

### 5.1 useLocalStorageEntity

**테스트:**
```typescript
describe('useLocalStorageEntity', () => {
  it('초기 로드', () => {})
  it('아이템 추가', () => {})
  it('아이템 수정', () => {})
  it('아이템 삭제', () => {})
  it('localStorage 동기화', () => {})
})
```

**구현:**
```typescript
// src/hooks/useLocalStorageEntity.ts
export function useLocalStorageEntity<T extends { id: string }>(
  key: string,
  defaultValue: T[]
) {
  const [items, setItems] = useState<T[]>(defaultValue)

  const add = (item: Omit<T, 'id'>) => {}
  const update = (id: string, updates: Partial<T>) => {}
  const remove = (id: string) => {}

  return { items, add, update, remove }
}
```

**적용:**
```typescript
// useTags.ts → 20줄로 축소
export const useTags = () => useLocalStorageEntity<Tag>('blocknote-tags', mockTags)

// useBlockTypes.ts → 20줄로 축소
export const useBlockTypes = () => useLocalStorageEntity<BlockType>('blocknote-types', mockBlockTypes)
```

---

## Phase 6: 성능 최적화

### 6.1 가상 스크롤링 (100+ 블록 대응)

```typescript
// src/components/block/VirtualBlockList.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualBlockList({ blocks }) {
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  })
  // ...
}
```

### 6.2 메모이제이션 감사

**제거 대상 (불필요):**
```typescript
// 간단한 계산은 useMemo 불필요
const viewTitle = useMemo(() => VIEW_LABELS[view.type], [view.type])
// → const viewTitle = VIEW_LABELS[view.type]
```

**유지 대상 (필요):**
```typescript
// 무거운 계산은 유지
const filteredBlocks = useMemo(() =>
  filterBlocksByView(blocks, view), [blocks, view])
```

---

## 구현 순서 (TDD 사이클)

### Week 1: 훅 분리
| 단계 | 작업 | 테스트 파일 | 구현 파일 |
|------|------|------------|----------|
| 1 | useBlockSelection | `useBlockSelection.test.ts` | `useBlockSelection.ts` |
| 2 | useBlockSync | `useBlockSync.test.ts` | `useBlockSync.ts` |
| 3 | useTop3 | `useTop3.test.ts` | `useTop3.ts` |
| 4 | useBlocks 정리 | `useBlocks.test.ts` | `useBlocks.ts` (축소) |

### Week 2: Supabase 최적화
| 단계 | 작업 | 테스트 | 구현 |
|------|------|--------|------|
| 1 | upsert 변경 | 통합 테스트 | `useBlockSync.ts` |
| 2 | 증분 동기화 | 단위 테스트 | `useBlockSync.ts` |
| 3 | 오프라인 지원 | E2E 테스트 | `useBlockSync.ts` |

### Week 3: 컴포넌트 분리
| 단계 | 작업 | 영향 파일 |
|------|------|----------|
| 1 | BlockContext | `BlockContext.tsx`, `AppLayout.tsx` |
| 2 | ViewRouter | `ViewRouter.tsx`, `AppLayout.tsx` |
| 3 | PropertyEditor | `PropertyEditor.tsx`, `NoteView.tsx`, `BlockDetailModal.tsx` |

### Week 4: 최적화
| 단계 | 작업 |
|------|------|
| 1 | 가상 스크롤링 |
| 2 | 메모이제이션 감사 |
| 3 | 번들 사이즈 분석 |

---

## 테스트 설정

### 1. 의존성 설치
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

### 2. vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

### 3. 테스트 스크립트
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## 예상 결과

| 지표 | 현재 | 목표 |
|------|------|------|
| useBlocks.ts 라인 | 338 | 150 |
| AppLayout.tsx 라인 | 480 | 200 |
| NoteView.tsx 라인 | 727 | 400 |
| 테스트 커버리지 | 0% | 60%+ |
| Supabase 동기화 | 전체 재작성 | 증분 업데이트 |
| 100블록 렌더링 | ~500ms | ~100ms |

---

## 다음 단계

1. [ ] 테스트 환경 설정 (vitest)
2. [ ] useBlockSelection 테스트 작성
3. [ ] useBlockSelection 구현
4. [ ] useBlockSync 테스트 작성
5. [ ] useBlockSync 구현
6. [ ] useBlocks에서 분리된 훅 통합
