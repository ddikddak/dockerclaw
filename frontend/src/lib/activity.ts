import { getSupabase } from './supabase';

export type ActivityAction = 
  | 'card_created' | 'card_updated' | 'card_deleted' | 'card_moved'
  | 'comment_added' | 'comment_deleted'
  | 'reaction_added' | 'reaction_removed'
  | 'action_approved' | 'action_rejected' | 'action_archived' | 'action_executed';

export type ActorType = 'human' | 'agent' | 'system';
export type TargetType = 'card' | 'comment' | 'reaction';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  actor_type: ActorType;
  actor_id: string;
  actor_name: string | null;
  target_type: TargetType | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  activity_id: string;
  read: boolean;
  created_at: string;
  activity?: ActivityLog;
}

// Global SSE broadcaster (set by SSE route)
let sseBroadcaster: ((event: string, data: unknown) => void) | null = null;

export function setSseBroadcaster(broadcaster: (event: string, data: unknown) => void) {
  sseBroadcaster = broadcaster;
}

export function broadcastEvent(event: string, data: unknown) {
  if (sseBroadcaster) {
    sseBroadcaster(event, data);
  }
}

export interface LogActivityInput {
  action: ActivityAction;
  actorType: ActorType;
  actorId: string;
  actorName?: string;
  targetType?: TargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  notifyUsers?: string[]; // user_ids to notify
}

export async function logActivity(input: LogActivityInput): Promise<ActivityLog | null> {
  const supabase = await getSupabase();
  
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      action: input.action,
      actor_type: input.actorType,
      actor_id: input.actorId,
      actor_name: input.actorName || null,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      metadata: input.metadata || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log activity:', error);
    return null;
  }

  // Create notifications for specified users
  if (input.notifyUsers && input.notifyUsers.length > 0 && data) {
    const notifications = input.notifyUsers.map(userId => ({
      user_id: userId,
      activity_id: data.id,
      read: false
    }));

    await supabase.from('notifications').insert(notifications);
  }

  // Broadcast to SSE clients
  broadcastEvent('activity', {
    type: 'activity',
    activity: data
  });

  // Also broadcast specific event types for targeted updates
  if (input.targetId) {
    broadcastEvent(`card:${input.targetId}`, {
      type: input.action,
      cardId: input.targetId,
      activity: data
    });
  }

  return data;
}

export async function getActivityLog(options?: {
  targetId?: string;
  targetType?: TargetType;
  actorId?: string;
  action?: ActivityAction;
  limit?: number;
  offset?: number;
}): Promise<ActivityLog[]> {
  const supabase = await getSupabase();
  
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.targetId) {
    query = query.eq('target_id', options.targetId);
  }
  if (options?.targetType) {
    query = query.eq('target_type', options.targetType);
  }
  if (options?.actorId) {
    query = query.eq('actor_id', options.actorId);
  }
  if (options?.action) {
    query = query.eq('action', options.action);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get activity log:', error);
    return [];
  }

  return data || [];
}

export async function getNotifications(userId: string, options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  const supabase = await getSupabase();
  
  let query = supabase
    .from('notifications')
    .select('*, activity:activity_log(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('read', false);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await getSupabase();
  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }

  return count || 0;
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = await getSupabase();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }

  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const supabase = await getSupabase();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    return false;
  }

  return true;
}

// Helper functions for common actions
export async function logCardCreated(cardId: string, actorType: ActorType, actorId: string, actorName?: string, metadata?: Record<string, unknown>) {
  return logActivity({
    action: 'card_created',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata
  });
}

export async function logCardUpdated(cardId: string, actorType: ActorType, actorId: string, actorName?: string, changes?: Record<string, unknown>) {
  return logActivity({
    action: 'card_updated',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata: { changes }
  });
}

export async function logCardMoved(cardId: string, actorType: ActorType, actorId: string, fromColumn: string, toColumn: string, actorName?: string) {
  return logActivity({
    action: 'card_moved',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata: { from: fromColumn, to: toColumn }
  });
}

export async function logCardDeleted(cardId: string, actorType: ActorType, actorId: string, actorName?: string) {
  return logActivity({
    action: 'card_deleted',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId
  });
}

export async function logCommentAdded(commentId: string, cardId: string, actorType: ActorType, actorId: string, actorName?: string, content?: string) {
  return logActivity({
    action: 'comment_added',
    actorType,
    actorId,
    actorName,
    targetType: 'comment',
    targetId: commentId,
    metadata: { cardId, preview: content?.slice(0, 100) }
  });
}

export async function logCommentDeleted(commentId: string, cardId: string, actorType: ActorType, actorId: string, actorName?: string) {
  return logActivity({
    action: 'comment_deleted',
    actorType,
    actorId,
    actorName,
    targetType: 'comment',
    targetId: commentId,
    metadata: { cardId }
  });
}

export async function logReactionAdded(cardId: string, emoji: string, actorType: ActorType, actorId: string, actorName?: string) {
  return logActivity({
    action: 'reaction_added',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata: { emoji }
  });
}

export async function logReactionRemoved(cardId: string, emoji: string, actorType: ActorType, actorId: string, actorName?: string) {
  return logActivity({
    action: 'reaction_removed',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata: { emoji }
  });
}

export async function logActionExecuted(cardId: string, action: string, actorType: ActorType, actorId: string, actorName?: string, result?: Record<string, unknown>) {
  const actionMap: Record<string, ActivityAction> = {
    'approve': 'action_approved',
    'reject': 'action_rejected',
    'archive': 'action_archived'
  };
  
  return logActivity({
    action: actionMap[action] || 'action_executed',
    actorType,
    actorId,
    actorName,
    targetType: 'card',
    targetId: cardId,
    metadata: { action, result }
  });
}
