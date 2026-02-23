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
| 0 | Foundation & Infrastructure | 1-2 dies | 🔄 **in-progress** | - |
| 1 | Core API (Canvas Items CRUD) | 2-3 dies | pending | - |
| 2 | Canvas UI (tldraw integration) | 2-3 dies | pending | - |
| 3 | Real-Time Collaboration | 2-3 dies | pending | - |
| 4 | Documents, Images & Connectors | 2 dies | pending | - |
| 5 | AI Integration (Webhooks, SDK) | 1-2 dies | pending | - |

**Total estimat: 10-15 dies**

---

## ✅ Phase 0: Foundation & Infrastructure — IN PROGRESS

### Tasks:
- [ ] docker-compose per desenvolupament local
- [ ] Configurar logging estructurat (Pino)
- [ ] Setup test framework (Vitest)
- [ ] Migrar DB schema v2 (CanvasItem, etc.)
- [ ] Configurar Redis per pub/sub
- [ ] Setup GCS per imatges

### Acceptance Criteria:
- [ ] `docker-compose up` funciona en local
- [ ] Tests passen amb `npm test`
- [ ] DB migrada a nova schema
- [ ] Redis connectat i funcional

---

## 📁 Documentació

- **[PRD.md](PRD.md)** — Product Requirements Document
- **[architecture/](architecture/)** — System design, API spec, data model
- **[phases/](phases/)** — Fases 0-5 detallades
- **[reference/](reference/)** — NFRs, security, SDK spec

---

## 🚀 Next Step

**Començar Phase 0: Foundation & Infrastructure**

Primera task: Setup docker-compose i migrar DB schema v2.

Veure: `phases/PHASE_0_FOUNDATION.md` per detalls.
