---
current_phase: v2-infinite-canvas
last_action: 2026-02-23 17:00 UTC
status: in-progress
---

## 🎯 DockerClaw v2 — Infinite Collaborative Canvas

**Visió:** "Miro from scratch — AI Native"

**Data:** 2026-02-23  
**Versió:** 2.0  
**Estimació:** 6-9 dies (6 fases)

---

## 📋 Descripció

DockerClaw és un **canvas infinit col·laboratiu** amb una REST API dissenyada per consumir per agents d'IA.

**El que tenim (base v1):**
- ✅ Backend Node.js/Express/Prisma desplegat a Cloud Run
- ✅ Frontend Next.js desplegat a Vercel
- ✅ Sistema multi-board amb documents
- ✅ Autenticació per API key (`dc_`)

**El que construïm (v2):**
- 🆕 Infinite canvas (tldraw SDK)
- 🆕 Canvas items: sticky notes, shapes, frames, connectors
- 🆕 Real-time collaboration (Yjs, WebSockets)
- 🆕 Cursors, presence
- 🆕 Image uploads
- 🆕 Webhooks
- 🆕 Python SDK

---

## 🏗️ Arquitectura

**Stack:**
- **Backend:** Node.js 22 / Express 5 / Prisma 6
- **Frontend:** Next.js 16 + tldraw SDK
- **Database:** Supabase PostgreSQL
- **Real-time:** Yjs CRDT + y-websocket
- **Cache/PubSub:** Redis
- **Storage:** Google Cloud Storage (GCS)
- **Deploy:** Cloud Run (backend) + Vercel (frontend)

---

## 📅 Fases d'Implementació

| Fase | Nom | Estimació | Status | Assignat |
|------|-----|-----------|--------|----------|
| 0 | Foundation & Infrastructure | 1-2 dies | ✅ **completed** | - |
| 1 | Core API (Canvas Items CRUD) | 2-3 dies | pending | - |
| 2 | Canvas UI (tldraw integration) | 2-3 dies | pending | - |
| 3 | Real-Time Collaboration | 2-3 dies | pending | - |
| 4 | Documents, Images & Connectors | 2 dies | pending | - |
| 5 | AI Integration (Webhooks, SDK) | 1-2 dies | pending | - |

**Total estimat: 10-15 dies**

---

## ✅ Phase 0: Foundation & Infrastructure — COMPLETED

### Tasks Completats:
- [x] docker-compose.yml per desenvolupament local (PostgreSQL 15 + Redis 7 + API)
- [x] Configurar logging estructurat (Pino + pino-http + pino-pretty)
- [x] Setup test framework (Jest + Supertest)
- [x] App factory pattern (src/app.ts) per testability
- [x] Express Error Handler (Zod, Prisma errors)
- [x] Enhanced /health endpoint (DB + Redis checks)
- [x] Migracions DB schema v2 (api_keys, canvas_items, connectors, events, snapshots, webhooks, media_attachments)
- [x] Redis client module (ioredis)
- [x] Security fixes (hashed API key lookup + CORS restriction)
- [x] Dockerfile.dev per hot-reload
- [x] .env.example actualitzat

### Acceptance Criteria:
- [x] `docker-compose up -d` funciona (validat amb `docker compose config`)
- [x] Tests passen amb `npm test` ✅ 5 tests passing
- [x] `/health` retorna status de DB i Redis
- [x] Taules v2 creades (8 migracions SQL)
- [x] No hi ha `console.log` (només Pino)
- [x] API key lookup usa hashed keys amb fallback
- [x] Build passa (`npm run build`)

### Fitxers Creats:
- `docker-compose.yml` - Stack local
- `docker-compose.simple.yml` - Stack simplificat
- `Dockerfile.dev` - Dev amb hot-reload
- `src/app.ts` - Express app factory
- `src/lib/logger.ts` - Pino logger
- `src/lib/redis.ts` - Redis client
- `src/middleware/errorHandler.ts` - Error handler
- `jest.config.ts` - Jest config
- `tests/setup.ts` - Test setup
- `tests/health.test.ts` - Health endpoint tests
- `supabase/migrations/20260224_001_create_api_keys.sql`
- `supabase/migrations/20260224_002_create_canvas_items.sql`
- `supabase/migrations/20260224_003_create_connectors.sql`
- `supabase/migrations/20260224_004_create_events.sql`
- `supabase/migrations/20260224_005_create_canvas_snapshots.sql`
- `supabase/migrations/20260224_006_create_webhooks.sql`
- `supabase/migrations/20260224_007_create_media_attachments.sql`
- `supabase/migrations/20260224_008_backfill_api_keys.sql`

### Fitxers Modificats:
- `src/index.ts` - Thin server starter
- `src/lib/auth.ts` - Hashed API key lookup
- `package.json` - Test scripts + noves dependencies
- `tsconfig.json` - Include tests
- `.env.example` - Totes les variables documentades
- `.gitignore` - Afegit coverage/

---

## 🚀 Next Step

**Començar Phase 1: Core API (Canvas Items CRUD)**

Veure: `phases/PHASE_1_CORE_API.md` per detalls.

---

## 📁 Documentació

- **[PRD.md](PRD.md)** — Product Requirements Document
- **[architecture/](architecture/)** — System design, API spec, data model
- **[phases/](phases/)** — Fases 0-5 detallades
- **[reference/](reference/)** — NFRs, security, SDK spec
