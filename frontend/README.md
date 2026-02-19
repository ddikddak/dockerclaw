# DockerClaw Frontend

Next.js 15 frontend for the C2H (Cards to Humans) platform.

## Features

- **Figma-like Canvas**: Infinite canvas with zoom, pan, and grid background
- **Kanban Board**: Drag-and-drop columns with @dnd-kit
- **Card Types**: Text, Code, and Checklist components
- **Real-time Updates**: SSE (Server-Sent Events) for live card updates
- **Polished UI**: Tooltips, smooth animations with Framer Motion

## Tech Stack

- Next.js 15 + React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Framer Motion
- @dnd-kit (drag-drop)
- TanStack Query
- Zustand (state management)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Keyboard Shortcuts

- **Space + Drag**: Pan canvas
- **Ctrl + Scroll**: Zoom
- **Middle Mouse**: Pan canvas

## Build

```bash
npm run build
```

## Deploy

Deployed to Vercel automatically on push to main branch.
