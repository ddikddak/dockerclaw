# Dockerclaw Memory

## Project
React/TypeScript collaborative canvas. Dexie (local IndexedDB), Supabase (cloud sync + realtime).
9 block types: doc, kanban, inbox, checklist, table, text, folder, image, heading.

## Key Architecture
- `src/components/Canvas.tsx` — main orchestrator (~1,530 lines)
- `src/components/BlockWrapper.tsx` — draggable/resizable wrapper (~775 lines)
- `src/services/db.ts` — Dexie ORM (BoardService, BlockService)
- `src/services/sync.ts` — offline-first sync engine
- `src/services/boardSharing.ts` — shared board collaboration
- `src/services/collaboration.ts` — presence/cursors
- `src/lib/logger.ts` — structured logger (use instead of console.log)
- `src/lib/utils.ts` — cn(), handleAsyncError()
- `src/lib/mappers.ts` — mapRemoteBoard(), mapRemoteBlock() (snake_case ↔ camelCase)

## Refactoring Done (Mar 3 2026, branch refactor/phase5-dx + staging/refactoring-complete)
All issues fixed in one session — build clean, lint clean (no-console 0 violations):

1. **handleAsyncError utility** added to `src/lib/utils.ts` — centralises error logging + toast
2. **Canvas.tsx async errors** — wrapped all SharedBlockService/BlockService async calls in try/catch using handleAsyncError (handleBlockUpdate, handleBlockDataUpdate, handleBlockDuplicate, handleBlockDelete, handleBringToFront, handleDropOnFolder, handleFolderItemDragOut)
3. **Drag hot-path O(n)→O(1)** — `handleBlockDragMove` now iterates `blocksById` Map instead of `blocks.find()`
4. **Memoization** — `wordCount` in DocBlock, `textStyle` in HeadingBlock, `sortedItems` in ChecklistBlock wrapped in useMemo
5. **Vite chunk splits** — added chunks: radix-ui (all 26), tiptap (all extensions), mermaid; lowered warning to 250KB; removed @tiptap/pm (no root export)
6. **Removed unused deps** — tw-animate-css, recharts from package.json; deleted src/components/ui/chart.tsx
7. **no-console ESLint rule** — added to eslint.config.js; logger.ts and test files exempted
8. **All console.log → logger** — sync.ts (19 calls), boardSharing.ts (5), collaboration.ts (2), usePerformanceMonitor.ts (2), App.tsx (1) all routed through logger
9. **boardSharing.ts typed** — getSharedBoards() now returns `{ board: Board; ownerId: string; collaborator: BoardCollaborator }[]` instead of `Record<string, unknown>`; App.tsx updated accordingly

## Patterns
- Use `handleAsyncError(label, err)` from `@/lib/utils` in every catch block
- Use `logger.info/debug/warn/error('component', message, data?)` instead of console.log
- `blocksById` (Map) is available in Canvas.tsx for O(1) block lookups
- `mapRemoteBoard()` / `mapRemoteBlock()` for all Supabase row → local object conversions
