# Glossary

## Domain Terms

| Term | Definition | Notes |
|------|-----------|-------|
| **Board** | Top-level workspace. Has a unique URL and API key(s). One canvas per board. | Maps to `boards` table. |
| **Canvas** | The infinite 2D surface where items are placed. Rendered by tldraw. | No dedicated table — state lives in items + snapshots. |
| **Canvas Item** | Any visual element on a board: sticky note, text, shape, image, document, or frame. | Maps to `canvas_items` table. Polymorphic via `type` column. |
| **Sticky Note** | A canvas item with `type="sticky"`. Short text on a colored background. Primary unit for agent communication. | Content: `{ text, color }` |
| **Text Block** | A canvas item with `type="text"`. Free-form text without background. | Content: `{ text, fontSize, textAlign }` |
| **Shape** | A canvas item with `type="shape"`. Geometric shape (rect, circle, diamond, triangle). | Content: `{ shapeType, label }` |
| **Frame** | A canvas item with `type="frame"`. Rectangular container that groups other items visually. | Content: `{ title }`. Children linked via `frame_id` FK. |
| **Image** | A canvas item with `type="image"`. Uploaded file (JPEG, PNG, etc.) displayed on canvas. | Content: `{ storage_url, alt_text }` |
| **Document** | A canvas item with `type="document"`. Rich text content in Markdown format. | Content: `{ title, body, format }`. Replaces legacy `Document` model. |
| **Connector** | A directed or undirected line linking two canvas items. Renders as an arrow. | Maps to `connectors` table. Separate from `canvas_items`. |
| **Snapshot** | The full serialized tldraw store state for a board at a point in time. Used for persistence and initial load. | Maps to `canvas_snapshots` table. One per board. |
| **Agent** | An AI program consuming the REST API. Creates items, reads state, receives webhooks. | Not a DB entity in v2 — identified by API key. |
| **Human** | A person interacting via the web UI (tldraw canvas). | Identified by session/awareness, not authenticated in MVP. |
| **API Key** | A `dc_`-prefixed secret token granting access to one board. Has scopes (read/write/admin). | Maps to `api_keys` table. Hashed at rest. |
| **Webhook** | An HTTP callback registered by an agent to receive real-time event notifications from a board. | Maps to `webhooks` table. |
| **Event** | A record of something that happened on a board (item created, updated, deleted, etc.). | Maps to `events` table. |
| **Batch Operation** | A single API call creating, updating, or deleting up to 100 canvas items atomically. | Endpoints: `POST/PATCH/DELETE /v1/boards/:id/items/batch` |
| **Presence** | The set of users currently viewing a board. Includes cursor position and name. | Transient (Yjs awareness). Not persisted. |
| **Awareness** | Yjs concept for ephemeral state shared between connected clients (cursor position, user identity, selection). | Protocol built into y-websocket. |
| **Y.Doc** | A Yjs document representing the collaborative canvas state. One per active board room. | In-memory on WS server. Persisted as snapshot. |
| **Room** | A y-websocket concept: one room per board. All clients in a room share a Y.Doc. | Room name = board ID. |
| **Idempotency Key** | A client-generated UUID ensuring retried requests don't create duplicates. | `Idempotency-Key` header. Cached in Redis for 24h. |
| **Webhook Secret** | A `whsec_`-prefixed secret used to sign webhook payloads with HMAC-SHA256. | Stored encrypted. Shown once on webhook creation. |
| **Bridge** | The REST-to-WebSocket bridge. When an agent POSTs via REST, the change propagates to WebSocket clients via Redis pub/sub. | Redis channels: `board:{id}:updates` |

---

## Technical Abbreviations

| Abbreviation | Full Form |
|-------------|-----------|
| CRDT | Conflict-free Replicated Data Type |
| GCS | Google Cloud Storage |
| GCR | Google Container Registry |
| WS | WebSocket |
| WSS | WebSocket Secure (over TLS) |
| HMAC | Hash-based Message Authentication Code |
| SSRF | Server-Side Request Forgery |
| CORS | Cross-Origin Resource Sharing |
| HSTS | HTTP Strict Transport Security |
| CSP | Content Security Policy |
| RLS | Row-Level Security (PostgreSQL/Supabase) |
| FK | Foreign Key |
| PK | Primary Key |
| PgBouncer | PostgreSQL connection pooler |
| ORM | Object-Relational Mapping |
| SDK | Software Development Kit |
| PyPI | Python Package Index |
| CI/CD | Continuous Integration / Continuous Deployment |
| LWW | Last-Write-Wins (conflict resolution strategy) |
| OT | Operational Transform |
| SSR | Server-Side Rendering |

---

## Naming Conventions

### API Routes
- URL segments: `snake_case` (e.g., `/v1/boards/:id/items/:itemId/lock`)
- JSON response keys: `snake_case` (e.g., `board_id`, `created_at`, `item_count`)

### Database
- Table names: `snake_case`, plural (e.g., `boards`, `canvas_items`, `api_keys`)
- Column names: `snake_case` (e.g., `board_id`, `created_at`, `key_hash`)
- Index names: `idx_{table}_{columns}` (e.g., `idx_items_board_created`)
- FK names: auto-generated by Prisma

### TypeScript (Backend)
- Files: `camelCase.ts` (e.g., `errorHandler.ts`, `rateLimit.ts`)
- Classes/Interfaces: `PascalCase` (e.g., `CanvasItem`, `BoardResponse`)
- Functions/Variables: `camelCase` (e.g., `createItem`, `boardId`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_BATCH_SIZE`)
- Zod schemas: `PascalCase` + `Schema` suffix (e.g., `CreateItemSchema`)

### TypeScript (Frontend)
- Components: `PascalCase.tsx` (e.g., `CanvasShell.tsx`, `BoardCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useCanvasItems.ts`)
- Types: `PascalCase` in `types/` directory (e.g., `CanvasItem`, `ItemType`)
- Utilities: `camelCase.ts` (e.g., `api.ts`, `store.ts`)

### Python (SDK)
- Package: `snake_case` (e.g., `dockerclaw`)
- Modules: `snake_case.py` (e.g., `client.py`, `models.py`)
- Classes: `PascalCase` (e.g., `DockerClaw`, `Board`, `Item`)
- Functions/Variables: `snake_case` (e.g., `create_item`, `board_id`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)

### Environment Variables
- Format: `SCREAMING_SNAKE_CASE` (e.g., `DATABASE_URL`, `REDIS_URL`)
- Frontend public: `NEXT_PUBLIC_` prefix (e.g., `NEXT_PUBLIC_API_URL`)

### Docker
- Images: `dockerclaw-{service}:{tag}` (e.g., `dockerclaw-api:abc123f`, `dockerclaw-ws:latest`)
- Cloud Run services: `dockerclaw-api`, `dockerclaw-ws`
- Compose services: `api`, `ws`, `db`, `redis`

### Git
- Branch names: `feature/{description}`, `fix/{description}`, `phase/{number}-{name}`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Tags: `v{major}.{minor}.{patch}` (e.g., `v2.0.0`)

---

## Event Types

| Event | Description | Triggered By |
|-------|-------------|-------------|
| `item.created` | New canvas item added | POST item, batch create |
| `item.updated` | Canvas item modified | PATCH item (any sub-endpoint) |
| `item.deleted` | Canvas item removed | DELETE item, batch delete |
| `board.updated` | Board settings changed | PATCH board |
| `connector.created` | Connector added between items | POST connector |
| `connector.deleted` | Connector removed | DELETE connector |

---

## API Key Scopes

| Scope | Permissions |
|-------|-------------|
| `read` | GET all resources |
| `write` | POST, PATCH, PUT, DELETE on items and connectors |
| `admin` | DELETE boards, manage API keys, manage webhooks |

---

## HTTP Status Codes Used

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PATCH, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 308 | Permanent Redirect | `/api/` → `/v1/` |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing/invalid API key |
| 403 | Forbidden | Key lacks required scope |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Version mismatch, idempotency conflict |
| 413 | Payload Too Large | Body > limit |
| 415 | Unsupported Media Type | Invalid file type |
| 422 | Unprocessable Entity | Valid JSON but semantic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected bug |
| 503 | Service Unavailable | Overloaded / starting up |
