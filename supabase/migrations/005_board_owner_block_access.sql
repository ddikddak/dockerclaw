-- ============================================
-- Migration 005: Board Owner Block Access
-- Allows board owners to read blocks created by agents/APIs on their boards
-- ============================================

CREATE POLICY "Board owners can read all blocks"
  ON public.blocks FOR SELECT
  USING (
    board_id IN (SELECT id FROM boards WHERE user_id = auth.uid())
  );
