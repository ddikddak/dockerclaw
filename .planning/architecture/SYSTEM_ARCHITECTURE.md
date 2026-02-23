# System Architecture

## 1. Component Overview

```
                                  ┌─────────────────────────┐
                                  │     External Agents      │
                                  │  (Python SDK / curl)     │
                                  └────────────┬────────────┘
                                               │
                                          REST API
                                          (HTTPS)
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    │                          ▼                          │
                    │         ┌────────────────────────────┐              │
                    │         │     Cloud Run: API         │              │
                    │         │   (Node.js / Express)      │              │
                    │         │                            │              │
                    │         │  • REST endpoints          │              │
                    │         │  • Auth (API keys)         │              │
                    │         │  • Validation (Zod)        │              │
                    │         │  • Rate limiting           │              │
                    │         │  • Webhook dispatch        │              │
                    │         │  • Event logging           │              │
                    │         └──────┬────────────┬────────┘              │
                    │                │            │                       │
                    │          Prisma│       Redis│Pub/Sub                │
                    │                │            │                       │
                    │                ▼            ▼                       │
                    │  ┌──────────────┐  ┌──────────────────┐            │
                    │  │   Supabase   │  │      Redis       │            │
                    │  │  PostgreSQL  │  │                  │            │
                    │  │              │  │ • Pub/Sub bridge │            │
                    │  │ • boards     │  │ • API key cache  │            │
                    │  │ • canvas_items│  │ • Rate limits    │            │
                    │  │ • connectors │  │ • Idempotency    │            │
                    │  │ • events     │  │ • Webhook queue  │            │
                    │  │ • webhooks   │  │                  │            │
                    │  │ • api_keys   │  └────────┬─────────┘            │
                    │  │ • snapshots  │           │                      │
                    │  └──────────────┘      Redis│Sub                   │
                    │                             │                      │
                    │                             ▼                      │
                    │            ┌─────────────────────────┐             │
                    │            │  Cloud Run: WebSocket   │             │
                    │            │   (y-websocket + Yjs)   │             │
                    │            │                         │             │
                    │            │ • CRDT state sync       │             │
                    │            │ • Awareness (cursors)   │             │
                    │            │ • Snapshot persistence  │             │
                    │            │ • Redis bridge listener │             │
                    │            └────────────┬────────────┘             │
                    │                         │                          │
                    │                    WebSocket                       │
                    │                      (WSS)                         │
                    │                         │                          │
                    │                         ▼                          │
                    │         ┌────────────────────────────┐             │
                    │         │      Vercel: Frontend      │             │
                    │         │      (Next.js + tldraw)    │             │
                    │         │                            │             │
                    │         │  • tldraw canvas           │             │
                    │         │  • Board management UI     │             │
                    │         │  • Yjs WebSocket client    │             │
                    │         │  • REST API client         │             │
                    │         └────────────────────────────┘             │
                    │                                                    │
                    │         ┌────────────────────────────┐             │
                    │         │   Google Cloud Storage     │             │
                    │         │                            │             │
                    │         │  • Image uploads           │             │
                    │         │  • File attachments        │             │
                    │         │  • Signed URL access       │             │
                    │         └────────────────────────────┘             │
                    │                                                    │
                    └────────────────────────────────────────────────────┘
                              Google Cloud Platform (europe-west1)
```

---

## 2. Service Descriptions

### API Service (Cloud Run: `dockerclaw-api`)
- **Runtime:** Node.js 22 LTS
- **Framework:** Express 5 with TypeScript
- **Responsibilities:**
  - All REST API endpoints (`/v1/boards`, `/v1/boards/:id/items`, etc.)
  - Request authentication via API key validation (Redis-cached)
  - Request validation via Zod schemas
  - Rate limiting via Redis sliding window
  - Database reads/writes via Prisma ORM
  - Event logging to `events` table on every mutation
  - Webhook dispatch (enqueue to Redis, processed by background worker)
  - Publishing item changes to Redis pub/sub for WebSocket bridge
- **Scaling:** Stateless, 0→10 instances, Cloud Run auto-scale
- **Port:** 8080

### WebSocket Service (Cloud Run: `dockerclaw-ws`)
- **Runtime:** Node.js 22 LTS
- **Library:** y-websocket (Yjs WebSocket provider)
- **Responsibilities:**
  - Managing Yjs `Y.Doc` instances per board (one doc per room)
  - Broadcasting CRDT updates to all connected clients
  - Awareness protocol (cursor positions, user presence)
  - Persisting Y.Doc snapshots to database on idle/disconnect
  - Loading snapshots from database on first client connect
  - Subscribing to Redis pub/sub for REST-to-WebSocket bridge (agent writes → canvas updates)
- **Scaling:** Min 1 instance (persistent connections can't cold-start), max 5
- **Port:** 8080
- **Timeout:** 3600s (1 hour, for long-lived WebSocket connections)

### Frontend (Vercel)
- **Framework:** Next.js 16 (App Router, standalone output)
- **Canvas:** tldraw SDK
- **Responsibilities:**
  - Rendering the infinite canvas with tldraw
  - Board list and management UI
  - Syncing canvas state via Yjs WebSocket connection
  - Displaying cursor presence and user awareness
  - REST API calls for CRUD operations (create board, upload image, etc.)
  - Responsive layout, loading/error states
- **Deployment:** Vercel auto-deploy on push to `main`

### Database (Supabase PostgreSQL)
- **Engine:** PostgreSQL 15+
- **Role:** Authoritative state store for all data
- **Features Used:** JSONB columns, GIN indexes, foreign keys with CASCADE
- **Connection:** Prisma ORM from API service via connection pooling (PgBouncer)

### Cache (Redis)
- **Provider:** Upstash (serverless, dev) or Cloud Memorystore (prod)
- **Role:** Cross-service coordination
- **Uses:**
  - API key validation cache (TTL 60s) — avoid DB lookup on every request
  - Rate limiting counters (sliding window per API key)
  - Pub/sub channels for REST-to-WebSocket bridge
  - Idempotency key deduplication (TTL 24h)
  - Webhook delivery queue (BullMQ)

### Storage (Google Cloud Storage)
- **Bucket:** `dockerclaw-media-{project_id}` in `europe-west1`
- **Role:** Binary file storage (images, attachments)
- **Access:** Signed URLs with 1-hour expiry for reads
- **Lifecycle:** Auto-delete orphaned files after 30 days

---

## 3. Request Lifecycle

### Scenario A: Agent POSTs a Sticky Note

```
1. Agent sends POST /v1/boards/:id/items
   Headers: X-API-Key: dc_abc123...
   Body: { type: "sticky", x: 100, y: 200, content: { text: "Hello" } }

2. Express middleware chain:
   a. CORS check (origin in allowlist)
   b. Body parsing (express.json, 1MB limit)
   c. Rate limit check (Redis: increment counter for this API key)
   d. Auth middleware:
      - SHA-256(api_key) → check Redis cache
      - Cache miss → query api_keys WHERE key_hash = $hash AND is_active = true
      - Cache hit → validate board_id matches route param
   e. Zod validation (CanvasItemCreateSchema)

3. Route handler (src/routes/items.ts):
   a. Generate UUID for item
   b. Prisma create: INSERT INTO canvas_items (...)
   c. Prisma create: INSERT INTO events (type: 'item.created', ...)
   d. Redis PUBLISH board:{id}:updates → { action: 'create', item: {...} }
   e. Enqueue webhook check: any webhooks for this board with 'item.created' event?

4. Response: 201 Created
   { data: { id, type, x, y, content, style, created_at } }

5. Async (after response):
   a. y-websocket server receives Redis message
   b. Applies update to board's Y.Doc
   c. Broadcasts to all connected tldraw clients
   d. Webhook worker delivers POST to registered webhook URLs
```

### Scenario B: Human Drags an Item on Canvas

```
1. User drags sticky note from (100,200) to (300,400) in tldraw

2. tldraw updates its internal TLStore
   → Yjs binding converts store change to Y.Doc update
   → y-websocket client sends binary Yjs update to server

3. y-websocket server:
   a. Applies update to board's Y.Doc
   b. Broadcasts update to all other connected clients (instant)
   c. Schedules snapshot persistence (debounced 30s)

4. Snapshot persistence (async, every 30s if changes):
   a. Serialize Y.Doc → JSON
   b. Upsert canvas_snapshots WHERE board_id = :id
   c. Optionally: extract individual item positions → update canvas_items rows

5. Other connected browsers:
   a. Receive Yjs update via WebSocket
   b. tldraw Yjs binding applies update to TLStore
   c. Canvas re-renders with item at new position
   Total latency: < 200ms (same region)
```

---

## 4. Technology Choices

| Technology | Version | Purpose | Alternatives Considered | Why Chosen |
|-----------|---------|---------|------------------------|------------|
| Node.js | 22 LTS | Runtime | Deno, Bun | Already deployed, Cloud Run config exists |
| Express | 5.x | HTTP framework | Fastify, Koa, Hono | Already in use, Express 5 has async error handling |
| TypeScript | 5.x | Type safety | Plain JS | Already configured, catches bugs at compile time |
| Prisma | 6.x | ORM | Drizzle, Kysely, raw SQL | Already in use, excellent TypeScript integration |
| Zod | 4.x | Validation | Joi, Yup, AJV | Already in frontend, schema-first, TypeScript inference |
| tldraw | latest | Canvas engine | Konva, Fabric.js, Excalidraw | Best-in-class infinite canvas, built-in Yjs support |
| Yjs | latest | CRDT | Automerge, OT (ShareDB) | Native tldraw integration, battle-tested |
| y-websocket | latest | WS server | Custom WS, Hocuspocus | Reference implementation for Yjs, simple to deploy |
| React | 19 | UI library | Vue, Svelte | tldraw requires React, already in use |
| Next.js | 16 | React framework | Remix, Vite + React Router | Already deployed on Vercel, SSR/SSG built-in |
| Zustand | 5.x | State management | Redux, Jotai, Valtio | Already in use, minimal boilerplate |
| TanStack Query | 5.x | Data fetching | SWR, RTK Query | Already in use, mutation + cache invalidation |
| PostgreSQL | 15+ | Database | MySQL, MongoDB | Supabase provides managed PG, JSONB is powerful |
| Redis | 7.x | Cache + pub/sub | Memcached, PG NOTIFY | Pub/sub + caching + rate limiting in one service |
| GCS | - | File storage | S3, Cloudflare R2 | Same cloud (GCP), signed URLs, lifecycle policies |
| Pino | latest | Logging | Winston, Bunyan | Structured JSON, fast, Cloud Logging compatible |
| BullMQ | latest | Job queue | Agenda, pg-boss | Redis-backed, retries, dead-letter, TypeScript |

---

## 5. Scalability Model

### API Service
- **Auto-scaling:** Cloud Run scales from 0 to 10 instances based on CPU and request concurrency
- **Concurrency:** 80 concurrent requests per instance
- **Cold start:** ~2-3s (Node.js + Prisma client initialization). Acceptable for AI agents (not interactive)
- **Throughput:** ~500 RPS sustained (10 instances × 50 effective concurrent)
- **Stateless:** No in-process state. All state in PostgreSQL + Redis

### WebSocket Service
- **Min instances:** 1 (WebSocket connections can't survive cold starts)
- **Max instances:** 5
- **Connections per instance:** ~1000 concurrent WebSocket connections
- **Room sharding:** Not needed for MVP (single instance handles all rooms). Post-MVP: Redis pub/sub enables multi-instance by replicating Yjs updates across all instances
- **Memory:** Each Y.Doc is ~10-100KB. 1000 boards = ~100MB RAM max

### Database
- **Connection pooling:** Supabase provides PgBouncer. API connects via pooled connection string
- **Read scaling:** Read replicas available via Supabase if needed (post-MVP)
- **Write bottleneck:** Single primary. For MVP traffic, single PG handles all writes easily
- **JSONB queries:** GIN indexes on `content` for filtered queries (e.g., search sticky notes by text)

### Frontend
- **Vercel Edge:** Globally distributed. No scaling concern for static assets
- **tldraw performance:** Tested to handle 5,000+ shapes. Board soft limit at 10,000 items
- **Bundle size:** tldraw adds ~500KB gzipped. Lazy-loaded on board pages only
