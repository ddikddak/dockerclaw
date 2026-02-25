"""DockerClaw API client."""

import hmac
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional, Type, TypeVar
from urllib.parse import urljoin

import httpx

from dockerclaw.exceptions import (
    DockerClawError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServerError,
)
from dockerclaw.models import (
    Board,
    CanvasItem,
    CreateItemRequest,
    UpdateItemRequest,
    CreateWebhookRequest,
    UpdateWebhookRequest,
    Webhook,
    WebhookDelivery,
)

T = TypeVar("T")


class DockerClawClient:
    """DockerClaw API client.
    
    Example:
        ```python
        from dockerclaw import DockerClawClient
        
        client = DockerClawClient(
            api_key="your-api-key",
            base_url="https://api.dockerclaw.dev"
        )
        
        # List boards
        boards = client.list_boards()
        
        # Create an item
        item = client.create_item(
            board_id="board-uuid",
            type="sticky",
            x=100,
            y=200,
            content={"text": "Hello World"}
        )
        ```
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dockerclaw.dev",
        timeout: float = 30.0,
    ):
        """Initialize the client.
        
        Args:
            api_key: Your DockerClaw API key
            base_url: API base URL
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "X-API-Key": api_key,
                "Accept": "application/json",
                "User-Agent": f"dockerclaw-python/0.1.0",
            },
            timeout=timeout,
        )
    
    def _handle_error(self, response: httpx.Response) -> None:
        """Handle API error responses."""
        try:
            data = response.json()
            error = data.get("error", {})
            message = error.get("message", "Unknown error")
            code = error.get("code", "UNKNOWN")
        except Exception:
            message = f"HTTP {response.status_code}: {response.text}"
            code = "HTTP_ERROR"
        
        if response.status_code == 401:
            raise AuthenticationError(message)
        elif response.status_code == 404:
            raise NotFoundError(message)
        elif response.status_code == 400:
            raise ValidationError(message)
        elif response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 0))
            raise RateLimitError(message, retry_after=retry_after)
        elif response.status_code >= 500:
            raise ServerError(message, status_code=response.status_code)
        else:
            raise DockerClawError(message, code=code, status_code=response.status_code)
    
    def _request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Make an API request."""
        url = f"/v1/{path.lstrip('/')}"
        response = self._client.request(method, url, **kwargs)
        
        if response.status_code == 204:
            return {}
        
        if not response.is_success:
            self._handle_error(response)
        
        return response.json()
    
    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()
    
    def __enter__(self) -> "DockerClawClient":
        return self
    
    def __exit__(self, *args: Any) -> None:
        self.close()
    
    # ===== Boards =====
    
    def list_boards(self) -> List[Board]:
        """List all boards.
        
        Returns:
            List of boards
        """
        data = self._request("GET", "/boards")
        return [Board.model_validate(b) for b in data.get("data", [])]
    
    def get_board(self, board_id: str) -> Board:
        """Get a board by ID.
        
        Args:
            board_id: Board UUID
            
        Returns:
            Board details
        """
        data = self._request("GET", f"/boards/{board_id}")
        return Board.model_validate(data.get("data"))
    
    def create_board(self, name: str, description: Optional[str] = None) -> Board:
        """Create a new board.
        
        Args:
            name: Board name
            description: Optional description
            
        Returns:
            Created board (includes API key)
        """
        payload = {"name": name}
        if description:
            payload["description"] = description
        
        data = self._request("POST", "/boards", json=payload)
        return Board.model_validate(data.get("data"))
    
    # ===== Items =====
    
    def list_items(
        self,
        board_id: str,
        item_type: Optional[str] = None,
        frame_id: Optional[str] = None,
        locked: Optional[bool] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> List[CanvasItem]:
        """List items on a board.
        
        Args:
            board_id: Board UUID
            item_type: Filter by item type
            frame_id: Filter by frame ID
            locked: Filter by locked status
            limit: Maximum items to return (1-100)
            cursor: Pagination cursor
            
        Returns:
            List of canvas items
        """
        params: Dict[str, Any] = {"limit": limit}
        if item_type:
            params["type"] = item_type
        if frame_id:
            params["frame_id"] = frame_id
        if locked is not None:
            params["locked"] = str(locked).lower()
        if cursor:
            params["cursor"] = cursor
        
        data = self._request("GET", f"/boards/{board_id}/items", params=params)
        return [CanvasItem.model_validate(item) for item in data.get("data", [])]
    
    def get_item(self, board_id: str, item_id: str) -> CanvasItem:
        """Get a specific item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
            
        Returns:
            Canvas item
        """
        data = self._request("GET", f"/boards/{board_id}/items/{item_id}")
        return CanvasItem.model_validate(data.get("data"))
    
    def create_item(
        self,
        board_id: str,
        type: str,  # noqa: A002
        x: float,
        y: float,
        content: Dict[str, Any],
        **kwargs: Any,
    ) -> CanvasItem:
        """Create a new item on a board.
        
        Args:
            board_id: Board UUID
            type: Item type (sticky, text, shape, frame, image, document)
            x: X coordinate
            y: Y coordinate
            content: Item content (type-specific)
            **kwargs: Additional item properties (width, height, style, etc.)
            
        Returns:
            Created item
        """
        payload = {
            "type": type,
            "x": x,
            "y": y,
            "content": content,
            **kwargs,
        }
        
        data = self._request("POST", f"/boards/{board_id}/items", json=payload)
        return CanvasItem.model_validate(data.get("data"))
    
    def update_item(
        self,
        board_id: str,
        item_id: str,
        **kwargs: Any,
    ) -> CanvasItem:
        """Update an item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
            **kwargs: Properties to update (x, y, content, style, etc.)
            
        Returns:
            Updated item
        """
        data = self._request("PATCH", f"/boards/{board_id}/items/{item_id}", json=kwargs)
        return CanvasItem.model_validate(data.get("data"))
    
    def delete_item(self, board_id: str, item_id: str) -> None:
        """Delete an item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
        """
        self._request("DELETE", f"/boards/{board_id}/items/{item_id}")
    
    def update_item_position(
        self,
        board_id: str,
        item_id: str,
        x: float,
        y: float,
        **kwargs: Any,
    ) -> CanvasItem:
        """Update only the position of an item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
            x: New X coordinate
            y: New Y coordinate
            **kwargs: Optional width, height, rotation
            
        Returns:
            Updated item
        """
        payload = {"x": x, "y": y, **kwargs}
        data = self._request(
            "PATCH", f"/boards/{board_id}/items/{item_id}/position", json=payload
        )
        return CanvasItem.model_validate(data.get("data"))
    
    def update_item_content(
        self,
        board_id: str,
        item_id: str,
        content: Dict[str, Any],
    ) -> CanvasItem:
        """Update only the content of an item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
            content: New content
            
        Returns:
            Updated item
        """
        data = self._request(
            "PATCH",
            f"/boards/{board_id}/items/{item_id}/content",
            json={"content": content},
        )
        return CanvasItem.model_validate(data.get("data"))
    
    def set_item_lock(self, board_id: str, item_id: str, locked: bool) -> CanvasItem:
        """Lock or unlock an item.
        
        Args:
            board_id: Board UUID
            item_id: Item UUID
            locked: Lock status
            
        Returns:
            Updated item
        """
        data = self._request(
            "PATCH",
            f"/boards/{board_id}/items/{item_id}/lock",
            json={"locked": locked},
        )
        return CanvasItem.model_validate(data.get("data"))
    
    # ===== Webhooks =====
    
    def list_webhooks(self, board_id: str) -> List[Webhook]:
        """List webhooks for a board.
        
        Args:
            board_id: Board UUID
            
        Returns:
            List of webhooks
        """
        data = self._request("GET", f"/boards/{board_id}/webhooks")
        return [Webhook.model_validate(w) for w in data.get("data", [])]
    
    def get_webhook(self, board_id: str, webhook_id: str) -> Webhook:
        """Get a specific webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
            
        Returns:
            Webhook details
        """
        data = self._request("GET", f"/boards/{board_id}/webhooks/{webhook_id}")
        return Webhook.model_validate(data.get("data"))
    
    def create_webhook(
        self,
        board_id: str,
        url: str,
        events: List[str],
        description: Optional[str] = None,
    ) -> Webhook:
        """Create a webhook.
        
        Args:
            board_id: Board UUID
            url: Webhook endpoint URL
            events: List of events to subscribe to
            description: Optional description
            
        Returns:
            Created webhook (includes secret)
        """
        payload: Dict[str, Any] = {
            "url": url,
            "events": events,
        }
        if description:
            payload["description"] = description
        
        data = self._request("POST", f"/boards/{board_id}/webhooks", json=payload)
        return Webhook.model_validate(data.get("data"))
    
    def update_webhook(
        self,
        board_id: str,
        webhook_id: str,
        **kwargs: Any,
    ) -> Webhook:
        """Update a webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
            **kwargs: Properties to update
            
        Returns:
            Updated webhook
        """
        data = self._request(
            "PATCH", f"/boards/{board_id}/webhooks/{webhook_id}", json=kwargs
        )
        return Webhook.model_validate(data.get("data"))
    
    def delete_webhook(self, board_id: str, webhook_id: str) -> None:
        """Delete a webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
        """
        self._request("DELETE", f"/boards/{board_id}/webhooks/{webhook_id}")
    
    def get_webhook_deliveries(
        self,
        board_id: str,
        webhook_id: str,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> List[WebhookDelivery]:
        """Get delivery history for a webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
            limit: Maximum items to return
            cursor: Pagination cursor
            
        Returns:
            List of webhook deliveries
        """
        params: Dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        
        data = self._request(
            "GET",
            f"/boards/{board_id}/webhooks/{webhook_id}/deliveries",
            params=params,
        )
        return [WebhookDelivery.model_validate(d) for d in data.get("data", [])]
    
    def test_webhook(self, board_id: str, webhook_id: str) -> Dict[str, str]:
        """Send a test event to a webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
            
        Returns:
            Response message
        """
        data = self._request(
            "POST",
            f"/boards/{board_id}/webhooks/{webhook_id}/test",
        )
        return data.get("data", {})
    
    def rotate_webhook_secret(self, board_id: str, webhook_id: str) -> Dict[str, str]:
        """Rotate the secret for a webhook.
        
        Args:
            board_id: Board UUID
            webhook_id: Webhook UUID
            
        Returns:
            New secret
        """
        data = self._request(
            "POST",
            f"/boards/{board_id}/webhooks/{webhook_id}/rotate",
        )
        return data.get("data", {})
    
    # ===== Utility =====
    
    @staticmethod
    def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
        """Verify a webhook signature.
        
        Args:
            payload: Raw request body
            signature: X-Webhook-Signature header value (format: "sha256=...")
            secret: Webhook secret
            
        Returns:
            True if signature is valid
            
        Example:
            ```python
            from fastapi import Request, HTTPException
            
            @app.post("/webhook")
            async def webhook(request: Request):
                payload = await request.body()
                signature = request.headers.get("X-Webhook-Signature", "")
                
                if not DockerClawClient.verify_webhook_signature(
                    payload.decode(), signature, secret
                ):
                    raise HTTPException(status_code=401)
                
                data = await request.json()
                # Process webhook...
            ```
        """
        if not signature.startswith("sha256="):
            return False
        
        expected_sig = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(signature[7:], expected_sig)