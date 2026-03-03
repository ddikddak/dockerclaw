// ============================================
// Board Sharing Service - Manage collaborators via Supabase
// ============================================

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { mapRemoteBoard } from '@/lib/mappers';
import type { Board, Block, BoardCollaborator, CollaboratorRole } from '@/types';

// ============================================
// Helpers
// ============================================
function mapRow(row: Record<string, unknown>): BoardCollaborator {
  return {
    id: row.id as string,
    boardId: row.board_id as string,
    userId: (row.user_id as string | undefined) ?? null,
    email: row.email as string,
    role: row.role as CollaboratorRole,
    invitedBy: row.invited_by as string,
    status: row.status as 'pending' | 'accepted',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// Board Sharing Service
// ============================================
export const BoardSharingService = {
  async inviteByEmail(boardId: string, email: string, role: CollaboratorRole = 'editor'): Promise<BoardCollaborator> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('board_collaborators')
      .insert({
        board_id: boardId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async acceptInvite(collaboratorId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('board_collaborators')
      .update({
        status: 'accepted',
        user_id: user.id,
      })
      .eq('id', collaboratorId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      logger.error('sharing', `acceptInvite: update matched 0 rows. collaboratorId: ${collaboratorId} user: ${user.email}`);
      throw new Error('Could not accept invite — row not found or permission denied');
    }
    logger.info('sharing', 'invite accepted', data[0]);
  },

  async removeCollaborator(collaboratorId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('board_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
  },

  async updateRole(collaboratorId: string, role: CollaboratorRole): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('board_collaborators')
      .update({ role })
      .eq('id', collaboratorId);

    if (error) throw error;
  },

  async getCollaborators(boardId: string): Promise<BoardCollaborator[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('board_collaborators')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async getSharedBoards(): Promise<{ board: Board; ownerId: string; collaborator: BoardCollaborator }[]> {
    if (!supabase) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get accepted collaborations for current user
    const { data: collabs, error: collabError } = await supabase
      .from('board_collaborators')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (collabError) throw collabError;
    logger.debug('sharing', `getSharedBoards: found ${collabs?.length ?? 0} accepted collabs`);
    if (!collabs || collabs.length === 0) return [];

    // Fetch the boards
    const boardIds = collabs.map(c => c.board_id);
    logger.debug('sharing', 'fetching boards', boardIds);
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*')
      .in('id', boardIds);

    logger.debug('sharing', `boards query returned: ${boards?.length ?? 0} boards`, { boardsError });
    if (boardsError) throw boardsError;

    return (boards || []).map(board => ({
      board: mapRemoteBoard(board as Record<string, unknown>),
      ownerId: (board as Record<string, unknown>).user_id as string,
      collaborator: mapRow(collabs.find(c => c.board_id === board.id)!),
    }));
  },

  async getPendingInvites(): Promise<BoardCollaborator[]> {
    if (!supabase) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch invites with board name via join
    const { data, error } = await supabase
      .from('board_collaborators')
      .select('*, boards!board_collaborators_board_id_fkey(name)')
      .eq('email', user.email?.toLowerCase())
      .eq('status', 'pending');

    if (error) throw error;
    return (data || []).map((row: Record<string, unknown> & { boards?: { name?: string } }) => ({
      ...mapRow(row),
      boardName: row.boards?.name || 'Unknown board',
    }));
  },
};

// ============================================
// Shared Block Service - Direct Supabase ops for shared boards
// ============================================
export const SharedBlockService = {
  async create(block: Omit<Block, 'createdAt' | 'updatedAt'>, ownerId: string): Promise<Block> {
    if (!supabase) throw new Error('Supabase not configured');
    const now = new Date().toISOString();
    const row = {
      id: block.id,
      user_id: ownerId,
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
      created_at: now,
      updated_at: now,
    };
    const { error } = await supabase.from('blocks').insert(row);
    if (error) throw error;
    return { ...block, createdAt: now, updatedAt: now } as Block;
  },

  async update(blockId: string, updates: Partial<Block>): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const supabaseUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.x !== undefined) supabaseUpdates.x = updates.x;
    if (updates.y !== undefined) supabaseUpdates.y = updates.y;
    if (updates.w !== undefined) supabaseUpdates.w = updates.w;
    if (updates.h !== undefined) supabaseUpdates.h = updates.h;
    if (updates.z !== undefined) supabaseUpdates.z = updates.z;
    if (updates.locked !== undefined) supabaseUpdates.locked = updates.locked;
    if (updates.data !== undefined) supabaseUpdates.data = updates.data;
    if (updates.agentAccess !== undefined) supabaseUpdates.agent_access = updates.agentAccess;

    const { error } = await supabase.from('blocks').update(supabaseUpdates).eq('id', blockId);
    if (error) throw error;
  },

  async delete(blockId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const now = new Date().toISOString();
    const { error } = await supabase.from('blocks')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', blockId);
    if (error) throw error;
  },

  async duplicate(block: Block, ownerId: string): Promise<Block> {
    return this.create({
      ...block,
      id: crypto.randomUUID(),
      x: block.x + 20,
      y: block.y + 20,
      z: (block.z || 0) + 1,
    }, ownerId);
  },
};
