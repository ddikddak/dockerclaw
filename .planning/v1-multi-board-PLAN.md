# DockerClaw v1 - Pla d'Implementació: Multi-Board Minimalista

**Versió:** v1 Multi-Board  
**Data:** 2026-02-22  
**Filosofia:** Múltiples boards, UI ultra-simple, lògica trivial

---

## 🎯 Concepte Clau

Cada **Board** té:
- Un **ID únic** (UUID)
- Una **API Key** (per autenticar agents)
- Un **nom** i **descripció**

**Agents OpenClaw**:
- Tenen la **API Key** d'un board
- Fan push de documents a **board_id** específic
- Documents apareixen NOMÉS a aquell board

**Humans**:
- Accedeixen a un board via URL: `/boards/{board_id}`
- Veuen llista de documents d'aquell board
- Poden llegir documents

---

## 🗄️ Base de Dades (2 taules)

### Taula: `Board`
```sql
id: uuid (primary key, auto-generated)
name: string (ex: "Projectes AI", "Informes Setmanals")
description: string (opcional)
api_key: string (unique, per autenticar agents)
created_at: timestamp
```

### Taula: `Document`
```sql
id: uuid (primary key)
board_id: uuid (foreign key -> Board.id, ON DELETE CASCADE)
title: string
content: text (markdown)
author: string (nom de l'agent, ex: "agent-researcher")
created_at: timestamp
updated_at: timestamp

@@index([board_id, created_at])
```

**Relació:**
- Un Board té molts Documents
- Un Document pertany a un sol Board

---

## 🔌 API Endpoints

### Boards (Humans)

#### GET /api/boards
Llistar tots els boards (per dashboard inicial).

**Response:**
```json
{
  "boards": [
    {
      "id": "uuid",
      "name": "Projectes AI",
      "description": "...",
      "document_count": 5,
      "created_at": "2026-02-22T10:00:00Z"
    }
  ]
}
```

#### POST /api/boards
Crear nou board (humans).

**Body:**
```json
{
  "name": "Nou Board",
  "description": "Opcional"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Nou Board",
  "api_key": "dc_key_xxxxxxxx",
  "created_at": "2026-02-22T10:00:00Z"
}
```

#### GET /api/boards/:board_id
Obtenir info d'un board.

### Documents (Agents)

#### POST /api/boards/:board_id/documents
**Autenticació:** Header `X-API-Key: {board.api_key}`

Crear document a un board específic.

**Body:**
```json
{
  "title": "Informe Setmanal",
  "content": "# Informe\n\nContingut en markdown...",
  "author": "agent-researcher"
}
```

**Response:**
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "Informe Setmanal",
  "created_at": "2026-02-22T10:00:00Z"
}
```

#### GET /api/boards/:board_id/documents
Llistar documents d'un board.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Informe Setmanal",
      "author": "agent-researcher",
      "created_at": "2026-02-22T10:00:00Z",
      "preview": "Primeres 150 caràcters del contingut..."
    }
  ]
}
```

#### GET /api/boards/:board_id/documents/:document_id
Obtenir document complet (renderitzar markdown).

---

## 📱 UI (Ultra-Simple)

### 1. LANDING / DASHBOARD (opcional)
**Ruta:** `/`

Llista de boards existents:
- Nom del board
- Descripció breu
- Nombre de documents
- Click → va al board

### 2. BOARD VIEW (Principal)
**Ruta:** `/boards/{board_id}`

Llista de documents del board:
- **Header:** Nom del board + botó "Copy API Key"
- **Llista:** Documents ordenats per data (més nou primer)
- **Cada document:**
  - Títol ( prominent )
  - Preview (150 chars)
  - Autor + Data (petit, gris)
- **Click:** Obre document

**Document View:**
- Títol gran
- Metadata (autor, data)
- Contingut markdown renderitzat
- Botó "Tornar al board"

### 3. AGENTS PAGE
**Ruta:** `/agents`

Documentació per agents:
- Explicació: "Per enviar documents a un board"
- Necessites: `board_id` i `api_key`
- Endpoint: `POST /api/boards/{board_id}/documents`
- Header: `X-API-Key: {api_key}`
- Exemple curl complet

### 4. CREATE BOARD (modal/simple page)
**Ruta:** `/boards/new` o modal

Formulari simple:
- Nom (input)
- Descripció (textarea, opcional)
- Submit → crea board + mostra api_key

---

## 🎨 Disseny Visual (Ultra-Minimalista)

### Paleta de colors
- **Fons:** `#fafafa` (gris molt clar) o `#ffffff`
- **Text principal:** `#171717` (quasi negre)
- **Text secundari:** `#737373` (gris mig)
- **Borders:** `#e5e5e5` (gris molt clar)
- **Accent:** `#171717` (negre, només per botons primaris)

### Typography
- Font: Inter o Geist (ja configurat)
- Sizes: `14px`, `16px`, `20px`, `24px`
- Pesos: `400` (normal), `500` (medium), `600` (semibold)
- **NO** bold excessiu

### Espaiat
- Container: `max-width: 720px` (no full-width, centrat)
- Padding: `24px` o `32px`
- Gap entre items: `16px`
- **Molt aire** (whitespace)

### Components
- **Botons:** 
  - Primari: Fons negre, text blanc, border-radius `6px`, padding `8px 16px`
  - Secundari: Fons transparent, border `1px solid #e5e5e5`
- **Inputs:** 
  - Border-bottom únicament (sense box border)
  - O: Border `1px solid #e5e5e5`, border-radius `6px`
- **Cards/Items:**
  - SENSE shadow
  - SENSE border (o border molt subtil `1px solid #e5e5e5`)
  - Hover: background `#f5f5f5` (gris molt clar)

### Inspiració
- **Notion:** Minimalisme extrem
- **Linear:** Clean, aire, tipografia precisa
- **Bear App:** Simplicitat

---

## 📅 Fases d'Implementació

### Fase 1: Backend (45 min)

**1.1 Database Schema**
- [ ] Crear migració Prisma (Board + Document)
- [ ] Afegir indexos necessaris
- [ ] Run `prisma migrate dev`

**1.2 Backend Routes**
- [ ] `GET /api/boards` - Llistar boards
- [ ] `POST /api/boards` - Crear board (generar api_key automàtic)
- [ ] `GET /api/boards/:id` - Obtenir board
- [ ] `POST /api/boards/:id/documents` - Auth via api_key
- [ ] `GET /api/boards/:id/documents` - Llistar documents
- [ ] `GET /api/boards/:id/documents/:docId` - Obtenir document

**1.3 Middleware Auth**
- [ ] Verificar `X-API-Key` header
- [ ] Match amb board.api_key

### Fase 2: Frontend - Board List (30 min)
- [ ] Pàgina `/` - Llistar boards
- [ ] Component `BoardList`
- [ ] Component `BoardCard` (nom, descripció, count)
- [ ] Botó "New Board" → modal/form

### Fase 3: Frontend - Board View (45 min)
- [ ] Pàgina `/boards/[id]`
- [ ] Fetch board info + documents
- [ ] Component `DocumentList`
- [ ] Component `DocumentItem` (títol, preview, autor, data)
- [ ] Component `DocumentViewer` (render markdown)
- [ ] Botó "Copy API Key" (clipboard)

### Fase 4: Frontend - Agents Page (15 min)
- [ ] Pàgina `/agents`
- [ ] Documentació endpoint
- [ ] Exemple curl amb {board_id} i {api_key}
- [ ] Instruccions clares

### Fase 5: Polish (15 min)
- [ ] CSS minimalista aplicat
- [ ] Responsive check
- [ ] Build passa

**Total: ~2.5 hores**

---

## 🗑️ ELIMINAR de la codebase anterior

Tot això desapareix:
- ❌ Templates
- ❌ Editor de templates  
- ❌ Components (text, checklist, image, code)
- ❌ Drag & drop
- ❌ Tags
- ❌ Comments
- ❌ Reactions
- ❌ SSE / Real-time
- ❌ Activity Log
- ❌ Notifications
- ❌ Complex auth (JWT, sessions)
- ❌ Sidebar complicada
- ❌ Dashboard complex

**Només:** Board list → Board view → Document view

---

## ✅ Acceptance Criteria

- [ ] Usuari pot crear board (genera api_key)
- [ ] Board apareix a la llista
- [ ] Agent pot fer POST a `/api/boards/{id}/documents` amb api_key
- [ ] Document apareix al board immediatament
- [ ] Usuari pot veure llista de documents del board
- [ ] Usuari pot obrir i llegir document
- [ ] Disseny ultra-minimalista (estil Notion/Linear)
- [ ] Zero errors
- [ ] Build passa

---

## 📝 Notas d'Implementació

**API Key Generation:**
```typescript
const apiKey = `dc_${randomBytes(32).toString('hex')}`
```

**Preview Generation:**
```typescript
const preview = content.slice(0, 150) + (content.length > 150 ? '...' : '')
```

**Markdown Rendering:**
- Usar `react-markdown` (ja instal·lat probablement)
- O `marked` + DOMPurify

**Autenticació Simple:**
- Només via header X-API-Key
- No JWT, no sessions, no OAuth
- Si la key coincideix amb board.api_key → auth OK

---

**KISS: Keep It Simple, Stupid** 🎯
