# Phase 2: Canvas UI

## Objectives

Integrate tldraw SDK into the Next.js frontend to render an infinite canvas. Canvas state loads from the REST API on mount and human interactions (create, move, resize, delete) persist back via API calls. After Phase 2, a human can open a board URL and see all items an AI agent has created, and interact with them on a visual canvas.

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D2.1 | tldraw canvas on board page | `/boards/[id]` renders tldraw instead of document list |
| D2.2 | API snapshot loading | Canvas loads items from REST API on mount |
| D2.3 | Canvas-to-API sync | Human changes on canvas persist via REST API |
| D2.4 | Custom item shapes | DockerClaw item types rendered as tldraw shapes |
| D2.5 | Canvas toolbar | Custom tools for creating sticky notes, text, shapes |
| D2.6 | Board list updates | Board cards show item count, last activity |
| D2.7 | Loading and error states | Skeleton loader, error boundary, empty board state |

---

## Technology Setup

### New Dependencies (`frontend/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `@tldraw/tldraw` | latest | Core canvas engine |
| `tldraw` | latest | Full tldraw package with UI |

### Important: tldraw CSS

tldraw requires its CSS to be imported. Add to the board page layout:

```typescript
import '@tldraw/tldraw/tldraw.css'
```

---

## Target Frontend Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                    # (existing — add navigation header)
│   ├── page.tsx                      # (existing — board list)
│   ├── boards/
│   │   └── [id]/
│   │       ├── page.tsx              # REPLACE: now renders CanvasPage
│   │       ├── loading.tsx           # Skeleton loader
│   │       └── documents/
│   │           └── [docId]/
│   │               └── page.tsx      # (existing — keep for backward compat)
│   └── agents/
│       └── page.tsx                  # (existing — API docs)
├── components/
│   ├── canvas/
│   │   ├── CanvasShell.tsx           # Main tldraw wrapper component
│   │   ├── CanvasToolbar.tsx         # Custom toolbar actions
│   │   ├── shapes/
│   │   │   ├── StickyShape.tsx       # Custom sticky note shape
│   │   │   ├── TextShape.tsx         # Custom text block shape
│   │   │   ├── DockerClawShapeUtil.ts# Shape utilities for DockerClaw types
│   │   │   └── index.ts             # Shape registration
│   │   ├── ItemPanel.tsx             # Side panel for item properties
│   │   └── EmptyCanvas.tsx           # Empty state overlay
│   ├── board/
│   │   ├── BoardCard.tsx             # (existing — minor update)
│   │   ├── BoardList.tsx             # (existing)
│   │   └── CreateBoardModal.tsx      # (existing)
│   ├── ui/                           # (existing shadcn components)
│   └── layout/
│       └── Header.tsx                # Navigation header (board name, back button)
├── hooks/
│   ├── useBoard.ts                   # Fetch board details
│   ├── useCanvasItems.ts             # Fetch/mutate canvas items
│   ├── useCanvasSync.ts              # Sync tldraw store changes → REST API
│   └── useApiKey.ts                  # API key management (localStorage)
├── lib/
│   ├── api.ts                        # (extend: add items, connectors, snapshots)
│   ├── tldraw/
│   │   ├── store.ts                  # Create and configure TLStore
│   │   ├── shapes.ts                 # Custom shape definitions
│   │   ├── tools.ts                  # Custom tool definitions
│   │   └── sync.ts                   # Store ↔ API sync utilities
│   └── constants.ts                  # Colors, sizes, defaults
└── types/
    └── canvas.ts                     # TypeScript types for items, connectors
```

---

## Task Breakdown

### T2.1: Install tldraw and Configure

**Description:** Install tldraw SDK and configure it for the Next.js environment.

**Commands:**
```bash
cd frontend && npm install tldraw @tldraw/tldraw
```

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/next.config.ts` (add tldraw transpile config if needed)

**Acceptance Criteria:**
- `npm run build` succeeds with tldraw installed
- No SSR issues (tldraw must be client-side only — use `'use client'` directive)
- tldraw CSS loads without conflicts with Tailwind

---

### T2.2: Create TypeScript Types

**Description:** Define TypeScript interfaces matching the API response schemas.

**Files:**
- Create: `frontend/src/types/canvas.ts`

**Implementation:**
```typescript
// frontend/src/types/canvas.ts

export type ItemType = 'sticky' | 'text' | 'shape' | 'frame' | 'image' | 'document'

export interface CanvasItem {
  id: string
  board_id: string
  type: ItemType
  x: number
  y: number
  width: number | null
  height: number | null
  rotation: number
  z_index: number
  content: Record<string, unknown>
  style: ItemStyle
  frame_id: string | null
  locked: boolean
  visible: boolean
  created_by: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ItemStyle {
  color?: string
  fill?: 'solid' | 'semi' | 'none'
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  fontSize?: number
  fontFamily?: string
}

export interface StickyContent {
  text: string
  color?: string
}

export interface TextContent {
  text: string
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
}

export interface ShapeContent {
  shapeType: 'rect' | 'circle' | 'diamond' | 'triangle'
  label?: string
}

export interface Board {
  id: string
  name: string
  description: string | null
  settings: Record<string, unknown>
  item_count: number
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    has_more: boolean
    next_cursor: string | null
  }
}
```

---

### T2.3: Extend API Client

**Description:** Add item CRUD, batch, and snapshot methods to the existing API client.

**Files:**
- Modify: `frontend/src/lib/api.ts`

**New Methods:**
```typescript
// Items
getItems(boardId: string, params?: ItemQueryParams): Promise<ApiResponse<CanvasItem[]>>
createItem(boardId: string, item: CreateItemInput): Promise<ApiResponse<CanvasItem>>
updateItem(boardId: string, itemId: string, updates: Partial<CanvasItem>): Promise<ApiResponse<CanvasItem>>
updateItemPosition(boardId: string, itemId: string, position: Position): Promise<ApiResponse<CanvasItem>>
deleteItem(boardId: string, itemId: string): Promise<void>
batchCreateItems(boardId: string, items: CreateItemInput[]): Promise<BatchResponse>

// Snapshots
getSnapshot(boardId: string): Promise<ApiResponse<CanvasSnapshot>>
```

**Acceptance Criteria:**
- All methods use TanStack Query-compatible async functions
- Error handling: throw structured errors for 4xx/5xx
- API key passed via `X-API-Key` header (read from localStorage or context)

---

### T2.4: Create TanStack Query Hooks

**Description:** React hooks for data fetching and mutations using TanStack Query.

**Files:**
- Create: `frontend/src/hooks/useBoard.ts`
- Create: `frontend/src/hooks/useCanvasItems.ts`

**Implementation:**
```typescript
// frontend/src/hooks/useCanvasItems.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCanvasItems(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId, 'items'],
    queryFn: () => api.getItems(boardId),
    staleTime: 30_000, // 30s before refetch
  })
}

export function useCreateItem(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (item: CreateItemInput) => api.createItem(boardId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'items'] })
    },
  })
}

export function useUpdateItemPosition(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, position }: { itemId: string; position: Position }) =>
      api.updateItemPosition(boardId, itemId, position),
    // Optimistic update: move immediately, revert on error
    onMutate: async ({ itemId, position }) => {
      await queryClient.cancelQueries({ queryKey: ['boards', boardId, 'items'] })
      const previous = queryClient.getQueryData(['boards', boardId, 'items'])
      queryClient.setQueryData(['boards', boardId, 'items'], (old: any) => ({
        ...old,
        data: old.data.map((item: CanvasItem) =>
          item.id === itemId ? { ...item, ...position } : item
        ),
      }))
      return { previous }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['boards', boardId, 'items'], context?.previous)
    },
  })
}
```

---

### T2.5: Create tldraw Store Utilities

**Description:** Functions to convert between DockerClaw items and tldraw records.

**Files:**
- Create: `frontend/src/lib/tldraw/store.ts`
- Create: `frontend/src/lib/tldraw/shapes.ts`

**Key Functions:**
```typescript
// frontend/src/lib/tldraw/store.ts

import { createTLStore, TLRecord, TLShapeId } from '@tldraw/tldraw'
import { CanvasItem } from '@/types/canvas'

// Convert DockerClaw items to tldraw records
export function itemsToTldrawRecords(items: CanvasItem[]): TLRecord[] {
  return items.map(item => ({
    id: `shape:${item.id}` as TLShapeId,
    typeName: 'shape',
    type: mapType(item.type),        // 'sticky' → 'note', 'shape' → 'geo', etc.
    x: item.x,
    y: item.y,
    rotation: (item.rotation * Math.PI) / 180, // degrees → radians
    props: mapContentToProps(item),
    meta: {
      dockerclaw_id: item.id,
      dockerclaw_type: item.type,
      created_by: item.created_by,
      locked: item.locked,
      version: item.version,
    },
  }))
}

// Convert tldraw record back to DockerClaw item update
export function tldrawRecordToItemUpdate(record: TLRecord): Partial<CanvasItem> {
  return {
    x: record.x,
    y: record.y,
    rotation: (record.rotation * 180) / Math.PI,
    width: record.props?.w,
    height: record.props?.h,
    // Map tldraw props back to DockerClaw content...
  }
}

function mapType(type: string): string {
  const typeMap: Record<string, string> = {
    'sticky': 'note',
    'text': 'text',
    'shape': 'geo',
    'frame': 'frame',
    'image': 'image',
    'document': 'note', // render as note with document icon
  }
  return typeMap[type] || 'geo'
}
```

---

### T2.6: Create CanvasShell Component

**Description:** Main wrapper component that renders tldraw with data from the API.

**Files:**
- Create: `frontend/src/components/canvas/CanvasShell.tsx`

**Implementation:**
```typescript
// frontend/src/components/canvas/CanvasShell.tsx
'use client'

import { Tldraw, TLStore, createTLStore, loadSnapshot } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useMemo, useCallback, useRef } from 'react'
import { useCanvasItems } from '@/hooks/useCanvasItems'
import { itemsToTldrawRecords, tldrawRecordToItemUpdate } from '@/lib/tldraw/store'
import { api } from '@/lib/api'
import { debounce } from '@/lib/utils'

interface CanvasShellProps {
  boardId: string
  apiKey: string
}

export function CanvasShell({ boardId, apiKey }: CanvasShellProps) {
  const { data: itemsResponse, isLoading } = useCanvasItems(boardId)
  const pendingUpdates = useRef<Map<string, any>>(new Map())

  // Create tldraw store
  const store = useMemo(() => createTLStore(), [])

  // Load items into tldraw store when data arrives
  useEffect(() => {
    if (!itemsResponse?.data) return
    const records = itemsToTldrawRecords(itemsResponse.data)
    // Load records into tldraw store
    store.put(records)
  }, [itemsResponse, store])

  // Debounced sync: tldraw changes → REST API
  const syncToApi = useMemo(
    () => debounce(async (updates: Map<string, any>) => {
      for (const [itemId, update] of updates) {
        try {
          await api.updateItemPosition(boardId, itemId, update)
        } catch (err) {
          console.error('Failed to sync item', itemId, err)
        }
      }
      updates.clear()
    }, 500),
    [boardId]
  )

  // Listen to tldraw store changes
  useEffect(() => {
    const unsubscribe = store.listen((entry) => {
      for (const record of Object.values(entry.changes.updated)) {
        const meta = record[1]?.meta as any
        if (meta?.dockerclaw_id) {
          const update = tldrawRecordToItemUpdate(record[1])
          pendingUpdates.current.set(meta.dockerclaw_id, update)
          syncToApi(pendingUpdates.current)
        }
      }
    })
    return unsubscribe
  }, [store, syncToApi])

  if (isLoading) {
    return <CanvasSkeleton />
  }

  return (
    <div className="w-full h-full">
      <Tldraw store={store} />
    </div>
  )
}
```

**Acceptance Criteria:**
- tldraw canvas renders full-screen on board page
- Items from API appear as shapes on canvas
- Moving/resizing items triggers debounced API update
- Creating items in tldraw triggers API create
- Deleting items in tldraw triggers API delete

---

### T2.7: Replace Board Detail Page

**Description:** Replace the current document list page with the canvas page.

**Files:**
- Modify: `frontend/src/app/boards/[id]/page.tsx`
- Create: `frontend/src/app/boards/[id]/loading.tsx`

**Implementation:**
```typescript
// frontend/src/app/boards/[id]/page.tsx
'use client'

import { use } from 'react'
import { CanvasShell } from '@/components/canvas/CanvasShell'
import { useBoard } from '@/hooks/useBoard'
import { Header } from '@/components/layout/Header'
import { useApiKey } from '@/hooks/useApiKey'

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: board, isLoading, error } = useBoard(id)
  const { apiKey } = useApiKey(id)

  if (isLoading) return <BoardSkeleton />
  if (error) return <BoardError error={error} />
  if (!board) return <BoardNotFound />
  if (!apiKey) return <ApiKeyPrompt boardId={id} />

  return (
    <div className="flex flex-col h-screen">
      <Header boardName={board.data.name} boardId={id} />
      <div className="flex-1">
        <CanvasShell boardId={id} apiKey={apiKey} />
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- `/boards/[id]` now shows tldraw canvas (not document list)
- Header shows board name + back button to board list
- Loading skeleton while fetching board/items
- Error state if board not found or API unreachable
- API key prompt if no key stored for this board

---

### T2.8: Create API Key Management Hook

**Description:** Hook to store/retrieve API keys per board in localStorage.

**Files:**
- Create: `frontend/src/hooks/useApiKey.ts`

**Implementation:**
```typescript
// frontend/src/hooks/useApiKey.ts
import { useState, useEffect } from 'react'

export function useApiKey(boardId: string) {
  const [apiKey, setApiKeyState] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`dc_key_${boardId}`)
    if (stored) setApiKeyState(stored)
  }, [boardId])

  const setApiKey = (key: string) => {
    localStorage.setItem(`dc_key_${boardId}`, key)
    setApiKeyState(key)
  }

  const clearApiKey = () => {
    localStorage.removeItem(`dc_key_${boardId}`)
    setApiKeyState(null)
  }

  return { apiKey, setApiKey, clearApiKey }
}
```

---

### T2.9: Create Navigation Header

**Description:** Top navigation bar with board name, back button, and settings.

**Files:**
- Create: `frontend/src/components/layout/Header.tsx`

**Acceptance Criteria:**
- Shows board name
- Back arrow → navigate to `/` (board list)
- Settings icon (placeholder for future features)
- Responsive: collapses on mobile

---

### T2.10: Create Custom Canvas Toolbar

**Description:** Custom toolbar overlay for creating DockerClaw-specific items.

**Files:**
- Create: `frontend/src/components/canvas/CanvasToolbar.tsx`

**Tools:**
| Tool | Icon | Action |
|------|------|--------|
| Sticky Note | Square/note | Creates sticky at cursor position |
| Text | T | Creates text block at cursor position |
| Shape | Rectangle | Opens shape type picker (rect/circle/diamond) |
| Frame | Dashed rectangle | Creates frame for grouping |

**Acceptance Criteria:**
- Toolbar floats on left side of canvas
- Clicking tool activates creation mode
- Clicking on canvas creates item at click position
- Item immediately persisted via API

---

### T2.11: Update Board List

**Description:** Minor updates to the board list to show item counts and last activity.

**Files:**
- Modify: `frontend/src/components/board/BoardCard.tsx`

**Changes:**
- Show item count badge
- Show "last active" relative timestamp
- Show thumbnail preview (stretch goal)

---

### T2.12: Handle Empty Board State

**Description:** When a board has no items, show a helpful empty state instead of a blank canvas.

**Files:**
- Create: `frontend/src/components/canvas/EmptyCanvas.tsx`

**Acceptance Criteria:**
- Shows centered message: "This board is empty"
- Suggests: "Create items with the toolbar or via the API"
- Shows API endpoint example for quick copy
- Dismisses on first item creation

---

## tldraw Store Sync Strategy

### Write Path (tldraw → API)

```
User action (drag, create, delete)
  → tldraw TLStore change event
  → store.listen() callback
  → Extract changed records
  → Convert tldraw record → DockerClaw item update
  → Debounce 500ms (batch position changes)
  → PATCH /v1/boards/:id/items/:itemId
  → On 409 (version conflict): reload items from API
```

### Read Path (API → tldraw)

```
Page mount
  → GET /v1/boards/:id/items (TanStack Query)
  → Convert DockerClaw items → tldraw records
  → store.put(records) to load into tldraw
  → Stale time: 30s (auto-refetch for background changes)
```

### Optimistic Updates

- **Move:** Update tldraw store immediately. If API returns error, revert position.
- **Create:** Add to tldraw store with temporary ID. Replace with real ID on API response.
- **Delete:** Remove from tldraw store immediately. If API returns error, restore.

---

## Frontend Testing

### Unit Tests
- `useCanvasSync` hook with mocked tldraw store
- `itemsToTldrawRecords` conversion functions
- `tldrawRecordToItemUpdate` conversion functions

### Component Tests
- `CanvasShell` renders without crashing
- `CanvasShell` shows skeleton while loading
- `CanvasShell` shows error on API failure

### E2E Tests (Playwright)
- Open board page → canvas renders
- Create sticky note via toolbar → item appears on canvas
- Reload page → item persists
- Delete item → item removed from canvas

---

## Definition of Done

- [ ] `/boards/[id]` renders tldraw canvas (not document list)
- [ ] Items created via REST API appear on canvas
- [ ] Human can create sticky notes via toolbar
- [ ] Human can move items — position persists on reload
- [ ] Human can delete items — removed from DB
- [ ] Board list page still works with item counts
- [ ] No console errors in production
- [ ] Vercel deploy green
- [ ] Canvas loads in < 3s on cold start
- [ ] Canvas renders 500 items without frame drops

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| tldraw SSR incompatibility with Next.js | High | Use `'use client'` directive, dynamic import with `{ ssr: false }` |
| tldraw CSS conflicts with Tailwind | Medium | Scope tldraw CSS to canvas container, use CSS modules if needed |
| tldraw bundle size (~500KB gzipped) | Medium | Dynamic import on board page only, code splitting |
| Sync conflicts (stale data) | Medium | Version-based optimistic locking, 409 handling with reload |
| tldraw API changes between versions | Low | Pin exact version in package.json |
