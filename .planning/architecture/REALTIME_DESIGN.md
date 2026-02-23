# Real-Time Collaboration Design

## 1. Collaboration Model

### Chosen Approach: Yjs CRDT + y-websocket

DockerClaw uses **Yjs** (a Conflict-free Replicated Data Type library) with **y-websocket** as the WebSocket transport layer. This integrates natively with tldraw's collaboration features via `@tldraw/sync`.

### Why Yjs Over Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Yjs CRDT** | Automatic conflict resolution, no server-side logic, works offline, native tldraw support | Larger state payloads, learning curve | **Chosen** |
| OT (Operational Transform) | Well-understood (Google Docs), simpler payloads | Requires centralized server, complex to implement correctly, no tldraw integration | Rejected |
| Socket.IO broadcast (LWW) | Simple to implement, familiar | Data loss on concurrent edits, no conflict resolution, manual tldraw binding | Rejected |
| Supabase Realtime | Built-in with Supabase, no extra service | Row-level only (not CRDT), insufficient for canvas state sync | Rejected |

### How Yjs Works (Simplified)

```
Client A makes a change → encoded as Yjs update (binary) → sent to server
Server stores update → broadcasts to all other clients
Client B receives update → applies to local Y.Doc → tldraw re-renders

If Client A and B edit simultaneously:
- Yjs merges both changes deterministically (same result on all clients)
- No conflicts, no data loss
- Order-independent convergence
```

---

## 2. tldraw + Yjs Integration

### How tldraw Exposes Its Store

tldraw uses a `TLStore` internally. For collaboration, tldraw provides the `@tldraw/sync` package that binds a `TLStore` to a Yjs `Y.Doc`:

```typescript
import { Tldraw } from '@tldraw/tldraw'
import { useSyncDemo } from '@tldraw/sync'

// Option A: tldraw's sync demo (quick prototype)
function CollaborativeCanvas({ boardId }: { boardId: string }) {
  const store = useSyncDemo({ roomId: boardId })
  return <Tldraw store={store} />
}

// Option B: Custom Yjs binding (production)
import { useYjsStore } from '../hooks/useYjsStore'

function CollaborativeCanvas({ boardId }: { boardId: string }) {
  const store = useYjsStore({
    roomId: boardId,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL!,
    apiKey: currentApiKey,
  })
  return <Tldraw store={store} />
}
```

### Custom `useYjsStore` Hook

```typescript
// frontend/src/hooks/useYjsStore.ts

import { useEffect, useMemo } from 'react'
import { createTLStore, TLRecord } from '@tldraw/tldraw'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface UseYjsStoreOptions {
  roomId: string
  wsUrl: string
  apiKey: string
}

export function useYjsStore({ roomId, wsUrl, apiKey }: UseYjsStoreOptions) {
  const { store, provider } = useMemo(() => {
    const yDoc = new Y.Doc()
    const yStore = yDoc.getMap<TLRecord>('tldraw')

    const provider = new WebsocketProvider(
      wsUrl,
      roomId,
      yDoc,
      { params: { apiKey } }
    )

    const store = createTLStore()

    // Yjs → TLStore: apply remote changes
    yStore.observe((event) => {
      // Apply Yjs changes to tldraw store
    })

    // TLStore → Yjs: push local changes
    store.listen((entry) => {
      // Push tldraw changes to Yjs doc
    })

    return { store, provider }
  }, [roomId, wsUrl, apiKey])

  useEffect(() => {
    return () => {
      provider.destroy()
    }
  }, [provider])

  return store
}
```

### Awareness Protocol

Yjs includes an **awareness** protocol for ephemeral state (not persisted):

```typescript
// Set local user awareness
provider.awareness.setLocalState({
  user: {
    id: userId,
    name: userName,
    color: userColor,   // Auto-assigned unique color
  },
  cursor: { x: 0, y: 0 },
  selection: [],        // Selected shape IDs
})

// Listen to remote awareness
provider.awareness.on('change', () => {
  const states = provider.awareness.getStates()
  // Render cursors and selection indicators for each remote user
})
```

---

## 3. WebSocket Server Architecture

### Service: `dockerclaw-ws`

A separate Cloud Run service running y-websocket with custom persistence and Redis bridge.

```
ws/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # WebSocket server entry point
│   ├── auth.ts             # Validate API key from connection params
│   ├── persistence.ts      # Load/save Y.Doc snapshots to Supabase PG
│   ├── redis-bridge.ts     # Subscribe to Redis pub/sub for REST API updates
│   └── config.ts           # Environment variables
```

### `ws/src/index.ts` — Server Entry

```typescript
import { WebSocketServer } from 'ws'
import { setupWSConnection, docs } from 'y-websocket/bin/utils'
import { createServer } from 'http'
import { authenticateConnection } from './auth'
import { setupPersistence } from './persistence'
import { setupRedisBridge } from './redis-bridge'

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', rooms: docs.size }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
  // Extract board ID from URL: /v1/boards/:id
  const boardId = extractBoardId(req.url)

  // Authenticate API key from query params
  const isValid = await authenticateConnection(req)
  if (!isValid) {
    ws.close(4001, 'Unauthorized')
    return
  }

  // Setup y-websocket connection for this room (board)
  setupWSConnection(ws, req, { docName: boardId })
})

// Setup persistence (Y.Doc ↔ PostgreSQL)
setupPersistence()

// Setup Redis bridge (REST API updates → Y.Doc)
setupRedisBridge()

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
```

### Connection URL Format

```
wss://ws.dockerclaw.com/v1/boards/{boardId}?apiKey=dc_abc123...
```

---

## 4. State Persistence Strategy

### Persistence Flow

```
1. First client connects to board room
   → y-websocket checks if Y.Doc exists in memory
   → No → Load from database:
     a. Query: SELECT snapshot FROM canvas_snapshots WHERE board_id = ?
     b. If exists: Y.applyUpdate(doc, snapshotBinary)
     c. If not: Create empty Y.Doc (new board)
   → Serve to client

2. While clients are connected
   → All changes are in-memory Y.Doc
   → Persistence timer: every 30 seconds if changes exist
     a. const update = Y.encodeStateAsUpdate(doc)
     b. UPSERT canvas_snapshots SET snapshot = $binary WHERE board_id = $id

3. Last client disconnects
   → Immediate snapshot save
   → Y.Doc remains in memory for 5 minutes (reconnection grace)
   → After 5 min: evict from memory
```

### `ws/src/persistence.ts`

```typescript
import * as Y from 'yjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// y-websocket persistence callback
export function setupPersistence() {
  return {
    // Called when a Y.Doc is loaded from persistence
    async bindState(docName: string, ydoc: Y.Doc) {
      const snapshot = await prisma.canvasSnapshot.findUnique({
        where: { board_id: docName },
      })
      if (snapshot?.snapshot) {
        const update = Buffer.from(snapshot.snapshot, 'base64')
        Y.applyUpdate(ydoc, update)
      }
    },

    // Called when a Y.Doc should be persisted
    async writeState(docName: string, ydoc: Y.Doc) {
      const update = Buffer.from(Y.encodeStateAsUpdate(ydoc))
      await prisma.canvasSnapshot.upsert({
        where: { board_id: docName },
        create: {
          board_id: docName,
          snapshot: update.toString('base64'),
        },
        update: {
          snapshot: update.toString('base64'),
          updated_at: new Date(),
        },
      })
    },
  }
}
```

---

## 5. REST-to-WebSocket Bridge

### Problem
When an AI agent POSTs a new item via REST API, humans viewing the canvas in their browser should see the item appear immediately — without polling or page refresh.

### Solution: Redis Pub/Sub

```
Agent → POST /v1/boards/:id/items → API writes to DB → API publishes to Redis
                                                              ↓
y-websocket server subscribes to Redis → receives update → applies to Y.Doc → broadcasts to all clients
```

### API Side (Publisher)

```typescript
// src/routes/items.ts (in the API service)

import { redis } from '../lib/redis'

router.post('/v1/boards/:id/items', async (req, res) => {
  // ... validate, create item in DB ...

  // Publish to Redis for WebSocket bridge
  await redis.publish(`board:${boardId}:updates`, JSON.stringify({
    action: 'create',
    item: {
      id: newItem.id,
      type: newItem.type,
      x: newItem.x,
      y: newItem.y,
      width: newItem.width,
      height: newItem.height,
      content: newItem.content,
      style: newItem.style,
      // ... all fields needed to render in tldraw
    },
  }))

  res.status(201).json({ data: newItem })
})
```

### WebSocket Side (Subscriber)

```typescript
// ws/src/redis-bridge.ts

import Redis from 'ioredis'
import * as Y from 'yjs'
import { docs } from 'y-websocket/bin/utils'

const subscriber = new Redis(process.env.REDIS_URL!)

export function setupRedisBridge() {
  // Subscribe to all board update channels
  subscriber.psubscribe('board:*:updates')

  subscriber.on('pmessage', (pattern, channel, message) => {
    const boardId = channel.split(':')[1]
    const doc = docs.get(boardId)

    if (!doc) return // No clients connected to this board

    const update = JSON.parse(message)

    // Convert REST item to tldraw record and apply to Y.Doc
    const yStore = doc.getMap('tldraw')
    const tldrawRecord = convertToTldrawRecord(update.item)

    doc.transact(() => {
      switch (update.action) {
        case 'create':
          yStore.set(tldrawRecord.id, tldrawRecord)
          break
        case 'update':
          yStore.set(tldrawRecord.id, tldrawRecord)
          break
        case 'delete':
          yStore.delete(`shape:${update.item.id}`)
          break
      }
    })

    // y-websocket automatically broadcasts to all connected clients
  })
}

function convertToTldrawRecord(item: any) {
  // Map DockerClaw item schema to tldraw shape record
  return {
    id: `shape:${item.id}`,
    typeName: 'shape',
    type: mapItemTypeToTldraw(item.type),
    x: item.x,
    y: item.y,
    props: {
      w: item.width || 200,
      h: item.height || 200,
      ...mapContentToProps(item),
    },
    meta: {
      dockerclaw_id: item.id,
      created_by: item.created_by,
    },
  }
}
```

---

## 6. Presence & Awareness UI

### Data Model

Each connected user broadcasts awareness state:

```typescript
interface AwarenessState {
  user: {
    id: string          // API key prefix or session ID
    name: string        // Display name
    color: string       // Unique cursor color (auto-assigned)
    type: 'human' | 'agent'
  }
  cursor: {
    x: number           // Canvas coordinates
    y: number
  } | null
  selection: string[]   // Selected shape IDs
  lastActivity: number  // Unix timestamp
}
```

### Heartbeat

- Awareness state is broadcast every 10 seconds automatically by y-websocket
- If no heartbeat received for 30 seconds, user is considered disconnected
- On disconnect: remove from awareness, notify remaining clients

### Frontend Presence UI

```typescript
// frontend/src/components/canvas/PresenceBar.tsx

function PresenceBar({ awareness }: { awareness: Map<number, AwarenessState> }) {
  const users = Array.from(awareness.values())
    .filter(state => state.user)
    .filter(state => Date.now() - state.lastActivity < 30000) // Active in last 30s

  return (
    <div className="absolute top-4 right-4 flex -space-x-2">
      {users.map(state => (
        <div
          key={state.user.id}
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: state.user.color, backgroundColor: state.user.color + '20' }}
          title={`${state.user.name} (${state.user.type})`}
        >
          {state.user.type === 'agent' ? '🤖' : state.user.name[0]}
        </div>
      ))}
    </div>
  )
}
```

### Cursor Rendering

tldraw handles cursor rendering natively through its collaboration mode. Remote cursors appear as colored arrows with the user's name label.

---

## 7. Conflict Resolution

### How Yjs Handles Conflicts

| Scenario | Yjs Behavior |
|----------|-------------|
| Two users move same item simultaneously | Last move wins (position is a simple value, not a sequence) |
| Two users edit same sticky text | Characters merge (Yjs text uses sequence CRDT for character-level merging) |
| One user deletes item while another edits it | Delete wins (tombstone). Edit is discarded. |
| User drags item while agent updates it via REST | Both changes merge. Position from drag, content from REST. |

### Edge Cases

**REST Write During Active Drag:**
1. User starts dragging item at t=0
2. Agent POSTs update to same item at t=1 (content change)
3. Redis bridge applies content change to Y.Doc at t=2
4. User drops item at t=3 (position change)
5. Result: Item has **agent's content** + **user's position** (both changes preserved)

**Offline Reconnection:**
1. User goes offline at t=0
2. Agent creates items via REST at t=1, t=2, t=3
3. User reconnects at t=4
4. y-websocket sends accumulated updates
5. User's canvas shows all new items immediately

---

## 8. Scalability

### Single Instance (MVP)

For MVP, a single y-websocket Cloud Run instance handles all boards:
- ~1000 concurrent WebSocket connections
- ~100 active boards
- Memory: ~100MB (100 boards × ~1MB average Y.Doc)

### Multi-Instance (Post-MVP)

When scaling beyond one instance:

```
                      ┌─────────────┐
                      │   Redis     │
                      │   Pub/Sub   │
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  WS #1   │   │  WS #2   │   │  WS #3   │
       │ rooms:   │   │ rooms:   │   │ rooms:   │
       │ A, B, C  │   │ D, E, F  │   │ G, H, I  │
       └──────────┘   └──────────┘   └──────────┘
```

- Each instance manages a subset of rooms
- When a REST update arrives for board D, Redis delivers it to WS #2
- All instances subscribe to all channels; only the one with the active room processes the update
- No sticky sessions needed (clients connect to any instance; if their board isn't on that instance, the y-websocket `setupWSConnection` creates a new room and loads from DB)

---

## 9. Message Types

### WebSocket Protocol Messages

| Type | Direction | Description |
|------|-----------|-------------|
| `sync-step-1` | Client → Server | Client sends its state vector |
| `sync-step-2` | Server → Client | Server sends missing updates |
| `update` | Bidirectional | Incremental Yjs update (binary) |
| `awareness` | Bidirectional | Cursor, presence, selection state |
| `auth` | Client → Server | API key authentication (on connect) |
| `error` | Server → Client | Auth failure, room not found |

All messages use the **Yjs binary protocol** — no custom message format needed. The y-websocket library handles encoding/decoding.

---

## 10. Network Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| WebSocket latency (same region) | < 50ms | Cursor tracking feels real-time |
| Update propagation (same region) | < 200ms | Human perceives < 200ms as instant |
| Reconnection time | < 5s | Transparent to user |
| Awareness heartbeat | Every 10s | Balance freshness vs bandwidth |
| Max message size | 1MB | Yjs updates are typically < 1KB |
| Connection timeout | 3600s (1 hour) | Long-lived editing sessions |
| Idle disconnect | 30 minutes | Clean up inactive connections |
