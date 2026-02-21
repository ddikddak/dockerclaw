-- Migration to add ApiKey table
-- Created manually for dockerclaw-web

-- Create ApiKey table
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Create unique index on keyHash
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- Create indexes for performance
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
