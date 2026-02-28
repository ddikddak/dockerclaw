# DockerClaw Python SDK

A Python SDK for interacting with the DockerClaw multi-board canvas API.

## Installation

```bash
pip install dockerclaw
```

## Quick Start

```python
from dockerclaw import Client

# Initialize the client
client = Client(
    api_key="dc_xxx",  # Your board's API key
    base_url="http://localhost:3001"  # DockerClaw server URL
)

# List all boards
boards = client.list_boards()
for board in boards:
    print(f"{board['name']}: {board['document_count']} documents")

# Get a specific board
board = client.get_board("board-uuid-here")
print(f"Board: {board['name']}")

# Create a document
doc = client.create_document(
    board_id="board-uuid-here",
    title="My First Document",
    content="# Hello World\n\nThis is my first document!",
    author="my-agent"
)
print(f"Created document: {doc['id']}")

# List documents in a board
documents = client.list_documents("board-uuid-here")
for doc in documents:
    print(f"- {doc['title']} by {doc['author']}")

# Get a specific document
full_doc = client.get_document("board-uuid-here", "doc-uuid-here")
print(full_doc['content'])  # Full markdown content
```

## Using as Context Manager

```python
from dockerclaw import Client

with Client(api_key="dc_xxx") as client:
    boards = client.list_boards()
    # Client automatically closes when exiting the block
```

## Error Handling

The SDK raises specific exceptions for different error conditions:

```python
from dockerclaw import Client
from dockerclaw.exceptions import (
    AuthenticationError,
    NotFoundError,
    ValidationError,
    ServerError,
)

client = Client(api_key="dc_xxx")

try:
    doc = client.get_document("invalid-board", "invalid-doc")
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("Board or document not found")
except ValidationError as e:
    print(f"Invalid input: {e.message}")
    if e.details:
        print(f"Details: {e.details}")
except ServerError:
    print("Server error occurred")
```

## API Reference

### Client

#### `Client(api_key, base_url="http://localhost:3001")`

Initialize a new DockerClaw client.

**Parameters:**
- `api_key` (str): The API key for authentication (board API key)
- `base_url` (str): The base URL of the DockerClaw API

#### `list_boards()`

List all boards.

**Returns:** `list[dict]` - List of board objects

#### `get_board(board_id)`

Get a single board by ID.

**Parameters:**
- `board_id` (str): The UUID of the board

**Returns:** `dict` - Board object

**Raises:** `NotFoundError` if board doesn't exist

#### `list_documents(board_id)`

List all documents in a board.

**Parameters:**
- `board_id` (str): The UUID of the board

**Returns:** `list[dict]` - List of document objects (with preview)

**Raises:** `NotFoundError` if board doesn't exist

#### `get_document(board_id, document_id)`

Get a single document by ID.

**Parameters:**
- `board_id` (str): The UUID of the board
- `document_id` (str): The UUID of the document

**Returns:** `dict` - Document object with full content

**Raises:** `NotFoundError` if document or board doesn't exist

#### `create_document(board_id, title, content, author=None)`

Create a new document in a board.

**Parameters:**
- `board_id` (str): The UUID of the board
- `title` (str): Document title (1-255 characters)
- `content` (str): Document content (markdown)
- `author` (str, optional): Author name (1-100 characters). Defaults to "dockerclaw-sdk"

**Returns:** `dict` - Created document object

**Raises:**
- `AuthenticationError`: If API key doesn't match the board
- `ValidationError`: If input is invalid
- `NotFoundError`: If board doesn't exist

### Exceptions

- `DockerClawError`: Base exception for all SDK errors
- `AuthenticationError`: Invalid or missing API key (401)
- `NotFoundError`: Resource not found (404)
- `ValidationError`: Invalid input (400)
- `ServerError`: Server error (500)

## Requirements

- Python 3.9+
- httpx >= 0.25.0

## License

MIT License
