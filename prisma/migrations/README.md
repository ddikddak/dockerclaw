# Database migrations for DockerClaw

## Migration: init (20250219190000)

### Schema

This migration creates the initial database schema with the following tables:

#### Agent
- `id`: UUID primary key
- `name`: Agent name
- `email`: Unique email address
- `api_key`: Unique API key for authentication
- `webhook_url`: Optional webhook URL for event notifications
- `created_at`: Timestamp

#### Template
- `id`: UUID primary key
- `agent_id`: Foreign key to Agent
- `name`: Template name
- `schema`: JSON schema defining template structure
- `created_at`: Timestamp

#### Card
- `id`: UUID primary key
- `template_id`: Foreign key to Template
- `agent_id`: Foreign key to Agent
- `data`: JSON data filling the template
- `status`: Card status (default: 'pending')
- `created_at`: Timestamp

#### Event
- `id`: UUID primary key
- `agent_id`: Foreign key to Agent
- `type`: Event type
- `payload`: JSON event data
- `status`: Event status (default: 'pending')
- `created_at`: Timestamp

## How to apply

```bash
# Set your DATABASE_URL in .env
export DATABASE_URL="postgresql://user:password@localhost:5432/dockerclaw"

# Apply migrations
npx prisma migrate deploy

# Or for development with auto-creation
npx prisma migrate dev
```
