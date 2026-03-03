# Phase 1: Critical Fixes - Implementation Guide

## Immediate Action Required (Do This Today)

### Fix 1: BlockWrapper Memory Leak

**File:** `src/components/BlockWrapper.tsx`

Replace lines 172-234 with:

```typescript
// Ref to hold startDrag so handleBlockTouchStart can call it without circular dependency
const startDragRef = useRef<((e: React.MouseEvent | React.TouchEvent) => void) | null>(null);
const dragAbortController = useRef<AbortController | null>(null);

// Cleanup on unmount
useEffect(() => {
  return () => {
    dragAbortController.current?.abort();
  };
}, []);

const startDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
  if (block.locked || isConnecting) return;

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  dragRef.current = {
    startX: clientX,
    startY: clientY,
    blockX: block.x,
    blockY: block.y,
  };

  setIsDragging(true);
  onSelect();
  onDragStart?.();

  let lastClientX = clientX;
  let lastClientY = clientY;

  // Cancel any previous drag
  dragAbortController.current?.abort();
  dragAbortController.current = new AbortController();
  const { signal } = dragAbortController.current;

  const handleMove = (moveE: MouseEvent | TouchEvent) => {
    if (!dragRef.current) return;

    const moveClientX = 'touches' in moveE ? moveE.touches[0].clientX : moveE.clientX;
    const moveClientY = 'touches' in moveE ? moveE.touches[0].clientY : moveE.clientY;
    lastClientX = moveClientX;
    lastClientY = moveClientY;

    const dx = (moveClientX - dragRef.current.startX) / zoom;
    const dy = (moveClientY - dragRef.current.startY) / zoom;

    onUpdate({
      x: dragRef.current.blockX + dx,
      y: dragRef.current.blockY + dy,
    });

    onDragMove?.(moveClientX, moveClientY);
  };

  const handleUp = () => {
    dragRef.current = null;
    setIsDragging(false);
    onDragEnd?.(lastClientX, lastClientY);
    dragAbortController.current = null;
  };

  window.addEventListener('mousemove', handleMove, { passive: false, signal });
  window.addEventListener('mouseup', handleUp, { signal });
  window.addEventListener('touchmove', handleMove, { passive: false, signal });
  window.addEventListener('touchend', handleUp, { signal });

  e.preventDefault();
  e.stopPropagation();
}, [block.locked, isConnecting, block.x, block.y, zoom, onSelect, onUpdate, onDragStart, onDragEnd, onDragMove]);
```

Do the same for `startResize` (lines 255-303).

---

### Fix 2: Array Mutation Bug

**File:** `src/components/Canvas.tsx` (Line 1194)

```typescript
// BEFORE:
const firstColumn = toData.columns.sort((a, b) => a.order - b.order)[0];

// AFTER:
const firstColumn = [...toData.columns].sort((a, b) => a.order - b.order)[0];
```

---

### Fix 3: Missing useEffect Dependencies

**File:** `src/components/Canvas.tsx` (Lines 467-493)

```typescript
// BEFORE:
useEffect(() => {
  if (!focusBlockId) return;
  const block = blocksById.get(focusBlockId);
  // ... animation code using pan, zoom
}, [focusBlockId]); // ❌ Missing deps

// AFTER:
useEffect(() => {
  if (!focusBlockId) return;
  const block = blocksById.get(focusBlockId);
  // ... animation code
}, [focusBlockId, pan.x, pan.y, zoom, blocksById, onFocusBlockHandled, canvasRef]);
```

---

### Fix 4: Create ErrorBoundary Component

**File:** `src/components/ErrorBoundary.tsx` (NEW FILE)

```typescript
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
            <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
            <p className="text-red-600 text-sm mb-3">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

---

### Fix 5: Wrap Blocks in ErrorBoundary

**File:** `src/components/Canvas.tsx` (around line 1315)

```typescript
import { ErrorBoundary } from './ErrorBoundary';

// In the render:
{blocks.map((block) => (
  <ErrorBoundary 
    key={block.id} 
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        Error loading block {block.id}
      </div>
    }
  >
    <BlockWrapper
      block={block}
      // ... props
    >
      {renderBlockContent(block)}
    </BlockWrapper>
  </ErrorBoundary>
))}
```

---

## Testing Checklist

- [ ] Drag a block, then navigate away while dragging - no console errors
- [ ] Move 50+ cards in kanban - no visual glitches
- [ ] Add ErrorBoundary test by throwing error in a block component
- [ ] Check React DevTools Profiler - no warnings about missing deps

---

## Time Estimate

- BlockWrapper fix: 30 minutes
- Array mutation fix: 5 minutes  
- useEffect deps fix: 15 minutes
- ErrorBoundary: 20 minutes
- Testing: 30 minutes

**Total: ~1.5 hours**
