---
phase: 05-interactive
discussed: 2026-02-20
questions: 5
auto_answered: true
---

# 05-Interactive - Context

## Decisions Preses (El Vell - Automàtic)

### Pregunta 1: Features
**Elecció:** Comments + Reactions
- Comments a nivell de card
- Reactions emoji (👍 ❤️ 🎉 🚀 👀)

### Pregunta 2: UX
**Elecció:** 
- Comments: Secció a sota de la card o modal
- Reactions: Botons ràpids tipus GitHub/Slack

### Pregunta 3: Backend
**Elecció:** Next.js API Routes (existent)
- Nova taula `comments`
- Nova taula `reactions`

### Pregunta 4: Scope
**Elecció:** MVP (1 dia)
- Comments bàsics (text)
- 5 reactions emoji
- No threads (futur)

### Pregunta 5: Notificacions
**Elecció:** Per ara, només polling
- Agent rep comment/reaction via polling
- Notificacions temps real a Fase 06

## Features

1. **Comments**
   - Afegir comment a card
   - Llistar comments
   - Delete comment (autor)

2. **Reactions**
   - 5 emoji: 👍 ❤️ 🎉 🚀 👀
   - Toggle (add/remove)
   - Count per emoji

## Schema Supabase

```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id),
  author_type text check (author_type in ('human', 'agent')),
  author_id text,
  content text not null,
  created_at timestamp default now()
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id),
  author_type text check (author_type in ('human', 'agent')),
  author_id text,
  emoji text check (emoji in ('👍', '❤️', '🎉', '🚀', '👀')),
  unique(card_id, author_id, emoji)
);
```

## Notes
- Backend Fase 03-04 ja preparat per noves taules
- Frontend Card component pot ampliar-se
