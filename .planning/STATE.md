# STATE.md - DockerClaw Project State

**Project:** dockerclaw  
**Last Updated:** 2026-02-27 17:20 UTC  
**Current Phase:** v2.1 - Frontend-Backend Integration (Complete)

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Board Management | ✅ Complete | Create, list, select, delete, rename |
| Block System | ✅ Complete | 7 block types, drag & drop, z-index |
| Canvas | ✅ Complete | Infinite-ish canvas, pan/zoom ready |
| Data Storage | ✅ Complete | Backend API (PostgreSQL/SQLite) |
| Frontend-Backend | ✅ Complete | Full API integration, API Key UI |
| Export/Import | ✅ Complete | JSON export/import full board |
| Mobile UI | ✅ Complete | Responsive sidebar, touch-friendly |
| Agent System | ✅ Complete | Backend API + auth implementat |

---

## 🎯 Current Phase: v1 Multi-Board Canvas

**Goal:** Ultra-simple multi-board canvas for agents to push content

**What's Working:**
- Multiple boards with sidebar selector
- 7 block types: Text, Checklist, Kanban, Table, Doc, Folder, Inbox
- Drag & drop positioning
- Z-index layering
- Soft-delete blocks
- Duplicate blocks
- Board export/import (JSON)
- Mobile-responsive UI

**Known Limitations:**
- No real-time sync (requires page refresh to see new docs from agents)
- No user authentication (only API key auth for agents)
- No Python SDK for agents yet (must use curl/http client)
- Frontend only supports "doc" blocks from backend (other block types pending)

---

## 🐛 Active Bugs

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| BUG-001 | Medium | Prisma schema PostgreSQL/SQLite mismatch | ✅ Fixed |

*See `bugs/` directory for details*

---

## 📋 Ready for Next

### Option A: Python SDK for Agents ⭐ RECOMMENDED
- Create `dockerclaw-sdk` Python package
- Simple client: `dockerclaw.Client(api_key)`
- Methods: `create_document()`, `list_documents()`
- Publish to PyPI

### Option B: Deploy to Production
- Deploy backend a Railway/Render/VPS
- Deploy frontend a Vercel
- Configurar PostgreSQL de producció
- Documentar URLs i setup

### Option C: Real-time Sync (WebSockets)
- Afegir Socket.IO o SSE al backend
- Frontend escolta canvis en temps real
- Agents veuen documents nous sense refresh

---

## 🎨 Design Philosophy

- Keep it ultra-minimal (Notion/Linear style)
- Mobile-first responsive
- No bloat - every feature must earn its place
- Agents are first-class citizens

---

*"El codi no menteix. Els powerpoints sí."* — El Vell 🧠
