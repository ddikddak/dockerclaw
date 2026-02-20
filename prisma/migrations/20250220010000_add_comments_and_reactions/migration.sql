-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  author_type TEXT CHECK (author_type IN ('human', 'agent')),
  author_id TEXT NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Create reactions table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  author_type TEXT CHECK (author_type IN ('human', 'agent')),
  author_id TEXT NOT NULL,
  author_name TEXT,
  emoji TEXT CHECK (emoji IN ('👍', '❤️', '🎉', '🚀', '👀')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, author_id, emoji)
);

-- Create indexes for performance
CREATE INDEX comments_card_id_idx ON comments(card_id);
CREATE INDEX reactions_card_id_idx ON reactions(card_id);
