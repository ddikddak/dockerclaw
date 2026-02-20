# Nestor Memory - DockerClaw Frontend

## Última Actualització
2026-02-20

## Històric de Canvis Recents

### Bug Fix Session (2026-02-20)
**Bugs arreglats:**

1. **BUG-005** (HIGH) - Image Upload Action Type
   - Fitxer: `src/lib/api.ts`
   - Canvi: `action: 'edit_text'` → `action: 'upload_image'`

2. **BUG-003** (HIGH) - Checklist Data Field
   - Fitxer: `src/components/card/ChecklistComponent.tsx`
   - Canvi: Estandarditzat a camp `items` únicament

3. **BUG-004** (MEDIUM) - New Card Button
   - Fitxer: `src/app/page.tsx`
   - Canvi: Implementat Dialog amb formulari per crear cards
   - Nous components: `Input.tsx`, `Label.tsx`

4. **INCONSISTENCY-002** - Console.logs
   - Fitxer: `src/hooks/useSSE.ts`
   - Canvi: Eliminats tots els logs de debugging

## Estructura del Codi

### Components UI (`src/components/ui/`)
- `button.tsx` - Botons
- `dialog.tsx` - Modals
- `input.tsx` - Inputs de formulari (NOU)
- `label.tsx` - Labels de formulari (NOU)
- `textarea.tsx` - Textareas
- `checkbox.tsx` - Checkboxes
- `badge.tsx` - Badges
- `tooltip.tsx` - Tooltips
- `dropdown-menu.tsx` - Menús
- `scroll-area.tsx` - Scroll
- `separator.tsx` - Separadors
- `sonner.tsx` - Toast notifications
- `card.tsx` - Card containers

### Components de Card (`src/components/card/`)
- `ChecklistComponent.tsx` - Checklist (items[])
- `ImageComponent.tsx` - Images
- Altres components de tipus de card...

### API (`src/lib/`)
- `api.ts` - Client API amb mètodes CRUD
- `store.ts` - Zustand store (Canvas + Board)
- `validation.ts` - Zod schemas

### Hooks (`src/hooks/`)
- `useSSE.ts` - Server-Sent Events (netejat de logs)

## Patterns i Conventions

### Creació de Cards
- Requereix `template_id` existent
- La API de POST /api/cards valida API key
- El frontend mostra error si no hi ha templates

### Component Actions
Tipus disponibles:
- `'edit_text'` - Editar text
- `'edit_code'` - Editar codi
- `'toggle_check'` - Toggle checklist item
- `'add_comment'` - Afegir comentari
- `'upload_image'` - Pujar imatge

### Estructura de Checklist
```typescript
{
  items: [{ text: string; checked: boolean }]
}
```

## Àrees de Risc / Gotchas

1. **API Key requerida** - Totes les operacions de creació/modificació requereixen API key
2. **Templates necessaris** - No es poden crear cards sense templates predefinits
3. **Type safety** - Fer servir els tipus de `api.ts` per evitar errors com BUG-005

## Comandes Útils

```bash
# Build
npm run build

# Dev server
npm run dev
```
