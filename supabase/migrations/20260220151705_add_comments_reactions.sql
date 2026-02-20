-- Create Comment table
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "card_id" TEXT NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Comment_card_id_idx" ON "Comment"("card_id");

-- Create Reaction table
CREATE TABLE IF NOT EXISTS "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "card_id" TEXT NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_card_id_author_id_emoji_key" ON "Reaction"("card_id", "author_id", "emoji");
CREATE INDEX IF NOT EXISTS "Reaction_card_id_idx" ON "Reaction"("card_id");
