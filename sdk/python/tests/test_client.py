"""Tests for DockerClaw SDK."""

import pytest
import respx
from httpx import Response

from dockerclaw import Client
from dockerclaw.exceptions import (
    AuthenticationError,
    DockerClawError,
    NotFoundError,
    ServerError,
    ValidationError,
)


# Fixtures

@pytest.fixture
def client():
    """Create a test client."""
    return Client(api_key="dc_test_key_12345", base_url="http://localhost:3001")


@pytest.fixture
def base_url():
    """Return the base URL for mocking."""
    return "http://localhost:3001"


# Client Initialization Tests

class TestClientInitialization:
    """Tests for client initialization."""
    
    def test_client_init(self):
        """Test client initialization."""
        client = Client(api_key="dc_test")
        assert client.api_key == "dc_test"
        assert client.base_url == "http://localhost:3001"
    
    def test_client_init_custom_url(self):
        """Test client initialization with custom URL."""
        client = Client(api_key="dc_test", base_url="https://api.example.com")
        assert client.base_url == "https://api.example.com"
    
    def test_client_init_trailing_slash(self):
        """Test client handles trailing slash in base URL."""
        client = Client(api_key="dc_test", base_url="http://localhost:3001/")
        assert client.base_url == "http://localhost:3001"


# Board Tests

@respx.mock
def test_list_boards(client, base_url):
    """Test listing boards."""
    mock_data = {
        "boards": [
            {
                "id": "board-1",
                "name": "Test Board",
                "description": "A test board",
                "document_count": 5,
                "created_at": "2026-02-28T10:00:00Z",
            }
        ]
    }
    route = respx.get(f"{base_url}/api/boards").mock(return_value=Response(200, json=mock_data))
    
    boards = client.list_boards()
    
    assert len(boards) == 1
    assert boards[0]["name"] == "Test Board"
    assert boards[0]["document_count"] == 5
    assert route.called


@respx.mock
def test_get_board(client, base_url):
    """Test getting a single board."""
    mock_data = {
        "id": "board-1",
        "name": "Test Board",
        "description": "A test board",
        "api_key": "dc_board_key",
        "document_count": 3,
        "created_at": "2026-02-28T10:00:00Z",
    }
    route = respx.get(f"{base_url}/api/boards/board-1").mock(
        return_value=Response(200, json=mock_data)
    )
    
    board = client.get_board("board-1")
    
    assert board["id"] == "board-1"
    assert board["name"] == "Test Board"
    assert route.called


@respx.mock
def test_get_board_not_found(client, base_url):
    """Test getting a non-existent board raises NotFoundError."""
    respx.get(f"{base_url}/api/boards/invalid").mock(
        return_value=Response(404, json={"error": "Board not found"})
    )
    
    with pytest.raises(NotFoundError):
        client.get_board("invalid")


# Document Tests

@respx.mock
def test_list_documents(client, base_url):
    """Test listing documents."""
    mock_data = {
        "documents": [
            {
                "id": "doc-1",
                "title": "Test Doc",
                "author": "test-agent",
                "created_at": "2026-02-28T10:00:00Z",
                "preview": "First 150 chars...",
            }
        ]
    }
    route = respx.get(f"{base_url}/api/boards/board-1/documents").mock(
        return_value=Response(200, json=mock_data)
    )
    
    documents = client.list_documents("board-1")
    
    assert len(documents) == 1
    assert documents[0]["title"] == "Test Doc"
    assert route.called


@respx.mock
def test_list_documents_board_not_found(client, base_url):
    """Test listing documents for non-existent board."""
    respx.get(f"{base_url}/api/boards/invalid/documents").mock(
        return_value=Response(404, json={"error": "Board not found"})
    )
    
    with pytest.raises(NotFoundError):
        client.list_documents("invalid")


@respx.mock
def test_get_document(client, base_url):
    """Test getting a single document."""
    mock_data = {
        "id": "doc-1",
        "board_id": "board-1",
        "title": "Test Doc",
        "content": "# Hello World",
        "author": "test-agent",
        "created_at": "2026-02-28T10:00:00Z",
        "updated_at": "2026-02-28T10:00:00Z",
    }
    route = respx.get(f"{base_url}/api/boards/board-1/documents/doc-1").mock(
        return_value=Response(200, json=mock_data)
    )
    
    doc = client.get_document("board-1", "doc-1")
    
    assert doc["id"] == "doc-1"
    assert doc["content"] == "# Hello World"
    assert route.called


@respx.mock
def test_get_document_not_found(client, base_url):
    """Test getting a non-existent document raises NotFoundError."""
    respx.get(f"{base_url}/api/boards/board-1/documents/invalid").mock(
        return_value=Response(404, json={"error": "Document not found"})
    )
    
    with pytest.raises(NotFoundError):
        client.get_document("board-1", "invalid")


@respx.mock
def test_create_document(client, base_url):
    """Test creating a document."""
    mock_data = {
        "id": "doc-1",
        "board_id": "board-1",
        "title": "New Doc",
        "author": "my-agent",
        "created_at": "2026-02-28T10:00:00Z",
    }
    route = respx.post(f"{base_url}/api/boards/board-1/documents").mock(
        return_value=Response(201, json=mock_data)
    )
    
    doc = client.create_document(
        board_id="board-1",
        title="New Doc",
        content="# Content",
        author="my-agent",
    )
    
    assert doc["id"] == "doc-1"
    assert doc["title"] == "New Doc"
    assert route.called
    # Verify request body
    request = route.calls[0].request
    import json
    body = json.loads(request.content)
    assert body["title"] == "New Doc"
    assert body["content"] == "# Content"
    assert body["author"] == "my-agent"


@respx.mock
def test_create_document_default_author(client, base_url):
    """Test creating a document with default author."""
    mock_data = {
        "id": "doc-1",
        "board_id": "board-1",
        "title": "New Doc",
        "author": "dockerclaw-sdk",
        "created_at": "2026-02-28T10:00:00Z",
    }
    route = respx.post(f"{base_url}/api/boards/board-1/documents").mock(
        return_value=Response(201, json=mock_data)
    )
    
    client.create_document(
        board_id="board-1",
        title="New Doc",
        content="# Content",
        # author not provided
    )
    
    request = route.calls[0].request
    import json
    body = json.loads(request.content)
    assert body["author"] == "dockerclaw-sdk"


@respx.mock
def test_create_document_auth_error(client, base_url):
    """Test creating a document with wrong API key."""
    respx.post(f"{base_url}/api/boards/board-1/documents").mock(
        return_value=Response(401, json={"error": "Invalid API key"})
    )
    
    with pytest.raises(AuthenticationError):
        client.create_document("board-1", "Title", "Content", "author")


@respx.mock
def test_create_document_validation_error(client, base_url):
    """Test creating a document with invalid input."""
    respx.post(f"{base_url}/api/boards/board-1/documents").mock(
        return_value=Response(
            400, 
            json={"error": "Invalid input", "details": [{"field": "title", "message": "Required"}]}
        )
    )
    
    with pytest.raises(ValidationError) as exc_info:
        client.create_document("board-1", "", "Content", "author")
    
    assert exc_info.value.details is not None


# Error Handling Tests

@respx.mock
def test_server_error(client, base_url):
    """Test handling of server errors."""
    respx.get(f"{base_url}/api/boards").mock(return_value=Response(500))
    
    with pytest.raises(ServerError):
        client.list_boards()


@respx.mock
def test_unknown_error(client, base_url):
    """Test handling of unknown errors."""
    respx.get(f"{base_url}/api/boards").mock(return_value=Response(418))
    
    with pytest.raises(DockerClawError) as exc_info:
        client.list_boards()
    
    assert exc_info.value.status_code == 418


# Context Manager Tests

def test_context_manager():
    """Test using client as context manager."""
    with Client(api_key="dc_test") as client:
        assert client.api_key == "dc_test"
