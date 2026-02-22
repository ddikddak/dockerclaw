-- Migration: Add tags and RLS to Card and Template tables
-- Created: 2026-02-22

-- ============================================
-- 1. ADD COLUMNS
-- ============================================

-- Add tags array to Card table
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';

-- Add user_id to Card (for RLS)
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id);

-- Add user_id to Template (for RLS)
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES auth.users(id);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- GIN index for efficient tag searching
CREATE INDEX IF NOT EXISTS "idx_card_tags" ON "Card" USING GIN("tags");

-- Index for user_id queries (RLS performance)
CREATE INDEX IF NOT EXISTS "idx_card_user_id" ON "Card"("user_id");
CREATE INDEX IF NOT EXISTS "idx_template_user_id" ON "Template"("user_id");

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on Card table
ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Template table
ALTER TABLE "Template" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can create their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can update their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can delete their own cards" ON "Card";

DROP POLICY IF EXISTS "Users can only see their own templates" ON "Template";
DROP POLICY IF EXISTS "Users can create their own templates" ON "Template";
DROP POLICY IF EXISTS "Users can update their own templates" ON "Template";
DROP POLICY IF EXISTS "Users can delete their own templates" ON "Template";

-- Policy: Users can only see their own cards
CREATE POLICY "Users can only see their own cards" ON "Card"
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own cards
CREATE POLICY "Users can create their own cards" ON "Card"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own cards
CREATE POLICY "Users can update their own cards" ON "Card"
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own cards
CREATE POLICY "Users can delete their own cards" ON "Card"
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can only see their own templates
CREATE POLICY "Users can only see their own templates" ON "Template"
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own templates
CREATE POLICY "Users can create their own templates" ON "Template"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own templates
CREATE POLICY "Users can update their own templates" ON "Template"
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own templates
CREATE POLICY "Users can delete their own templates" ON "Template"
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE FUNCTIONS
-- ============================================

-- Function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set user_id automatically on Card insert
DROP TRIGGER IF EXISTS set_card_user_id ON "Card";
CREATE TRIGGER set_card_user_id
  BEFORE INSERT ON "Card"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- Trigger to set user_id automatically on Template insert
DROP TRIGGER IF EXISTS set_template_user_id ON "Template";
CREATE TRIGGER set_template_user_id
  BEFORE INSERT ON "Template"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- ============================================
-- 6. FUNCTION: GET UNIQUE TAGS FOR USER
-- ============================================

-- Function to get all unique tags for the current user
CREATE OR REPLACE FUNCTION public.get_user_tags()
RETURNS TABLE(tag TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest("Card".tags) as tag
  FROM "Card"
  WHERE "Card".user_id = auth.uid()
    AND "Card".tags IS NOT NULL
    AND array_length("Card".tags, 1) > 0
  ORDER BY tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. BACKFILL EXISTING DATA (Optional)
-- ============================================
-- Note: Run this manually if needed to migrate existing data
-- UPDATE "Card" SET tags = '{}' WHERE tags IS NULL;
-- UPDATE "Card" SET user_id = 'some-user-id' WHERE user_id IS NULL;
-- UPDATE "Template" SET user_id = 'some-user-id' WHERE user_id IS NULL;
