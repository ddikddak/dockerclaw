// ============================================
// Sync Service - Background cloud sync engine
// Dexie (local) remains primary. Supabase syncs in background.
// ============================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { db } from './db';
import type { Board, Block } from '@/types';
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
  private onChange: (() => void) | null = null;
  // Track IDs we just pushed to ignore our own realtime echoes
  private recentPushes = new Set<string>();

  // ---- Lifecycle ----

  start(user: User) {
    this.user = user;
    console.log('[sync] started for', user.email);
    this.flushQueue();
    this.pushAllLocal();
    this.subscribeRealtime();
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

  /** Register a callback for when remote changes are received */
  onRemoteChange(callback: () => void) {
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
        console.log('[sync] realtime:', status);
      });
  }

  private unsubscribeRealtime() {
    if (this.realtimeChannel) {
      supabase?.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async handleRealtimeEvent(table: 'boards' | 'blocks', payload: any) {
    const record = payload.new as Record<string, any> | undefined;
    const oldRecord = payload.old as Record<string, any> | undefined;
    const eventType = payload.eventType as string;

    // Ignore our own pushes
    const recordId = record?.id || oldRecord?.id;
    if (recordId && this.recentPushes.has(`${table}:${recordId}`)) {
      this.recentPushes.delete(`${table}:${recordId}`);
      return;
    }

    console.log(`[sync] realtime ${eventType} on ${table}`, recordId);

    if (eventType === 'DELETE' && oldRecord?.id) {
      if (table === 'boards') {
        await db.boards.delete(oldRecord.id);
      } else {
        await db.blocks.delete(oldRecord.id);
      }
    } else if (record) {
      if (table === 'boards') {
        await db.boards.put({
          id: record.id,
          name: record.name,
          canvas: record.canvas,
          settings: record.settings || {},
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        } as Board);
      } else {
        await db.blocks.put({
          id: record.id,
          boardId: record.board_id,
          type: record.type,
          x: record.x,
          y: record.y,
          w: record.w,
          h: record.h,
          z: record.z || 0,
          locked: record.locked || false,
          agentAccess: record.agent_access || [],
          data: record.data,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
          deletedAt: record.deleted_at || undefined,
        } as Block);
      }
    }

    // Notify App to reload UI
    this.onChange?.();
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
        if (error) { console.error(`[sync] delete ${table}/${recordId}:`, error); return; }
      } else if (table === 'boards') {
        const board = await db.boards.get(recordId);
        if (!board) return;
        const { error } = await supabase.from('boards').upsert({
          id: board.id,
          user_id: this.user.id,
          name: board.name,
          canvas: board.canvas,
          settings: board.settings || {},
          created_at: board.createdAt,
          updated_at: board.updatedAt,
        });
        if (error) { console.error(`[sync] upsert board ${recordId}:`, error); return; }
      } else {
        const block = await db.blocks.get(recordId);
        if (!block) return;
        // Skip orphaned blocks (no boardId = board was deleted)
        if (!block.boardId) {
          console.warn(`[sync] skipping orphaned block ${recordId} (no boardId), deleting from local`);
          await db.blocks.delete(recordId);
          await db._syncQueue.where({ table, recordId }).delete();
          return;
        }
        const { error } = await supabase.from('blocks').upsert({
          id: block.id,
          user_id: this.user.id,
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
        });
        if (error) { console.error(`[sync] upsert block ${recordId}:`, error); return; }
      }

      console.log(`[sync] pushed ${table}/${recordId}`);

      // Remove from queue on success
      await db._syncQueue
        .where({ table, recordId })
        .delete();
    } catch (err) {
      console.warn(`[sync] push failed for ${table}/${recordId}:`, err);
    }
  }

  // ---- Push all existing local data (first sign-in) ----

  private async pushAllLocal() {
    if (!this.isActive()) return;

    try {
      const boards = await db.boards.toArray();
      console.log(`[sync] pushing ${boards.length} local boards`);
      for (const board of boards) {
        await this.pushRecord('boards', board.id, 'upsert');
      }

      const blocks = await db.blocks.toArray();
      console.log(`[sync] pushing ${blocks.length} local blocks`);
      for (const block of blocks) {
        await this.pushRecord('blocks', block.id, 'upsert');
      }

      console.log('[sync] initial push complete');
    } catch (err) {
      console.warn('[sync] pushAllLocal failed:', err);
    }
  }

  // ---- Flush pending queue (on start) ----

  private async flushQueue() {
    if (this.pushing || !this.isActive()) return;
    this.pushing = true;

    try {
      const items = await db._syncQueue.toArray();
      for (const item of items) {
        await this.pushRecord(item.table, item.recordId, item.action);
      }
    } catch (err) {
      console.warn('[sync] flush queue failed:', err);
    } finally {
      this.pushing = false;
    }
  }

  // ---- Pull from cloud ----

  async pullFromCloud(): Promise<boolean> {
    if (this.pulling || !supabase || !this.user) {
      console.log('[sync] pull skipped:', { pulling: this.pulling, hasClient: !!supabase, hasUser: !!this.user });
      return false;
    }
    this.pulling = true;

    try {
      const lastSyncedAt = localStorage.getItem('dockerclaw_lastSyncedAt');
      console.log('[sync] pulling from cloud, lastSyncedAt:', lastSyncedAt || 'never (full pull)');

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
      console.log(`[sync] pulled ${boards?.length ?? 0} boards, ${blocks?.length ?? 0} blocks, hasChanges: ${hasChanges}`);

      // Merge boards into Dexie (last-write-wins)
      if (boards) {
        for (const remote of boards) {
          const local = await db.boards.get(remote.id);
          if (!local || remote.updated_at > local.updatedAt) {
            await db.boards.put({
              id: remote.id,
              name: remote.name,
              canvas: remote.canvas,
              settings: remote.settings || {},
              createdAt: remote.created_at,
              updatedAt: remote.updated_at,
            } as Board);
          }
        }
      }

      // Merge blocks into Dexie (last-write-wins)
      if (blocks) {
        for (const remote of blocks) {
          const local = await db.blocks.get(remote.id);
          if (!local || remote.updated_at > local.updatedAt) {
            await db.blocks.put({
              id: remote.id,
              boardId: remote.board_id,
              type: remote.type,
              x: remote.x,
              y: remote.y,
              w: remote.w,
              h: remote.h,
              z: remote.z || 0,
              locked: remote.locked || false,
              agentAccess: remote.agent_access || [],
              data: remote.data,
              createdAt: remote.created_at,
              updatedAt: remote.updated_at,
              deletedAt: remote.deleted_at || undefined,
            } as Block);
          }
        }
      }

      // Update sync timestamp
      localStorage.setItem('dockerclaw_lastSyncedAt', new Date().toISOString());

      return hasChanges;
    } catch (err) {
      console.warn('[sync] pull failed:', err);
      return false;
    } finally {
      this.pulling = false;
    }
  }
}

export const syncService = new SyncService();
