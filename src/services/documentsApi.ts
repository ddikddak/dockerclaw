// ============================================
// Documents API Service
// ============================================

import { apiGet, apiPost } from './api';

export interface Document {
  id: string;
  boardId: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentPreview {
  id: string;
  title: string;
  author: string;
  created_at: string;
  preview: string;
}

export interface CreateDocumentDTO {
  title: string;
  content: string;
  author: string;
}

// Backend response types
interface BackendDocument {
  id: string;
  board_id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  updated_at?: string;
}

interface BackendDocumentPreview {
  id: string;
  title: string;
  author: string;
  created_at: string;
  preview: string;
}

function mapBackendDocument(doc: BackendDocument): Document {
  return {
    id: doc.id,
    boardId: doc.board_id,
    title: doc.title,
    content: doc.content,
    author: doc.author,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export class DocumentsApiService {
  static async getAll(boardId: string): Promise<DocumentPreview[]> {
    const response = await apiGet<{ documents: BackendDocumentPreview[] }>(`/api/boards/${boardId}/documents`);
    return response.documents;
  }

  static async getById(boardId: string, docId: string): Promise<Document> {
    const doc = await apiGet<BackendDocument>(`/api/boards/${boardId}/documents/${docId}`);
    return mapBackendDocument(doc);
  }

  static async create(boardId: string, apiKey: string, data: CreateDocumentDTO): Promise<Document> {
    const doc = await apiPost<BackendDocument>(
      `/api/boards/${boardId}/documents`,
      data,
      apiKey
    );
    return mapBackendDocument(doc);
  }
}
