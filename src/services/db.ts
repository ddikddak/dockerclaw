// ============================================
// IndexedDB Storage Layer - Dexie
// ============================================

import Dexie, { type Table } from 'dexie';
import type { Board, Block } from '@/types';
import type { SyncQueueItem } from './sync';
import { syncService } from './sync';

class DockerClawDB extends Dexie {
  boards!: Table<Board>;
  blocks!: Table<Block>;
  _syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('dockerclaw-db');

    this.version(1).stores({
      boards: 'id, name, createdAt, updatedAt',
      blocks: 'id, boardId, type, x, y, z, createdAt, updatedAt, deletedAt',
    });

    this.version(2).stores({
      boards: 'id, name, createdAt, updatedAt',
      blocks: 'id, boardId, type, x, y, z, createdAt, updatedAt, deletedAt',
      _syncQueue: '++id, [table+recordId], timestamp',
    });
  }
}

export const db = new DockerClawDB();

// ============================================
// Board Service
// ============================================
export class BoardService {
  static async create(board: Omit<Board, 'createdAt' | 'updatedAt'>): Promise<Board> {
    const now = new Date().toISOString();
    const newBoard: Board = {
      ...board,
      createdAt: now,
      updatedAt: now,
    };
    await db.boards.add(newBoard);
    syncService.enqueuePush('boards', newBoard.id);
    return newBoard;
  }

  static async getById(id: string): Promise<Board | undefined> {
    return await db.boards.get(id);
  }

  static async getAll(): Promise<Board[]> {
    return await db.boards.orderBy('createdAt').reverse().toArray();
  }

  static async update(id: string, updates: Partial<Omit<Board, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();
    await db.boards.update(id, { ...updates, updatedAt: now });
    syncService.enqueuePush('boards', id);
  }

  static async delete(id: string): Promise<void> {
    // Delete all blocks associated with this board first
    const blockIds = await db.blocks.where('boardId').equals(id).primaryKeys();
    await db.blocks.where('boardId').equals(id).delete();
    for (const blockId of blockIds) {
      syncService.enqueuePush('blocks', blockId as string, 'delete');
    }
    await db.boards.delete(id);
    syncService.enqueuePush('boards', id, 'delete');
  }
}

// ============================================
// Block Service
// ============================================
export class BlockService {
  static async create(block: Omit<Block, 'createdAt' | 'updatedAt'>): Promise<Block> {
    const now = new Date().toISOString();
    const newBlock: Block = {
      ...block,
      createdAt: now,
      updatedAt: now,
    };
    await db.blocks.add(newBlock);
    syncService.enqueuePush('blocks', newBlock.id);
    return newBlock;
  }

  static async getById(id: string): Promise<Block | undefined> {
    return await db.blocks.get(id);
  }

  static async getByBoardId(boardId: string): Promise<Block[]> {
    return await db.blocks
      .where('boardId')
      .equals(boardId)
      .filter((b) => !b.deletedAt)
      .toArray();
  }

  static async update(id: string, updates: Partial<Omit<Block, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();
    await db.blocks.update(id, { ...updates, updatedAt: now });
    syncService.enqueuePush('blocks', id);
  }

  static async delete(id: string, soft: boolean = true): Promise<void> {
    if (soft) {
      const now = new Date().toISOString();
      await db.blocks.update(id, { deletedAt: now, updatedAt: now });
      syncService.enqueuePush('blocks', id);
    } else {
      await db.blocks.delete(id);
      syncService.enqueuePush('blocks', id, 'delete');
    }
  }

  static async duplicate(blockId: string, offset: number = 20): Promise<Block> {
    const block = await this.getById(blockId);
    if (!block) throw new Error('Block not found');

    const newId = crypto.randomUUID();
    const newBlock: Block = {
      ...block,
      id: newId,
      x: block.x + offset,
      y: block.y + offset,
      z: (block.z || 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.blocks.add(newBlock);
    syncService.enqueuePush('blocks', newBlock.id);
    return newBlock;
  }

  static async updateZIndex(blockId: string, zIndex: number): Promise<void> {
    const now = new Date().toISOString();
    await db.blocks.update(blockId, { z: zIndex, updatedAt: now });
    syncService.enqueuePush('blocks', blockId);
  }
}

// ============================================
// Export/Import Service
// ============================================
export class ExportImportService {
  static async exportBoard(boardId: string): Promise<string> {
    const board = await BoardService.getById(boardId);
    if (!board) throw new Error('Board not found');

    const blocks = await BlockService.getByBoardId(boardId);

    const exportData = {
      board,
      blocks,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  static async importBoard(jsonData: string): Promise<Board> {
    const data = JSON.parse(jsonData);
    const { board, blocks } = data;

    // Generate new IDs to avoid conflicts
    const newBoardId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newBoard: Board = {
      ...board,
      id: newBoardId,
      name: `${board.name} (Imported)`,
      createdAt: now,
      updatedAt: now,
    };

    await BoardService.create(newBoard);

    // Import blocks with new IDs
    if (blocks && Array.isArray(blocks)) {
      for (const block of blocks) {
        const newBlock: Block = {
          ...block,
          id: crypto.randomUUID(),
          boardId: newBoardId,
          createdAt: now,
          updatedAt: now,
          deletedAt: undefined,
        };
        await BlockService.create(newBlock);
      }
    }

    return newBoard;
  }
}
