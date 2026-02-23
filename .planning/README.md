# DockerClaw — Planning Documentation

> **DockerClaw** is an infinite collaborative canvas with a REST API designed for AI agent consumption.
> "Miro from scratch — AI Native."

---

## How to Read This Folder

1. Start with **[PRD.md](PRD.md)** — product vision, personas, MVP definition, success metrics
2. Read **[architecture/](architecture/)** — system design, data model, API spec, real-time, deployment
3. Follow **[phases/](phases/)** in order (0→5) — each phase is a self-contained sprint with tasks, acceptance criteria, and Definition of Done
4. Consult **[reference/](reference/)** as needed — NFRs, security, SDK spec, migration strategy, glossary

---

## Current Baseline (as of 2026-02-23)

| Component | Status | Details |
|-----------|--------|---------|
| Backend | Deployed | Node.js 22 / Express 5 / Prisma 6 on Cloud Run (`europe-west1`) |
| Frontend | Deployed | Next.js 16 on Vercel |
| Database | Active | Supabase PostgreSQL (Prisma models: `Board` + `Document`) |
| API Endpoints | 7 | Boards CRUD + Documents CRUD |
| Frontend Components | 6 | `BoardCard`, `BoardList`, `CreateBoardModal`, `DocumentItem`, `DocumentList`, `DocumentViewer` |
| Frontend Pages | 4 | `/`, `/boards/[id]`, `/boards/[id]/documents/[docId]`, `/agents` |
| Auth | Per-board API key | `dc_` prefix, 256-bit entropy, `X-API-Key` header |
| CI/CD | Cloud Build | Docker build → GCR push → Cloud Run deploy |

---

## Phase Status

| Phase | Name | Status | Key Deliverable |
|-------|------|--------|-----------------|
| 0 | Foundation & Infrastructure | Not Started | docker-compose, logging, test framework, v2 DB schema |
| 1 | Core API | Not Started | Canvas Items CRUD, batch endpoints, rate limiting |
| 2 | Canvas UI | Not Started | tldraw integration, snapshot persistence |
| 3 | Real-Time Collaboration | Not Started | y-websocket, presence, cursor sync |
| 4 | Documents, Images & Connectors | Not Started | GCS uploads, rich text, connector rendering |
| 5 | AI Integration | Not Started | Webhooks, Python SDK, batch optimization |

---

## Architectural Decision Records (ADRs)

| ID | Date | Decision | Rationale | Alternatives Rejected |
|----|------|----------|-----------|----------------------|
| ADR-001 | 2026-02-23 | Keep Node.js/Express backend | Preserves existing Cloud Run Dockerfile, `cloudbuild.yaml`, Prisma setup, `dc_` API key system. Rewriting to FastAPI would discard working infrastructure. | FastAPI (Python) |
| ADR-002 | 2026-02-23 | Use tldraw SDK for canvas | Best-in-class open-source infinite canvas. Built-in collaboration support via Yjs. Active maintenance and growing ecosystem. | Konva, Fabric.js, custom SVG/Canvas |
| ADR-003 | 2026-02-23 | Use Supabase PostgreSQL | Existing Supabase project with migrations applied. Managed PostgreSQL with built-in auth, RLS, and real-time features. | Cloud SQL, self-hosted PG |
| ADR-004 | 2026-02-23 | Yjs CRDT + y-websocket for real-time | Conflict-free merging without server-side resolution. Native tldraw integration via `@tldraw/sync`. Industry standard for collaborative editors. | Socket.IO broadcast (last-write-wins), OT (operational transforms) |
| ADR-005 | 2026-02-23 | API-first design | Every canvas operation must be callable via REST before UI is built. Enables AI agents to be first-class consumers. | UI-first (API added later) |
| ADR-006 | 2026-02-23 | Separate WebSocket Cloud Run service | WS needs `min-instances: 1` (persistent connections can't cold-start), 3600s timeout, different concurrency. Separate scaling avoids contaminating REST API performance. | Single service (API + WS in same process) |
| ADR-007 | 2026-02-23 | Redis for pub/sub + caching | REST-to-WebSocket bridge requires cross-service messaging. API key caching reduces DB lookups. Rate limiting needs shared counters. | In-memory (single-instance only), PostgreSQL NOTIFY/LISTEN |

---

## File Index

### Root
- [PRD.md](PRD.md) — Master Product Requirements Document

### Architecture
- [SYSTEM_ARCHITECTURE.md](architecture/SYSTEM_ARCHITECTURE.md) — Component diagram, request lifecycle, tech choices
- [DATA_MODEL.md](architecture/DATA_MODEL.md) — Full DB schema, indexes, JSON column schemas, migration plan
- [API_SPECIFICATION.md](architecture/API_SPECIFICATION.md) — Every REST endpoint with request/response schemas
- [REALTIME_DESIGN.md](architecture/REALTIME_DESIGN.md) — Yjs/y-websocket architecture, REST-to-WS bridge
- [DEPLOYMENT_TOPOLOGY.md](architecture/DEPLOYMENT_TOPOLOGY.md) — Cloud Run, Vercel, Redis, GCS config + CI/CD

### Phases
- [PHASE_0_FOUNDATION.md](phases/PHASE_0_FOUNDATION.md) — Infrastructure, docker-compose, logging, tests, DB migrations
- [PHASE_1_CORE_API.md](phases/PHASE_1_CORE_API.md) — Canvas Items CRUD, batch, rate limiting, Zod validation
- [PHASE_2_CANVAS_UI.md](phases/PHASE_2_CANVAS_UI.md) — tldraw integration, snapshot load/save, custom shapes
- [PHASE_3_REALTIME.md](phases/PHASE_3_REALTIME.md) — y-websocket service, presence, cursors, Redis bridge
- [PHASE_4_MEDIA.md](phases/PHASE_4_MEDIA.md) — Documents, images (GCS upload), connectors
- [PHASE_5_AI.md](phases/PHASE_5_AI.md) — Webhooks (HMAC + retry), Python SDK, batch optimization

### Reference
- [NFR.md](reference/NFR.md) — Non-functional requirements with measurable thresholds
- [SECURITY_MODEL.md](reference/SECURITY_MODEL.md) — Auth, threat model, key rotation, CORS
- [SDK_SPECIFICATION.md](reference/SDK_SPECIFICATION.md) — Python SDK interface contract (sync + async)
- [MIGRATION_STRATEGY.md](reference/MIGRATION_STRATEGY.md) — v1→v2 transition, data backfill, backward compat
- [GLOSSARY.md](reference/GLOSSARY.md) — Domain vocabulary + naming conventions
