// ============================================
// Shared data mapping utilities
// Single source of truth for remote <-> local transformations
// ============================================

import type { Board, Block } from '@/types';

/** Map a Supabase board row (snake_case) to local Board (camelCase) */
export function mapRemoteBoard(row: Record<string, unknown>): Board {
  return {
    id: row.id as string,
    name: row.name as string,
    canvas: row.canvas as Board['canvas'],
    settings: (row.settings as Board['settings']) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Map a Supabase block row (snake_case) to local Block (camelCase) */
export function mapRemoteBlock(row: Record<string, unknown>): Block {
  return {
    id: row.id as string,
    boardId: row.board_id as string,
    type: row.type as Block['type'],
    x: row.x as number,
    y: row.y as number,
    w: row.w as number,
    h: row.h as number,
    z: (row.z as number) || 0,
    locked: (row.locked as boolean) || false,
    agentAccess: (row.agent_access as string[]) || [],
    data: row.data as Block['data'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) || undefined,
  };
}

/** Map a local Board to Supabase row format (camelCase -> snake_case) */
export function boardToSupabaseRow(board: Board, userId: string) {
  return {
    id: board.id,
    user_id: userId,
    name: board.name,
    canvas: board.canvas,
    settings: board.settings || {},
    created_at: board.createdAt,
    updated_at: board.updatedAt,
  };
}

/** Map a local Block to Supabase row format (camelCase -> snake_case) */
export function blockToSupabaseRow(block: Block, userId: string) {
  return {
    id: block.id,
    user_id: userId,
    board_id: block.boardId,
    type: block.type,
    x: block.x,
    y: block.y,
    w: block.w,
    h: block.h,
    z: block.z || 0,
    locked: block.locked || false,
    agent_access: block.agentAccess || [],
    data: block.data,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
    deleted_at: block.deletedAt || null,
  };
}
