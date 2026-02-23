# Python SDK Specification

## 1. Design Goals

- **Minimal dependencies:** Only `httpx` (HTTP client) and `pydantic` (models)
- **Sync + Async:** `DockerClaw` (sync) and `AsyncDockerClaw` (async) clients
- **Type-safe:** Full type hints, IDE autocomplete, Pydantic v2 models
- **Idiomatic Python:** Context managers, iterators, named parameters
- **Error handling:** Typed exception hierarchy with retry information
- **Distribution:** PyPI package `dockerclaw`

---

## 2. Package Structure

```
dockerclaw/
├── __init__.py           # Exports: DockerClaw, AsyncDockerClaw, Board, Item, etc.
├── client.py             # DockerClaw sync client
├── async_client.py       # AsyncDockerClaw async client
├── board.py              # Board resource (sync)
├── async_board.py        # Board resource (async)
├── models.py             # Pydantic v2 models
├── exceptions.py         # Exception hierarchy
├── webhook.py            # Signature verification + event parsing
└── _version.py           # Version string
```

---

## 3. Sync Client Interface

### `DockerClaw`

```python
class DockerClaw:
    """Synchronous DockerClaw client.

    Usage:
        dc = DockerClaw(api_key="dc_...")
        board = dc.board("board-id")
        item = board.create_item(type="sticky", x=100, y=200, content={"text": "Hello"})

    Context manager:
        with DockerClaw(api_key="dc_...") as dc:
            board = dc.board("board-id")
            ...
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dockerclaw.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None: ...

    def board(self, board_id: str) -> Board: ...
    def create_board(self, name: str, description: str = "") -> BoardResponse: ...
    def list_boards(self, limit: int = 50) -> list[BoardResponse]: ...
    def close(self) -> None: ...
    def __enter__(self) -> DockerClaw: ...
    def __exit__(self, *args) -> None: ...
```

### `Board`

```python
class Board:
    """Board resource for performing canvas operations."""

    id: str

    # Items
    def create_item(
        self,
        type: str,
        x: float,
        y: float,
        content: dict,
        *,
        width: float | None = None,
        height: float | None = None,
        rotation: float = 0,
        style: dict | None = None,
        frame_id: str | None = None,
        locked: bool = False,
        idempotency_key: str | None = None,
    ) -> Item: ...

    def get_item(self, item_id: str) -> Item: ...

    def list_items(
        self,
        *,
        type: str | None = None,
        frame_id: str | None = None,
        locked: bool | None = None,
        limit: int = 50,
        after: str | None = None,
    ) -> list[Item]: ...

    def update_item(self, item_id: str, **kwargs) -> Item: ...
    def move_item(self, item_id: str, x: float, y: float) -> Item: ...
    def delete_item(self, item_id: str) -> None: ...
    def lock_item(self, item_id: str) -> Item: ...
    def unlock_item(self, item_id: str) -> Item: ...

    # Batch
    def batch_create(
        self,
        items: list[dict],
        *,
        partial: bool = False,
        idempotency_key: str | None = None,
    ) -> BatchResult: ...

    def batch_update(self, updates: list[dict]) -> BatchResult: ...
    def batch_delete(self, ids: list[str]) -> BatchDeleteResult: ...

    # Connectors
    def create_connector(
        self,
        from_item_id: str,
        to_item_id: str,
        *,
        label: str = "",
        style: dict | None = None,
    ) -> Connector: ...

    def list_connectors(
        self,
        *,
        item_id: str | None = None,
        limit: int = 50,
    ) -> list[Connector]: ...

    def delete_connector(self, connector_id: str) -> None: ...

    # Webhooks
    def create_webhook(
        self,
        url: str,
        events: list[str],
    ) -> Webhook: ...

    def list_webhooks(self) -> list[Webhook]: ...
    def delete_webhook(self, webhook_id: str) -> None: ...
    def ping_webhook(self, webhook_id: str) -> WebhookPingResult: ...

    # Events
    def list_events(
        self,
        *,
        event_type: str | None = None,
        actor_type: str | None = None,
        item_id: str | None = None,
        since: str | None = None,
        limit: int = 50,
    ) -> list[Event]: ...

    # API Keys
    def create_key(
        self,
        name: str,
        scopes: list[str] | None = None,
    ) -> ApiKeyResponse: ...

    def list_keys(self) -> list[ApiKeyInfo]: ...
    def revoke_key(self, key_id: str) -> None: ...

    # Snapshot
    def get_snapshot(self) -> CanvasSnapshot: ...
    def export(self) -> BoardExport: ...
```

---

## 4. Async Client Interface

```python
class AsyncDockerClaw:
    """Asynchronous DockerClaw client.

    Usage:
        async with AsyncDockerClaw(api_key="dc_...") as dc:
            board = dc.board("board-id")
            items = await board.list_items()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dockerclaw.com",
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None: ...

    def board(self, board_id: str) -> AsyncBoard: ...
    async def create_board(self, name: str, description: str = "") -> BoardResponse: ...
    async def list_boards(self, limit: int = 50) -> list[BoardResponse]: ...
    async def close(self) -> None: ...
    async def __aenter__(self) -> AsyncDockerClaw: ...
    async def __aexit__(self, *args) -> None: ...


class AsyncBoard:
    """All methods are async versions of Board methods."""

    async def create_item(self, type: str, x: float, y: float, content: dict, **kwargs) -> Item: ...
    async def list_items(self, **kwargs) -> list[Item]: ...
    async def batch_create(self, items: list[dict], **kwargs) -> BatchResult: ...
    # ... same interface as Board but all methods are async
```

---

## 5. Models

```python
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class BoardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    api_key: Optional[str] = None
    settings: dict[str, Any] = {}
    item_count: int = 0
    connector_count: int = 0
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
    frame_id: Optional[str] = None
    locked: bool = False
    visible: bool = True
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
    waypoints: list[dict[str, float]] = []
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Webhook(BaseModel):
    id: str
    board_id: str
    url: str
    secret: Optional[str] = None
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

class BatchDeleteResult(BaseModel):
    deleted: list[str] = []
    not_found: list[str] = []

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: Optional[str] = None  # Only on creation
    scopes: list[str]
    is_active: bool
    created_at: datetime

class ApiKeyInfo(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime

class CanvasSnapshot(BaseModel):
    board_id: str
    snapshot: dict[str, Any]
    version: int
    updated_at: datetime

class BoardExport(BaseModel):
    board: BoardResponse
    items: list[Item]
    connectors: list[Connector]
    exported_at: datetime

class WebhookPingResult(BaseModel):
    delivered: bool
    response_code: Optional[int] = None
    response_time_ms: Optional[int] = None
```

---

## 6. Exception Hierarchy

```python
DockerClawError              # Base exception (all SDK errors)
├── AuthError                # 401 Unauthorized
├── ForbiddenError           # 403 Forbidden (wrong scope)
├── NotFoundError            # 404 Resource not found
├── ValidationError          # 400 Invalid request
│   └── details: list[dict]  # Field-level validation errors
├── ConflictError            # 409 Version conflict or idempotency mismatch
├── RateLimitError           # 429 Too many requests
│   └── retry_after: int     # Seconds to wait
├── PayloadTooLargeError     # 413 Request too large
└── ServerError              # 500+ Server error
```

---

## 7. Webhook Utilities

```python
# dockerclaw/webhook.py

def verify_signature(
    payload: bytes,
    signature: str,
    secret: str,
    tolerance: int = 300,
) -> bool:
    """Verify HMAC-SHA256 signature of a webhook payload.

    Args:
        payload: Raw request body bytes
        signature: X-DockerClaw-Signature header value
        secret: Webhook secret (whsec_...)
        tolerance: Max payload age in seconds (default 5 min)

    Returns:
        True if signature is valid and payload is fresh
    """
    ...

def parse_event(payload: dict | bytes | str) -> Event:
    """Parse a webhook payload into an Event model.

    Accepts dict, bytes, or JSON string.
    """
    ...

class WebhookHandler:
    """Convenience class for handling webhooks in web frameworks.

    Usage:
        handler = WebhookHandler(secret="whsec_...")

        @app.post("/webhook")
        def webhook(request):
            event = handler.handle(request.body, request.headers)
            if event.event_type == "item.created":
                process_new_item(event.payload)
    """

    def __init__(self, secret: str, tolerance: int = 300): ...

    def handle(
        self,
        body: bytes,
        headers: dict[str, str],
    ) -> Event:
        """Verify signature and parse event. Raises on invalid signature."""
        ...
```

---

## 8. Pagination

Auto-pagination for list methods:

```python
# Default: returns first page
items = board.list_items(limit=50)

# Manual pagination
items = board.list_items(limit=50, after="last-item-id")

# Auto-pagination iterator (future enhancement)
for item in board.iter_items(type="sticky"):
    process(item)
```

---

## 9. Retry Logic

The SDK uses `httpx`'s built-in retry transport for network errors. For rate limiting:

```python
# Automatic retry on 429 (built into client)
while True:
    try:
        response = self._client.post(...)
        break
    except RateLimitError as e:
        if attempt >= max_retries:
            raise
        time.sleep(e.retry_after)
```

---

## 10. Versioning Policy

| SDK Version | API Version | Compatibility |
|-------------|-------------|---------------|
| 0.x | v1 | Development / unstable |
| 1.x | v1 | Stable, backward compatible within 1.x |
| 2.x | v2 (future) | Breaking changes, new features |

- Minor versions: new features, backward compatible
- Patch versions: bug fixes only
- Deprecation: warnings for 2 minor versions before removal
