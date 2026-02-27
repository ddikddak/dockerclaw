// ============================================
// Database Service - Backend API Only
// KISS: No IndexedDB, direct API calls
// ============================================

import { BoardsApiService, type CreateBoardDTO } from './boardsApi';
import { DocumentsApiService, type CreateDocumentDTO, type Document, type DocumentPreview } from './documentsApi';
import type { Board, Block, BlockType, BlockData } from '@/types';

// Re-export types for convenience
export type { Document, DocumentPreview, CreateDocumentDTO };

// ============================================
// Board Service
// ============================================
export class BoardService {
  static async create(data: CreateBoardDTO): Promise<Board> {
    return BoardsApiService.create(data);
  }

  static async getById(id: string): Promise<Board | undefined> {
    try {
      return await BoardsApiService.getById(id);
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  static async getAll(): Promise<Board[]> {
    return BoardsApiService.getAll();
  }

  static async update(id: string, updates: Partial<Omit<Board, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    // Backend doesn't support update yet, could add PATCH /api/boards/:id
    console.warn('Board update not implemented in backend yet', id, updates);
  }

  static async delete(id: string): Promise<void> {
    return BoardsApiService.delete(id);
  }
}

// ============================================
// Document Service (replaces Block Service)
// Documents are the main content unit in DockerClaw v1
// ============================================
export class DocumentService {
  static async getAll(boardId: string): Promise<DocumentPreview[]> {
    return DocumentsApiService.getAll(boardId);
  }

  static async getById(boardId: string, docId: string): Promise<Document | undefined> {
    try {
      return await DocumentsApiService.getById(boardId, docId);
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  static async create(boardId: string, apiKey: string, data: CreateDocumentDTO): Promise<Document> {
    return DocumentsApiService.create(boardId, apiKey, data);
  }
}

// ============================================
// Legacy Block Service - DEPRECATED
// Kept for compatibility during transition
// Blocks are being replaced by Documents
// ============================================
export class BlockService {
  static async getByBoardId(boardId: string): Promise<Block[]> {
    // Convert documents to blocks for backward compatibility
    const docs = await DocumentService.getAll(boardId);
    return docs.map(doc => ({
      id: doc.id,
      boardId: boardId, // Use the passed boardId
      type: 'doc' as BlockType,
      x: 0,
      y: 0,
      w: 400,
      h: 300,
      data: {
        title: doc.title,
        contentMarkdown: doc.preview || '',
      } as BlockData,
      createdAt: doc.created_at,
      updatedAt: doc.created_at,
    }));
  }

  static async create(block: Omit<Block, 'createdAt' | 'updatedAt'>): Promise<Block> {
    console.warn('BlockService.create is deprecated, use DocumentService');
    const now = new Date().toISOString();
    return {
      ...block,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async update(_id: string, _updates?: unknown): Promise<void> {
    console.warn('BlockService.update is deprecated');
  }

  static async delete(_id?: string, _soft?: boolean): Promise<void> {
    console.warn('BlockService.delete is deprecated');
  }

  static async duplicate(_blockId?: string, _offset?: number): Promise<Block> {
    throw new Error('BlockService.duplicate is deprecated');
  }

  static async updateZIndex(_blockId?: string, _zIndex?: number): Promise<void> {
    console.warn('BlockService.updateZIndex is deprecated');
  }
}

// ============================================
// Export/Import Service - DEPRECATED
// Kept for compatibility, no-ops for now
// ============================================
export class ExportImportService {
  static async exportBoard(boardId: string): Promise<string> {
    const board = await BoardService.getById(boardId);
    if (!board) throw new Error('Board not found');

    const documents = await DocumentService.getAll(boardId);

    const exportData = {
      board,
      documents,
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  static async importBoard(jsonData: string): Promise<Board> {
    const data = JSON.parse(jsonData);
    const { board } = data;

    const newBoard = await BoardService.create({
      name: `${board.name} (Imported)`,
      description: board.description,
    });

    return newBoard;
  }
}
