"""Webhook server utilities for handling DockerClaw webhooks."""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, List, Optional

try:
    from fastapi import FastAPI, Request, HTTPException, Header
    from fastapi.responses import JSONResponse
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

try:
    from ngrok import connect as ngrok_connect
    HAS_NGROK = True
except ImportError:
    HAS_NGROK = False

from dockerclaw.models import WebhookPayload

logger = logging.getLogger(__name__)

WebhookHandler = Callable[[WebhookPayload], Any]


class WebhookServer:
    """Helper class for running a webhook server.
    
    This class simplifies receiving and handling DockerClaw webhooks.
    It optionally supports ngrok for local development.
    
    Example without ngrok:
        ```python
        from dockerclaw import WebhookServer, DockerClawClient
        
        server = WebhookServer(secret="whsec_...")
        
        @server.on("canvas_item_created")
        def handle_item_created(payload):
            print(f"Item created: {payload.data['id']}")
        
        server.run(port=8000)
        ```
    
    Example with ngrok:
        ```python
        from dockerclaw import WebhookServer, DockerClawClient
        
        client = DockerClawClient(api_key="...")
        server = WebhookServer(secret="whsec_...", use_ngrok=True)
        
        @server.on("canvas_item_created")
        def handle_item_created(payload):
            print(f"Item created: {payload.data['id']}")
        
        # This will create an ngrok tunnel and register the webhook
        server.run_with_ngrok(
            client=client,
            board_id="board-uuid",
            events=["canvas_item_created"],
            port=8000,
        )
        ```
    """
    
    def __init__(
        self,
        secret: str,
        use_ngrok: bool = False,
        ngrok_auth_token: Optional[str] = None,
    ):
        """Initialize the webhook server.
        
        Args:
            secret: Webhook secret for signature verification
            use_ngrok: Whether to use ngrok tunneling
            ngrok_auth_token: ngrok auth token (required if use_ngrok=True)
        """
        if not HAS_FASTAPI:
            raise ImportError(
                "FastAPI is required for WebhookServer. "
                "Install with: pip install dockerclaw[webhook]"
            )
        
        if use_ngrok and not HAS_NGROK:
            raise ImportError(
                "ngrok is required for tunneling. "
                "Install with: pip install dockerclaw[webhook]"
            )
        
        self.secret = secret
        self.use_ngrok = use_ngrok
        self.ngrok_auth_token = ngrok_auth_token
        self._handlers: Dict[str, List[WebhookHandler]] = {}
        self._catch_all_handlers: List[WebhookHandler] = []
        
        self._app = FastAPI(title="DockerClaw Webhook Server")
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Setup FastAPI routes."""
        
        @self._app.post("/webhook")
        async def webhook_handler(
            request: Request,
            x_webhook_signature: Optional[str] = Header(None),
            x_webhook_id: Optional[str] = Header(None),
            x_event_type: Optional[str] = Header(None),
        ):
            # Get raw body
            body = await request.body()
            payload_str = body.decode()
            
            # Verify signature
            if not self._verify_signature(payload_str, x_webhook_signature or ""):
                raise HTTPException(status_code=401, detail="Invalid signature")
            
            # Parse payload
            try:
                data = json.loads(payload_str)
                payload = WebhookPayload.model_validate(data)
            except Exception as e:
                logger.error(f"Failed to parse webhook payload: {e}")
                raise HTTPException(status_code=400, detail="Invalid payload")
            
            # Handle the webhook
            await self._handle_webhook(payload)
            
            return JSONResponse({"status": "ok"})
        
        @self._app.get("/health")
        async def health_check():
            return {"status": "ok"}
    
    def _verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature."""
        import hmac
        import hashlib
        
        if not signature.startswith("sha256="):
            return False
        
        expected = hmac.new(
            self.secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(signature[7:], expected)
    
    async def _handle_webhook(self, payload: WebhookPayload) -> None:
        """Route webhook to handlers."""
        event = payload.event
        
        # Call event-specific handlers
        handlers = self._handlers.get(event, [])
        for handler in handlers:
            try:
                result = handler(payload)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Handler error for {event}: {e}")
        
        # Call catch-all handlers
        for handler in self._catch_all_handlers:
            try:
                result = handler(payload)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Catch-all handler error: {e}")
    
    def on(self, event: str) -> Callable[[WebhookHandler], WebhookHandler]:
        """Decorator to register an event handler.
        
        Args:
            event: Event type to handle (e.g., "canvas_item_created")
                   Use "*" to handle all events
        
        Example:
            ```python
            @server.on("canvas_item_created")
            def handle_created(payload):
                print(f"Created: {payload.data['id']}")
            
            @server.on("*")
            def handle_all(payload):
                print(f"Event: {payload.event}")
            ```
        """
        def decorator(handler: WebhookHandler) -> WebhookHandler:
            if event == "*":
                self._catch_all_handlers.append(handler)
            else:
                if event not in self._handlers:
                    self._handlers[event] = []
                self._handlers[event].append(handler)
            return handler
        return decorator
    
    def run(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        log_level: str = "info",
    ) -> None:
        """Run the webhook server.
        
        Args:
            host: Host to bind to
            port: Port to bind to
            log_level: Uvicorn log level
        """
        uvicorn.run(
            self._app,
            host=host,
            port=port,
            log_level=log_level,
        )
    
    def run_with_ngrok(
        self,
        client: "DockerClawClient",  # noqa: F821
        board_id: str,
        events: List[str],
        description: Optional[str] = None,
        host: str = "0.0.0.0",
        port: int = 8000,
        log_level: str = "info",
    ) -> None:
        """Run with ngrok tunnel and auto-register webhook.
        
        This will:
        1. Start an ngrok tunnel to the local server
        2. Register the webhook with DockerClaw
        3. Run the server
        4. Clean up the webhook on exit
        
        Args:
            client: DockerClaw client instance
            board_id: Board to register webhook for
            events: Events to subscribe to
            description: Webhook description
            host: Host to bind to
            port: Port to bind to
            log_level: Uvicorn log level
        """
        if not self.use_ngrok:
            raise ValueError("use_ngrok must be True to use run_with_ngrok")
        
        if not self.ngrok_auth_token:
            raise ValueError("ngrok_auth_token is required")
        
        import atexit
        
        # Start ngrok tunnel
        logger.info(f"Starting ngrok tunnel on port {port}...")
        tunnel = ngrok_connect(port, authtoken=self.ngrok_auth_token)
        public_url = tunnel.public_url
        logger.info(f"ngrok tunnel: {public_url}")
        
        webhook_url = f"{public_url}/webhook"
        
        # Register webhook
        logger.info(f"Registering webhook for board {board_id}...")
        webhook = client.create_webhook(
            board_id=board_id,
            url=webhook_url,
            events=events,
            description=description or f"SDK webhook (ngrok: {public_url})",
        )
        logger.info(f"Webhook registered: {webhook.id}")
        
        # Clean up on exit
        def cleanup():
            try:
                client.delete_webhook(board_id, webhook.id)
                logger.info(f"Webhook {webhook.id} deleted")
            except Exception as e:
                logger.error(f"Failed to delete webhook: {e}")
        
        atexit.register(cleanup)
        
        # Run server
        try:
            self.run(host=host, port=port, log_level=log_level)
        finally:
            cleanup()
            atexit.unregister(cleanup)