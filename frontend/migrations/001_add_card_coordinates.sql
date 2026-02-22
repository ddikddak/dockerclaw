-- Migration: Add x, y coordinates to Card table for infinite canvas
-- Created: 2026-02-22

-- Afegir columnes x, y a la taula Card
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "x" INTEGER DEFAULT 0;
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "y" INTEGER DEFAULT 0;

-- Crear índex per millorar performance de queries per posició
CREATE INDEX IF NOT EXISTS "idx_card_x" ON "Card"("x");
CREATE INDEX IF NOT EXISTS "idx_card_y" ON "Card"("y");

-- Comentaris per documentació
COMMENT ON COLUMN "Card"."x" IS 'X coordinate on infinite canvas';
COMMENT ON COLUMN "Card"."y" IS 'Y coordinate on infinite canvas';
