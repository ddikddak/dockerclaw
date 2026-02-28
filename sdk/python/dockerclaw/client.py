"""DockerClaw API client."""

from typing import Any
import httpx

from dockerclaw.exceptions import (
    AuthenticationError,
    DockerClawError,
    NotFoundError,
    ServerError,
    ValidationError,
)


class Client:
    """DockerClaw API client.
    
    Args:
        api_key: The API key for authentication (board API key).
        base_url: The base URL of the DockerClaw API.
                 Defaults to "http://localhost:3001".
    
    Example:
        >>> from dockerclaw import Client
        >>> client = Client(api_key="dc_xxx", base_url="http://localhost:3001")
        >>> boards = client.list_boards()
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:3001",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={"X-API-Key": self.api_key},
            timeout=30.0,
        )
    
    def _handle_error(self, response: httpx.Response) -> None:
        """Handle HTTP error responses."""
        if response.status_code == 401:
            raise AuthenticationError()
        elif response.status_code == 404:
            raise NotFoundError()
        elif response.status_code == 400:
            data = response.json() if response.content else {}
            raise ValidationError(
                message=data.get("error", "Invalid input"),
                details=data.get("details"),
            )
        elif response.status_code >= 500:
            raise ServerError()
        elif not response.is_success:
            raise DockerClawError(
                f"HTTP {response.status_code}: {response.text}",
                status_code=response.status_code,
            )
    
    def _request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Make an HTTP request and return JSON response."""
        response = self._client.request(method, path, **kwargs)
        
        if not response.is_success:
            self._handle_error(response)
        
        return response.json() if response.content else {}
    
    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()
    
    def __enter__(self) -> "Client":
        return self
    
    def __exit__(self, *args: Any) -> None:
        self.close()
    
    # Boards
    
    def list_boards(self) -> list[dict[str, Any]]:
        """List all boards.
        
        Returns:
            List of board objects with keys:
            - id: str - Board UUID
            - name: str - Board name
            - description: str | None - Board description
            - document_count: int - Number of documents in the board
            - created_at: str - ISO 8601 timestamp
        """
        data = self._request("GET", "/api/boards")
        return data.get("boards", [])
    
    def get_board(self, board_id: str) -> dict[str, Any]:
        """Get a single board by ID.
        
        Args:
            board_id: The UUID of the board.
        
        Returns:
            Board object with keys:
            - id: str - Board UUID
            - name: str - Board name
            - description: str | None - Board description
            - api_key: str - The board's API key
            - document_count: int - Number of documents in the board
            - created_at: str - ISO 8601 timestamp
        
        Raises:
            NotFoundError: If the board doesn't exist.
        """
        return self._request("GET", f"/api/boards/{board_id}")
    
    # Documents
    
    def list_documents(self, board_id: str) -> list[dict[str, Any]]:
        """List all documents in a board.
        
        Args:
            board_id: The UUID of the board.
        
        Returns:
            List of document objects with keys:
            - id: str - Document UUID
            - title: str - Document title
            - author: str - Document author name
            - created_at: str - ISO 8601 timestamp
            - preview: str - First 150 characters of content
        
        Raises:
            NotFoundError: If the board doesn't exist.
        """
        data = self._request("GET", f"/api/boards/{board_id}/documents")
        return data.get("documents", [])
    
    def get_document(self, board_id: str, document_id: str) -> dict[str, Any]:
        """Get a single document by ID.
        
        Args:
            board_id: The UUID of the board.
            document_id: The UUID of the document.
        
        Returns:
            Document object with keys:
            - id: str - Document UUID
            - board_id: str - Parent board UUID
            - title: str - Document title
            - content: str - Full document content (markdown)
            - author: str - Document author name
            - created_at: str - ISO 8601 timestamp
            - updated_at: str - ISO 8601 timestamp
        
        Raises:
            NotFoundError: If the document or board doesn't exist.
        """
        return self._request(
            "GET", 
            f"/api/boards/{board_id}/documents/{document_id}"
        )
    
    def create_document(
        self,
        board_id: str,
        title: str,
        content: str,
        author: str | None = None,
    ) -> dict[str, Any]:
        """Create a new document in a board.
        
        Requires the API key to match the board's API key.
        
        Args:
            board_id: The UUID of the board.
            title: The document title (1-255 characters).
            content: The document content (markdown, required).
            author: The author name (1-100 characters, required).
                   If not provided, defaults to "dockerclaw-sdk".
        
        Returns:
            Created document object with keys:
            - id: str - Document UUID
            - board_id: str - Parent board UUID
            - title: str - Document title
            - author: str - Document author name
            - created_at: str - ISO 8601 timestamp
        
        Raises:
            AuthenticationError: If the API key doesn't match the board.
            ValidationError: If the input is invalid.
            NotFoundError: If the board doesn't exist.
        """
        if author is None:
            author = "dockerclaw-sdk"
        
        payload = {
            "title": title,
            "content": content,
            "author": author,
        }
        
        return self._request(
            "POST",
            f"/api/boards/{board_id}/documents",
            json=payload,
        )
