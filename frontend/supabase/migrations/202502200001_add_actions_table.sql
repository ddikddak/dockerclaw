-- Create actions table for human actions on cards
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card_action', 'component_action')),
  action TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'processed' CHECK (status IN ('pending', 'processed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_actions_card_id ON actions(card_id);
CREATE INDEX idx_actions_agent_id ON actions(agent_id);
CREATE INDEX idx_actions_created_at ON actions(created_at);

-- Update events table if needed
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('pending', 'delivered'));

-- Add comment for documentation
COMMENT ON TABLE actions IS 'Stores human actions on cards (approve, reject, edit, toggle)';
