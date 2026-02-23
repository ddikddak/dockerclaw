# PLA: Sistema d'API Keys per Compte

## 🎯 Objectiu
Implementar un sistema on cada compte (usuari) pugui tenir múltiples API keys, amb UI per gestionar-les i popup quan no n'hi hagi cap configurada.

## 📋 Requisits

### 1. Backend - API Keys Management
- [ ] Nou model `ApiKey` a Prisma
  - `id`, `name`, `key` (hash), `accountId`, `createdAt`, `lastUsedAt`, `isActive`
- [ ] Endpoints:
  - `POST /api/keys` - Crear nova API key
  - `GET /api/keys` - Llistar keys del compte
  - `DELETE /api/keys/:id` - Revocar key
- [ ] Middleware actualitzat per validar qualsevol key activa del compte

### 2. Frontend - API Key Management UI
- [ ] Nova pàgina `/settings/keys`
  - Llista de keys existents
  - Botó "Create New Key"
  - Opció per copiar key (només un cop, després no es mostra)
  - Botó per revocar keys

### 3. Frontend - Popup Inicial
- [ ] Modal/popup al centre de la pantalla quan no hi ha cap API key configurada
  - Títol: "Welcome to DockerClaw"
  - Missatge: "Create an API key to get started"
  - Botó: "Create API Key" → redirigeix a `/settings/keys`
  - Això ha de comprovar-se al carregar l'app

### 4. Frontend - Storage d'API Key
- [ ] Guardar la key seleccionada a `localStorage`
- [ ] Selector de key a la UI (si n'hi ha múltiples)
- [ ] Possibilitat de canviar de key sense logout

## 🏗️ Estructura de Dades

### Prisma Model
```prisma
model ApiKey {
  id        String   @id @default(uuid())
  name      String
  keyHash   String   @unique
  accountId String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  lastUsedAt DateTime?
  
  account   Account  @relation(fields: [accountId], references: [id])
}
```

## 🎨 UI/UX Flow

```
Usuari obre app
    ↓
[Comprovar localStorage per API key]
    ↓
No hi ha key? → Mostrar Popup Welcome
    ↓
Clic "Create API Key" → /settings/keys
    ↓
Formulari: Nom de la key → Crear
    ↓
Mostrar key (només un cop!) → Copiar
    ↓
Guardar a localStorage → Redirigir a /
    ↓
App funciona normalment
```

## 📁 Fitxers a Modificar/Crear

### Backend
- `prisma/schema.prisma` - Afegir model ApiKey
- `src/routes/keys.ts` - Nous endpoints
- `src/middleware/auth.ts` - Actualitzar validació

### Frontend
- `src/app/settings/keys/page.tsx` - Nova pàgina
- `src/components/ApiKeyModal.tsx` - Popup welcome
- `src/lib/api.ts` - Actualitzar per usar key de localStorage
- `src/hooks/useApiKey.ts` - Hook per gestionar keys

## ⏱️ Estimació
- Backend: 2-3 hores
- Frontend UI: 3-4 hores
- Testing: 1-2 hores
- **Total: ~1 dia**

## 🚀 Implementació

Aquest és un canvi significatiu. Proposo:
1. Implementar backend primer (model + endpoints)
2. Després frontend UI (/settings/keys)
3. Finalment el popup i integració

Vols que comenci amb això? Necessitaré spawn Nestor per implementar-ho.