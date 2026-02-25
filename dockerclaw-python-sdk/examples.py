#!/usr/bin/env python3
"""Example: Using DockerClaw SDK to create items and receive webhooks."""

import os
from dockerclaw import DockerClawClient, WebhookServer, WebhookEvent

# Configuration
API_KEY = os.getenv("DOCKERCLAW_API_KEY", "your-api-key")
BOARD_ID = os.getenv("DOCKERCLAW_BOARD_ID", "your-board-id")
WEBHOOK_SECRET = os.getenv("DOCKERCLAW_WEBHOOK_SECRET", "your-webhook-secret")


def example_create_items():
    """Example: Create various items on a board."""
    client = DockerClawClient(api_key=API_KEY)
    
    # Create a sticky note
    sticky = client.create_item(
        board_id=BOARD_ID,
        type="sticky",
        x=100,
        y=100,
        content={"text": "Hello from Python SDK!"},
        style={"color": "#FFE4B5"}
    )
    print(f"Created sticky note: {sticky.id}")
    
    # Create a text item
    text = client.create_item(
        board_id=BOARD_ID,
        type="text",
        x=300,
        y=100,
        content={
            "text": "Project Overview",
            "fontSize": 24,
            "textAlign": "center"
        },
        width=250
    )
    print(f"Created text: {text.id}")
    
    # Create a shape
    shape = client.create_item(
        board_id=BOARD_ID,
        type="shape",
        x=100,
        y=300,
        width=150,
        height=150,
        content={
            "shapeType": "circle",
            "label": "Core"
        },
        style={
            "fill": "solid",
            "color": "#E3F2FD",
            "strokeColor": "#1976D2"
        }
    )
    print(f"Created shape: {shape.id}")
    
    # Create a document
    doc = client.create_item(
        board_id=BOARD_ID,
        type="document",
        x=500,
        y=100,
        width=400,
        height=300,
        content={
            "title": "Meeting Notes",
            "body": "# Meeting Notes\n\n## Attendees\n- Alice\n- Bob\n\n## Agenda\n1. Project status\n2. Next steps",
            "format": "markdown"
        }
    )
    print(f"Created document: {doc.id}")
    
    client.close()


def example_manage_webhooks():
    """Example: Create and manage webhooks."""
    client = DockerClawClient(api_key=API_KEY)
    
    # Create a webhook
    webhook = client.create_webhook(
        board_id=BOARD_ID,
        url="https://your-server.com/webhook",
        events=[
            WebhookEvent.CANVAS_ITEM_CREATED,
            WebhookEvent.CANVAS_ITEM_UPDATED,
            WebhookEvent.CANVAS_ITEM_DELETED,
        ],
        description="My webhook"
    )
    print(f"Created webhook: {webhook.id}")
    print(f"Webhook secret: {webhook.secret}")
    
    # List webhooks
    webhooks = client.list_webhooks(board_id=BOARD_ID)
    print(f"\nTotal webhooks: {len(webhooks)}")
    for w in webhooks:
        print(f"  - {w.id}: {w.url} ({w.status})")
    
    # Get delivery history
    deliveries = client.get_webhook_deliveries(
        board_id=BOARD_ID,
        webhook_id=webhook.id,
        limit=10
    )
    print(f"\nRecent deliveries: {len(deliveries)}")
    
    # Test the webhook
    result = client.test_webhook(board_id=BOARD_ID, webhook_id=webhook.id)
    print(f"\nTest result: {result}")
    
    # Delete webhook
    # client.delete_webhook(board_id=BOARD_ID, webhook_id=webhook.id)
    # print(f"\nDeleted webhook: {webhook.id}")
    
    client.close()


def example_webhook_server():
    """Example: Run a webhook server to receive events."""
    server = WebhookServer(secret=WEBHOOK_SECRET)
    
    @server.on(WebhookEvent.CANVAS_ITEM_CREATED)
    def on_item_created(payload):
        """Handle item created events."""
        print(f"\n📝 Item Created:")
        print(f"   ID: {payload.data['id']}")
        print(f"   Type: {payload.data['type']}")
        print(f"   Position: ({payload.data['x']}, {payload.data['y']})")
        if 'content' in payload.data:
            print(f"   Content: {payload.data['content']}")
    
    @server.on(WebhookEvent.CANVAS_ITEM_UPDATED)
    def on_item_updated(payload):
        """Handle item updated events."""
        print(f"\n✏️  Item Updated:")
        print(f"   ID: {payload.data['id']}")
        print(f"   Updated fields: {payload.data.get('updated_fields', [])}")
    
    @server.on(WebhookEvent.CANVAS_ITEM_DELETED)
    def on_item_deleted(payload):
        """Handle item deleted events."""
        print(f"\n🗑️  Item Deleted:")
        print(f"   ID: {payload.data['id']}")
        print(f"   Type: {payload.data['type']}")
    
    @server.on("*")
    def on_all_events(payload):
        """Handle all events (catch-all)."""
        print(f"\n📨 Event: {payload.event} (ID: {payload.id})")
    
    print("Starting webhook server on http://localhost:8000")
    print("Press Ctrl+C to stop")
    server.run(port=8000)


def example_with_ngrok():
    """Example: Run with ngrok tunnel (requires ngrok auth token)."""
    from dockerclaw import DockerClawClient
    
    client = DockerClawClient(api_key=API_KEY)
    
    server = WebhookServer(
        secret="will-be-generated",
        use_ngrok=True,
        ngrok_auth_token=os.getenv("NGROK_AUTH_TOKEN")
    )
    
    @server.on(WebhookEvent.CANVAS_ITEM_CREATED)
    def on_created(payload):
        print(f"Created: {payload.data['id']}")
    
    # This will:
    # 1. Start ngrok tunnel
    # 2. Register webhook with DockerClaw
    # 3. Run the server
    # 4. Clean up on exit
    server.run_with_ngrok(
        client=client,
        board_id=BOARD_ID,
        events=[
            WebhookEvent.CANVAS_ITEM_CREATED,
            WebhookEvent.CANVAS_ITEM_UPDATED,
        ],
        port=8000
    )


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python examples.py [create|webhooks|server|ngrok]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "create":
        example_create_items()
    elif command == "webhooks":
        example_manage_webhooks()
    elif command == "server":
        example_webhook_server()
    elif command == "ngrok":
        example_with_ngrok()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python examples.py [create|webhooks|server|ngrok]")