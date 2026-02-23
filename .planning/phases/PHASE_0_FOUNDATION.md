# Phase 0: Foundation & Infrastructure

## Objectives

Establish the development infrastructure, CI/CD pipeline, test framework, and database schema required by all subsequent phases. After Phase 0, any developer can clone the repo, run `docker-compose up`, and have a fully functional local environment.

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D0.1 | `docker-compose.yml` | Local dev stack: API + PostgreSQL + Redis |
| D0.2 | Updated `cloudbuild.yaml` | Test + lint + migrate + deploy pipeline |
| D0.3 | Structured logging | Pino JSON logger replacing `console.log` |
| D0.4 | Error handling middleware | Centralized Express error handler |
| D0.5 | `/health` endpoint | Health check with DB + Redis status |
| D0.6 | Test framework | Jest + Supertest + first passing tests |
| D0.7 | v2 Database migrations | All new tables created (additive, no drops) |
| D0.8 | Updated Prisma schema | New models for v2 tables |
| D0.9 | Redis client module | `src/lib/redis.ts` with ioredis |
| D0.10 | Updated `.env.example` | All environment variables documented |
| D0.11 | Security fixes | API key hashing, CORS restriction |

---

## Task Breakdown

### T0.1: Create `docker-compose.yml`

**Description:** Create a Docker Compose file for local development with PostgreSQL 15 and Redis 7.

**Files:**
- Create: `docker-compose.yml`

**Acceptance Criteria:**
- `docker-compose up -d` starts postgres, redis, and api containers
- PostgreSQL accessible at `localhost:5432`
- Redis accessible at `localhost:6379`
- API accessible at `localhost:3001`
- Volumes persist PostgreSQL data between restarts
- Hot-reload: changes to `src/` reflect without container restart

---

### T0.2: Add Pino Structured Logging

**Description:** Replace all `console.log` calls with Pino structured logging. Configure JSON output for Cloud Logging compatibility.

**Files:**
- Create: `src/lib/logger.ts`
- Modify: `src/index.ts` (replace console.log)
- Modify: `src/lib/auth.ts` (replace console.log)

**Dependencies:** `pino`, `pino-http`

**Acceptance Criteria:**
- All logs are structured JSON with `level`, `time`, `msg` fields
- HTTP request logging via `pino-http` middleware (method, url, status, latency)
- Log level configurable via `LOG_LEVEL` env var
- No `console.log` calls remain in source code
- Sensitive data (API keys, passwords) never logged in plaintext

**Implementation:**
```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['req.headers["x-api-key"]', 'api_key'],
})
```

---

### T0.3: Add Express Error Handling Middleware

**Description:** Centralized error handler that catches all errors and returns structured JSON responses.

**Files:**
- Create: `src/middleware/errorHandler.ts`
- Modify: `src/index.ts` (register middleware)

**Acceptance Criteria:**
- All unhandled errors return `{ error: { code, message, details? } }`
- Zod validation errors return 400 with field-level details
- Prisma `P2025` (not found) returns 404
- Prisma `P2002` (unique constraint) returns 409
- Unknown errors return 500 with generic message (no stack trace in production)
- Errors logged with Pino at appropriate levels

**Implementation:**
```typescript
// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from '../lib/logger'

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      })
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Resource already exists' },
      })
    }
  }

  logger.error({ err, url: req.url }, 'Unhandled error')
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  })
}
```

---

### T0.4: Add `/health` Endpoint

**Description:** Health check endpoint that verifies database and Redis connectivity.

**Files:**
- Modify: `src/index.ts` (add route)

**Acceptance Criteria:**
- `GET /health` returns 200 when all services are healthy
- Returns 503 when DB or Redis is unreachable
- Response includes service version from `package.json`
- Response includes uptime in seconds
- Response format: `{ status, version, uptime, checks: { database, redis } }`

---

### T0.5: Set Up Jest + Supertest

**Description:** Configure test framework with Jest for unit tests and Supertest for integration tests.

**Files:**
- Create: `jest.config.ts`
- Create: `tests/setup.ts` (test database setup/teardown)
- Create: `tests/health.test.ts` (first test)
- Modify: `package.json` (add test scripts)

**Dependencies:** `jest`, `@types/jest`, `ts-jest`, `supertest`, `@types/supertest`

**Acceptance Criteria:**
- `npm test` runs all tests and produces coverage report
- Test database is created/destroyed per test suite
- `tests/health.test.ts` verifies `GET /health` returns 200
- Coverage output in `coverage/` directory (gitignored)
- CI-friendly: `npm test -- --ci --coverage`

**Implementation Notes:**
- Use `src/app.ts` factory pattern (create Express app without `.listen()`) for Supertest
- Extract `app.ts` from `index.ts`:
  - `app.ts`: exports Express app
  - `index.ts`: imports app, calls `app.listen()`

---

### T0.6: Refactor `src/index.ts` into App Factory

**Description:** Extract Express app creation into `src/app.ts` for testability. `src/index.ts` becomes a thin server starter.

**Files:**
- Create: `src/app.ts`
- Modify: `src/index.ts`

**Acceptance Criteria:**
- `src/app.ts` exports a configured Express app (routes, middleware)
- `src/index.ts` only imports app and calls `app.listen()`
- All existing functionality preserved
- Supertest can import `app` directly without starting the server

---

### T0.7: Create Redis Client Module

**Description:** Configure ioredis client with connection pooling and error handling.

**Files:**
- Create: `src/lib/redis.ts`

**Dependencies:** `ioredis`

**Acceptance Criteria:**
- Redis client connects using `REDIS_URL` environment variable
- Graceful error handling (log and continue if Redis is down)
- Connection events logged (connect, error, reconnect)
- Export `redis` client instance and `isRedisReady()` helper
- Redis is optional for Phase 0 (API works without Redis, just no caching/rate limiting)

---

### T0.8: Write v2 Database Migrations

**Description:** Create SQL migration files for all v2 tables. These are additive — no existing tables are dropped or modified.

**Files:**
- Create: `supabase/migrations/20260224_001_create_api_keys.sql`
- Create: `supabase/migrations/20260224_002_create_canvas_items.sql`
- Create: `supabase/migrations/20260224_003_create_connectors.sql`
- Create: `supabase/migrations/20260224_004_create_events.sql`
- Create: `supabase/migrations/20260224_005_create_canvas_snapshots.sql`
- Create: `supabase/migrations/20260224_006_create_webhooks.sql`
- Create: `supabase/migrations/20260224_007_create_media_attachments.sql`

**Acceptance Criteria:**
- All tables match the schema in [DATA_MODEL.md](../architecture/DATA_MODEL.md)
- All indexes created
- All foreign key constraints with correct ON DELETE behavior
- All CHECK constraints applied
- Migrations run without errors on fresh database
- Migrations run without errors on database with existing v1 tables
- Each migration is independently rollback-able

**Migration M001 Example (`20260224_001_create_api_keys.sql`):**
```sql
-- Create api_keys table for v2 auth model
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'default',
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(8) NOT NULL DEFAULT 'dc_',
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write'],
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_board ON api_keys(board_id);
```

---

### T0.9: Update Prisma Schema

**Description:** Add Prisma models for all v2 tables so that the Prisma client can query them.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- All v2 tables have corresponding Prisma models
- Relations defined correctly (1:N, self-referential for frame_id)
- `npx prisma generate` succeeds
- Existing `Board` and `Document` models preserved (deprecated but functional)

**Strategy:** After SQL migrations run in Supabase, use `npx prisma db pull` to introspect, then clean up the generated schema manually.

---

### T0.10: Backfill API Keys

**Description:** Create a migration that copies existing `Board.api_key` values into the new `api_keys` table as SHA-256 hashes.

**Files:**
- Create: `supabase/migrations/20260224_008_backfill_api_keys.sql`

**Acceptance Criteria:**
- Every existing board has a corresponding row in `api_keys`
- `key_hash` = SHA-256 of the original plaintext key
- `key_prefix` = first 7 chars of the key (e.g., `dc_a1b2`)
- `scopes` = `{read, write, admin}` (full access for existing keys)
- `board_id` matches the original board
- `name` = 'default'
- `is_active` = true
- Original `Board.api_key` column is NOT dropped (kept for backward compat during transition)

**Migration:**
```sql
-- Backfill api_keys from existing Board.api_key
INSERT INTO api_keys (board_id, key_hash, key_prefix, scopes, is_active, created_at)
SELECT
    id AS board_id,
    encode(digest(api_key, 'sha256'), 'hex') AS key_hash,
    LEFT(api_key, 7) AS key_prefix,
    ARRAY['read', 'write', 'admin'] AS scopes,
    true AS is_active,
    created_at
FROM boards
WHERE api_key IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;
```

> Requires `pgcrypto` extension: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

---

### T0.11: Fix Security Issues

**Description:** Address the two critical security issues in the current codebase.

**Files:**
- Modify: `src/index.ts` or `src/app.ts` (CORS configuration)
- Modify: `src/lib/auth.ts` (use hashed key lookup)

**Sub-tasks:**

**T0.11a: Restrict CORS**
- Replace `app.use(cors())` with `app.use(cors({ origin: CORS_ORIGINS.split(',') }))`
- `CORS_ORIGINS` defaults to `http://localhost:3000` in development

**T0.11b: Use Hashed API Key Lookup**
- Update `authenticateBoard()` to:
  1. SHA-256 hash the received API key
  2. Query `api_keys WHERE key_hash = $hash AND is_active = true`
  3. Cache result in Redis for 60s
  4. Fall back to old `Board.api_key` lookup during transition period
- Update `last_used_at` on successful auth (debounced, not on every request)

**Acceptance Criteria:**
- CORS rejects requests from unauthorized origins
- API key lookup uses `api_keys` table with hashed comparison
- Old `Board.api_key` lookup works as fallback
- No plaintext API keys in logs or error responses

---

### T0.12: Update `.env.example`

**Description:** Document all environment variables with descriptions and example values.

**Files:**
- Modify: `.env.example`

**Acceptance Criteria:**
- Every env var used by the API service is listed
- Descriptions explain what each var does
- Example values are realistic but not real credentials
- Grouped by service (API, Redis, GCS, etc.)

---

### T0.13: Update `cloudbuild.yaml`

**Description:** Add test, lint, and migration steps to the CI/CD pipeline.

**Files:**
- Modify: `cloudbuild.yaml`

**Acceptance Criteria:**
- Pipeline: install → lint → test → build → push → migrate → deploy → smoke test
- Test failure blocks deployment
- Lint failure blocks deployment
- Migration runs after image push but before deploy
- Smoke test verifies `/health` returns 200

---

### T0.14: Clean Up Legacy Supabase Directory

**Description:** Remove the duplicate `frontend/supabase/` directory. Consolidate all migrations in root `supabase/migrations/`.

**Files:**
- Move relevant migrations from `frontend/supabase/migrations/` to `supabase/migrations/`
- Delete `frontend/supabase/` directory

**Acceptance Criteria:**
- Only one `supabase/` directory exists (at repo root)
- No migration files lost
- Supabase CLI points to root directory

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `docker-compose.yml` | Local dev stack |
| Create | `src/app.ts` | Express app factory |
| Create | `src/lib/logger.ts` | Pino logger |
| Create | `src/lib/redis.ts` | Redis client |
| Create | `src/middleware/errorHandler.ts` | Error handling |
| Create | `jest.config.ts` | Test configuration |
| Create | `tests/setup.ts` | Test setup |
| Create | `tests/health.test.ts` | First test |
| Create | `supabase/migrations/20260224_001_create_api_keys.sql` | API keys table |
| Create | `supabase/migrations/20260224_002_create_canvas_items.sql` | Canvas items table |
| Create | `supabase/migrations/20260224_003_create_connectors.sql` | Connectors table |
| Create | `supabase/migrations/20260224_004_create_events.sql` | Events table |
| Create | `supabase/migrations/20260224_005_create_canvas_snapshots.sql` | Snapshots table |
| Create | `supabase/migrations/20260224_006_create_webhooks.sql` | Webhooks tables |
| Create | `supabase/migrations/20260224_007_create_media_attachments.sql` | Media table |
| Create | `supabase/migrations/20260224_008_backfill_api_keys.sql` | Key backfill |
| Modify | `src/index.ts` | Thin server starter |
| Modify | `src/lib/auth.ts` | Hashed key lookup |
| Modify | `prisma/schema.prisma` | v2 models |
| Modify | `cloudbuild.yaml` | Enhanced pipeline |
| Modify | `.env.example` | All vars documented |
| Modify | `package.json` | New deps + scripts |
| Delete | `frontend/supabase/` | Consolidate migrations |

---

## Dependencies (npm packages to add)

| Package | Purpose |
|---------|---------|
| `pino` | Structured logging |
| `pino-http` | HTTP request logging |
| `pino-pretty` | Dev-only log formatting |
| `ioredis` | Redis client |
| `jest` | Test runner |
| `@types/jest` | Jest types |
| `ts-jest` | TypeScript Jest transformer |
| `supertest` | HTTP integration testing |
| `@types/supertest` | Supertest types |
| `helmet` | Security headers |

---

## Definition of Done

- [ ] `docker-compose up -d` starts API + PostgreSQL + Redis
- [ ] `npm test` passes with at least `health.test.ts`
- [ ] `GET /health` returns `{ status: "ok", checks: { database: "ok", redis: "ok" } }`
- [ ] All v2 database tables exist (run migrations on fresh DB)
- [ ] Prisma schema includes all v2 models, `npx prisma generate` succeeds
- [ ] No `console.log` in source code (only Pino)
- [ ] CORS restricted to configured origins
- [ ] API key auth uses hashed lookup
- [ ] `cloudbuild.yaml` includes test + migrate steps
- [ ] `.env.example` documents all variables
- [ ] Single `supabase/` directory at repo root

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase migration conflicts with existing tables | High | Run on staging first; all migrations are additive (CREATE IF NOT EXISTS) |
| Prisma + Supabase SQL migrations coexisting | Medium | Use Supabase SQL for table creation, Prisma only for client generation (`prisma db pull`) |
| Redis not available in Cloud Run VPC | Medium | Use Upstash (serverless Redis with HTTP) as fallback; no VPC needed |
| `pgcrypto` extension not enabled in Supabase | Low | Supabase enables it by default; add `CREATE EXTENSION IF NOT EXISTS` to migration |
| Existing API key format incompatible with hash | Low | Backfill migration handles conversion; fallback lookup preserves backward compat |
