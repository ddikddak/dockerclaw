# Product Requirements Document (PRD)

## Infinite Collaborative Canvas + AI-Consumable REST API

*DockerClaw — "Miro from scratch, AI Native"*

**Version:** 2.0
**Date:** 2026-02-23
**Status:** Draft

---

## 1. Executive Summary

**The Problem:** AI agents have no visual, persistent, shared workspace to communicate with humans and each other. Current tools (Slack, email, dashboards) are text-only, ephemeral, or read-only. Collaborative canvases like Miro exist but lack programmable APIs for AI consumption.

**The Solution:** DockerClaw is an infinite collaborative canvas where AI agents and humans share a visual workspace in real time. Every action a human can perform on the canvas — creating sticky notes, drawing connections, uploading images, writing documents — can also be performed by an AI agent through a REST API. The platform is API-first, event-driven, and built for batch operations.

**Market Position:** "Miro for AI-human collaboration" — not a Miro competitor, but a programmable visual substrate for AI workflows.

**Current State:** DockerClaw v1 is a simple board + document management system with 7 REST endpoints and a Next.js frontend. This PRD defines the transformation to v2: a full collaborative canvas platform.

---

## 2. Product Vision

### North Star Metric
**Canvas items created via API per month** — measures agent-driven activity, the core value proposition.

### Vision Statement
> Any AI agent should be able to draw, annotate, connect, and collaborate on a shared infinite canvas using a 10-line Python script.

### Design Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **API-First** | Every action a human can do in the UI, an AI can do via REST. The API is designed before the UI. |
| 2 | **Event-Driven** | Every state change generates a structured event. Webhooks deliver events to external consumers. |
| 3 | **Extensible Data Model** | New item types can be added without schema changes (JSONB `content` column). |
| 4 | **Optimistic Real-Time UX** | Perceived latency < 150ms. UI updates immediately; server confirms asynchronously. |
| 5 | **AI Batch-Friendly** | Create 100 objects in a single API call. Idempotency keys prevent duplicates on retry. |

---

## 3. Current State Analysis

### What Exists (v1)

**Backend** (`src/index.ts` — single-file Express app):
- 7 REST endpoints: Boards CRUD + Documents CRUD
- Prisma ORM with 2 models: `Board` (id, name, description, api_key, created_at) + `Document` (id, board_id, title, content, author, timestamps)
- Per-board API keys (`dc_` prefix, 256-bit, `X-API-Key` header)
- Deployed on Cloud Run (`europe-west1`) via Cloud Build

**Frontend** (Next.js 16, 6 components, 4 pages):
- Board list (`/`), board detail (`/boards/[id]`), document viewer (`/boards/[id]/documents/[docId]`), API docs (`/agents`)
- Components: `BoardCard`, `BoardList`, `CreateBoardModal`, `DocumentItem`, `DocumentList`, `DocumentViewer`
- Deployed on Vercel

**Database** (Supabase PostgreSQL):
- Active Prisma models: `Board`, `Document`
- Legacy Supabase migrations (not wired to current backend): `Agent`, `Template`, `Card` (with x,y), `Event`, `Comment`, `Reaction`, `ApiKey`, `actions`

**Infrastructure:**
- `cloudbuild.yaml`: Docker build → GCR push → Cloud Run deploy
- `Dockerfile`: Node 22-slim, Prisma generate + build, port 8080
- Backend URL: `https://dockerclaw-backend-141346793650.europe-west1.run.app`
- Frontend URL: `https://dockerclaw.vercel.app`

### What Does NOT Exist Yet
- Infinite canvas (tldraw)
- Canvas items (sticky notes, shapes, frames, connectors)
- Real-time collaboration (WebSockets, cursors, presence)
- Image uploads
- Webhooks
- Batch API endpoints
- Python SDK
- Rate limiting
- Structured logging
- Test suite

### Known Issues
- **API keys stored in plaintext** in `Board.api_key` Prisma column (security risk)
- **CORS is wildcard** (`app.use(cors())`) — should be restricted to known origins
- **No rate limiting** — API is unprotected against abuse
- **No test suite** — zero automated tests

---

## 4. User Personas

### Primary: AI Developer
- **Profile:** Python/TypeScript developer building LLM-powered agents
- **Goal:** Push analysis results, task boards, diagrams to a shared visual canvas
- **Needs:** Simple REST API, batch operations, webhooks for reactivity, Python SDK
- **Pain Points:** Current tools require UI interaction; no programmatic canvas access
- **Success Metric:** Can create a functional agent integration in < 30 minutes

### Primary: Human Collaborator
- **Profile:** Product manager, designer, or team lead reviewing agent output
- **Goal:** See agent-created content on an intuitive canvas, annotate, approve/reject
- **Needs:** Drag-and-drop canvas, real-time updates, visual organization tools
- **Pain Points:** Agent output is scattered across Slack, email, dashboards — no unified visual workspace
- **Success Metric:** Can understand agent output within 10 seconds of opening a board

### Secondary: Team Lead
- **Profile:** Technical lead managing a team of agents and humans
- **Goal:** Create boards, distribute API keys, monitor agent activity
- **Needs:** Board management, API key lifecycle, event history
- **Success Metric:** Can onboard a new agent in < 5 minutes

### Secondary: API Explorer
- **Profile:** Developer testing the API via curl/Postman before building an agent
- **Goal:** Quickly understand and test all API capabilities
- **Needs:** OpenAPI/Swagger docs, clear error messages, example requests
- **Success Metric:** Can execute every API endpoint successfully from Swagger UI

---

## 5. Feature Scope

### 5.1 Boards

| Feature | Description | MVP | AC |
|---------|-------------|-----|-----|
| Create Board | POST creates board with auto-generated API key | Yes | Returns board ID + API key. Key shown once. < 200ms response. |
| List Boards | GET returns all boards with item count | Yes | Paginated (cursor-based, default 50). |
| Get Board | GET returns board details + settings | Yes | Includes item count, last activity timestamp. |
| Update Board | PATCH updates name, description, settings | Yes | Only owner (API key holder) can update. |
| Delete Board | DELETE soft-deletes board | Yes | Only owner can delete. Items become inaccessible. Reversible for 30 days. |
| Export Snapshot | GET returns full tldraw store as JSON | Yes | Consistent snapshot (no partial state). |
| Snapshot History | Manual snapshot creation + list | Post-MVP | Store up to 50 snapshots per board. |

### 5.2 Canvas Items (Unified Model)

All visual objects on the canvas are `canvas_items` with a polymorphic `type` field and a JSONB `content` column for type-specific data.

| Type | Description | Content Schema | MVP |
|------|-------------|---------------|-----|
| `sticky` | Short text note (like a Post-it) | `{ text: string, color?: string }` | Yes |
| `text` | Free-form text block | `{ text: string, fontSize?: number }` | Yes |
| `shape` | Rectangle, circle, diamond | `{ shapeType: "rect"\|"circle"\|"diamond" }` | Yes |
| `frame` | Grouping container | `{ title?: string, children?: string[] }` | Yes |
| `image` | Uploaded or URL-referenced image | `{ storage_url: string, alt_text?: string }` | Phase 4 |
| `document` | Rich text (Markdown) | `{ title: string, body: string, format: "markdown" }` | Phase 4 |
| `connector` | Arrow/line between two items | See Connectors section | Phase 4 |

### 5.3 Canvas Item Operations

| Operation | Method | Endpoint | MVP |
|-----------|--------|----------|-----|
| Create | POST | `/v1/boards/:id/items` | Yes |
| Get | GET | `/v1/boards/:id/items/:itemId` | Yes |
| List | GET | `/v1/boards/:id/items?type=sticky&limit=50` | Yes |
| Update (partial) | PATCH | `/v1/boards/:id/items/:itemId` | Yes |
| Update position | PATCH | `/v1/boards/:id/items/:itemId/position` | Yes |
| Update content | PATCH | `/v1/boards/:id/items/:itemId/content` | Yes |
| Update style | PATCH | `/v1/boards/:id/items/:itemId/style` | Yes |
| Delete | DELETE | `/v1/boards/:id/items/:itemId` | Yes |
| Lock | POST | `/v1/boards/:id/items/:itemId/lock` | Yes |
| Unlock | DELETE | `/v1/boards/:id/items/:itemId/lock` | Yes |
| Batch Create | POST | `/v1/boards/:id/items/batch` | Yes |
| Batch Update | PATCH | `/v1/boards/:id/items/batch` | Phase 5 |
| Batch Delete | DELETE | `/v1/boards/:id/items/batch` | Phase 5 |

### 5.4 Connectors

| Feature | Description | MVP |
|---------|-------------|-----|
| Create | Link two canvas items with a directed/undirected line | Phase 4 |
| Label | Optional text label on connector | Phase 4 |
| Style | Arrow type, color, stroke width | Phase 4 |
| Validation | Both items must belong to same board | Phase 4 |

### 5.5 Real-Time Collaboration

| Feature | Description | MVP |
|---------|-------------|-----|
| Canvas Sync | Yjs CRDT sync via y-websocket | Phase 3 |
| Presence | List of online users per board | Phase 3 |
| Cursors | Real-time cursor positions | Phase 3 |
| REST-to-WS Bridge | Agent REST writes appear on open canvases instantly | Phase 3 |

### 5.6 Webhooks

| Feature | Description | MVP |
|---------|-------------|-----|
| Registration | Create webhook with URL, secret, event types | Phase 5 |
| Delivery | HTTP POST with HMAC-SHA256 signature | Phase 5 |
| Retry | Exponential backoff (5 attempts) | Phase 5 |
| Event Types | `item.created`, `item.updated`, `item.deleted`, `board.updated` | Phase 5 |
| Ping | Test webhook delivery | Phase 5 |

### 5.7 Python SDK

| Feature | Description | MVP |
|---------|-------------|-----|
| Client | `DockerClaw(api_key, base_url)` | Phase 5 |
| CRUD | `board.create_item()`, `board.list_items()`, etc. | Phase 5 |
| Batch | `board.batch_create([...])` | Phase 5 |
| Webhook | `verify_signature(payload, signature, secret)` | Phase 5 |
| Types | Pydantic v2 models for all resources | Phase 5 |
| Async | `AsyncDockerClaw` with `httpx` | Phase 5 |

---

## 6. MVP Definition

### MVP = Phase 0 + Phase 1 + Phase 2

**MVP is complete when:**
A Python script can create a board, receive an API key, POST a sticky note via REST, and a human can open a URL and see that sticky note rendered on a tldraw infinite canvas.

### MVP Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Board creation returns API key | `curl POST /v1/boards` returns `{ data: { id, api_key } }` |
| 2 | Sticky note created via API appears on canvas | POST item → open board URL → see sticky on tldraw |
| 3 | Canvas items persist across page reloads | Create items → refresh → items still visible |
| 4 | Human can drag items on canvas | Drag sticky note → position saved via API |
| 5 | Canvas supports pan and zoom | Mouse wheel zoom, click-drag pan |
| 6 | Board list shows all boards | Home page (`/`) lists boards with item counts |
| 7 | API validates inputs | Invalid requests return 400 with field-level errors |
| 8 | API is rate-limited | Exceeding limit returns 429 with `Retry-After` header |
| 9 | Tests pass | `npm test` passes with > 80% coverage |
| 10 | CI/CD deploys automatically | Push to `main` → Cloud Build → Cloud Run (API) + Vercel (frontend) |

### Explicitly Out of Scope for MVP
- Real-time collaboration (no WebSockets, no cursors, no presence)
- Image uploads
- Document items (rich text)
- Connectors
- Webhooks
- Python SDK
- User authentication / accounts (API-key-per-board only)
- Comments, mentions, reactions
- Templates
- Mobile native app
- Offline mode
- Video/audio
- Billing / metering
- Multi-tenant workspaces

---

## 7. Success Metrics

| Phase | KPI | Target | Measurement |
|-------|-----|--------|-------------|
| 0 | CI/CD pipeline green | < 3 min deploy | Cloud Build logs |
| 0 | Local dev starts | < 30s `docker-compose up` | Manual verification |
| 1 | API p95 latency | < 100ms | Cloud Monitoring |
| 1 | Test coverage | > 80% | Jest coverage report |
| 1 | Endpoint count | 25+ endpoints operational | API spec vs implementation audit |
| 2 | Canvas cold load | < 3s | Lighthouse CI |
| 2 | Canvas 500 items | No frame drops | Manual test with batch-created items |
| 3 | Real-time propagation | < 200ms same region | E2E test with timestamps |
| 3 | Concurrent users | 20 per board without degradation | Load test |
| 4 | Image upload 5MB | < 5s | Integration test |
| 4 | Document render | Markdown renders correctly | Visual regression test |
| 5 | Batch 100 items | < 10s | Integration test |
| 5 | Webhook delivery | First attempt < 5s | Integration test |
| 5 | SDK quickstart | Functional in < 10 lines | Documentation review |

---

## 8. Tech Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Runtime | Node.js | 22 LTS | Current stack, Cloud Run deployed |
| Framework | Express | 5.x | Current stack, mature ecosystem |
| Language | TypeScript | 5.x | Type safety, IDE support |
| ORM | Prisma | 6.x | Current stack, type-safe queries |
| Validation | Zod | 4.x | Already in frontend, schema-first |
| Canvas | tldraw SDK | latest | Best open-source infinite canvas |
| Real-Time | Yjs + y-websocket | latest | CRDT conflict resolution, tldraw native |
| Frontend | Next.js | 16.x | Current stack, Vercel optimized |
| React | React | 19.x | Current stack |
| UI Library | shadcn/ui + Tailwind 4 | latest | Current stack |
| State | Zustand | 5.x | Current stack, lightweight |
| Data Fetching | TanStack Query | 5.x | Current stack, cache + mutations |
| Database | PostgreSQL | 15+ | Supabase managed |
| Cache | Redis | 7.x | Pub/sub, rate limiting, caching |
| Storage | Google Cloud Storage | - | Same cloud, signed URLs |
| Auth | API Keys (JWT post-MVP) | - | Simple, agent-friendly |
| API Hosting | Google Cloud Run | - | Current deployment target |
| Frontend Hosting | Vercel | - | Current deployment target |
| CI/CD | Google Cloud Build | - | Current pipeline |
| SDK | Python (httpx + pydantic) | 3.10+ | AI/ML ecosystem dominant language |

---

## 9. Roadmap Timeline

| Phase | Name | Key Deliverable | Dependencies |
|-------|------|-----------------|-------------|
| 0 | Foundation | docker-compose, logging, tests, v2 DB schema | None |
| 1 | Core API | 25+ REST endpoints, batch, rate limiting | Phase 0 |
| 2 | Canvas UI | tldraw renders items from API | Phase 1 |
| 3 | Real-Time | y-websocket, presence, cursors, REST-to-WS bridge | Phase 2 |
| 4 | Media | Images (GCS), documents (Markdown), connectors | Phase 1 (API), Phase 2 (UI) |
| 5 | AI Integration | Webhooks, Python SDK, batch optimization | Phase 1 (API) |

> Phases 4 and 5 can run in parallel after Phase 2 is complete.

---

## 10. Open Questions & Risks

| # | Question/Risk | Impact | Status |
|---|---------------|--------|--------|
| 1 | tldraw store persistence: full TLStoreSnapshot JSON in PG vs separate per-item mapping? | Architecture | **Decision needed** — Phase 2 will determine approach |
| 2 | Plaintext API keys in current DB — security vulnerability | Security | **Must fix in Phase 0** |
| 3 | CORS wildcard (`cors()`) in production | Security | **Must fix in Phase 0** |
| 4 | Two Supabase migration directories (root + frontend) — which is canonical? | Migration | Use root `/supabase/migrations/` — clean up in Phase 0 |
| 5 | Legacy Supabase tables (Agent, Card, Template, Event) — keep, migrate, or drop? | Data | Keep but don't wire — v2 uses new `canvas_items` table |
| 6 | WebSocket Cold Start on Cloud Run — min-instances cost | Cost | Set `min-instances: 1` for WS service (~$30/mo) |
| 7 | Rate limiting shared state — Redis required even for Phase 1 | Infrastructure | Provision Redis (Upstash for dev, Cloud Memorystore for prod) |
| 8 | Python SDK distribution — PyPI vs GitHub package | Distribution | PyPI for public access |

---

## 11. Future Extensions (Post-v2)

- CRDT offline editing with Yjs persistence
- AI auto-layout engine (auto-arrange canvas items)
- Auto-clustering of related notes
- Graph/mindmap view mode
- Board analytics dashboard
- Role-based workspace system (teams, members, roles)
- Multi-tenant SaaS with billing
- Public board embeds (iframe)
- Template marketplace
- LLM-powered canvas assistant (auto-summarize, suggest connections)
- Mobile app (React Native with tldraw)

---

## References

- [System Architecture](architecture/SYSTEM_ARCHITECTURE.md)
- [Data Model](architecture/DATA_MODEL.md)
- [API Specification](architecture/API_SPECIFICATION.md)
- [Real-Time Design](architecture/REALTIME_DESIGN.md)
- [Deployment Topology](architecture/DEPLOYMENT_TOPOLOGY.md)
- [Phase 0: Foundation](phases/PHASE_0_FOUNDATION.md)
- [Phase 1: Core API](phases/PHASE_1_CORE_API.md)
- [Phase 2: Canvas UI](phases/PHASE_2_CANVAS_UI.md)
- [Phase 3: Real-Time](phases/PHASE_3_REALTIME.md)
- [Phase 4: Media](phases/PHASE_4_MEDIA.md)
- [Phase 5: AI Integration](phases/PHASE_5_AI.md)
- [Non-Functional Requirements](reference/NFR.md)
- [Security Model](reference/SECURITY_MODEL.md)
- [SDK Specification](reference/SDK_SPECIFICATION.md)
- [Migration Strategy](reference/MIGRATION_STRATEGY.md)
- [Glossary](reference/GLOSSARY.md)
