# Fase 05: Interactive - Planificació Preliminar

**Goal:** Afegir interactivitat amb comments i reactions
**REQ-ID:** REQ-013
**Status:** 📝 Planificació en curs

---

## 📋 Requeriments

### 1. Comments (add_comment)
- [ ] UI per mostrar comentaris en una card
- [ ] Formulari per afegir nou comentari
- [ ] Endpoint API: `POST /api/cards/:id/comments`
- [ ] Acció de component: `add_comment`
- [ ] Webhook per notificar agent de nou comentari

### 2. Reactions (Emoji)
- [ ] Selector d'emoji (reactions popup)
- [ ] Mostrar reactions existents (count per emoji)
- [ ] Endpoint API: `POST /api/cards/:id/reactions`
- [ ] Acció de component: `add_reaction`
- [ ] Webhook per notificar agent

---

## 🗄️ Database Schema (Supabase)

### Taula: `comments`
```sql
id: uuid
card_id: uuid (foreign key)
author_type: 'human' | 'agent'
author_id: string
author_name: string
content: text
created_at: timestamp
updated_at: timestamp
```

### Taula: `reactions`
```sql
id: uuid
card_id: uuid (foreign key)
author_type: 'human' | 'agent'
author_id: string
emoji: string (ex: "👍", "❤️", "🎉")
created_at: timestamp
```

---

## 🔌 API Endpoints

### Comments
- `GET /api/cards/:id/comments` - Llistar comentaris
- `POST /api/cards/:id/comments` - Crear comentari

### Reactions
- `GET /api/cards/:id/reactions` - Llistar reactions
- `POST /api/cards/:id/reactions` - Afegir reaction
- `DELETE /api/cards/:id/reactions/:id` - Eliminar reaction

---

## 🎨 UI Components

### Nous Components:
1. **CommentThread** - Llista de comentaris amb scroll
2. **CommentInput** - Input per nou comentari
3. **ReactionBar** - Mostrar reactions amb count
4. **ReactionPicker** - Selector d'emoji (Popup)

### Modificacions:
- **Card.tsx** - Afegir secció de comments/reactions
- **CardDetail** (nou) - Vista detallada amb comments

---

## 📝 Webhook Payloads

### Nou Comentari:
```json
{
  "event": "component_action",
  "action": "add_comment",
  "card_id": "...",
  "component_id": "comments",
  "data": {
    "content": "...",
    "author_type": "human",
    "author_id": "..."
  }
}
```

### Nova Reaction:
```json
{
  "event": "component_action", 
  "action": "add_reaction",
  "card_id": "...",
  "data": {
    "emoji": "👍",
    "author_type": "human"
  }
}
```

---

## ⏱️ Estimació

| Task | Hores Estimades |
|------|-----------------|
| Database schema + migrations | 1h |
| API endpoints (backend) | 2h |
| UI Components (frontend) | 3h |
| Webhook integration | 1h |
| Testing | 1h |
| **Total** | **~8h** |

---

## 🎯 Acceptance Criteria

- [ ] Usuari pot afegir comentari a una card
- [ ] Usuari pot veure tots els comentaris
- [ ] Usuari pot afegir reaction (emoji) a una card
- [ ] Usuari pot veure count de reactions
- [ ] Agent rep webhook quan hi ha nou comentari
- [ ] Agent rep webhook quan hi ha nova reaction

---

*Document creat automàticament per El Vell - Heartbeat 08:20 UTC* 🧠
