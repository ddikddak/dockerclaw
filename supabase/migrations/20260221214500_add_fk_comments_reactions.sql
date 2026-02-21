-- Add foreign key constraints for Comment and Reaction tables
-- Connecting card_id to Card.id

-- Add foreign key to Comment table
ALTER TABLE "Comment" 
    ADD CONSTRAINT "Comment_card_id_fkey" 
    FOREIGN KEY ("card_id") 
    REFERENCES "Card"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Add foreign key to Reaction table  
ALTER TABLE "Reaction"
    ADD CONSTRAINT "Reaction_card_id_fkey"
    FOREIGN KEY ("card_id")
    REFERENCES "Card"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Also fix the cardId column in Comment if it exists (should be card_id)
-- This ensures consistency
ALTER TABLE "Comment" DROP COLUMN IF EXISTS "cardId";