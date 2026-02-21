-- Create Agent table
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "api_key" TEXT NOT NULL UNIQUE,
    "webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Template table
CREATE TABLE IF NOT EXISTS "Template" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Template" ADD CONSTRAINT "Template_agent_id_fkey" 
    FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Card table
CREATE TABLE IF NOT EXISTS "Card" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "template_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Card" ADD CONSTRAINT "Card_template_id_fkey" 
    FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Card" ADD CONSTRAINT "Card_agent_id_fkey" 
    FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Event table
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "agent_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Event" ADD CONSTRAINT "Event_agent_id_fkey" 
    FOREIGN KEY ("agent_id") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys to existing tables
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "cardId" TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Template_agent_id_idx" ON "Template"("agent_id");
CREATE INDEX IF NOT EXISTS "Card_template_id_idx" ON "Card"("template_id");
CREATE INDEX IF NOT EXISTS "Card_agent_id_idx" ON "Card"("agent_id");
CREATE INDEX IF NOT EXISTS "Event_agent_id_idx" ON "Event"("agent_id");
CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");