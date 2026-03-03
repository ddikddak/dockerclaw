# 🚀 A++ Refactoring Plan

## Goal: Production-grade performance, reliability, and maintainability

---

## Phase 1: Critical Fixes (Week 1) - STOP THE BLEEDING

### 1.1 Fix Memory Leaks & Listener Cleanup

**File: `src/components/BlockWrapper.tsx`**
```typescript
// CURRENT ISSUE: Listeners not cleaned up on unmount
// Line 225-228: window.addEventListener in startDrag

// FIX: Use AbortController for centralized cleanup
const dragAbortController = useRef<AbortController | null>(null);

const startDrag = useCallback((e) => {
  // ... setup code ...
  
  dragAbortController.current = new AbortController();
  const { signal } = dragAbortController.current;
  
  window.addEventListener('mousemove', handleMove, { passive: false, signal });
  window.addEventListener('mouseup', handleUp, { signal });
  window.addEventListener('touchmove', handleMove, { passive: false, signal });
  window.addEventListener('touchend', handleUp, { signal });
}, [...]);

// Add cleanup in useEffect
useEffect(() => {
  return () => {
    dragAbortController.current?.abort();
  };
}, []);
```

### 1.2 Fix Array Mutation Bug

**File: `src/components/Canvas.tsx` (Line 1126)**
```typescript
// BEFORE (mutates original array):
const firstColumn = kanbanData.columns.sort((a, b) => a.order - b.order)[0];

// AFTER (immutable):
const firstColumn = [...kanbanData.columns].sort((a, b) => a.order - b.order)[0];
```

### 1.3 Add Missing useEffect Dependencies

**File: `src/components/Canvas.tsx` (Lines 467-493)**
```typescript
useEffect(() => {
  // ... focus animation code ...
}, [focusBlockId, pan, zoom, onFocusBlockHandled]); // Add missing deps
```

---

## Phase 2: Architecture Overhaul (Week 2) - STRUCTURE

### 2.1 Split Massive Canvas Component

**Current: 1504 lines** → **Target: 5 focused components**

```
src/components/Canvas/
├── index.tsx                 # Main orchestrator (200 lines)
├── CanvasViewport.tsx        # Pan/zoom/background (150 lines)
├── BlockLayer.tsx            # Block rendering only (200 lines)
├── ConnectionLayer.tsx       # SVG connections (150 lines)
├── InteractionLayer.tsx      # Drag/selection/cursors (200 lines)
└── hooks/
    ├── useCanvasPanZoom.ts   # Pan/zoom logic
    ├── useBlockDrag.ts       # Block dragging
    ├── useConnectionDraw.ts  # Connection creation
    └── useCollaboration.ts   # Real-time cursors
```

**Refactor Strategy:**
```typescript
// Canvas/index.tsx - Only coordinates children
export function Canvas({ blocks, connections, ...props }) {
  const { pan, zoom, handlers } = useCanvasPanZoom();
  const { dragState, dragHandlers } = useBlockDrag(blocks);
  
  return (
    <CanvasViewport pan={pan} zoom={zoom} handlers={handlers}>
      <ConnectionLayer connections={connections} blocksById={blocksById} />
      <BlockLayer 
        blocks={blocks} 
        renderBlock={renderBlock}  // Memoized renderer
        dragState={dragState}
      />
      <InteractionLayer cursors={remoteCursors} />
    </CanvasViewport>
  );
}
```

### 2.2 Create Block Registry Pattern

**File: `src/components/blocks/BlockRegistry.tsx`**
```typescript
// Centralized block component registration
const blockRegistry = {
  doc: { 
    component: DocBlock, 
    defaultSize: { w: 400, h: 500 },
    chromeless: false 
  },
  kanban: { 
    component: KanbanBlock, 
    defaultSize: { w: 600, h: 400 },
    chromeless: false 
  },
  heading: { 
    component: HeadingBlock, 
    defaultSize: { w: 300, h: 40 },
    chromeless: true 
  },
  // ... etc
};

// Type-safe block renderer
export function renderBlock(type: BlockType, props: BlockProps) {
  const config = blockRegistry[type];
  if (!config) return <UnknownBlock type={type} />;
  return <config.component {...props} />;
}
```

### 2.3 Extract Virtual List for Kanban/Inbox

**File: `src/components/blocks/KanbanBlock.tsx`**
```typescript
// Current: Renders ALL cards even if not visible
// Fix: Virtualize columns with many cards

import { VirtualList } from '@/components/VirtualList';

function KanbanColumn({ cards }) {
  return (
    <VirtualList
      items={cards}
      itemHeight={80}
      overscan={5}  // Render 5 extra items for smooth scrolling
      renderItem={(card) => <KanbanCard card={card} />}
    />
  );
}
```

---

## Phase 3: Performance Optimization (Week 3) - SPEED

### 3.1 Implement Proper Memoization Strategy

**File: `src/components/Canvas/BlockLayer.tsx` (NEW)**
```typescript
interface BlockItemProps {
  block: Block;
  isSelected: boolean;
  zoom: number;
  // Use stable callback references
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onSelect: (id: string) => void;
}

const BlockItem = memo(function BlockItem({ 
  block, isSelected, zoom, onUpdate, onSelect 
}: BlockItemProps) {
  // Memoized handlers - stable across renders
  const handleUpdate = useCallback((updates: Partial<Block>) => {
    onUpdate(block.id, updates);
  }, [block.id, onUpdate]);
  
  const handleSelect = useCallback(() => {
    onSelect(block.id);
  }, [block.id, onSelect]);
  
  return (
    <BlockWrapper
      block={block}
      isSelected={isSelected}
      zoom={zoom}
      onUpdate={handleUpdate}
      onSelect={handleSelect}
      // ... other memoized handlers
    >
      {renderBlockContent(block)}
    </BlockWrapper>
  );
}, (prev, next) => {
  // Custom comparison - only re-render if these change
  return (
    prev.block.id === next.block.id &&
    prev.block.x === next.block.x &&
    prev.block.y === next.block.y &&
    prev.block.w === next.block.w &&
    prev.block.h === next.block.h &&
    prev.block.z === next.block.z &&
    prev.block.data === next.block.data && // Reference equality for data
    prev.isSelected === next.isSelected &&
    prev.zoom === next.zoom
  );
});
```

### 3.2 Throttle High-Frequency Events

**File: `src/hooks/useThrottledCallback.ts` (NEW)**
```typescript
export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const lastCall = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall.current);
    
    if (remaining <= 0) {
      lastCall.current = now;
      callbackRef.current(...args);
    } else if (!timeout.current) {
      timeout.current = setTimeout(() => {
        lastCall.current = Date.now();
        timeout.current = null;
        callbackRef.current(...args);
      }, remaining);
    }
  }, deps) as T;
}
```

**Usage in Canvas:**
```typescript
const handleMouseMove = useThrottledCallback((e: React.MouseEvent) => {
  // Pan logic
}, 16, [pan, zoom]); // Max 60fps

const handleBlockDrag = useThrottledCallback((x, y) => {
  // Drag logic
}, 16, [/* deps */]);
```

### 3.3 Optimize Connection Rendering with Spatial Index

**File: `src/lib/SpatialIndex.ts` (NEW)**
```typescript
// R-tree or simple quadtree for connection hit-testing
export class SpatialIndex<T> {
  private grid: Map<string, T[]> = new Map();
  private cellSize: number;
  
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }
  
  insert(item: T, bbox: { x: number; y: number; w: number; h: number }) {
    const cells = this.getCellsForBBox(bbox);
    for (const cell of cells) {
      if (!this.grid.has(cell)) this.grid.set(cell, []);
      this.grid.get(cell)!.push(item);
    }
  }
  
  queryRange(x: number, y: number, w: number, h: number): T[] {
    const cells = this.getCellsForBBox({ x, y, w, h });
    const results = new Set<T>();
    for (const cell of cells) {
      this.grid.get(cell)?.forEach(item => results.add(item));
    }
    return Array.from(results);
  }
  
  private getCellsForBBox(bbox: { x: number; y: number; w: number; h: number }): string[] {
    const cells: string[] = [];
    const minCellX = Math.floor(bbox.x / this.cellSize);
    const maxCellX = Math.floor((bbox.x + bbox.w) / this.cellSize);
    const minCellY = Math.floor(bbox.y / this.cellSize);
    const maxCellY = Math.floor((bbox.y + bbox.h) / this.cellSize);
    
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }
}
```

**Usage: Only render connections in viewport**
```typescript
const visibleConnections = useMemo(() => {
  const viewport = {
    x: -pan.x / zoom,
    y: -pan.y / zoom,
    w: canvasWidth / zoom,
    h: canvasHeight / zoom
  };
  return spatialIndex.queryRange(viewport.x, viewport.y, viewport.w, viewport.h);
}, [pan, zoom, canvasWidth, canvasHeight]);
```

### 3.4 Implement Data Normalization (Redux-style)

**File: `src/store/normalizedState.ts` (NEW)**
```typescript
// Flatten nested data for O(1) updates
interface NormalizedState {
  boards: {
    byId: Record<string, Board>;
    allIds: string[];
  };
  blocks: {
    byId: Record<string, Block>;
    byBoardId: Record<string, string[]>; // Index
    allIds: string[];
  };
  cards: { // For kanban cards
    byId: Record<string, KanbanCard>;
    byColumnId: Record<string, string[]>;
  };
}

// Update only one card without copying entire blocks array
const updateCard = (state, cardId, updates) => {
  return {
    ...state,
    cards: {
      ...state.cards,
      byId: {
        ...state.cards.byId,
        [cardId]: { ...state.cards.byId[cardId], ...updates }
      }
    }
  };
};
```

---

## Phase 4: Reliability (Week 4) - ROBUSTNESS

### 4.1 Add Error Boundaries

**File: `src/components/ErrorBoundary.tsx` (NEW)**
```typescript
interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Report to monitoring service
    reportError(error, { 
      component: this.constructor.name,
      ...errorInfo 
    });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Usage in Canvas:**
```typescript
{blocks.map(block => (
  <ErrorBoundary key={block.id} fallback={<BrokenBlock id={block.id} />}>
    <BlockItem block={block} ... />
  </ErrorBoundary>
))}
```

### 4.2 Add Data Validation Layer

**File: `src/lib/validation.ts` (NEW)**
```typescript
import { z } from 'zod';

const BlockDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('kanban'),
    columns: z.array(z.object({
      id: z.string(),
      name: z.string(),
      order: z.number()
    })),
    cards: z.array(z.object({
      id: z.string(),
      columnId: z.string(),
      title: z.string(),
      createdAt: z.string(),
      updatedAt: z.string()
    }))
  }),
  z.object({
    type: z.literal('doc'),
    title: z.string(),
    contentMarkdown: z.string()
  }),
  // ... other block types
]);

export function validateBlockData(data: unknown): BlockData {
  return BlockDataSchema.parse(data);
}

export function safeValidateBlockData(data: unknown): 
  { success: true; data: BlockData } | { success: false; errors: z.ZodError } {
  const result = BlockDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
```

### 4.3 Add Comprehensive Logging

**File: `src/lib/logger.ts` (NEW)**
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  log(level: LogLevel, component: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data
    };
    
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console output in development
    if (import.meta.env.DEV) {
      const styles = {
        debug: 'color: gray',
        info: 'color: blue',
        warn: 'color: orange',
        error: 'color: red; font-weight: bold'
      };
      console.log(`%c[${component}] ${message}`, styles[level], data);
    }
  }
  
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = Logger.getInstance();
```

### 4.4 Add Retry Logic with Exponential Backoff

**File: `src/lib/retry.ts` (NEW)**
```typescript
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryableErrors = () => true
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !retryableErrors(lastError)) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );
      
      logger.log('warn', 'Retry', `Attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: lastError.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

---

## Phase 5: Developer Experience (Week 5) - MONITORING

### 5.1 Add Performance Monitoring

**File: `src/hooks/usePerformanceMonitor.ts` (NEW)**
```typescript
export function useRenderCount(componentName: string) {
  if (import.meta.env.DEV) {
    const count = useRef(0);
    count.current++;
    
    useEffect(() => {
      console.log(`[${componentName}] Render #${count.current}`);
    });
  }
}

export function useRenderTime(componentName: string) {
  if (import.meta.env.DEV) {
    const start = performance.now();
    
    useEffect(() => {
      const end = performance.now();
      console.log(`[${componentName}] Render took ${(end - start).toFixed(2)}ms`);
    });
  }
}

// Usage
function ExpensiveComponent() {
  useRenderCount('ExpensiveComponent');
  useRenderTime('ExpensiveComponent');
  // ...
}
```

### 5.2 Add React DevTools Profiler Integration

**File: `src/components/Profiler.tsx` (NEW)**
```typescript
export function AppProfiler({ children }: { children: React.ReactNode }) {
  if (!import.meta.env.DEV) return children;
  
  const handleRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Log slow renders
    if (actualDuration > 16) { // 60fps = 16ms per frame
      console.warn(
        `[Profiler] ${id} ${phase} took ${actualDuration.toFixed(2)}ms`,
        { baseDuration, startTime, commitTime }
      );
    }
  };
  
  return (
    <Profiler id="App" onRender={handleRender}>
      {children}
    </Profiler>
  );
}
```

### 5.3 Add Bundle Analysis

**File: `vite.config.ts` update
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... existing plugins
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy dependencies
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'markdown': ['react-markdown', 'remark-gfm'],
          'icons': ['lucide-react']
        }
      }
    }
  }
});
```

---

## Implementation Checklist

### Week 1: Critical
- [ ] Fix BlockWrapper listener cleanup with AbortController
- [ ] Fix array mutation in handleConvertToTask
- [ ] Add missing useEffect dependencies
- [ ] Add basic ErrorBoundary

### Week 2: Architecture
- [ ] Split Canvas into 5 components
- [ ] Create BlockRegistry
- [ ] Implement normalized state structure
- [ ] Extract hooks from Canvas

### Week 3: Performance
- [ ] Implement useThrottledCallback
- [ ] Add BlockItem memo with custom comparator
- [ ] Create VirtualList component
- [ ] Add SpatialIndex for connections
- [ ] Implement viewport culling

### Week 4: Reliability
- [ ] Add ErrorBoundary to all block renders
- [ ] Implement Zod validation schemas
- [ ] Add comprehensive logging
- [ ] Add retry logic to all API calls
- [ ] Add offline detection & queueing

### Week 5: DX
- [ ] Add usePerformanceMonitor hooks
- [ ] Integrate React DevTools Profiler
- [ ] Set up bundle analyzer
- [ ] Create performance regression tests
- [ ] Document optimization patterns

---

## Success Metrics

| Metric | Before | After Target |
|--------|--------|--------------|
| Time to Interactive | ~3s | <1.5s |
| 50-block drag render time | ~200ms | <16ms |
| Memory leak (1hr usage) | ~100MB growth | <10MB growth |
| First paint | ~1.5s | <500ms |
| Error rate | Unknown | <0.1% |
| Test coverage | 0% | >80% |

---

## Notes

- Each phase builds on the previous - don't skip!
- Write tests for each refactored component
- Measure before/after with React DevTools Profiler
- Consider Feature Flags for gradual rollout
- Document breaking changes in CHANGELOG.md
