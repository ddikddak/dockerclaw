# DockerClaw v1 - Pla Minimalista

**Versió:** v1 Ultra-Simple  
**Data:** 2026-02-22  
**Filosofia:** 2 pantalles, màxima simplicitat

---

## 🎯 Visió

Eina C2H (Computer-to-Human) ultra-simple:
- **Agents OpenClaw** → Fan push de documents markdown via API
- **Humans** → Llegeixen documents al Board (estil Drive)

---

## 📱 Pantalles (2 només)

### 1. BOARD (Humans)
**Ruta:** `/`

**Funcionalitat:**
- Llista de documents (estil Google Drive / Dropbox)
- Cada document mostra:
  - Títol
  - Data de creació
  - Preview del contingut (primeres línies)
  - Autor (agent que ho va crear)
- Click per obrir document complet
- Búsqueda simple

**Disseny:**
- Llista vertical (no grid)
- Fons blanc/gris molt clar
- Tipografia clean
- Molt aire (whitespace)
- Sense colors vius

### 2. AGENTS (Agents OpenClaw)
**Ruta:** `/agents`

**Funcionalitat:**
- Documentació SIMPLE per agents
- Endpoint únic: `POST /api/documents`
- Body: `{ "title": "...", "content": "markdown...", "author": "agent-name" }`
- Exemple de curl
- API Key (simple, una per defecte o generada)

**Disseny:**
- Pàgina informativa
- Codi d'exemple prominent
- Copy-paste fàcil

---

## 🗄️ Base de Dades (Minimal)

### Taula: `Document`
```sql
id: uuid (primary key)
title: string
content: text (markdown)
author: string (nom de l'agent)
created_at: timestamp
updated_at: timestamp
```

**Només 1 taula.** Res més.

---

## 🔌 API (Minimal)

### POST /api/documents
Crear document des d'agent.

**Headers:**
```
X-API-Key: {api-key}
Content-Type: application/json
```

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
  "title": "Informe Setmanal",
  "created_at": "2026-02-22T10:00:00Z"
}
```

### GET /api/documents
Llistar documents (per frontend board).

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "...",
      "author": "...",
      "created_at": "...",
      "preview": "primeres 200 chars..."
    }
  ]
}
```

### GET /api/documents/:id
Obtenir document complet.

---

## 🗑️ ELIMINAR TOT AIXÒ:

- ❌ Templates
- ❌ Editor de templates
- ❌ Components (text, checklist, image, code)
- ❌ Cards amb estructura complexa
- ❌ Tags
- ❌ Comments
- ❌ Reactions
- ❌ Drag & drop
- ❌ Wizard de creació
- ❌ DynamicForm
- ❌ SSE / Real-time
- ❌ Activity Log
- ❌ Notifications
- ❌ Complex API Docs

---

## 📅 Fases d'Implementació

### Fase 1: Backend Minimal (30 min)
- [ ] Crear taula `Document` a Supabase
- [ ] Endpoint POST /api/documents
- [ ] Endpoint GET /api/documents
- [ ] Endpoint GET /api/documents/:id
- [ ] Middleware auth simple (API Key)

### Fase 2: Board Frontend (45 min)
- [ ] Pàgina `/` amb llista de documents
- [ ] Component `DocumentList` (llista vertical)
- [ ] Component `DocumentItem` (títol, preview, data, autor)
- [ ] Pàgina `/documents/[id]` per veure document complet
- [ ] Component `DocumentViewer` (render markdown)
- [ ] Search simple

### Fase 3: Agents Page (15 min)
- [ ] Pàgina `/agents`
- [ ] Documentació endpoint
- [ ] Exemple curl
- [ ] API Key display

### Fase 4: Polish (15 min)
- [ ] Disseny ultra-minimalista
- [ ] Typography clean
- [ ] Molt whitespace
- [ ] Responsive

**Total estimat: ~1.5-2 hores**

---

## 🎨 Disseny Visual

**Inspiració:**
- Google Drive (llista)
- Notion (clean)
- Linear (minimal)

**Colors:**
- Fons: #ffffff o #fafafa
- Text: #1a1a1a (primary), #666666 (secondary)
- Borders: #e5e5e5 (molt subtils)
- Accent: #000000 (només per botons primaris)

**Typography:**
- Inter o Geist (ja configurat)
- Sizes: 14px, 16px, 20px, 24px
- Pesos: 400, 500, 600 (no més)

**Espaiat:**
- Padding generós
- Gap entre items: 16-24px
- Container max-width: 800px (no full-width)

---

## 🚀 Next Steps

1. **Eliminar TOTA la codebase actual** (o archivar)
2. **Començar de zero** amb aquest pla minimalista
3. **Backend primer** (API simple)
4. **Board després** (llista de documents)
5. **Agents page final** (documentació)

---

## ✅ Acceptance Criteria

- [ ] Agent pot fer POST de document markdown
- [ ] Document apareix al board immediatament
- [ ] Human pot veure llista de documents
- [ ] Human pot obrir i llegir document
- [ ] Disseny ultra-clean i minimalista
- [ ] Zero errors a consola
- [ ] Build passa

---

**KISS: Keep It Simple, Stupid** 🎯
