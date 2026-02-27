// ============================================
// Collaboration Service - Presence + Broadcast per board
// Uses Supabase Realtime for live cursors, selections, and online users
// ============================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel, User } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================
export interface PresenceUser {
  userId: string;
  email: string;
  color: string;
  cursorX: number;
  cursorY: number;
  selectedBlockId: string | null;
}

export interface CursorUpdate {
  userId: string;
  x: number;
  y: number;
}

export interface SelectionUpdate {
  userId: string;
  blockId: string | null;
}

// ============================================
// Color palette (8 distinct colors)
// ============================================
const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ============================================
// Collaboration Service
// ============================================
type PresenceCallback = (users: PresenceUser[]) => void;
type CursorCallback = (update: CursorUpdate) => void;
type SelectionCallback = (update: SelectionUpdate) => void;

class CollaborationService {
  private channel: RealtimeChannel | null = null;
  private user: User | null = null;
  private color: string = COLORS[0];

  private onPresenceChange: PresenceCallback | null = null;
  private onCursorMove: CursorCallback | null = null;
  private onSelectionChange: SelectionCallback | null = null;
  private subscribed = false;

  // Throttle cursor broadcasts
  private lastCursorBroadcast = 0;
  private pendingCursorRAF: number | null = null;
  private lastCursorX = 0;
  private lastCursorY = 0;

  // ---- Lifecycle ----

  join(targetBoardId: string, user: User) {
    if (!supabase || !isSupabaseConfigured) return;
    if (this.channel) this.leave();

    this.user = user;
    this.color = getUserColor(user.id);

    this.channel = supabase.channel(`board:${targetBoardId}`, {
      config: { presence: { key: user.id } },
    });

    // Presence sync
    this.channel.on('presence', { event: 'sync' }, () => {
      this.handlePresenceSync();
    });

    // Cursor broadcast
    this.channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId !== this.user?.id) {
        this.onCursorMove?.(payload as CursorUpdate);
      }
    });

    // Selection broadcast
    this.channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      if (payload.userId !== this.user?.id) {
        this.onSelectionChange?.(payload as SelectionUpdate);
      }
    });

    this.subscribed = false;
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.subscribed = true;
        await this.channel!.track({
          userId: user.id,
          email: user.email || '',
          color: this.color,
          cursorX: 0,
          cursorY: 0,
          selectedBlockId: null,
        });
        console.log('[collab] joined board', targetBoardId);
      }
    });
  }

  leave() {
    if (this.pendingCursorRAF) {
      cancelAnimationFrame(this.pendingCursorRAF);
      this.pendingCursorRAF = null;
    }
    this.subscribed = false;
    if (this.channel) {
      this.channel.untrack();
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    console.log('[collab] left board');
  }

  isActive(): boolean {
    return this.channel !== null && this.user !== null;
  }

  getColor(): string {
    return this.color;
  }

  // ---- Callbacks ----

  setOnPresenceChange(cb: PresenceCallback | null) {
    this.onPresenceChange = cb;
  }

  setOnCursorMove(cb: CursorCallback | null) {
    this.onCursorMove = cb;
  }

  setOnSelectionChange(cb: SelectionCallback | null) {
    this.onSelectionChange = cb;
  }

  // ---- Broadcast ----

  broadcastCursor(x: number, y: number) {
    if (!this.channel || !this.user || !this.subscribed) return;

    // Skip if barely moved
    const dx = Math.abs(x - this.lastCursorX);
    const dy = Math.abs(y - this.lastCursorY);
    if (dx < 2 && dy < 2) return;

    this.lastCursorX = x;
    this.lastCursorY = y;

    // Throttle to 50ms (20Hz)
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 50) {
      if (!this.pendingCursorRAF) {
        this.pendingCursorRAF = requestAnimationFrame(() => {
          this.pendingCursorRAF = null;
          this.sendCursor();
        });
      }
      return;
    }

    this.sendCursor();
  }

  private sendCursor() {
    if (!this.channel || !this.user || !this.subscribed) return;
    this.lastCursorBroadcast = Date.now();
    this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: this.user.id,
        x: this.lastCursorX,
        y: this.lastCursorY,
      },
    });
  }

  broadcastSelection(blockId: string | null) {
    if (!this.channel || !this.user || !this.subscribed) return;
    this.channel.send({
      type: 'broadcast',
      event: 'selection',
      payload: {
        userId: this.user.id,
        blockId,
      },
    });
  }

  // ---- Presence handling ----

  private handlePresenceSync() {
    if (!this.channel) return;
    const state = this.channel.presenceState<PresenceUser>();
    const users: PresenceUser[] = [];

    for (const key of Object.keys(state)) {
      const presences = state[key];
      if (presences && presences.length > 0) {
        const p = presences[0];
        // Skip self
        if (p.userId !== this.user?.id) {
          users.push({
            userId: p.userId,
            email: p.email,
            color: p.color,
            cursorX: p.cursorX,
            cursorY: p.cursorY,
            selectedBlockId: p.selectedBlockId,
          });
        }
      }
    }

    this.onPresenceChange?.(users);
  }
}

export const collaborationService = new CollaborationService();
