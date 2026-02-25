# DockerClaw Python SDK

Official Python SDK for [DockerClaw](https://dockerclaw.dev) - AI-native canvas platform.

## Installation

```bash
pip install dockerclaw
```

With optional webhook support:
```bash
pip install dockerclaw[webhook]
```

## Quick Start

```python
from dockerclaw import DockerClawClient

# Initialize client
client = DockerClawClient(
    api_key="your-api-key",
    base_url="https://api.dockerclaw.dev"  # Optional
)

# List boards
boards = client.list_boards()
for board in boards:
    print(f"{board.id}: {board.name}")

# Create an item
item = client.create_item(
    board_id="your-board-id",
    type="sticky",
    x=100,
    y=200,
    content={"text": "Hello from Python!"},
    style={"color": "#FFE4B5"}
)
print(f"Created item: {item.id}")
```

## Authentication

Get your API key from your board settings or create a new board:

```python
# Create a new board (returns API key)
board = client.create_board(
    name="My Project",
    description="Project canvas"
)
print(f"Board ID: {board.id}")
print(f"API Key: {board.api_key}")  # Save this!
```

## Items

### List Items

```python
items = client.list_items(
    board_id="board-id",
    item_type="sticky",  # Optional filter
    limit=50
)
```

### Create Item

```python
# Sticky note
sticky = client.create_item(
    board_id="board-id",
    type="sticky",
    x=100,
    y=200,
    content={"text": "Hello World"},
    style={"color": "#FFE4B5"}
)

# Text
 text = client.create_item(
    board_id="board-id",
    type="text",
    x=300,
    y=100,
    content={"text": "Title", "fontSize": 24},
    width=200
)

# Shape
shape = client.create_item(
    board_id="board-id",
    type="shape",
    x=100,
    y=400,
    width=150,
    height=150,
    content={"shapeType": "circle", "label": "Node A"},
    style={"fill": "solid", "color": "#E3F2FD"}
)

# Document
doc = client.create_item(
    board_id="board-id",
    type="document",
    x=500,
    y=100,
    width=400,
    height=300,
    content={
        "title": "Requirements",
        "body": "# Overview\n\nProject requirements...",
        "format": "markdown"
    }
)
```

### Update Item

```python
# Full update
updated = client.update_item(
    board_id="board-id",
    item_id="item-id",
    x=150,
    y=250,
    content={"text": "Updated text"}
)

# Update only position
client.update_item_position(
    board_id="board-id",
    item_id="item-id",
    x=200,
    y=300
)

# Update only content
client.update_item_content(
    board_id="board-id",
    item_id="item-id",
    content={"text": "New content"}
)

# Lock/unlock
client.set_item_lock(
    board_id="board-id",
    item_id="item-id",
    locked=True
)
```

### Delete Item

```python
client.delete_item(board_id="board-id", item_id="item-id")
```

## Webhooks

### Manage Webhooks

```python
from dockerclaw import WebhookEvent

# Create webhook
webhook = client.create_webhook(
    board_id="board-id",
    url="https://your-server.com/webhook",
    events=[
        WebhookEvent.CANVAS_ITEM_CREATED,
        WebhookEvent.CANVAS_ITEM_UPDATED,
    ],
    description="Production webhook"
)
print(f"Secret: {webhook.secret}")  # Save this!

# List webhooks
webhooks = client.list_webhooks(board_id="board-id")

# Update webhook
client.update_webhook(
    board_id="board-id",
    webhook_id=webhook.id,
    status="paused"
)

# Delete webhook
client.delete_webhook(board_id="board-id", webhook_id=webhook.id)

# Test webhook
client.test_webhook(board_id="board-id", webhook_id=webhook.id)

# Rotate secret
result = client.rotate_webhook_secret(
    board_id="board-id",
    webhook_id=webhook.id
)
print(f"New secret: {result['secret']}")

# Get delivery history
deliveries = client.get_webhook_deliveries(
    board_id="board-id",
    webhook_id=webhook.id,
    limit=10
)
```

### Webhook Server (Receive Webhooks)

```python
from dockerclaw import WebhookServer

server = WebhookServer(secret="whsec_your_webhook_secret")

@server.on("canvas_item_created")
def handle_item_created(payload):
    print(f"Item created: {payload.data['id']}")
    print(f"Type: {payload.data['type']}")
    print(f"Content: {payload.data['content']}")

@server.on("canvas_item_updated")
def handle_item_updated(payload):
    print(f"Item updated: {payload.data['id']}")

@server.on("*")  # Catch all events
def handle_all(payload):
    print(f"Event: {payload.event}")

# Run the server
server.run(port=8000)
```

### Webhook Server with ngrok (Local Development)

```python
from dockerclaw import DockerClawClient, WebhookServer

client = DockerClawClient(api_key="your-api-key")

server = WebhookServer(
    secret="will-be-generated",
    use_ngrok=True,
    ngrok_auth_token="your-ngrok-token"  # Get from https://dashboard.ngrok.com
)

@server.on("canvas_item_created")
def handle_created(payload):
    print(f"Created: {payload.data}")

# This will:
# 1. Start ngrok tunnel
# 2. Register webhook with DockerClaw
# 3. Run the server
# 4. Clean up on exit
server.run_with_ngrok(
    client=client,
    board_id="your-board-id",
    events=["canvas_item_created", "canvas_item_updated"],
    port=8000
)
```

### Verify Webhook Signatures

```python
from fastapi import FastAPI, Request, HTTPException, Header
from dockerclaw import DockerClawClient

app = FastAPI()

@app.post("/webhook")
async def webhook(
    request: Request,
    x_webhook_signature: str = Header(...)
):
    payload = await request.body()
    
    # Verify signature
    is_valid = DockerClawClient.verify_webhook_signature(
        payload=payload.decode(),
        signature=x_webhook_signature,
        secret="whsec_your_secret"
    )
    
    if not is_valid:
        raise HTTPException(status_code=401)
    
    # Process webhook
    data = await request.json()
    print(f"Received: {data}")
    
    return {"status": "ok"}
```

## Error Handling

```python
from dockerclaw import (
    DockerClawClient,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServerError,
)

client = DockerClawClient(api_key="...")

try:
    item = client.get_item("board-id", "invalid-id")
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("Item not found")
except ValidationError as e:
    print(f"Validation failed: {e.message}")
except RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after}")
except ServerError:
    print("Server error")
except DockerClawError as e:
    print(f"API error: {e.code} - {e.message}")
```

## Context Manager

```python
from dockerclaw import DockerClawClient

with DockerClawClient(api_key="...") as client:
    boards = client.list_boards()
    # Client automatically closes on exit
```

## Advanced Usage

### Custom HTTP Client

```python
import httpx
from dockerclaw import DockerClawClient

# The SDK uses httpx internally
# You can customize timeout, etc.
client = DockerClawClient(
    api_key="...",
    timeout=60.0  # 60 second timeout
)
```

### Pagination

```python
# List with cursor pagination
items = client.list_items(
    board_id="board-id",
    limit=50
)

# Get next page (if available)
# Note: The SDK returns parsed models, use raw API for cursor tracking
```

## API Reference

See [DockerClaw API Documentation](https://docs.dockerclaw.dev) for complete API reference.

## License

MIT License