'use client';

import { useEffect, useState, useCallback } from 'react';
import { Notification, markAllNotificationsAsRead } from '@/lib/activity';
import { api } from '@/lib/api';
import { useSSE } from '@/hooks/useSSE';
import { 
  BellIcon,
  CheckIcon,
  CardStackIcon,
  ChatBubbleIcon,
  HeartIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ArchiveIcon
} from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDistanceToNow } from '@/lib/utils';

const actionIcons: Record<string, typeof BellIcon> = {
  card_created: CardStackIcon,
  card_updated: CardStackIcon,
  card_deleted: CardStackIcon,
  card_moved: CardStackIcon,
  comment_added: ChatBubbleIcon,
  comment_deleted: ChatBubbleIcon,
  reaction_added: HeartIcon,
  reaction_removed: HeartIcon,
  action_approved: CheckCircledIcon,
  action_rejected: CrossCircledIcon,
  action_archived: ArchiveIcon,
  action_executed: CardStackIcon,
};

const actionLabels: Record<string, string> = {
  card_created: 'created a card',
  card_updated: 'updated a card',
  card_deleted: 'deleted a card',
  card_moved: 'moved a card',
  comment_added: 'commented on',
  comment_deleted: 'deleted a comment on',
  reaction_added: 'reacted to',
  reaction_removed: 'removed reaction from',
  action_approved: 'approved',
  action_rejected: 'rejected',
  action_archived: 'archived',
  action_executed: 'executed action on',
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const [notifsData, countData] = await Promise.all([
        api.getNotifications({ limit: 10 }),
        api.getUnreadCount()
      ]);
      setNotifications(notifsData.notifications);
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
    
    // Poll every 30 seconds as fallback
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Listen for real-time activity
  useSSE({
    onMessage: (event) => {
      if (event.type === 'activity') {
        // New activity received, refresh notifications
        loadNotifications();
      }
    }
  });

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await api.markNotificationRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-in zoom-in">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              disabled={loading}
            >
              <CheckIcon className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const activity = notification.activity;
              if (!activity) return null;

              const Icon = actionIcons[activity.action] || BellIcon;
              const actionLabel = actionLabels[activity.action] || activity.action;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-3 cursor-pointer",
                    !notification.read && "bg-accent/50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    !notification.read ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      <span className="font-medium">{activity.actor_name || activity.actor_id}</span>
                      {' '}{actionLabel}
                      {activity.target_type && (
                        <span className="text-muted-foreground"> a {activity.target_type}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at))}
                    </p>
                  </div>

                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-xs text-muted-foreground cursor-pointer"
              onClick={() => {
                // Could navigate to full activity page
                setOpen(false);
              }}
            >
              View all activity
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
