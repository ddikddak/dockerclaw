# Phase 1: Core API

## Objectives

Implement the complete REST API for boards and canvas items. After Phase 1, an AI agent can create boards, generate API keys, create/read/update/delete canvas items, and perform batch operations — all via REST with proper authentication, validation, and rate limiting.

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D1.1 | Refactored route structure | Routes extracted from monolithic `index.ts` into modules |
| D1.2 | Boards API (`/v1/boards`) | Full CRUD with export |
| D1.3 | Canvas Items API (`/v1/boards/:id/items`) | Create, read, update, delete, lock/unlock |
| D1.4 | Batch API (`/v1/boards/:id/items/batch`) | Create up to 100 items in one call |
| D1.5 | API Key management (`/v1/boards/:id/keys`) | Create/list/revoke additional keys |
| D1.6 | Events API (`/v1/boards/:id/events`) | Read event log |
| D1.7 | Zod validation middleware | All inputs validated with typed schemas |
| D1.8 | Rate limiting middleware | Per-key Redis-backed rate limiting |
| D1.9 | API versioning | `/v1/` prefix with `/api/` backward compat redirect |
| D1.10 | Integration tests | >80% coverage on all endpoints |
| D1.11 | OpenAPI/Swagger docs | Auto-generated from Zod schemas |

---

## Target File Structure

```
src/
├── index.ts                 # Server start only (from Phase 0)
├── app.ts                   # Express app factory (from Phase 0)
├── lib/
│   ├── prisma.ts            # (existing)
│   ├── redis.ts             # (from Phase 0)
│   ├── logger.ts            # (from Phase 0)
│   ├── auth.ts              # (extended: scope checking)
│   └── schemas/
│       ├── board.ts         # Board Zod schemas
│       ├── item.ts          # Canvas item Zod schemas
│       ├── batch.ts         # Batch operation schemas
│       ├── connector.ts     # Connector schemas
│       ├── event.ts         # Event query schemas
│       ├── key.ts           # API key schemas
│       └── common.ts        # Shared schemas (pagination, UUID, etc.)
├── middleware/
│   ├── errorHandler.ts      # (from Phase 0)
│   ├── auth.ts              # Auth middleware with scope checking
│   ├── rateLimit.ts         # Redis-backed rate limiting
│   └── validate.ts          # Zod validation middleware factory
├── routes/
│   ├── boards.ts            # Board CRUD + export
│   ├── items.ts             # Canvas item CRUD + position/content/style
│   ├── batch.ts             # Batch create/update/delete
│   ├── keys.ts              # API key management
│   ├── events.ts            # Event log read
│   └── legacy.ts            # /api/ backward compat redirects
└── tests/
    ├── setup.ts             # (from Phase 0)
    ├── health.test.ts       # (from Phase 0)
    ├── boards.test.ts       # Board endpoint tests
    ├── items.test.ts        # Item endpoint tests
    ├── batch.test.ts        # Batch endpoint tests
    ├── keys.test.ts         # Key management tests
    ├── events.test.ts       # Event log tests
    └── auth.test.ts         # Auth + rate limit tests
```

---

## Task Breakdown

### T1.1: Create Zod Schemas

**Description:** Define all request/response validation schemas.

**Files:**
- Create: `src/lib/schemas/common.ts`
- Create: `src/lib/schemas/board.ts`
- Create: `src/lib/schemas/item.ts`
- Create: `src/lib/schemas/batch.ts`
- Create: `src/lib/schemas/key.ts`
- Create: `src/lib/schemas/event.ts`

**Key Schemas:**

```typescript
// src/lib/schemas/common.ts
import { z } from 'zod'

export const UUIDSchema = z.string().uuid()

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  after: z.string().uuid().optional(),
})

export const SortSchema = z.object({
  sort: z.enum(['created_at', 'updated_at', 'z_index']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('asc'),
})
```

```typescript
// src/lib/schemas/item.ts
import { z } from 'zod'

const ItemType = z.enum(['sticky', 'text', 'shape', 'frame', 'image', 'document'])

const StyleSchema = z.object({
  color: z.string().optional(),
  fill: z.enum(['solid', 'semi', 'none']).optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().min(0).max(20).optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().optional(),
}).partial()

// Type-specific content schemas
const StickyContentSchema = z.object({
  text: z.string().min(1).max(500),
  color: z.string().optional(),
})

const TextContentSchema = z.object({
  text: z.string().min(1),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
})

const ShapeContentSchema = z.object({
  shapeType: z.enum(['rect', 'circle', 'diamond', 'triangle']),
  label: z.string().optional(),
})

const FrameContentSchema = z.object({
  title: z.string().optional(),
})

const ImageContentSchema = z.object({
  storage_url: z.string().url(),
  alt_text: z.string().optional(),
  original_filename: z.string().optional(),
})

const DocumentContentSchema = z.object({
  title: z.string().min(1),
  body: z.string(),
  format: z.enum(['markdown']).default('markdown'),
})

// Discriminated union based on type
export const CreateItemSchema = z.object({
  type: ItemType,
  x: z.number().min(-1000000).max(1000000),
  y: z.number().min(-1000000).max(1000000),
  width: z.number().min(1).max(10000).optional(),
  height: z.number().min(1).max(10000).optional(),
  rotation: z.number().min(0).max(360).default(0),
  content: z.record(z.unknown()), // Validated per-type in route handler
  style: StyleSchema.optional(),
  frame_id: z.string().uuid().optional(),
  locked: z.boolean().default(false),
})

export const UpdateItemSchema = CreateItemSchema.partial().omit({ type: true })

export const UpdatePositionSchema = z.object({
  x: z.number().min(-1000000).max(1000000),
  y: z.number().min(-1000000).max(1000000),
  width: z.number().min(1).max(10000).optional(),
  height: z.number().min(1).max(10000).optional(),
})

export const ItemQuerySchema = z.object({
  type: ItemType.optional(),
  frame_id: z.string().uuid().optional(),
  locked: z.coerce.boolean().optional(),
  ...PaginationSchema.shape,
  ...SortSchema.shape,
})
```

**Acceptance Criteria:**
- All schemas export TypeScript types via `z.infer<typeof Schema>`
- Content schema validated per item type
- Reasonable defaults for optional fields

---

### T1.2: Create Validation Middleware

**Description:** Generic middleware factory that validates request body/query/params against Zod schemas.

**Files:**
- Create: `src/middleware/validate.ts`

**Implementation:**
```typescript
// src/middleware/validate.ts
import { RequestHandler } from 'express'
import { z, ZodSchema } from 'zod'

interface ValidateOptions {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export function validate(schemas: ValidateOptions): RequestHandler {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query)
      if (schemas.params) req.params = schemas.params.parse(req.params)
      next()
    } catch (err) {
      next(err) // Caught by errorHandler middleware
    }
  }
}
```

**Acceptance Criteria:**
- Validated data replaces `req.body`/`req.query` (with defaults applied)
- Zod errors flow to errorHandler → 400 response

---

### T1.3: Implement Auth Middleware with Scopes

**Description:** Extend the auth middleware to check API key scopes.

**Files:**
- Modify: `src/lib/auth.ts` → `src/middleware/auth.ts`

**Implementation:**
```typescript
// src/middleware/auth.ts
import { RequestHandler } from 'express'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

type Scope = 'read' | 'write' | 'admin'

export function requireAuth(...requiredScopes: Scope[]): RequestHandler {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] as string
    if (!apiKey) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing X-API-Key header' }
      })
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Check Redis cache
    let keyData = await redis.get(`apikey:${keyHash}`)
    if (!keyData) {
      // Query DB
      const key = await prisma.apiKey.findUnique({
        where: { key_hash: keyHash },
        include: { board: true },
      })
      if (!key || !key.is_active) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Invalid API key' }
        })
      }
      keyData = JSON.stringify(key)
      await redis.setex(`apikey:${keyHash}`, 60, keyData) // Cache 60s
    }

    const key = JSON.parse(keyData)

    // Check board_id matches route
    const boardId = req.params.id || req.params.boardId
    if (boardId && key.board_id !== boardId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'API key does not have access to this board' }
      })
    }

    // Check scopes
    for (const scope of requiredScopes) {
      if (!key.scopes.includes(scope)) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: `Missing required scope: ${scope}` }
        })
      }
    }

    req.apiKey = key // Attach to request for downstream use
    next()
  }
}
```

**Acceptance Criteria:**
- Missing key → 401
- Invalid key → 401
- Key for wrong board → 403
- Key without required scope → 403
- Valid key → `req.apiKey` populated, `next()` called
- Key data cached in Redis for 60s

---

### T1.4: Implement Rate Limiting

**Description:** Redis-backed sliding window rate limiter per API key.

**Files:**
- Create: `src/middleware/rateLimit.ts`

**Dependencies:** `rate-limiter-flexible`

**Acceptance Criteria:**
- 1000 requests per minute per API key (standard endpoints)
- 50 requests per minute for batch endpoints
- 20 requests per minute for uploads
- Returns 429 with `Retry-After` header when exceeded
- Returns rate limit headers on all responses
- Graceful degradation: if Redis is down, allow all requests (log warning)

---

### T1.5: Implement Board Routes

**Description:** Extract and extend board CRUD from current `index.ts`.

**Files:**
- Create: `src/routes/boards.ts`

**Endpoints:**

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| POST | `/v1/boards` | None | - |
| GET | `/v1/boards` | Required | read |
| GET | `/v1/boards/:id` | Required | read |
| PATCH | `/v1/boards/:id` | Required | write |
| DELETE | `/v1/boards/:id` | Required | admin |
| GET | `/v1/boards/:id/export` | Required | read |

**Acceptance Criteria:**
- `POST /v1/boards` creates board + generates API key + creates `api_keys` row
- `GET /v1/boards` returns paginated list with `item_count`
- `GET /v1/boards/:id` returns board details
- `PATCH /v1/boards/:id` updates name/description/settings
- `DELETE /v1/boards/:id` deletes board (cascade)
- `GET /v1/boards/:id/export` returns items + connectors as JSON
- All responses use envelope format `{ data, meta? }`
- All inputs validated via Zod

---

### T1.6: Implement Canvas Item Routes

**Description:** Full CRUD for canvas items with type-specific content validation.

**Files:**
- Create: `src/routes/items.ts`

**Endpoints:**

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| POST | `/v1/boards/:id/items` | Required | write | Create item |
| GET | `/v1/boards/:id/items` | Required | read | List items (filterable) |
| GET | `/v1/boards/:id/items/:itemId` | Required | read | Get item |
| PATCH | `/v1/boards/:id/items/:itemId` | Required | write | Update item |
| PATCH | `/v1/boards/:id/items/:itemId/position` | Required | write | Update position only |
| PATCH | `/v1/boards/:id/items/:itemId/content` | Required | write | Update content only |
| PATCH | `/v1/boards/:id/items/:itemId/style` | Required | write | Update style only |
| DELETE | `/v1/boards/:id/items/:itemId` | Required | write | Delete item |
| POST | `/v1/boards/:id/items/:itemId/lock` | Required | write | Lock item |
| DELETE | `/v1/boards/:id/items/:itemId/lock` | Required | write | Unlock item |

**Acceptance Criteria:**
- All 10 endpoints functional
- Content validated per item type (sticky requires text, shape requires shapeType, etc.)
- `z_index` auto-incremented on create (max z_index + 1 for the board)
- `version` incremented on every update
- `created_by` set to API key prefix
- Event logged for every create/update/delete
- Cursor-based pagination with `after` + `limit`
- Filtering by `type`, `frame_id`, `locked`

---

### T1.7: Implement Batch Routes

**Description:** Batch create/update/delete for AI agent bulk operations.

**Files:**
- Create: `src/routes/batch.ts`

**Endpoints:**

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| POST | `/v1/boards/:id/items/batch` | Required | write |
| PATCH | `/v1/boards/:id/items/batch` | Required | write |
| DELETE | `/v1/boards/:id/items/batch` | Required | write |

**Implementation:**
```typescript
// POST /v1/boards/:id/items/batch
router.post('/:id/items/batch',
  requireAuth('write'),
  rateLimit('batch'),
  validate({ body: BatchCreateSchema }),
  async (req, res) => {
    const { items } = req.body
    const boardId = req.params.id

    // Validate board exists
    const board = await prisma.board.findUnique({ where: { id: boardId } })
    if (!board) return res.status(404).json(...)

    // Check item limit
    const currentCount = await prisma.canvasItem.count({ where: { board_id: boardId } })
    if (currentCount + items.length > 10000) {
      return res.status(400).json({
        error: { code: 'BOARD_LIMIT', message: `Board would exceed 10,000 item limit` }
      })
    }

    // Transaction: create all items
    const created = await prisma.$transaction(
      items.map((item, index) => prisma.canvasItem.create({
        data: {
          board_id: boardId,
          type: item.type,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation || 0,
          content: item.content,
          style: item.style || {},
          created_by: req.apiKey.key_prefix,
          z_index: currentCount + index + 1,
        },
      }))
    )

    // Log events for each created item
    await prisma.event.createMany({
      data: created.map(item => ({
        board_id: boardId,
        item_id: item.id,
        actor_type: 'agent',
        actor_id: req.apiKey.key_prefix,
        event_type: 'item.created',
        payload: { type: item.type },
      }))
    })

    // Publish to Redis for WebSocket bridge (Phase 3)
    // await redis.publish(`board:${boardId}:updates`, ...)

    res.status(201).json({
      data: {
        created: created.map((item, index) => ({ index, item })),
        failed: [],
      },
      meta: { total_created: created.length, total_failed: 0 },
    })
  }
)
```

**Acceptance Criteria:**
- Max 100 items per batch
- All-or-nothing by default (Prisma transaction)
- `?partial=true` allows partial success
- Each item individually validated
- Events logged for all created items
- Rate limited separately (50/min vs 1000/min)
- Board item count limit enforced (10,000 soft limit)

---

### T1.8: Implement API Key Management Routes

**Description:** Allow board owners to create additional API keys with different scopes.

**Files:**
- Create: `src/routes/keys.ts`

**Endpoints:**

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| GET | `/v1/boards/:id/keys` | Required | admin |
| POST | `/v1/boards/:id/keys` | Required | admin |
| DELETE | `/v1/boards/:id/keys/:keyId` | Required | admin |

**Acceptance Criteria:**
- Create returns full key (once only)
- List returns keys without full key (prefix + metadata only)
- Cannot delete the last active key for a board
- New keys support custom scopes: `read`, `write`, `admin`

---

### T1.9: Implement Events Routes

**Description:** Read-only event log for board activity auditing.

**Files:**
- Create: `src/routes/events.ts`

**Endpoints:**

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| GET | `/v1/boards/:id/events` | Required | read |
| GET | `/v1/boards/:id/events/:eventId` | Required | read |

**Acceptance Criteria:**
- Paginated with cursor + limit
- Filterable by `event_type`, `actor_type`, `item_id`, `since` (timestamp)
- Sorted by `created_at DESC` (newest first)

---

### T1.10: Add `/api/` Backward Compatibility

**Description:** Redirect old `/api/` routes to `/v1/` routes for existing clients.

**Files:**
- Create: `src/routes/legacy.ts`

**Implementation:**
```typescript
// Redirect /api/boards → /v1/boards (preserving query params)
router.all('/api/*', (req, res) => {
  const newUrl = req.originalUrl.replace('/api/', '/v1/')
  res.redirect(308, newUrl) // 308 preserves HTTP method
})
```

**Acceptance Criteria:**
- `GET /api/boards` → 308 redirect to `/v1/boards`
- `POST /api/boards` → 308 redirect to `/v1/boards`
- All existing v1 clients continue to work
- Redirect logged as deprecated access

---

### T1.11: Add OpenAPI/Swagger Docs

**Description:** Auto-generate OpenAPI spec from Zod schemas and serve Swagger UI.

**Dependencies:** `@asteasolutions/zod-to-openapi`, `swagger-ui-express`

**Files:**
- Create: `src/lib/openapi.ts`
- Modify: `src/app.ts` (mount Swagger UI)

**Acceptance Criteria:**
- `GET /v1/docs` serves Swagger UI
- `GET /v1/openapi.json` returns OpenAPI 3.0 spec
- All endpoints documented with request/response schemas
- Authentication documented (API key header)

---

### T1.12: Write Integration Tests

**Description:** Comprehensive test suite for all API endpoints.

**Files:**
- Create: `tests/boards.test.ts`
- Create: `tests/items.test.ts`
- Create: `tests/batch.test.ts`
- Create: `tests/keys.test.ts`
- Create: `tests/events.test.ts`
- Create: `tests/auth.test.ts`

**Test Matrix:**

| Endpoint | Success | 400 | 401 | 403 | 404 | 409 | 429 |
|----------|---------|-----|-----|-----|-----|-----|-----|
| POST /v1/boards | Yes | Yes | - | - | - | - | - |
| GET /v1/boards | Yes | - | Yes | - | - | - | - |
| GET /v1/boards/:id | Yes | - | Yes | Yes | Yes | - | - |
| PATCH /v1/boards/:id | Yes | Yes | Yes | Yes | Yes | - | - |
| DELETE /v1/boards/:id | Yes | - | Yes | Yes | Yes | - | - |
| POST /v1/.../items | Yes | Yes | Yes | Yes | Yes | - | - |
| GET /v1/.../items | Yes | - | Yes | Yes | - | - | - |
| GET /v1/.../items/:id | Yes | - | Yes | Yes | Yes | - | - |
| PATCH /v1/.../items/:id | Yes | Yes | Yes | Yes | Yes | Yes | - |
| DELETE /v1/.../items/:id | Yes | - | Yes | Yes | Yes | - | - |
| POST /v1/.../items/batch | Yes | Yes | Yes | Yes | Yes | - | Yes |
| POST /v1/.../keys | Yes | Yes | Yes | Yes | - | - | - |
| GET /v1/.../events | Yes | - | Yes | Yes | - | - | - |

**Acceptance Criteria:**
- All cells in test matrix have at least one test
- `npm test -- --coverage` shows >80% line coverage
- Tests use test database (not production)
- Tests clean up after themselves

---

## Definition of Done

- [ ] All endpoints from [API_SPECIFICATION.md](../architecture/API_SPECIFICATION.md) sections 1-8 implemented
- [ ] All requests validated with Zod (400 on invalid input with field-level errors)
- [ ] Auth middleware checks API key hash and scopes
- [ ] Rate limiting active (429 on excess, with `Retry-After` header)
- [ ] Events logged for all mutations (create, update, delete)
- [ ] `/api/` routes redirect to `/v1/` (backward compat)
- [ ] Swagger UI at `/v1/docs`
- [ ] `npm test` passes with >80% coverage
- [ ] Deployed to Cloud Run, all endpoints accessible

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content validation complexity per item type | Medium | Validate `content` in route handler with discriminated union; fall back to generic `z.record()` for unknown types |
| Batch transaction timeout for 100 items | Medium | Set Prisma transaction timeout to 30s; add connection pool size check |
| Rate limiter Redis dependency | Medium | Graceful degradation: allow all if Redis is down |
| OpenAPI generation from Zod | Low | `zod-to-openapi` is mature; test generated spec with Swagger validator |
