// ============================================
// Spatial Index - Grid-based spatial partitioning
// For efficient viewport culling of connections and blocks
// ============================================

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpatialItem<T> {
  id: string;
  data: T;
  bbox: BBox;
}

export class SpatialIndex<T> {
  private cellSize: number;
  private grid: Map<string, Set<string>> = new Map();
  private items: Map<string, SpatialItem<T>> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  // Insert an item with its bounding box
  insert(id: string, data: T, bbox: BBox): void {
    // Remove existing item if present
    this.remove(id);

    const item: SpatialItem<T> = { id, data, bbox };
    this.items.set(id, item);

    const cells = this.getCellsForBBox(bbox);
    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(id);
    }
  }

  // Remove an item
  remove(id: string): void {
    const item = this.items.get(id);
    if (!item) return;

    const cells = this.getCellsForBBox(item.bbox);
    for (const cell of cells) {
      this.grid.get(cell)?.delete(id);
    }

    this.items.delete(id);
  }

  // Update an item's position
  update(id: string, bbox: BBox): void {
    const item = this.items.get(id);
    if (!item) return;

    // Remove from old cells
    const oldCells = this.getCellsForBBox(item.bbox);
    for (const cell of oldCells) {
      this.grid.get(cell)?.delete(id);
    }

    // Update bbox
    item.bbox = bbox;

    // Add to new cells
    const newCells = this.getCellsForBBox(bbox);
    for (const cell of newCells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(id);
    }
  }

  // Query items within a bounding box
  queryRange(bbox: BBox): T[] {
    const cells = this.getCellsForBBox(bbox);
    const resultIds = new Set<string>();

    for (const cell of cells) {
      const cellItems = this.grid.get(cell);
      if (cellItems) {
        for (const id of cellItems) {
          resultIds.add(id);
        }
      }
    }

    // Filter by actual intersection
    const results: T[] = [];
    for (const id of resultIds) {
      const item = this.items.get(id);
      if (item && this.intersects(item.bbox, bbox)) {
        results.push(item.data);
      }
    }

    return results;
  }

  // Query items at a point
  queryPoint(x: number, y: number): T[] {
    const cell = this.getCell(x, y);
    const itemIds = this.grid.get(cell);
    
    if (!itemIds) return [];

    const results: T[] = [];
    for (const id of itemIds) {
      const item = this.items.get(id);
      if (item && this.contains(item.bbox, x, y)) {
        results.push(item.data);
      }
    }

    return results;
  }

  // Get all items
  getAll(): T[] {
    return Array.from(this.items.values()).map((item) => item.data);
  }

  // Clear all items
  clear(): void {
    this.grid.clear();
    this.items.clear();
  }

  // Get stats for debugging
  getStats(): { items: number; cells: number; cellSize: number } {
    return {
      items: this.items.size,
      cells: this.grid.size,
      cellSize: this.cellSize,
    };
  }

  private getCell(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  private getCellsForBBox(bbox: BBox): string[] {
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

  private intersects(a: BBox, b: BBox): boolean {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  private contains(bbox: BBox, x: number, y: number): boolean {
    return (
      x >= bbox.x &&
      x <= bbox.x + bbox.w &&
      y >= bbox.y &&
      y <= bbox.y + bbox.h
    );
  }
}

// ============================================
// Spatial Index for Connections
// Specialized for line segments
// ============================================

export interface LineSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  data: unknown;
}

export class ConnectionSpatialIndex {
  private index: SpatialIndex<LineSegment>;

  constructor(cellSize: number = 100) {
    this.index = new SpatialIndex<LineSegment>(cellSize);
  }

  insert(segment: LineSegment): void {
    const bbox = this.getLineBBox(segment);
    this.index.insert(segment.id, segment, bbox);
  }

  remove(id: string): void {
    this.index.remove(id);
  }

  update(segment: LineSegment): void {
    const bbox = this.getLineBBox(segment);
    this.index.update(segment.id, bbox);
  }

  queryRange(bbox: BBox): LineSegment[] {
    return this.index.queryRange(bbox);
  }

  clear(): void {
    this.index.clear();
  }

  getStats(): { items: number; cells: number; cellSize: number } {
    return this.index.getStats();
  }

  private getLineBBox(segment: LineSegment): BBox {
    const minX = Math.min(segment.x1, segment.x2);
    const maxX = Math.max(segment.x1, segment.x2);
    const minY = Math.min(segment.y1, segment.y2);
    const maxY = Math.max(segment.y1, segment.y2);

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }
}
