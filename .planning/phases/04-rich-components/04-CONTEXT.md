---
phase: 04-rich-components
discussed: 2026-02-20
questions: 5
auto_answered: true
---

# 04-Rich Components - Context

## Decisions Preses (El Vell - Automàtic)

### Pregunta 1: Stack
**Elecció:** Continuar amb Next.js 15 + shadcn/ui
**Raó:** Consistència amb Fases 02-03

### Pregunta 2: Scope
**Elecció:** Components visuals essencials
- Component `image` (upload + display)
- Component `code` amb syntax highlight (PrismJS o Shiki)
- Component `text` amb rich editor (TipTap)
- Component `data` (JSON viewer)

### Pregunta 3: UX
**Elecció:** Integració natural amb Canvas Figma-like existent
- Images: Preview + click per lightbox
- Code: Syntax highlight + copy button
- Rich text: Toolbar flotant (com Notion)
- JSON: Tree view col·lapsible

### Pregunta 4: Backend
**Elecció:** Next.js API Routes (existent)
- Upload images a Supabase Storage
- Endpoints ja creats, només afegir suport per noves dades

### Pregunta 5: Qualitat
**Elecció:** Equilibrat (1-2 dies)
- Tots 4 components funcionals
- UI polish moderat
- Testing bàsic

## Característiques

### Components a Implementar

1. **Image Component**
   - Upload drag-drop o click
   - Preview thumbnail
   - Lightbox click per veure gran
   - Suport: JPG, PNG, GIF, WebP

2. **Code Component (Enhanced)**
   - Syntax highlight (PrismJS)
   - Language detection o especificació
   - Copy to clipboard button
   - Line numbers (opcional)

3. **Rich Text Component**
   - TipTap editor (ProseMirror)
   - Toolbar: bold, italic, headings, lists, links
   - Markdown suport
   - Edició in-place (com Fase 03)

4. **Data/JSON Component**
   - Tree view col·lapsible
   - Syntax highlight
   - Copy JSON button
   - Search/filter (futur)

## Tech Stack
- TipTap (@tiptap/react, @tiptap/starter-kit)
- PrismJS o Shiki (syntax highlight)
- Supabase Storage (images)
- react-json-view o similar (JSON tree)

## Notes
- Backend Fase 03 ja suporta payload JSON flexible
- Frontend Fase 02 ja té canvas preparat per nous components
- Integració: Afegir renderers als Card components
