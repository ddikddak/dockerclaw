"""Tests for DockerClaw SDK."""

import pytest
from datetime import datetime

from dockerclaw import DockerClawClient
from dockerclaw.models import Board, CanvasItem, ItemType, WebhookEvent
from dockerclaw.exceptions import AuthenticationError, NotFoundError


class TestModels:
    """Test model validation."""
    
    def test_board_model(self):
        """Test Board model."""
        data = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Test Board",
            "description": "Test description",
            "created_at": "2026-02-25T10:00:00Z",
            "updated_at": "2026-02-25T10:00:00Z",
        }
        board = Board.model_validate(data)
        assert board.name == "Test Board"
        assert board.description == "Test description"
    
    def test_canvas_item_model(self):
        """Test CanvasItem model."""
        data = {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "board_id": "550e8400-e29b-41d4-a716-446655440000",
            "type": "sticky",
            "x": 100.0,
            "y": 200.0,
            "z_index": 1,
            "content": {"text": "Hello"},
            "style": {},
            "locked": False,
            "version": 1,
            "created_by": "abc1234",
            "created_at": "2026-02-25T10:00:00Z",
            "updated_at": "2026-02-25T10:00:00Z",
        }
        item = CanvasItem.model_validate(data)
        assert item.type == ItemType.STICKY
        assert item.x == 100.0
        assert item.content["text"] == "Hello"
    
    def test_item_type_enum(self):
        """Test ItemType enum."""
        assert ItemType.STICKY.value == "sticky"
        assert ItemType.TEXT.value == "text"
        assert ItemType.DOCUMENT.value == "document"
    
    def test_webhook_event_enum(self):
        """Test WebhookEvent enum."""
        assert WebhookEvent.CANVAS_ITEM_CREATED.value == "canvas_item_created"
        assert WebhookEvent.CANVAS_ITEM_UPDATED.value == "canvas_item_updated"


class TestClientInitialization:
    """Test client initialization."""
    
    def test_client_init(self):
        """Test client initialization."""
        client = DockerClawClient(api_key="test-key")
        assert client.api_key == "test-key"
        assert client.base_url == "https://api.dockerclaw.dev"
        assert client.timeout == 30.0
    
    def test_client_init_custom_params(self):
        """Test client with custom parameters."""
        client = DockerClawClient(
            api_key="test-key",
            base_url="https://custom.dockerclaw.dev",
            timeout=60.0,
        )
        assert client.api_key == "test-key"
        assert client.base_url == "https://custom.dockerclaw.dev"
        assert client.timeout == 60.0
    
    def test_client_context_manager(self):
        """Test client as context manager."""
        with DockerClawClient(api_key="test-key") as client:
            assert client.api_key == "test-key"


class TestWebhookSignature:
    """Test webhook signature verification."""
    
    def test_verify_valid_signature(self):
        """Test verifying a valid signature."""
        secret = "whsec_test_secret"
        payload = '{"event": "test"}'
        
        # Generate valid signature
        import hmac
        import hashlib
        expected_sig = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        signature = f"sha256={expected_sig}"
        
        is_valid = DockerClawClient.verify_webhook_signature(payload, signature, secret)
        assert is_valid is True
    
    def test_verify_invalid_signature(self):
        """Test verifying an invalid signature."""
        secret = "whsec_test_secret"
        payload = '{"event": "test"}'
        signature = "sha256=invalid_signature"
        
        is_valid = DockerClawClient.verify_webhook_signature(payload, signature, secret)
        assert is_valid is False
    
    def test_verify_wrong_format(self):
        """Test signature with wrong format."""
        secret = "whsec_test_secret"
        payload = '{"event": "test"}'
        signature = "invalid_format"
        
        is_valid = DockerClawClient.verify_webhook_signature(payload, signature, secret)
        assert is_valid is False