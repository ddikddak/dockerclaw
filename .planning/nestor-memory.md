# Nestor Memory — dockerclaw

## Mapa del Codi

### Frontend (Next.js)
```
app/
├── page.tsx              # Dashboard principal
├── layout.tsx            # Root layout
├── globals.css           # Tailwind + estils
├── api/
│   └── route.ts          # Proxy a API local (si cal)
├── components/
│   ├── Dashboard.tsx     # Vista principal
│   ├── AgentCard.tsx     # Card per agent
│   ├── ProjectList.tsx   # Llista projectes
│   ├── TaskBoard.tsx     # Kanban board
│   └── ui/               # shadcn components
└── lib/
    ├── api.ts            # Fetch functions
    └── utils.ts          # Helpers
```

### Backend (Express.js local)
```
api/
├── server.ts             # Entry point
├── routes/
│   ├── status.ts         # Estat workspace
│   ├── agents.ts         # Info agents
│   ├── projects.ts       # Llista projectes
│   └── tasks.ts          # Tasques GSD
└── utils/
    └── fs-reader.ts      # Llegir fitxers workspace
```

## Històric de Canvis

## Patterns i Decisions

## Àrees de Risc

## Tasks Pendents
