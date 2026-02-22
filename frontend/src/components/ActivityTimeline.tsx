'use client';

import { useEffect, useState } from 'react';
import { ActivityLog, ActivityAction, getActivityLog } from '@/lib/activity';
import { 
  CardStackIcon, 
  ChatBubbleIcon, 
  HeartIcon, 
  CheckCircledIcon,
  CrossCircledIcon,
  ArchiveIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
  MoveIcon
} from '@radix-ui/react-icons';
import { formatDistanceToNow } from '@/lib/utils';

interface ActivityTimelineProps {
  cardId?: string;
  limit?: number;
  showFilters?: boolean;
}

const actionIcons: Record<ActivityAction, typeof PlusIcon> = {
  card_created: PlusIcon,
  card_updated: Pencil1Icon,
  card_deleted: TrashIcon,
  card_moved: MoveIcon,
  comment_added: ChatBubbleIcon,
  comment_deleted: TrashIcon,
  reaction_added: HeartIcon,
  reaction_removed: HeartIcon,
  action_approved: CheckCircledIcon,
  action_rejected: CrossCircledIcon,
  action_archived: ArchiveIcon,
  action_executed: CardStackIcon,
};

const actionLabels: Record<ActivityAction, string> = {
  card_created: 'Created card',
  card_updated: 'Updated card',
  card_deleted: 'Deleted card',
  card_moved: 'Moved card',
  comment_added: 'Added comment',
  comment_deleted: 'Deleted comment',
  reaction_added: 'Added reaction',
  reaction_removed: 'Removed reaction',
  action_approved: 'Approved',
  action_rejected: 'Rejected',
  action_archived: 'Archived',
  action_executed: 'Executed action',
};

const actionColors: Record<ActivityAction, string> = {
  card_created: 'bg-gray-100 text-gray-600',
  card_updated: 'bg-gray-100 text-gray-600',
  card_deleted: 'bg-gray-100 text-gray-600',
  card_moved: 'bg-gray-100 text-gray-600',
  comment_added: 'bg-gray-100 text-gray-600',
  comment_deleted: 'bg-gray-100 text-gray-600',
  reaction_added: 'bg-gray-100 text-gray-600',
  reaction_removed: 'bg-gray-100 text-gray-600',
  action_approved: 'bg-gray-100 text-gray-600',
  action_rejected: 'bg-gray-100 text-gray-600',
  action_archived: 'bg-gray-100 text-gray-600',
  action_executed: 'bg-gray-100 text-gray-600',
};

export function ActivityTimeline({ cardId, limit = 20, showFilters = false }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityAction | 'all'>('all');

  useEffect(() => {
    loadActivities();
  }, [cardId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      // Use local activity log for now - API Activity not implemented yet
      const data = await getActivityLog({ 
        targetId: cardId,
        limit 
      });
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.action === filter);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(actionLabels).map(([action, label]) => (
            <button
              key={action}
              onClick={() => setFilter(action as ActivityAction)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === action ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-0">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No activity yet
          </div>
        ) : (
          filteredActivities.map((activity, index) => {
            const Icon = actionIcons[activity.action];
            const colorClass = actionColors[activity.action];
            const isLast = index === filteredActivities.length - 1;

            return (
              <div key={activity.id} className="flex gap-3 group">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${!isLast ? 'pb-4' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">
                      {activity.actor_name || activity.actor_id}
                    </span>
                    <span className="text-sm text-gray-500">
                      {actionLabels[activity.action]}
                    </span>
                    {activity.metadata?.emoji ? (
                      <span className="text-base">{String(activity.metadata.emoji)}</span>
                    ) : null}
                  </div>

                  {activity.metadata?.preview ? (
                    <div className="mt-1 text-sm text-gray-500 bg-gray-50 rounded px-2 py-1">
                      "{String(activity.metadata.preview)}"
                    </div>
                  ) : null}

                  {activity.metadata?.from && activity.metadata?.to ? (
                    <div className="mt-1 text-xs text-gray-400">
                      {String(activity.metadata.from)} → {String(activity.metadata.to)}
                    </div>
                  ) : null}

                  <div className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(activity.created_at))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}