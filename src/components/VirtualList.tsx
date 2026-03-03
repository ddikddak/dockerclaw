// ============================================
// Virtual List - Render only visible items
// Essential for large lists (1000+ items)
// ============================================

import { useRef, useMemo, useCallback, useState, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  style = {},
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container height
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate visible range
  const { virtualItems, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    
    // Calculate visible range with overscan
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    // Create virtual items
    const virtualItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      virtualItems.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }
    
    return { virtualItems, totalHeight, startIndex, endIndex };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Optimization: Don't virtualize for small lists
  if (items.length < 50) {
    return (
      <div ref={containerRef} className={className} style={style}>
        {items.map((item, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ ...style, position: 'relative' }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Virtual Grid (for folder blocks, kanban columns)
// ============================================

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  gap = 8,
  renderItem,
  className = '',
  style = {},
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [_scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);
    
    return () => resizeObserver.disconnect();
  }, []);

  const { rows, virtualItems } = useMemo(() => {
    if (containerWidth === 0) return { columns: 1, rows: 0, virtualItems: [] };

    const columns = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
    const rows = Math.ceil(items.length / columns);
    
    // Calculate visible range
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const visibleRows = Math.ceil(containerRef.current?.clientHeight ?? 0 / (itemHeight + gap)) + 2;
    const endRow = Math.min(rows, startRow + visibleRows);
    
    const virtualItems: Array<{ item: T; index: number; style: React.CSSProperties }> = [];
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= items.length) break;
        
        virtualItems.push({
          item: items[index],
          index,
          style: {
            position: 'absolute',
            top: row * (itemHeight + gap),
            left: col * (itemWidth + gap),
            width: itemWidth,
            height: itemHeight,
          },
        });
      }
    }
    
    return { columns, rows, virtualItems };
  }, [items, containerWidth, itemWidth, itemHeight, gap, scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  if (items.length < 30) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          ...style,
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, ${itemWidth}px)`,
          gap,
        }}
      >
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  const totalHeight = rows * (itemHeight + gap);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ ...style, position: 'relative' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
