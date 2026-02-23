# Migration Strategy: v1 → v2

## 1. Current State Inventory

### Production Data (if any)

| Resource | Table | ORM | Active |
|----------|-------|-----|--------|
| Boards | `Board` (Prisma) | Prisma | Yes |
| Documents | `Document` (Prisma) | Prisma | Yes |
| Agents | `Agent` (Supabase) | N/A | No (legacy) |
| Templates | `Template` (Supabase) | N/A | No (legacy) |
| Cards | `Card` (Supabase) | N/A | No (legacy) |
| Events | `Event` (Supabase) | N/A | No (legacy) |
| Comments | `Comment` (Supabase) | N/A | No (legacy) |
| Reactions | `Reaction` (Supabase) | N/A | No (legacy) |
| ApiKey | `ApiKey` (Supabase) | N/A | No (legacy) |
| Actions | `actions` (Supabase) | N/A | No (legacy) |

### Active API Endpoints

| Method | Path | Action |
|--------|------|--------|
| GET | `/api/boards` | List boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board |
| POST | `/api/boards/:id/documents` | Create document |
| GET | `/api/boards/:id/documents` | List documents |
| GET | `/api/boards/:id/documents/:docId` | Get document |

### Active Frontend Routes

| Path | Page |
|------|------|
| `/` | Board list |
| `/boards/[id]` | Board detail (document list) |
| `/boards/[id]/documents/[docId]` | Document viewer |
| `/agents` | API docs |

### Configuration Files

| File | Description |
|------|-------------|
| `Dockerfile` | Node 22-slim, Prisma, port 8080 |
| `cloudbuild.yaml` | Docker build → GCR → Cloud Run |
| `prisma/schema.prisma` | Board + Document models |
| `.env.example` | DATABASE_URL, PORT, NODE_ENV |

---

## 2. Migration Principles

1. **Additive only** — No drops, no renames until deprecation period ends
2. **Backward compatible** — Existing API endpoints continue working
3. **Data preserved** — All existing boards and documents migrated to v2 format
4. **Rollback safe** — Every migration has a corresponding down migration
5. **Zero downtime** — Migration runs during deployment, no service interruption

---

## 3. Migration Path by Phase

### Phase 0: Database + Infrastructure

**What Changes:**
- 7 new tables added: `api_keys`, `canvas_items`, `connectors`, `events`, `canvas_snapshots`, `webhooks` + `webhook_deliveries`, `media_attachments`
- Existing `Board` and `Document` tables NOT modified
- Backfill: `Board.api_key` → `api_keys` table (hashed)
- Backfill: `Document` rows → `canvas_items` with type 'document'

**Migration Steps:**
```
1. Run SQL migrations M001-M007 (create new tables)
   → No impact on existing code (new tables, no FK from old tables)

2. Run SQL migration M008 (backfill api_keys)
   → Creates api_keys rows from Board.api_key
   → Original Board.api_key NOT modified
   → Auth middleware updated to check api_keys table first, fall back to Board.api_key

3. Run SQL migration M009 (backfill documents to canvas_items)
   → Creates canvas_items rows from Document records
   → Original Document records NOT modified
   → Each document becomes a canvas_item at x=0, y=N*250

4. Update Prisma schema (prisma db pull + manual cleanup)
   → npx prisma generate succeeds
   → All new models available in Prisma client
```

**Rollback:** Drop new tables. Original data unaffected.

### Phase 1: API Versioning

**What Changes:**
- New `/v1/` route prefix for all endpoints
- Old `/api/` routes redirect to `/v1/` with 308 (Permanent Redirect, preserves method)
- Auth middleware: try `api_keys` table first, fall back to `Board.api_key`

**Migration Steps:**
```
1. Deploy new routes at /v1/boards, /v1/boards/:id/items, etc.
2. Add redirect: /api/* → /v1/* (308)
3. Log all /api/ accesses as deprecated

Existing clients:
- GET /api/boards → 308 → GET /v1/boards → 200 OK
- POST /api/boards → 308 → POST /v1/boards → 201 Created
```

**Rollback:** Remove `/v1/` routes, remove redirect. `/api/` routes still work.

### Phase 2: Frontend Page Change

**What Changes:**
- `/boards/[id]` now renders tldraw canvas instead of document list
- Documents visible as canvas items on the board
- Old `/boards/[id]/documents/[docId]` route preserved for direct links

**User Impact:**
- Existing board URLs now show a canvas instead of document list
- Documents appear as card-like shapes on the canvas
- Document viewer still accessible by clicking a document item

**Migration Steps:**
```
1. Deploy new board page component (CanvasShell)
2. Backfilled documents appear at x=0, y=0,250,500,...
3. Direct document URLs still work (/boards/[id]/documents/[docId])
```

**Rollback:** Revert board page component to document list view.

### Phase 3-5: Additive Only

No migration impact. New features are additive:
- Phase 3: WebSocket service is new (no existing service replaced)
- Phase 4: Media uploads are new; document API backward compat maintained
- Phase 5: Webhooks, SDK, batch optimization are new

---

## 4. API Key Migration

### Current State
```
Board table:
  api_key: "dc_a1b2c3d4e5f67890abcdef..." (PLAINTEXT)
```

### Target State
```
api_keys table:
  key_hash: SHA-256("dc_a1b2c3d4e5f67890abcdef...") = "abc123def..."
  key_prefix: "dc_a1b2"
  board_id: FK → boards.id
  scopes: ["read", "write", "admin"]
  is_active: true
```

### Auth Middleware Transition

```typescript
// Phase 0-1: Dual lookup (api_keys first, Board.api_key fallback)
async function authenticateBoard(apiKey: string) {
  // Try new table first
  const keyHash = sha256(apiKey)
  const newKey = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } })
  if (newKey && newKey.is_active) return newKey

  // Fall back to old column
  const board = await prisma.board.findFirst({ where: { api_key: apiKey } })
  if (board) return { board_id: board.id, scopes: ['read', 'write', 'admin'] }

  throw new UnauthorizedError()
}

// Phase 5+ (after deprecation): api_keys table only
async function authenticateBoard(apiKey: string) {
  const keyHash = sha256(apiKey)
  const key = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } })
  if (!key || !key.is_active) throw new UnauthorizedError()
  return key
}
```

### Timeline
- **Day 0:** Deploy api_keys table + backfill + dual lookup
- **Day 1-90:** Both lookups active (transition period)
- **Day 90:** Remove Board.api_key column from Prisma schema
- **Day 91+:** Clean up: DROP COLUMN api_key FROM boards

---

## 5. Document Migration

### Backfill Script

```sql
-- M009: Create canvas_items from existing documents

INSERT INTO canvas_items (
    id,
    board_id,
    type,
    x,
    y,
    width,
    height,
    content,
    created_by,
    created_at,
    updated_at
)
SELECT
    d.id,
    d.board_id,
    'document',
    0,                                                          -- x = 0
    ROW_NUMBER() OVER (PARTITION BY d.board_id ORDER BY d.created_at) * 250,  -- y = stacked
    400,                                                        -- width
    200,                                                        -- height
    jsonb_build_object(
        'title', d.title,
        'body', d.content,
        'format', 'markdown'
    ),
    d.author,
    d.created_at,
    d.updated_at
FROM documents d
ON CONFLICT (id) DO NOTHING;
```

### Dual Access

After backfill, documents are accessible two ways:
1. `GET /v1/boards/:id/items?type=document` → returns as canvas items
2. `GET /v1/boards/:id/documents` → returns in legacy Document format (mapped from canvas_items)

Both return the same underlying data from `canvas_items` table.

---

## 6. Frontend URL Handling

### URL Changes

| Before (v1) | After (v2) | Behavior |
|-------------|-----------|----------|
| `/boards/[id]` | `/boards/[id]` | Now shows canvas (was document list) |
| `/boards/[id]/documents/[docId]` | `/boards/[id]/documents/[docId]` | Still works (document viewer) |
| `/agents` | `/agents` | Updated with SDK docs |

### Bookmark Handling
- Users who bookmarked `/boards/[id]` will see the canvas (different but richer UX)
- Users who bookmarked document URLs will still reach the document viewer
- No 404s or broken links

---

## 7. Supabase Migration Consolidation

### Current State: Two Migration Directories

```
/supabase/migrations/                    ← Root level (5 migrations)
  20260220151705_add_comments_reactions.sql
  20260221214000_add_core_tables.sql
  20260221214500_add_fk_comments_reactions.sql
  20260221220000_add_api_key_table.sql
  202602220100_add_tags_and_rls.sql

/frontend/supabase/migrations/           ← Frontend level (1 migration)
  202502200001_add_actions_table.sql

/frontend/migrations/                    ← Loose migration (1 migration)
  001_add_card_coordinates.sql
```

### Consolidation Plan

1. Move `frontend/supabase/migrations/202502200001_add_actions_table.sql` → `supabase/migrations/`
2. Move `frontend/migrations/001_add_card_coordinates.sql` → `supabase/migrations/` (renumber)
3. Delete `frontend/supabase/` directory
4. Delete `frontend/migrations/` directory
5. Point Supabase CLI to root `supabase/` only

### Legacy Tables Decision

The old Supabase tables (`Agent`, `Template`, `Card`, `Event`, `Comment`, `Reaction`, `ApiKey`, `actions`) are NOT used by v2. They will be:
- **Kept** during v2 development (no interference, they're just unused tables)
- **Dropped** after v2 is stable and confirmed working (manual cleanup)
- **Not** referenced by any v2 Prisma model

---

## 8. Deprecation Timeline

| Day | Action |
|-----|--------|
| 0 | v2 deployed alongside v1 (dual routes, dual auth) |
| 0 | `/api/*` redirects to `/v1/*` with 308 |
| 0 | `Document` API returns `Deprecation: true` header |
| 30 | Monitor: how many `/api/` requests still coming? |
| 60 | Warning logs for `/api/` usage; email notification (if applicable) |
| 90 | Remove `/api/` redirect (return 410 Gone) |
| 90 | Remove `Board.api_key` column |
| 90 | Remove `Document` Prisma model |
| 120 | Drop legacy Supabase tables (Agent, Card, Template, etc.) |

---

## 9. Rollback Plan

### Per-Phase Rollback

| Phase | Rollback Action | Data Impact |
|-------|----------------|-------------|
| 0 | Drop new tables, revert Prisma schema | None (original data unaffected) |
| 1 | Remove `/v1/` routes, restore original `/api/` routes | None |
| 2 | Revert board page component | None (canvas items still in DB for future re-deploy) |
| 3 | Stop WS service, revert to REST-only sync | Canvas still works (no real-time) |
| 4 | Disable upload endpoint, revert media routes | Uploaded files remain in GCS |
| 5 | Disable webhook worker, remove SDK from PyPI | Webhook registrations remain in DB |

### Full Rollback

If v2 is abandoned entirely:
1. Revert all code to pre-v2 commit
2. Drop all v2 tables (they don't affect v1 tables)
3. Original `Board` + `Document` + `Board.api_key` still intact
4. No data loss
