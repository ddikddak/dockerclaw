-- Create ApiKey table
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL UNIQUE,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_isActive_idx" ON "ApiKey"("isActive");