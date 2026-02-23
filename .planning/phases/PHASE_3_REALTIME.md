# Phase 3: Real-Time Collaboration

## Objectives

Add real-time collaboration so that multiple users viewing the same board see changes instantly. When an AI agent creates items via REST API, human viewers see them appear without refreshing. Users see each other's cursors and presence indicators.

## Prerequisites

- Phase 1 complete (API endpoints functional)
- Phase 2 complete (tldraw canvas rendering items from API)
- Redis provisioned and accessible from Cloud Run

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D3.1 | y-websocket server | Separate Cloud Run service for WebSocket connections |
| D3.2 | Y.Doc persistence | Save/load canvas state to PostgreSQL |
| D3.3 | REST-to-WebSocket bridge | Agent REST writes appear on open canvases via Redis pub/sub |
| D3.4 | Frontend WebSocket integration | Replace REST-based sync with Yjs WebSocket sync |
| D3.5 | Presence UI | Show connected users with colored cursors |
| D3.6 | Cloud Run deployment | WS service deployed with proper config (min-instances, timeout) |
| D3.7 | Health checks | `/health` endpoint on WS service |

---

## New Service: `ws/`

### Directory Structure

```
ws/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # WebSocket server entry point
│   ├── config.ts           # Environment variables
│   ├── auth.ts             # API key validation from connection params
│   ├── persistence.ts      # Y.Doc ↔ PostgreSQL snapshot persistence
│   ├── redis-bridge.ts     # Redis pub/sub subscriber for REST updates
│   ├── room-manager.ts     # Room lifecycle (create, evict, cleanup)
│   └── logger.ts           # Pino logger (shared config with API)
```

### Dependencies (`ws/package.json`)

| Package | Purpose |
|---------|---------|
| `yjs` | CRDT library |
| `y-websocket` | WebSocket provider for Yjs |
| `ws` | WebSocket server |
| `ioredis` | Redis client for pub/sub bridge |
| `@prisma/client` | DB access for snapshot persistence |
| `pino` | Structured logging |

---

## Task Breakdown

### T3.1: Provision Redis

**Description:** Set up Redis for pub/sub and caching.

**Options:**
- **Development:** Upstash Redis (free tier, serverless, no VPC)
- **Production:** Cloud Memorystore (same VPC as Cloud Run)

**Files:**
- Modify: `.env.example` (add `REDIS_URL`)
- Modify: `docker-compose.yml` (already has Redis)

**Acceptance Criteria:**
- `REDIS_URL` configured in both API and WS service
- API can publish to Redis channels
- WS can subscribe to Redis channels
- Local docker-compose Redis works for development

---

### T3.2: Create WebSocket Server

**Description:** Build the y-websocket server as a standalone Node.js service.

**Files:**
- Create: `ws/package.json`
- Create: `ws/tsconfig.json`
- Create: `ws/src/index.ts`
- Create: `ws/src/config.ts`
- Create: `ws/src/logger.ts`

**Implementation Notes:**

```typescript
// ws/src/index.ts
import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'
import { authenticateWs } from './auth'
import { initPersistence } from './persistence'
import { initRedisBridge } from './redis-bridge'
import { logger } from './logger'
import { config } from './config'

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      rooms: global.docs?.size || 0,
      connections: wss.clients.size,
    }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

// Initialize persistence and bridge
initPersistence()
initRedisBridge()

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const boardId = url.pathname.split('/').pop()

  // Authenticate
  const apiKey = url.searchParams.get('apiKey')
  const isValid = await authenticateWs(apiKey, boardId)
  if (!isValid) {
    logger.warn({ boardId }, 'WebSocket auth failed')
    ws.close(4001, 'Unauthorized')
    return
  }

  logger.info({ boardId, clients: wss.clients.size }, 'WebSocket connected')

  // Set up Yjs connection for this board room
  setupWSConnection(ws, req, {
    docName: boardId,
    gc: true, // Garbage collection for deleted items
  })

  ws.on('close', () => {
    logger.info({ boardId }, 'WebSocket disconnected')
  })
})

server.listen(config.port, () => {
  logger.info({ port: config.port }, 'WebSocket server started')
})
```

**Acceptance Criteria:**
- Server starts and listens on port 8080
- Health endpoint returns room count and connection count
- WebSocket connections accepted with proper auth
- y-websocket `setupWSConnection` creates rooms per board

---

### T3.3: Implement WebSocket Authentication

**Description:** Validate API key from WebSocket connection query params.

**Files:**
- Create: `ws/src/auth.ts`

**Implementation:**
```typescript
// ws/src/auth.ts
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { redis } from './redis'

const prisma = new PrismaClient()

export async function authenticateWs(
  apiKey: string | null,
  boardId: string | undefined
): Promise<boolean> {
  if (!apiKey || !boardId) return false

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  // Check Redis cache first
  const cached = await redis.get(`apikey:${keyHash}`)
  if (cached) {
    const key = JSON.parse(cached)
    return key.board_id === boardId && key.is_active
  }

  // Query DB
  const key = await prisma.apiKey.findUnique({
    where: { key_hash: keyHash },
  })

  if (!key || !key.is_active || key.board_id !== boardId) return false

  // Cache for 60s
  await redis.setex(`apikey:${keyHash}`, 60, JSON.stringify(key))

  return true
}
```

---

### T3.4: Implement Y.Doc Persistence

**Description:** Save and load Y.Doc state from PostgreSQL `canvas_snapshots` table.

**Files:**
- Create: `ws/src/persistence.ts`

**Implementation:**

```typescript
// ws/src/persistence.ts
import * as Y from 'yjs'
import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const prisma = new PrismaClient()

// Map of boardId → debounced save timer
const saveTimers = new Map<string, NodeJS.Timeout>()

export function initPersistence() {
  // y-websocket calls these callbacks for doc lifecycle
  return {
    /**
     * Called when a new Y.Doc is created (first client connects to room)
     * Load existing snapshot from DB
     */
    async bindState(docName: string, ydoc: Y.Doc): Promise<void> {
      try {
        const snapshot = await prisma.canvasSnapshot.findUnique({
          where: { board_id: docName },
        })

        if (snapshot?.snapshot) {
          const update = Buffer.from(snapshot.snapshot as string, 'base64')
          Y.applyUpdate(ydoc, new Uint8Array(update))
          logger.info({ boardId: docName }, 'Loaded snapshot from DB')
        } else {
          logger.info({ boardId: docName }, 'New board, empty Y.Doc')
        }
      } catch (err) {
        logger.error({ err, boardId: docName }, 'Failed to load snapshot')
      }

      // Listen for changes and auto-save
      ydoc.on('update', () => {
        scheduleSave(docName, ydoc)
      })
    },

    /**
     * Called when a Y.Doc is being destroyed (all clients disconnected)
     * Save final state
     */
    async writeState(docName: string, ydoc: Y.Doc): Promise<void> {
      // Clear any pending save timer
      const timer = saveTimers.get(docName)
      if (timer) clearTimeout(timer)
      saveTimers.delete(docName)

      // Save immediately
      await saveSnapshot(docName, ydoc)
    },
  }
}

function scheduleSave(docName: string, ydoc: Y.Doc) {
  const existing = saveTimers.get(docName)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    saveSnapshot(docName, ydoc)
    saveTimers.delete(docName)
  }, 30_000) // Save every 30 seconds if changes exist

  saveTimers.set(docName, timer)
}

async function saveSnapshot(docName: string, ydoc: Y.Doc) {
  try {
    const update = Y.encodeStateAsUpdate(ydoc)
    const base64 = Buffer.from(update).toString('base64')

    await prisma.canvasSnapshot.upsert({
      where: { board_id: docName },
      create: {
        board_id: docName,
        snapshot: base64,
      },
      update: {
        snapshot: base64,
        updated_at: new Date(),
      },
    })

    logger.info({ boardId: docName, sizeBytes: update.length }, 'Snapshot saved')
  } catch (err) {
    logger.error({ err, boardId: docName }, 'Failed to save snapshot')
  }
}
```

---

### T3.5: Implement Redis Bridge

**Description:** Subscribe to Redis pub/sub channels to receive REST API updates and apply them to active Y.Docs.

**Files:**
- Create: `ws/src/redis-bridge.ts`

**Implementation:**
```typescript
// ws/src/redis-bridge.ts
import Redis from 'ioredis'
import * as Y from 'yjs'
import { logger } from './logger'
import { config } from './config'

// Access y-websocket's in-memory docs
// @ts-ignore - y-websocket exports this globally
import { docs } from 'y-websocket/bin/utils'

const subscriber = new Redis(config.redisUrl)

interface BoardUpdate {
  action: 'create' | 'update' | 'delete'
  item: {
    id: string
    type: string
    x: number
    y: number
    width?: number
    height?: number
    content: Record<string, unknown>
    style?: Record<string, unknown>
    created_by?: string
  }
}

export function initRedisBridge() {
  subscriber.psubscribe('board:*:updates', (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to Redis')
      return
    }
    logger.info('Redis bridge: subscribed to board:*:updates')
  })

  subscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const boardId = channel.split(':')[1]
      const doc = docs.get(boardId) as Y.Doc | undefined

      if (!doc) {
        // No active connections for this board — skip
        return
      }

      const update: BoardUpdate = JSON.parse(message)
      applyUpdateToDoc(doc, update, boardId)
    } catch (err) {
      logger.error({ err, channel }, 'Redis bridge: failed to process message')
    }
  })
}

function applyUpdateToDoc(doc: Y.Doc, update: BoardUpdate, boardId: string) {
  const yStore = doc.getMap('tldraw')

  doc.transact(() => {
    switch (update.action) {
      case 'create': {
        const record = itemToTldrawRecord(update.item)
        yStore.set(record.id, record)
        logger.info({ boardId, itemId: update.item.id, action: 'create' }, 'Bridge: applied create')
        break
      }
      case 'update': {
        const record = itemToTldrawRecord(update.item)
        yStore.set(record.id, record)
        logger.info({ boardId, itemId: update.item.id, action: 'update' }, 'Bridge: applied update')
        break
      }
      case 'delete': {
        yStore.delete(`shape:${update.item.id}`)
        logger.info({ boardId, itemId: update.item.id, action: 'delete' }, 'Bridge: applied delete')
        break
      }
    }
  })
}

function itemToTldrawRecord(item: BoardUpdate['item']): any {
  // Convert DockerClaw item to tldraw shape record
  const typeMap: Record<string, string> = {
    sticky: 'note',
    text: 'text',
    shape: 'geo',
    frame: 'frame',
    image: 'image',
    document: 'note',
  }

  return {
    id: `shape:${item.id}`,
    typeName: 'shape',
    type: typeMap[item.type] || 'geo',
    x: item.x,
    y: item.y,
    rotation: 0,
    isLocked: false,
    props: {
      w: item.width || 200,
      h: item.height || 200,
      ...mapContentToTldrawProps(item),
    },
    meta: {
      dockerclaw_id: item.id,
      dockerclaw_type: item.type,
      created_by: item.created_by,
    },
  }
}
```

---

### T3.6: Add Redis Publishing to REST API

**Description:** When the API creates/updates/deletes items, publish the change to Redis for the WebSocket bridge.

**Files:**
- Modify: `src/routes/items.ts`
- Modify: `src/routes/batch.ts`

**Changes:**

After each successful item mutation, add:
```typescript
// After creating an item
await redis.publish(`board:${boardId}:updates`, JSON.stringify({
  action: 'create',
  item: createdItem,
}))

// After updating an item
await redis.publish(`board:${boardId}:updates`, JSON.stringify({
  action: 'update',
  item: updatedItem,
}))

// After deleting an item
await redis.publish(`board:${boardId}:updates`, JSON.stringify({
  action: 'delete',
  item: { id: itemId },
}))
```

**Acceptance Criteria:**
- Every item create/update/delete publishes to Redis
- Batch operations publish one message per item (or one bulk message)
- Publishing failure doesn't block the API response (fire-and-forget with error logging)

---

### T3.7: Update Frontend for WebSocket Sync

**Description:** Replace REST-based polling sync with Yjs WebSocket sync.

**Files:**
- Modify: `frontend/src/components/canvas/CanvasShell.tsx`
- Create: `frontend/src/hooks/useYjsSync.ts`

**Implementation:**
```typescript
// frontend/src/hooks/useYjsSync.ts
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createTLStore, TLStore } from '@tldraw/tldraw'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

interface UseYjsSyncOptions {
  boardId: string
  wsUrl: string
  apiKey: string
  userName: string
  userColor: string
}

interface YjsSyncState {
  store: TLStore
  provider: WebsocketProvider
  connected: boolean
  synced: boolean
}

export function useYjsSync({
  boardId, wsUrl, apiKey, userName, userColor
}: UseYjsSyncOptions): YjsSyncState | null {
  const [connected, setConnected] = useState(false)
  const [synced, setSynced] = useState(false)

  const { store, provider } = useMemo(() => {
    const yDoc = new Y.Doc()

    const provider = new WebsocketProvider(
      wsUrl,
      boardId,
      yDoc,
      {
        params: { apiKey },
        connect: true,
      }
    )

    // Set awareness (cursor, name, color)
    provider.awareness.setLocalState({
      user: {
        name: userName,
        color: userColor,
        type: 'human',
      },
      cursor: null,
      selection: [],
    })

    const store = createTLStore()

    // Wire up Y.Doc ↔ TLStore two-way binding
    // (implementation depends on tldraw version)

    return { store, provider }
  }, [boardId, wsUrl, apiKey, userName, userColor])

  useEffect(() => {
    provider.on('status', ({ status }: { status: string }) => {
      setConnected(status === 'connected')
    })

    provider.on('sync', (isSynced: boolean) => {
      setSynced(isSynced)
    })

    return () => {
      provider.destroy()
    }
  }, [provider])

  return { store, provider, connected, synced }
}
```

**Updated CanvasShell:**
```typescript
// CanvasShell.tsx (Phase 3 version)
export function CanvasShell({ boardId, apiKey }: CanvasShellProps) {
  const sync = useYjsSync({
    boardId,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL!,
    apiKey,
    userName: 'User', // From auth context (post-MVP)
    userColor: generateColor(boardId),
  })

  if (!sync || !sync.synced) {
    return <CanvasSkeleton message="Connecting..." />
  }

  return (
    <div className="w-full h-full relative">
      <Tldraw store={sync.store} />
      <PresenceBar provider={sync.provider} />
      <ConnectionIndicator connected={sync.connected} />
    </div>
  )
}
```

---

### T3.8: Implement Presence UI

**Description:** Show connected users and their cursors on the canvas.

**Files:**
- Create: `frontend/src/components/canvas/PresenceBar.tsx`
- Create: `frontend/src/components/canvas/ConnectionIndicator.tsx`

**PresenceBar:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { WebsocketProvider } from 'y-websocket'

interface PresenceBarProps {
  provider: WebsocketProvider
}

export function PresenceBar({ provider }: PresenceBarProps) {
  const [users, setUsers] = useState<Map<number, any>>(new Map())

  useEffect(() => {
    const handler = () => {
      setUsers(new Map(provider.awareness.getStates()))
    }
    provider.awareness.on('change', handler)
    return () => provider.awareness.off('change', handler)
  }, [provider])

  const otherUsers = Array.from(users.entries())
    .filter(([clientId]) => clientId !== provider.awareness.clientID)
    .map(([, state]) => state?.user)
    .filter(Boolean)

  if (otherUsers.length === 0) return null

  return (
    <div className="absolute top-4 right-4 flex -space-x-2 z-50">
      {otherUsers.map((user, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
      ))}
    </div>
  )
}
```

**ConnectionIndicator:**
```typescript
export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2 text-sm text-gray-500">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      {connected ? 'Connected' : 'Reconnecting...'}
    </div>
  )
}
```

---

### T3.9: Create WebSocket Dockerfile

**Description:** Dockerfile for the y-websocket service.

**Files:**
- Create: `ws/Dockerfile`

```dockerfile
FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build TypeScript
RUN npx tsc

# Cloud Run expects port 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
```

---

### T3.10: Create Cloud Build Config for WS

**Description:** Add WS service deployment to CI/CD pipeline.

**Files:**
- Modify: `cloudbuild.yaml` (add WS build + deploy steps)

**Acceptance Criteria:**
- WS Docker image built and pushed to GCR
- WS deployed to Cloud Run with:
  - `min-instances: 1`
  - `timeout: 3600`
  - `concurrency: 1000`
  - `session-affinity: true`
  - `cpu-allocation: always-on`

---

### T3.11: Two-Tab Collaboration Test

**Description:** End-to-end test verifying real-time sync between two browser tabs.

**Test Steps:**
1. Open board in Tab A
2. Open same board in Tab B
3. In Tab A: create a sticky note
4. Verify: sticky note appears in Tab B within 200ms
5. In Tab B: move the sticky note
6. Verify: position updates in Tab A within 200ms
7. In Tab A: delete the sticky note
8. Verify: item disappears from Tab B

**Acceptance Criteria:**
- All sync operations complete within 200ms (same region)
- Cursor positions visible across tabs
- Presence shows 2 users

---

### T3.12: Agent-to-Canvas Test

**Description:** Test that REST API writes appear on the canvas in real-time.

**Test Steps:**
1. Open board in browser
2. Run: `curl -X POST /v1/boards/:id/items -H "X-API-Key: dc_..." -d '{"type":"sticky","x":100,"y":200,"content":{"text":"From Agent"}}'`
3. Verify: sticky note appears on canvas within 200ms

**Acceptance Criteria:**
- REST-created item appears without page refresh
- Item renders with correct position, content, and style

---

## Definition of Done

- [ ] y-websocket service deployed to Cloud Run (`dockerclaw-ws`)
- [ ] Two browser tabs on same board sync in < 200ms
- [ ] Cursor presence visible for all connected users
- [ ] REST API writes appear on open canvases via Redis bridge
- [ ] Y.Doc persisted to DB on disconnect and every 30s
- [ ] Y.Doc loaded from DB on first client connect
- [ ] WebSocket auth validates API key
- [ ] `/health` returns room and connection counts
- [ ] Connection indicator shows online/offline status
- [ ] `min-instances: 1` on WS Cloud Run service
- [ ] Phase 2 REST-based sync removed (replaced by WebSocket)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cloud Run WebSocket timeout | High | Set `timeout: 3600`, enable `session-affinity`, `cpu-allocation: always-on` |
| Cloud Run idle disconnect (no traffic) | High | `min-instances: 1` keeps at least one instance warm |
| Redis pub/sub message loss | Medium | Redis pub/sub is fire-and-forget; if WS service restarts, it reloads from DB snapshot |
| Y.Doc memory growth for large boards | Medium | Enable Yjs garbage collection (`gc: true`); monitor memory via Cloud Monitoring |
| tldraw + Yjs binding version mismatch | Medium | Pin exact versions of both tldraw and yjs; test integration in CI |
| VPC connector needed for Cloud Memorystore | Medium | Alternative: use Upstash Redis (no VPC needed) for simpler setup |
