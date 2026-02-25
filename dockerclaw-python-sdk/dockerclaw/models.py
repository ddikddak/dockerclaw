"""DockerClaw SDK models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ItemType(str, Enum):
    """Canvas item types."""
    STICKY = "sticky"
    TEXT = "text"
    SHAPE = "shape"
    FRAME = "frame"
    IMAGE = "image"
    DOCUMENT = "document"


class WebhookEvent(str, Enum):
    """Webhook event types."""
    CANVAS_ITEM_CREATED = "canvas_item_created"
    CANVAS_ITEM_UPDATED = "canvas_item_updated"
    CANVAS_ITEM_DELETED = "canvas_item_deleted"
    CANVAS_SNAPSHOT_CREATED = "canvas_snapshot_created"


class WebhookStatus(str, Enum):
    """Webhook status values."""
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"


class Board(BaseModel):
    """Board model."""
    id: str
    name: str
    description: Optional[str] = None
    api_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CanvasItem(BaseModel):
    """Canvas item model."""
    id: str
    board_id: str
    type: ItemType
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: float = 0
    z_index: int = 0
    content: Dict[str, Any]
    style: Dict[str, Any] = Field(default_factory=dict)
    frame_id: Optional[str] = None
    locked: bool = False
    version: int = 1
    created_by: str
    created_at: datetime
    updated_at: datetime


class CreateItemRequest(BaseModel):
    """Request to create a canvas item."""
    type: ItemType
    x: float = Field(..., ge=-1000000, le=1000000)
    y: float = Field(..., ge=-1000000, le=1000000)
    width: Optional[float] = Field(None, ge=1, le=10000)
    height: Optional[float] = Field(None, ge=1, le=10000)
    rotation: float = Field(0, ge=0, le=360)
    content: Dict[str, Any]
    style: Optional[Dict[str, Any]] = None
    frame_id: Optional[str] = None
    locked: bool = False


class UpdateItemRequest(BaseModel):
    """Request to update a canvas item."""
    x: Optional[float] = Field(None, ge=-1000000, le=1000000)
    y: Optional[float] = Field(None, ge=-1000000, le=1000000)
    width: Optional[float] = Field(None, ge=1, le=10000)
    height: Optional[float] = Field(None, ge=1, le=10000)
    rotation: Optional[float] = Field(None, ge=0, le=360)
    content: Optional[Dict[str, Any]] = None
    style: Optional[Dict[str, Any]] = None
    frame_id: Optional[str] = None
    locked: Optional[bool] = None


class Webhook(BaseModel):
    """Webhook model."""
    id: str
    board_id: str
    url: str
    events: List[WebhookEvent]
    status: WebhookStatus
    success_count: int = 0
    failure_count: int = 0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    last_error: Optional[str] = None
    description: Optional[str] = None
    secret: Optional[str] = None  # Only returned on creation
    created_by: str
    created_at: datetime
    updated_at: datetime


class CreateWebhookRequest(BaseModel):
    """Request to create a webhook."""
    url: str = Field(..., min_length=1, max_length=2000)
    events: List[WebhookEvent] = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)


class UpdateWebhookRequest(BaseModel):
    """Request to update a webhook."""
    url: Optional[str] = Field(None, min_length=1, max_length=2000)
    events: Optional[List[WebhookEvent]] = None
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[WebhookStatus] = None


class WebhookPayload(BaseModel):
    """Webhook event payload."""
    id: str
    event: str
    timestamp: datetime
    data: Dict[str, Any]


class WebhookDelivery(BaseModel):
    """Webhook delivery record."""
    id: str
    webhook_id: str
    event_type: str
    payload: Dict[str, Any]
    status_code: Optional[int] = None
    error: Optional[str] = None
    attempt: int
    duration_ms: Optional[int] = None
    success: bool
    created_at: datetime


class ListResponse(BaseModel):
    """Generic list response with pagination."""
    data: List[Any]
    meta: Optional[Dict[str, Any]] = None