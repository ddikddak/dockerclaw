-- Migration 06: Activity Log and Notifications
-- Phase 06: Real-time & History

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN (
    'card_created', 'card_updated', 'card_deleted', 'card_moved',
    'comment_added', 'comment_deleted', 
    'reaction_added', 'reaction_removed',
    'action_approved', 'action_rejected', 'action_archived', 'action_executed'
  )),
  actor_type TEXT CHECK (actor_type IN ('human', 'agent', 'system')),
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  target_type TEXT CHECK (target_type IN ('card', 'comment', 'reaction')),
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_id UUID REFERENCES activity_log(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for activity_log
CREATE INDEX IF NOT EXISTS activity_log_target_id_idx ON activity_log(target_id);
CREATE INDEX IF NOT EXISTS activity_log_actor_id_idx ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log(action);
CREATE INDEX IF NOT EXISTS activity_log_target_type_idx ON activity_log(target_type);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);

-- Add comment for documentation
COMMENT ON TABLE activity_log IS 'Audit trail of all actions in the system';
COMMENT ON TABLE notifications IS 'User notifications linked to activity log';
