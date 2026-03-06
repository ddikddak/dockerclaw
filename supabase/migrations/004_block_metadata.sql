-- ============================================
-- Migration 004: Block Metadata for AI Agents
-- Adds description, purpose, and semantic_tags to blocks
-- so AI agents can annotate and understand board structure
-- ============================================

ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS purpose text
    CHECK (purpose IS NULL OR purpose IN ('input', 'process', 'output', 'reference', 'dashboard')),
  ADD COLUMN IF NOT EXISTS semantic_tags text[] DEFAULT '{}';

-- Index on purpose for agent queries filtering by block role
CREATE INDEX IF NOT EXISTS idx_blocks_purpose ON public.blocks(purpose) WHERE purpose IS NOT NULL;
