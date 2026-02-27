// ============================================
// Boards API Service
// ============================================

import { apiGet, apiPost, apiDelete } from './api';
import type { Board } from '@/types';

// Backend Board response
interface BackendBoard {
  id: string;
  name: string;
  description?: string;
  api_key: string;
  document_count?: number;
  created_at: string;
}

// Convert backend board to frontend Board type
function mapBackendBoard(board: BackendBoard): Board {
  return {
    id: board.id,
    name: board.name,
    apiKey: board.api_key,
    createdAt: board.created_at,
    updatedAt: board.created_at, // Backend doesn't have updated_at yet
    canvas: null,
  };
}

export interface CreateBoardDTO {
  name: string;
  description?: string;
}

export class BoardsApiService {
  static async getAll(): Promise<Board[]> {
    const response = await apiGet<{ boards: BackendBoard[] }>('/api/boards');
    return response.boards.map(mapBackendBoard);
  }

  static async getById(id: string): Promise<Board> {
    const board = await apiGet<BackendBoard>(`/api/boards/${id}`);
    return mapBackendBoard(board);
  }

  static async create(data: CreateBoardDTO): Promise<Board> {
    const board = await apiPost<BackendBoard>('/api/boards', data);
    return mapBackendBoard(board);
  }

  static async delete(id: string): Promise<void> {
    await apiDelete(`/api/boards/${id}`);
  }
}
