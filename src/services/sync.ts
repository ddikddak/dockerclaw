// ============================================
// Sync Service - Background cloud sync engine
// Dexie (local) remains primary. Supabase syncs in background.
// ============================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { db } from './db';
import { mapRemoteBoard, mapRemoteBlock, boardToSupabaseRow, blockToSupabaseRow } from '@/lib/mappers';
import { logger } from '@/lib/logger';
// Types imported via mappers
import type { User, RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================
export interface SyncQueueItem {
  id?: number; // auto-increment
  table: 'boards' | 'blocks';
  recordId: string;
  action: 'upsert' | 'delete';
  timestamp: string;
}

// ============================================
// Sync Service
// ============================================
class SyncService {
  private pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private user: User | null = null;
  private pulling = false;
  private pushing = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private onChange: ((table: 'boards' | 'blocks') => void) | null = null;
  // Track IDs we just pushed to ignore our own realtime echoes
  private recentPushes = new Set<string>();

  // ---- Lifecycle ----

  start(user: User) {
    this.user = user;
    logger.info('sync', `started for ${user.email}`);
    this.flushQueue();
    this.pushAllLocal();
    this.subscribeRealtime();
  }

  /** Start realtime subscriptions without pushing local data */
  startRealtimeOnly(user: User) {
    this.user = user;
    logger.info('sync', `started realtime-only for ${user.email}`);
    this.subscribeRealtime();
  }

  /** Push all local data and flush the sync queue */
  async pushAllAndFlush() {
    this.flushQueue();
    await this.pushAllLocal();
  }

  /** Wipe all local Dexie data and pull fresh from cloud */
  async clearLocalAndPullFresh(): Promise<boolean> {
    if (!supabase || !this.user) return false;

    try {
      await db.boards.clear();
      await db.blocks.clear();
      await db._syncQueue.clear();
      localStorage.removeItem('dockerclaw_lastSyncedAt');
      logger.info('sync', 'cleared local data, pulling fresh from cloud');
      return await this.pullFromCloud();
    } catch (err) {
      logger.warn('sync', 'clearLocalAndPullFresh failed', err);
      return false;
    }
  }

  stop() {
    this.user = null;
    this.unsubscribeRealtime();
    for (const timer of this.pushTimers.values()) {
      clearTimeout(timer);
    }
    this.pushTimers.clear();
  }

  isActive(): boolean {
    return this.user !== null && isSupabaseConfigured;
  }

  /** Check if error is a Row Level Security policy violation */
  private isRLSError(error: { code?: string; message?: string }): boolean {
    // PostgreSQL error code for RLS violation
    if (error.code === '42501') return true;
    // Check error message for RLS-related text
    const msg = (error.message || '').toLowerCase();
    return msg.includes('row-level security') || 
           msg.includes('violates row-level security') ||
           msg.includes('new row violates');
  }

  /** Register a callback for when remote changes are received */
  onRemoteChange(callback: (table: 'boards' | 'blocks') => void) {
    this.onChange = callback;
  }

  // ---- Realtime subscriptions ----

  private subscribeRealtime() {
    if (!supabase || !this.user) return;

    const userId = this.user.id;
    this.realtimeChannel = supabase
      .channel('sync-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards', filter: `user_id=eq.${userId}` },
        (payload) => this.handleRealtimeEvent('boards', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `user_id=eq.${userId}` },
        (payload) => this.handleRealtimeEvent('blocks', payload)
      )
      .subscribe((status) => {
        logger.debug('sync', `realtime: ${status}`);
      });
  }

  private unsubscribeRealtime() {
    if (this.realtimeChannel) {
      supabase?.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async handleRealtimeEvent(table: 'boards' | 'blocks', payload: { new?: Record<string, unknown>; old?: Record<string, unknown>; eventType?: string }) {
    const record = payload.new;
    const oldRecord = payload.old;
    const eventType = payload.eventType;

    // Ignore our own pushes
    const recordId = (record?.id ?? oldRecord?.id) as string | undefined;
    if (recordId && this.recentPushes.has(`${table}:${recordId}`)) {
      this.recentPushes.delete(`${table}:${recordId}`);
      return;
    }

    logger.debug('sync', `realtime ${eventType} on ${table}`, recordId);

    if (eventType === 'DELETE' && oldRecord?.id) {
      if (table === 'boards') {
        await db.boards.delete(oldRecord.id as string);
      } else {
        await db.blocks.delete(oldRecord.id as string);
      }
    } else if (record) {
      if (table === 'boards') {
        await db.boards.put(mapRemoteBoard(record));
      } else {
        await db.blocks.put(mapRemoteBlock(record));
      }
    }

    // Notify App to reload UI, passing which table changed
    this.onChange?.(table);
  }

  // ---- Enqueue (called after every local write) ----

  enqueuePush(table: 'boards' | 'blocks', recordId: string, action: 'upsert' | 'delete' = 'upsert') {
    if (!this.isActive()) return;

    const item: SyncQueueItem = {
      table,
      recordId,
      action,
      timestamp: new Date().toISOString(),
    };

    // Persist to Dexie queue (survives app restart)
    db._syncQueue.put(item);

    // Debounce push per record (500ms)
    const key = `${table}:${recordId}`;
    if (this.pushTimers.has(key)) {
      clearTimeout(this.pushTimers.get(key)!);
    }
    this.pushTimers.set(key, setTimeout(() => {
      this.pushTimers.delete(key);
      this.pushRecord(table, recordId, action);
    }, 500));
  }

  // ---- Push single record to Supabase ----

  private async pushRecord(table: 'boards' | 'blocks', recordId: string, action: 'upsert' | 'delete') {
    if (!supabase || !this.user) return;

    // Mark as our own push so realtime ignores the echo
    this.recentPushes.add(`${table}:${recordId}`);
    // Auto-clear after 5s in case the echo never arrives
    setTimeout(() => this.recentPushes.delete(`${table}:${recordId}`), 5000);

    try {
      if (action === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', recordId).eq('user_id', this.user.id);
        if (error) { 
          // RLS error - skip this record to prevent infinite retry
          if (this.isRLSError(error)) {
            logger.warn('sync', `RLS policy blocked delete ${table}/${recordId} - removing from queue`);
            await db._syncQueue.where({ table, recordId }).delete();
            return;
          }
          logger.error('sync', `delete ${table}/${recordId}: ${error.message} (code=${error.code}, details=${error.details})`);
          return; 
        }
      } else if (table === 'boards') {
        const board = await db.boards.get(recordId);
        if (!board) return;
        const { error } = await supabase.from('boards').upsert(boardToSupabaseRow(board, this.user.id));
        if (error) { 
          // RLS error - board may belong to different user or was created offline
          if (this.isRLSError(error)) {
            logger.warn('sync', `RLS policy blocked board ${recordId} - marking as local-only`);
            await db._syncQueue.where({ table, recordId }).delete();
            return;
          }
          logger.error('sync', `upsert board ${recordId}: ${error.message} (code=${error.code}, details=${error.details}, hint=${error.hint})`);
          return; 
        }
      } else {
        const block = await db.blocks.get(recordId);
        if (!block) return;
        // Skip orphaned blocks (no boardId = board was deleted)
        if (!block.boardId) {
          logger.warn('sync', `skipping orphaned block ${recordId} (no boardId), deleting from local`);
          await db.blocks.delete(recordId);
          await db._syncQueue.where({ table, recordId }).delete();
          return;
        }
        const row = blockToSupabaseRow(block, this.user.id);
        const { error } = await supabase.from('blocks').upsert(row);
        if (error) {
          // RLS error - skip this record
          if (this.isRLSError(error)) {
            logger.warn('sync', `RLS policy blocked block ${recordId} - removing from queue`);
            await db._syncQueue.where({ table, recordId }).delete();
            return;
          }
          logger.error('sync', `upsert block ${recordId}: ${error.message} (code=${error.code}, details=${error.details}, hint=${error.hint})`);
          // Remove from queue - retrying the same data won't fix schema/constraint errors
          await db._syncQueue.where({ table, recordId }).delete();
          return;
        }
      }

      logger.debug('sync', `pushed ${table}/${recordId}`);

      // Remove from queue on success
      await db._syncQueue
        .where({ table, recordId })
        .delete();
    } catch (err) {
      logger.warn('sync', `push failed for ${table}/${recordId}`, err);
    }
  }

  // ---- Push all existing local data (first sign-in) ----

  private async pushAllLocal() {
    if (!this.isActive()) return;

    try {
      const boards = await db.boards.toArray();
      logger.info('sync', `pushing ${boards.length} local boards`);
      // Push in parallel batches of 10
      for (let i = 0; i < boards.length; i += 10) {
        await Promise.all(
          boards.slice(i, i + 10).map(board => this.pushRecord('boards', board.id, 'upsert'))
        );
      }

      const blocks = await db.blocks.toArray();
      logger.info('sync', `pushing ${blocks.length} local blocks`);
      for (let i = 0; i < blocks.length; i += 10) {
        await Promise.all(
          blocks.slice(i, i + 10).map(block => this.pushRecord('blocks', block.id, 'upsert'))
        );
      }

      logger.info('sync', 'initial push complete');
    } catch (err) {
      logger.warn('sync', 'pushAllLocal failed', err);
    }
  }

  // ---- Flush pending queue (on start) ----

  private async flushQueue() {
    if (this.pushing || !this.isActive()) return;
    this.pushing = true;

    try {
      const items = await db._syncQueue.toArray();
      // Flush in parallel batches of 10
      for (let i = 0; i < items.length; i += 10) {
        await Promise.all(
          items.slice(i, i + 10).map(item => this.pushRecord(item.table, item.recordId, item.action))
        );
      }
    } catch (err) {
      logger.warn('sync', 'flush queue failed', err);
    } finally {
      this.pushing = false;
    }
  }

  // ---- Pull from cloud ----

  async pullFromCloud(): Promise<boolean> {
    if (this.pulling || !supabase || !this.user) {
      logger.debug('sync', 'pull skipped', { pulling: this.pulling, hasClient: !!supabase, hasUser: !!this.user });
      return false;
    }
    this.pulling = true;

    try {
      const lastSyncedAt = localStorage.getItem('dockerclaw_lastSyncedAt');
      logger.info('sync', `pulling from cloud, lastSyncedAt: ${lastSyncedAt || 'never (full pull)'}`);

      // Pull boards
      let boardsQuery = supabase
        .from('boards')
        .select('*')
        .eq('user_id', this.user.id);
      if (lastSyncedAt) {
        boardsQuery = boardsQuery.gt('updated_at', lastSyncedAt);
      }
      const { data: boards, error: boardsError } = await boardsQuery;
      if (boardsError) throw boardsError;

      // Pull blocks
      let blocksQuery = supabase
        .from('blocks')
        .select('*')
        .eq('user_id', this.user.id);
      if (lastSyncedAt) {
        blocksQuery = blocksQuery.gt('updated_at', lastSyncedAt);
      }
      const { data: blocks, error: blocksError } = await blocksQuery;
      if (blocksError) throw blocksError;

      const hasChanges = (boards && boards.length > 0) || (blocks && blocks.length > 0);
      logger.info('sync', `pulled ${boards?.length ?? 0} boards, ${blocks?.length ?? 0} blocks`, { hasChanges });

      // Merge boards into Dexie (last-write-wins)
      if (boards && boards.length > 0) {
        const localBoards = await db.boards.bulkGet(boards.map((r: Record<string, unknown>) => r.id as string));
        const localMap = new Map(localBoards.filter(Boolean).map(b => [b!.id, b!]));
        const toUpsert = boards
          .filter((remote: Record<string, unknown>) => {
            const local = localMap.get(remote.id as string);
            return !local || (remote.updated_at as string) > local.updatedAt;
          })
          .map((remote: Record<string, unknown>) => mapRemoteBoard(remote));
        if (toUpsert.length > 0) await db.boards.bulkPut(toUpsert);
      }

      // Merge blocks into Dexie (last-write-wins)
      if (blocks && blocks.length > 0) {
        const localBlocks = await db.blocks.bulkGet(blocks.map((r: Record<string, unknown>) => r.id as string));
        const localMap = new Map(localBlocks.filter(Boolean).map(b => [b!.id, b!]));
        const toUpsert = blocks
          .filter((remote: Record<string, unknown>) => {
            const local = localMap.get(remote.id as string);
            return !local || (remote.updated_at as string) > local.updatedAt;
          })
          .map((remote: Record<string, unknown>) => mapRemoteBlock(remote));
        if (toUpsert.length > 0) await db.blocks.bulkPut(toUpsert);
      }

      // Update sync timestamp
      localStorage.setItem('dockerclaw_lastSyncedAt', new Date().toISOString());

      return hasChanges;
    } catch (err) {
      logger.warn('sync', 'pull failed', err);
      return false;
    } finally {
      this.pulling = false;
    }
  }
}

export const syncService = new SyncService();

/** Check if Dexie has any local boards */
export async function hasLocalData(): Promise<boolean> {
  const boardCount = await db.boards.count();
  return boardCount > 0;
}
