# ROADMAP.md - DockerClaw Roadmap

**Version:** v1 → v2 → v3  
**Philosophy:** Ship fast, iterate, keep it simple

---

## 🎯 v1.0 - Core Canvas ✅ (Current)

**Status:** Complete  
**Goal:** Working canvas with blocks

**Features:**
- [x] Multiple boards
- [x] 7 block types (Text, Checklist, Kanban, Table, Doc, Folder, Inbox)
- [x] Drag & drop positioning
- [x] Export/Import JSON
- [x] Mobile responsive

**Exit Criteria:**
- [x] Can create boards
- [x] Can add/move blocks
- [x] Works on mobile
- [x] Export/import works

---

## 🚀 v2.0 - Agent Integration (Next)

**Status:** Ready to start  
**Goal:** Agents can push content via API

**Features:**
- [ ] Backend API (Node.js/Express)
- [ ] Database (PostgreSQL + Prisma)
- [ ] API Key auth per board
- [ ] Agent SDK (Python package)
- [ ] Webhook support
- [ ] Document blocks from agent pushes

**Tasks:**
1. Set up backend project structure
2. Database schema (Board, Document, Agent)
3. REST API endpoints
4. API Key middleware
5. Python SDK
6. Integration tests

**Exit Criteria:**
- Agent can authenticate with API key
- Agent can POST document to board
- Document appears in real-time (or on refresh)

---

## 🔮 v3.0 - Collaboration & Scale (Future)

**Status:** Not started  
**Goal:** Multi-user, real-time, production-ready

**Features:**
- [ ] User accounts & auth
- [ ] Real-time sync (WebSockets/SSE)
- [ ] Permissions & sharing
- [ ] File uploads
- [ ] Search (Elasticsearch/Meilisearch)
- [ ] Notifications
- [ ] Activity log

---

## 🐛 Bug Backlog

| ID | Priority | Description | Status |
|----|----------|-------------|--------|
| - | - | *No bugs currently tracked* | - |

---

## 📅 Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| v1.0 Core | 2026-02-26 | ✅ Shipped |
| v2.0 API | TBD | 🟡 Ready to start |
| v3.0 Scale | TBD | ⚪ Not planned |

---

*"Un projecte aturat és un projecte mort."* — El Vell 🧠
