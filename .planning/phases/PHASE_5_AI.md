# Phase 5: AI Integration

## Objectives

Complete the AI-native capabilities: webhook delivery system, Python SDK, batch API optimization, and idempotency. After Phase 5, an AI agent can subscribe to board events via webhooks, create hundreds of items via batch API, and interact with the canvas using a simple Python SDK.

## Prerequisites

- Phase 1 complete (API endpoints)
- Phase 3 recommended (real-time for webhook triggers on live changes)

## Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D5.1 | Webhook delivery system | Event-driven webhook dispatch with HMAC signatures and retry |
| D5.2 | Webhook management API | CRUD endpoints for webhook registration |
| D5.3 | Batch API optimization | Transactional batch with partial failure support |
| D5.4 | Idempotency middleware | Request deduplication via `Idempotency-Key` header |
| D5.5 | Python SDK | `dockerclaw` PyPI package with sync + async clients |
| D5.6 | SDK examples | Quickstart, batch, webhook handler examples |
| D5.7 | Agent docs page update | Updated `/agents` page with SDK install + examples |

---

## Task Breakdown

### T5.1: Implement Webhook Management API

**Description:** CRUD endpoints for webhook registration per board.

**Files:**
- Create: `src/routes/webhooks.ts`
- Modify: `src/app.ts` (register route)

**Endpoints:**

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| POST | `/v1/boards/:id/webhooks` | admin | Register webhook |
| GET | `/v1/boards/:id/webhooks` | admin | List webhooks |
| GET | `/v1/boards/:id/webhooks/:whId` | admin | Get webhook |
| PATCH | `/v1/boards/:id/webhooks/:whId` | admin | Update webhook |
| DELETE | `/v1/boards/:id/webhooks/:whId` | admin | Delete webhook |
| POST | `/v1/boards/:id/webhooks/:whId/ping` | admin | Test delivery |

**Webhook Creation:**
```typescript
router.post('/:id/webhooks', requireAuth('admin'), validate({ body: CreateWebhookSchema }), async (req, res) => {
  const { url, events } = req.body
  const boardId = req.params.id

  // SSRF protection: reject private IPs
  if (isPrivateUrl(url)) {
    return res.status(400).json({
      error: { code: 'INVALID_URL', message: 'Webhook URL must not point to a private network' }
    })
  }

  // Generate secret
  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex')

  const webhook = await prisma.webhook.create({
    data: {
      board_id: boardId,
      url,
      secret_hash: secretHash,
      events,
    },
  })

  // Return secret ONCE
  res.status(201).json({
    data: {
      ...webhook,
      secret, // Only returned on creation
      secret_hash: undefined,
    },
  })
})
```

**SSRF Protection:**
```typescript
import { URL } from 'url'
import dns from 'dns/promises'

async function isPrivateUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString)
    if (url.protocol !== 'https:') return true // Require HTTPS

    const addresses = await dns.resolve(url.hostname)
    return addresses.some(addr => {
      // Check RFC 1918 ranges
      return addr.startsWith('10.') ||
             addr.startsWith('172.16.') ||
             addr.startsWith('192.168.') ||
             addr.startsWith('127.') ||
             addr === '0.0.0.0'
    })
  } catch {
    return true // If we can't resolve, reject
  }
}
```

**Acceptance Criteria:**
- Webhook creation returns secret (once only)
- Webhook URL must be HTTPS
- Private/localhost URLs rejected (SSRF protection)
- Events array validated against known event types
- Ping endpoint sends test payload to URL

---

### T5.2: Implement Webhook Delivery System

**Description:** Background job system that delivers webhook payloads with HMAC signatures and retries.

**Files:**
- Create: `src/lib/webhooks/dispatcher.ts`
- Create: `src/lib/webhooks/worker.ts`
- Create: `src/lib/webhooks/signature.ts`

**Dependencies:** `bullmq`

**Architecture:**
```
Item mutation → Event created in DB → Dispatch to Redis queue (BullMQ)
                                          ↓
                                    Worker processes job:
                                    1. Find matching webhooks for this event type
                                    2. For each webhook:
                                       a. Build payload
                                       b. Sign with HMAC-SHA256
                                       c. POST to webhook URL
                                       d. Record delivery in webhook_deliveries
                                       e. On failure: schedule retry
```

**Signature Generation:**
```typescript
// src/lib/webhooks/signature.ts
import crypto from 'crypto'

export function signPayload(payload: string, secret: string): string {
  return `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')}`
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

**Dispatcher:**
```typescript
// src/lib/webhooks/dispatcher.ts
import { Queue } from 'bullmq'
import { redis } from '../redis'

const webhookQueue = new Queue('webhooks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'custom',
      delay: (attemptsMade: number) => {
        // Retry schedule: 0s, 30s, 2min, 10min, 1h
        const delays = [0, 30_000, 120_000, 600_000, 3_600_000]
        return delays[attemptsMade - 1] || 3_600_000
      },
    },
    removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
    removeOnFail: { age: 604800 },    // Keep failed jobs for 7 days
  },
})

export async function dispatchWebhookEvent(
  boardId: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  // Find all active webhooks for this board and event type
  const webhooks = await prisma.webhook.findMany({
    where: {
      board_id: boardId,
      is_active: true,
      events: { has: eventType },
    },
  })

  for (const webhook of webhooks) {
    await webhookQueue.add('deliver', {
      webhookId: webhook.id,
      eventId,
      eventType,
      boardId,
      payload,
    })
  }
}
```

**Worker:**
```typescript
// src/lib/webhooks/worker.ts
import { Worker } from 'bullmq'
import { redis } from '../redis'
import { signPayload } from './signature'
import { logger } from '../logger'

const worker = new Worker('webhooks', async (job) => {
  const { webhookId, eventId, eventType, boardId, payload } = job.data

  // Get webhook details
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  })

  if (!webhook || !webhook.is_active) {
    logger.info({ webhookId }, 'Webhook inactive, skipping')
    return
  }

  // Get the actual secret (need to store it or derive it)
  // Note: We store secret_hash, not the secret itself
  // Solution: Store encrypted secret (not just hash) or use a derived key
  // For MVP: store the secret encrypted with a server-side key

  const deliveryPayload = JSON.stringify({
    id: `del_${crypto.randomUUID()}`,
    event: eventType,
    board_id: boardId,
    data: payload,
    timestamp: new Date().toISOString(),
  })

  const signature = signPayload(deliveryPayload, webhook.secret_encrypted)

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DockerClaw-Signature': signature,
        'X-DockerClaw-Event': eventType,
        'X-DockerClaw-Delivery': job.id!,
      },
      body: deliveryPayload,
      signal: AbortSignal.timeout(30_000), // 30s timeout
    })

    // Record delivery
    await prisma.webhookDelivery.create({
      data: {
        webhook_id: webhookId,
        event_id: eventId,
        status: response.ok ? 'success' : 'failed',
        response_code: response.status,
        response_body: (await response.text()).substring(0, 1024),
        attempt_count: job.attemptsMade + 1,
      },
    })

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`)
    }

    // Reset failure count on success
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { failure_count: 0, last_triggered_at: new Date() },
    })

    logger.info({ webhookId, eventType, status: response.status }, 'Webhook delivered')

  } catch (err) {
    // Increment failure count
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failure_count: { increment: 1 },
      },
    })

    // Auto-suspend after 10 consecutive failures
    const updated = await prisma.webhook.findUnique({ where: { id: webhookId } })
    if (updated && updated.failure_count >= 10) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { is_active: false },
      })
      logger.warn({ webhookId }, 'Webhook auto-suspended after 10 failures')
    }

    throw err // BullMQ will retry
  }
}, { connection: redis, concurrency: 10 })

export { worker }
```

**Acceptance Criteria:**
- Events trigger webhook deliveries
- HMAC-SHA256 signature in `X-DockerClaw-Signature` header
- Retry schedule: immediate → 30s → 2min → 10min → 1h
- Failed deliveries recorded in `webhook_deliveries`
- Auto-suspend after 10 consecutive failures
- Delivery timeout: 30 seconds
- Worker processes up to 10 deliveries concurrently

---

### T5.3: Wire Webhook Dispatch to Item Routes

**Description:** Call `dispatchWebhookEvent()` after every item/connector mutation.

**Files:**
- Modify: `src/routes/items.ts`
- Modify: `src/routes/batch.ts`
- Modify: `src/routes/connectors.ts`

**Events Dispatched:**

| Event Type | Trigger |
|------------|---------|
| `item.created` | POST item, batch create |
| `item.updated` | PATCH item (any sub-endpoint) |
| `item.deleted` | DELETE item, batch delete |
| `board.updated` | PATCH board |
| `connector.created` | POST connector |
| `connector.deleted` | DELETE connector |

**Acceptance Criteria:**
- Every mutation dispatches appropriate event
- Batch operations dispatch one event per item
- Dispatch is non-blocking (fire-and-forget to queue)

---

### T5.4: Implement Idempotency Middleware

**Description:** Middleware that deduplicates requests using `Idempotency-Key` header.

**Files:**
- Create: `src/middleware/idempotency.ts`

**Implementation:**
```typescript
// src/middleware/idempotency.ts
import { RequestHandler } from 'express'
import { redis } from '../lib/redis'
import crypto from 'crypto'

export const idempotency: RequestHandler = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] as string
  if (!idempotencyKey) return next() // Optional header

  const cacheKey = `idem:${idempotencyKey}`

  // Check if we already processed this request
  const cached = await redis.get(cacheKey)
  if (cached) {
    const { statusCode, body, requestHash } = JSON.parse(cached)

    // Verify same request body (prevent key reuse with different payload)
    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex')

    if (currentHash !== requestHash) {
      return res.status(409).json({
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key reused with different request body',
        },
      })
    }

    // Return cached response
    res.set('X-Idempotency-Replay', 'true')
    return res.status(statusCode).json(body)
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res)
  res.json = (body: any) => {
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex')

    // Cache for 24 hours
    redis.setex(cacheKey, 86400, JSON.stringify({
      statusCode: res.statusCode,
      body,
      requestHash,
    })).catch(() => {}) // Non-blocking

    return originalJson(body)
  }

  next()
}
```

**Apply to routes:**
```typescript
// In routes
router.post('/:id/items', idempotency, requireAuth('write'), ...)
router.post('/:id/items/batch', idempotency, requireAuth('write'), ...)
```

**Acceptance Criteria:**
- Same `Idempotency-Key` + same body → returns cached response with `X-Idempotency-Replay: true`
- Same key + different body → returns 409
- No key → normal processing
- Cache TTL: 24 hours
- Works for POST, PATCH, PUT

---

### T5.5: Optimize Batch API

**Description:** Performance optimization for batch endpoints handling 100 items.

**Files:**
- Modify: `src/routes/batch.ts`

**Optimizations:**
1. **Use `createMany`** instead of individual `create` calls
2. **Pre-validate all items** before starting transaction
3. **Parallel event creation** with `createMany`
4. **Single Redis publish** with all items

```typescript
// Optimized batch create
router.post('/:id/items/batch', async (req, res) => {
  const { items } = req.body
  const boardId = req.params.id

  // Pre-validate all items
  const validated = items.map((item, index) => {
    try {
      return { index, item: CreateItemSchema.parse(item), error: null }
    } catch (err) {
      return { index, item: null, error: err }
    }
  })

  const valid = validated.filter(v => v.item)
  const invalid = validated.filter(v => v.error)

  if (!req.query.partial && invalid.length > 0) {
    return res.status(400).json({
      error: {
        code: 'BATCH_VALIDATION_ERROR',
        message: `${invalid.length} items failed validation`,
        details: invalid.map(v => ({
          index: v.index,
          errors: v.error.errors,
        })),
      },
    })
  }

  // Get current max z_index
  const maxZ = await prisma.canvasItem.aggregate({
    where: { board_id: boardId },
    _max: { z_index: true },
  })
  const baseZ = (maxZ._max.z_index || 0) + 1

  // Prepare data for createMany
  const data = valid.map((v, i) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    type: v.item!.type,
    x: v.item!.x,
    y: v.item!.y,
    width: v.item!.width || null,
    height: v.item!.height || null,
    rotation: v.item!.rotation || 0,
    z_index: baseZ + i,
    content: v.item!.content,
    style: v.item!.style || {},
    locked: v.item!.locked || false,
    visible: true,
    created_by: req.apiKey.key_prefix,
  }))

  // Transaction: create all items
  const result = await prisma.$transaction(async (tx) => {
    await tx.canvasItem.createMany({ data })

    // Fetch created items (createMany doesn't return records)
    const created = await tx.canvasItem.findMany({
      where: { id: { in: data.map(d => d.id) } },
      orderBy: { z_index: 'asc' },
    })

    // Create events
    await tx.event.createMany({
      data: created.map(item => ({
        board_id: boardId,
        item_id: item.id,
        actor_type: 'agent' as const,
        actor_id: req.apiKey.key_prefix,
        event_type: 'item.created',
        payload: { type: item.type, batch: true },
      })),
    })

    return created
  }, {
    timeout: 30_000, // 30s timeout for large batches
  })

  // Single Redis publish with all items
  await redis.publish(`board:${boardId}:updates`, JSON.stringify({
    action: 'batch_create',
    items: result,
  }))

  // Dispatch webhook events
  for (const item of result) {
    await dispatchWebhookEvent(boardId, item.id, 'item.created', item)
  }

  res.status(201).json({
    data: {
      created: result.map((item, index) => ({ index, item })),
      failed: invalid.map(v => ({
        index: v.index,
        error: { message: 'Validation failed' },
      })),
    },
    meta: {
      total_created: result.length,
      total_failed: invalid.length,
    },
  })
})
```

**Acceptance Criteria:**
- 100-item batch completes in < 10 seconds
- `createMany` used instead of individual creates
- Transaction timeout set to 30 seconds
- Partial failure support with `?partial=true`
- All items get events and webhook dispatches

---

### T5.6: Create Python SDK

**Description:** Build a Python SDK package for AI agents.

**Directory Structure:**
```
sdk/python/
├── README.md
├── pyproject.toml
├── dockerclaw/
│   ├── __init__.py
│   ├── client.py          # Main DockerClaw client
│   ├── board.py           # Board resource
│   ├── models.py          # Pydantic v2 models
│   ├── exceptions.py      # Exception hierarchy
│   └── webhook.py         # Webhook signature utilities
├── tests/
│   ├── __init__.py
│   ├── test_client.py
│   ├── test_board.py
│   └── test_webhook.py
└── examples/
    ├── quickstart.py
    ├── batch_create.py
    └── webhook_handler.py
```

**`pyproject.toml`:**
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "dockerclaw"
version = "0.1.0"
description = "Python SDK for DockerClaw collaborative canvas API"
requires-python = ">=3.10"
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "respx>=0.21",
    "pytest-asyncio>=0.23",
]
```

**`dockerclaw/client.py`:**
```python
"""DockerClaw Python SDK — main client."""

import httpx
from typing import Optional
from .board import Board
from .models import BoardCreate, BoardResponse
from .exceptions import DockerClawError, AuthError, NotFoundError, RateLimitError


class DockerClaw:
    """Synchronous DockerClaw client.

    Usage:
        dc = DockerClaw(api_key="dc_...")
        board = dc.board("board-id")
        item = board.create_item(type="sticky", x=100, y=200, content={"text": "Hello"})
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dockerclaw.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=f"{self.base_url}/v1",
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
            },
            timeout=timeout,
            transport=httpx.HTTPTransport(retries=max_retries),
        )

    def board(self, board_id: str) -> Board:
        """Get a board resource for performing operations."""
        return Board(self._client, board_id)

    def create_board(self, name: str, description: str = "") -> BoardResponse:
        """Create a new board. Returns board with API key (shown once)."""
        response = self._client.post("/boards", json={
            "name": name,
            "description": description,
        })
        self._handle_errors(response)
        return BoardResponse(**response.json()["data"])

    def list_boards(self, limit: int = 50) -> list[BoardResponse]:
        """List all boards accessible with this API key."""
        response = self._client.get("/boards", params={"limit": limit})
        self._handle_errors(response)
        return [BoardResponse(**b) for b in response.json()["data"]]

    def _handle_errors(self, response: httpx.Response) -> None:
        if response.is_success:
            return
        error = response.json().get("error", {})
        code = error.get("code", "UNKNOWN")
        message = error.get("message", "Unknown error")

        if response.status_code == 401:
            raise AuthError(message)
        elif response.status_code == 404:
            raise NotFoundError(message)
        elif response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "60")
            raise RateLimitError(message, retry_after=int(retry_after))
        else:
            raise DockerClawError(message, status_code=response.status_code, code=code)

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
```

**`dockerclaw/board.py`:**
```python
"""Board resource — item CRUD, batch, connectors, webhooks."""

import httpx
from typing import Optional, Iterator
from .models import Item, ItemCreate, Connector, Webhook, Event, BatchResult


class Board:
    """Board resource for performing canvas operations."""

    def __init__(self, client: httpx.Client, board_id: str):
        self._client = client
        self.id = board_id
        self._base = f"/boards/{board_id}"

    # --- Items ---

    def create_item(self, type: str, x: float, y: float,
                    content: dict, **kwargs) -> Item:
        """Create a single canvas item."""
        data = {"type": type, "x": x, "y": y, "content": content, **kwargs}
        response = self._client.post(f"{self._base}/items", json=data)
        _handle_errors(response)
        return Item(**response.json()["data"])

    def get_item(self, item_id: str) -> Item:
        """Get a single item by ID."""
        response = self._client.get(f"{self._base}/items/{item_id}")
        _handle_errors(response)
        return Item(**response.json()["data"])

    def list_items(self, type: Optional[str] = None,
                   limit: int = 50) -> list[Item]:
        """List items on this board."""
        params = {"limit": limit}
        if type:
            params["type"] = type
        response = self._client.get(f"{self._base}/items", params=params)
        _handle_errors(response)
        return [Item(**i) for i in response.json()["data"]]

    def update_item(self, item_id: str, **kwargs) -> Item:
        """Update an item (partial update)."""
        response = self._client.patch(
            f"{self._base}/items/{item_id}", json=kwargs
        )
        _handle_errors(response)
        return Item(**response.json()["data"])

    def delete_item(self, item_id: str) -> None:
        """Delete an item."""
        response = self._client.delete(f"{self._base}/items/{item_id}")
        _handle_errors(response)

    def batch_create(self, items: list[dict]) -> BatchResult:
        """Create up to 100 items in a single API call."""
        response = self._client.post(
            f"{self._base}/items/batch",
            json={"items": items},
        )
        _handle_errors(response)
        return BatchResult(**response.json()["data"])

    # --- Connectors ---

    def create_connector(self, from_item_id: str, to_item_id: str,
                         label: str = "", **kwargs) -> Connector:
        """Create a connector between two items."""
        data = {
            "from_item_id": from_item_id,
            "to_item_id": to_item_id,
            "label": label,
            **kwargs,
        }
        response = self._client.post(f"{self._base}/connectors", json=data)
        _handle_errors(response)
        return Connector(**response.json()["data"])

    def list_connectors(self) -> list[Connector]:
        """List all connectors on this board."""
        response = self._client.get(f"{self._base}/connectors")
        _handle_errors(response)
        return [Connector(**c) for c in response.json()["data"]]

    # --- Webhooks ---

    def create_webhook(self, url: str, events: list[str]) -> Webhook:
        """Register a webhook for this board."""
        response = self._client.post(
            f"{self._base}/webhooks",
            json={"url": url, "events": events},
        )
        _handle_errors(response)
        return Webhook(**response.json()["data"])

    # --- Events ---

    def list_events(self, event_type: Optional[str] = None,
                    limit: int = 50) -> list[Event]:
        """List events for this board."""
        params = {"limit": limit}
        if event_type:
            params["event_type"] = event_type
        response = self._client.get(f"{self._base}/events", params=params)
        _handle_errors(response)
        return [Event(**e) for e in response.json()["data"]]
```

**`dockerclaw/models.py`:**
```python
"""Pydantic v2 models for DockerClaw API resources."""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class BoardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    api_key: Optional[str] = None  # Only on creation
    item_count: int = 0
    created_at: datetime
    updated_at: datetime


class Item(BaseModel):
    id: str
    board_id: str
    type: str
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: float = 0
    z_index: int = 0
    content: dict[str, Any] = {}
    style: dict[str, Any] = {}
    locked: bool = False
    visible: bool = True
    frame_id: Optional[str] = None
    created_by: Optional[str] = None
    version: int = 1
    created_at: datetime
    updated_at: datetime


class Connector(BaseModel):
    id: str
    board_id: str
    from_item_id: str
    to_item_id: str
    label: Optional[str] = None
    style: dict[str, Any] = {}
    created_at: datetime


class Webhook(BaseModel):
    id: str
    board_id: str
    url: str
    secret: Optional[str] = None  # Only on creation
    events: list[str]
    is_active: bool = True
    created_at: datetime


class Event(BaseModel):
    id: str
    board_id: str
    item_id: Optional[str] = None
    actor_type: str
    actor_id: Optional[str] = None
    event_type: str
    payload: dict[str, Any] = {}
    created_at: datetime


class BatchResult(BaseModel):
    created: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
```

**`dockerclaw/exceptions.py`:**
```python
"""Exception hierarchy for DockerClaw SDK."""


class DockerClawError(Exception):
    """Base exception for all DockerClaw errors."""

    def __init__(self, message: str, status_code: int = 0, code: str = ""):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class AuthError(DockerClawError):
    """Raised when authentication fails (401)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401, code="UNAUTHORIZED")


class NotFoundError(DockerClawError):
    """Raised when a resource is not found (404)."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404, code="NOT_FOUND")


class RateLimitError(DockerClawError):
    """Raised when rate limit is exceeded (429)."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(message, status_code=429, code="RATE_LIMITED")


class ValidationError(DockerClawError):
    """Raised when request validation fails (400)."""

    def __init__(self, message: str, details: list = None):
        self.details = details or []
        super().__init__(message, status_code=400, code="VALIDATION_ERROR")
```

**`dockerclaw/webhook.py`:**
```python
"""Webhook signature verification utilities."""

import hmac
import hashlib
import time
from typing import Optional
from .models import Event


def verify_signature(
    payload: bytes,
    signature: str,
    secret: str,
    tolerance: int = 300,  # 5 minutes
) -> bool:
    """Verify a webhook payload signature.

    Args:
        payload: Raw request body bytes
        signature: Value of X-DockerClaw-Signature header
        secret: Webhook secret (whsec_...)
        tolerance: Max age in seconds (default 5 min)

    Returns:
        True if signature is valid
    """
    if not signature.startswith("sha256="):
        return False

    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


def parse_event(payload: dict) -> Event:
    """Parse a webhook payload into an Event object."""
    return Event(**payload)
```

---

### T5.7: Create SDK Examples

**Files:**
- Create: `sdk/python/examples/quickstart.py`
- Create: `sdk/python/examples/batch_create.py`
- Create: `sdk/python/examples/webhook_handler.py`

**`quickstart.py`:**
```python
"""DockerClaw SDK — Quickstart Example"""

from dockerclaw import DockerClaw

# Connect to your board
dc = DockerClaw(api_key="dc_your_api_key_here")
board = dc.board("your-board-id")

# Create a sticky note
item = board.create_item(
    type="sticky",
    x=100, y=200,
    content={"text": "Hello from Python!", "color": "#FFD700"}
)
print(f"Created sticky note: {item.id}")

# Create a document
doc = board.create_item(
    type="document",
    x=400, y=200,
    content={
        "title": "Analysis Report",
        "body": "## Summary\n\nThe analysis shows...",
        "format": "markdown"
    }
)
print(f"Created document: {doc.id}")

# Connect them
connector = board.create_connector(
    from_item_id=item.id,
    to_item_id=doc.id,
    label="references"
)
print(f"Created connector: {connector.id}")

# List all items
for item in board.list_items():
    print(f"  {item.type}: {item.id} at ({item.x}, {item.y})")
```

**`batch_create.py`:**
```python
"""DockerClaw SDK — Batch Create Example"""

from dockerclaw import DockerClaw

dc = DockerClaw(api_key="dc_your_api_key_here")
board = dc.board("your-board-id")

# Create 50 sticky notes in a grid
items = [
    {
        "type": "sticky",
        "x": (i % 10) * 220,
        "y": (i // 10) * 220,
        "content": {"text": f"Task #{i+1}", "color": "#FFD700"},
    }
    for i in range(50)
]

result = board.batch_create(items)
print(f"Created {len(result.created)} items, {len(result.failed)} failed")
```

**`webhook_handler.py`:**
```python
"""DockerClaw SDK — Webhook Handler Example (Flask)"""

from flask import Flask, request, jsonify
from dockerclaw.webhook import verify_signature, parse_event

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_your_secret_here"


@app.route("/webhook", methods=["POST"])
def handle_webhook():
    # Verify signature
    signature = request.headers.get("X-DockerClaw-Signature", "")
    if not verify_signature(request.data, signature, WEBHOOK_SECRET):
        return jsonify({"error": "Invalid signature"}), 401

    # Parse event
    event = parse_event(request.json)
    print(f"Received event: {event.event_type}")
    print(f"  Board: {event.board_id}")
    print(f"  Item: {event.item_id}")
    print(f"  Data: {event.payload}")

    # Handle specific events
    if event.event_type == "item.created":
        print(f"New item created: {event.payload.get('type')}")
    elif event.event_type == "item.deleted":
        print(f"Item deleted: {event.item_id}")

    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    app.run(port=5000)
```

---

### T5.8: Write SDK Tests

**Files:**
- Create: `sdk/python/tests/test_client.py`
- Create: `sdk/python/tests/test_board.py`
- Create: `sdk/python/tests/test_webhook.py`

**Test with mocked HTTP (respx):**
```python
# sdk/python/tests/test_client.py
import respx
import httpx
import pytest
from dockerclaw import DockerClaw


@respx.mock
def test_create_board():
    respx.post("https://api.dockerclaw.com/v1/boards").mock(
        return_value=httpx.Response(201, json={
            "data": {
                "id": "board-123",
                "name": "Test Board",
                "api_key": "dc_testkey",
                "item_count": 0,
                "created_at": "2026-02-23T10:00:00Z",
                "updated_at": "2026-02-23T10:00:00Z",
            }
        })
    )

    dc = DockerClaw(api_key="dc_test")
    board = dc.create_board("Test Board")
    assert board.id == "board-123"
    assert board.api_key == "dc_testkey"
```

---

### T5.9: Update Agent Documentation Page

**Description:** Update the `/agents` page in the frontend with SDK installation instructions and examples.

**Files:**
- Modify: `frontend/src/app/agents/page.tsx`

**Content:**
- Python SDK installation: `pip install dockerclaw`
- Quick start code example
- API reference link to Swagger docs
- Webhook setup guide
- Rate limit information

---

## Definition of Done

- [ ] Webhook CRUD API functional
- [ ] Webhooks fire on item mutations with HMAC signature
- [ ] Retry policy: 5 attempts with exponential backoff
- [ ] Auto-suspend after 10 consecutive failures
- [ ] SSRF protection on webhook URLs
- [ ] Idempotency middleware prevents duplicate creates
- [ ] Batch create 100 items in < 10 seconds
- [ ] Python SDK: `pip install dockerclaw` and quickstart works end-to-end
- [ ] SDK has sync client with full CRUD operations
- [ ] SDK webhook verification utility works
- [ ] SDK tests pass with mocked HTTP
- [ ] `/agents` page updated with SDK docs
- [ ] All new endpoints tested (>80% coverage)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook secret storage (can't hash — need for HMAC) | High | Encrypt at rest with AES-256-GCM using server-side key; or store in Secret Manager |
| BullMQ Redis compatibility with Cloud Memorystore | Medium | Test BullMQ with Cloud Memorystore; fallback to Upstash |
| PyPI package name `dockerclaw` availability | Low | Check availability before Phase 5; reserve name early |
| Webhook delivery at scale (many webhooks per event) | Medium | BullMQ concurrency limit (10); per-board webhook limit (10) |
| Rate limiting in SDK (automatic retry) | Low | SDK uses `httpx` transport retries; add 429-aware retry logic |
