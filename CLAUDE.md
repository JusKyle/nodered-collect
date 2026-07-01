# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repository is a distributed data collection system built around Node-RED. It has three main parts:

- `backend/`: Express + TypeScript + Prisma service for platform APIs, PostgreSQL persistence, Redis buffering/cache, MQTT ingestion, and SSE status events.
- `frontend/`: React + Vite + TypeScript management UI using React Router, Zustand, Axios, TailwindCSS, and Recharts.
- `nodered-plugin/`: Node-RED contrib plugin that registers gateway/device/data-output nodes and handles gateway registration, heartbeat, config sync, MQTT upload, and SQLite-backed offline cache.

Local infrastructure is described in `docker-compose.yml`: PostgreSQL on `5432`, Redis on `6379`, EMQX MQTT on `1883` plus dashboard/websocket ports, Node-RED on `1880`, backend on `3000`, and frontend on `80`.

## Common commands

Run commands from the relevant subdirectory unless noted.

### Backend (`backend/`)

```bash
npm run dev              # ts-node-dev --respawn --transpile-only src/main.ts
npm run build            # tsc -p tsconfig.build.json
npm start                # node dist/main.js
npm test                 # run all Jest tests
npm test -- path/to.test.ts
npm run test:watch
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

Backend tests use Jest + ts-jest (`backend/jest.config.js`) and match `**/*.test.ts`.

Important startup note: `backend/package.json` points `dev` at `src/main.ts`, but `src/main.ts` creates and exports the Express app while `src/app.ts` imports it and calls `app.listen`. Verify the intended startup entry before relying on `npm run dev` behavior.

### Frontend (`frontend/`)

```bash
npm run dev
npm run build            # tsc && vite build
npm run lint
npm run preview
```

There is currently no frontend test script in `frontend/package.json`.

### Node-RED plugin (`nodered-plugin/`)

```bash
npm run build            # tsc
npm run dev              # tsc --watch
npm test                 # jest
```

`nodered-plugin/package.json` exposes Node-RED nodes from `dist/nodes/...` after build.

### Docker infrastructure

```bash
docker compose up
```

Use this when backend changes need PostgreSQL, Redis, EMQX, or Node-RED available locally.

## Backend architecture

The backend is organized mostly by feature module under `backend/src/modules/*`, with controller/router/service/repository/dto/entity style boundaries.

Main route registration is in `backend/src/routes/index.ts` under `/api`:

- `/api/gateways`
- `/api/device-models`
- `/api/device-instances`
- `/api/sync`
- `/api/registration`
- `/api/platform-config`
- `/api/device-data`
- `/api/events` for SSE clients

Core cross-cutting services live in `backend/src/services/`:

- `mqtt.service.ts` subscribes to MQTT topics and dispatches heartbeat/data payloads.
- `heartbeat.service.ts` processes gateway heartbeats, updates Redis/PostgreSQL, records performance data, and broadcasts SSE gateway status changes.
- `data-collection.service.ts` buffers device data in Redis, caches latest point values, flushes to PostgreSQL, and checks device offline status.
- `dispatch.service.ts` builds Node-RED flows from gateway/device/model data and deploys them through the Node-RED Admin API.
- `sse.service.ts` manages `/api/events` clients and broadcasts gateway/device/sync events.

Configuration is in `backend/src/config/`:

- `env.ts` validates environment variables with Zod.
- `db.ts` provides PrismaClient.
- `redis.ts` manages Redis client connection/reconnect behavior.
- `mqtt.ts` creates the MQTT client.

Database schema is `backend/prisma/schema.prisma`. Main entities include `Gateway`, `DeviceModel`, `ModelVersion`, `DeviceInstance`, `SyncRecord`, `DeviceDataPoint`, `RegistrationCode`, `PlatformConfig`, `GatewayPerformance`, and `GatewayCacheStatus`.

## Frontend architecture

The frontend entry is `frontend/src/main.tsx`; app routes and global toast handling are in `frontend/src/App.tsx`.

Current routes:

- `/` and `/gateways`: gateway list
- `/gateways/:id`: gateway detail
- `/device-models`: device model list
- `/device-models/:id`: device model detail
- `/device-instances`: device instances
- `/sync`: sync records
- `/registration-codes`: registration code management
- `/system-config`: system configuration

API modules live in `frontend/src/api/*.api.ts`. The shared Axios instance is `frontend/src/api/axios.ts`, uses `baseURL: '/api'`, and centralizes response error handling.

Zustand stores live in `frontend/src/stores/`. When backend response shapes change, check both `frontend/src/api/` and `frontend/src/types/index.ts` along with the relevant store/page.

Gateway live status updates are handled through SSE in `frontend/src/hooks/useGatewaySSE.ts`, consuming `/api/events` and listening for `gateway_status_change`.

## Node-RED plugin architecture

Plugin entry is `nodered-plugin/src/index.ts`, registering:

- `device-manager`
- `device-instance`
- `data-output`

Main node responsibilities:

- `nodes/device-manager/device-manager.ts`: stores platform/MQTT/registration config, registers the gateway, then starts heartbeat and config sync services.
- `nodes/device-instance/device-instance.ts`: represents a configured device instance tied to a manager, model, node id, and config.
- `nodes/data-output/data-output.ts`: publishes device data through MQTT and falls back to local cache when disconnected.

Service responsibilities:

- `services/registration.service.ts`: calls the platform registration endpoint.
- `services/heartbeat.service.ts`: publishes gateway heartbeat/performance payloads to MQTT.
- `services/config-sync.service.ts`: periodically pulls device instance config for a gateway.
- `services/data-cache.service.ts` and `store/sqlite-store.ts`: implement SQLite-backed cached data and device config storage.

## End-to-end flows

Gateway registration flow:

1. Frontend creates/manages registration codes through backend registration APIs.
2. Node-RED `device-manager` uses a registration code to register with the platform.
3. Backend binds/creates a `Gateway` and returns gateway information.
4. Plugin stores `gatewayId` and starts heartbeat/config sync.

Heartbeat/status flow:

1. Plugin publishes heartbeat to `gateway/{gatewayId}/heartbeat`.
2. Backend subscribes to `gateway/+/heartbeat`.
3. Backend updates Redis/PostgreSQL and broadcasts SSE status changes.
4. Frontend receives `/api/events` updates through `useGatewaySSE`.

Device data flow:

1. Device data arrives via MQTT.
2. Backend buffers and caches point data in Redis.
3. Backend periodically flushes to `DeviceDataPoint` in PostgreSQL.
4. Frontend queries `/api/device-data/*` APIs for latest/current/history data.

Configuration/deploy flow has two mechanisms:

- Backend can push generated Node-RED flows through `dispatch.service.ts` and the Node-RED Admin API `/flows` endpoint.
- Plugin can pull gateway device instance config through `config-sync.service.ts`.

## Integration cautions

- MQTT topic names must be checked carefully when changing data ingestion. Backend subscribes to `gateway/+/heartbeat` and `devices/+/data`; plugin heartbeat publishes `gateway/{gatewayId}/heartbeat`; plugin data output currently publishes `collecting/data/{deviceId}`.
- Backend API changes usually require coordinated updates in backend routes/controllers/services/repositories, frontend API modules, frontend types, and any affected Zustand stores/pages.
- Prisma model changes require updating `backend/prisma/schema.prisma`, running Prisma migration/generate commands, and checking backend repositories/services plus frontend types if API shapes change.
- Gateway/device status logic spans backend heartbeat/data-collection/SSE services and frontend SSE/store/page code; avoid changing only one side of the flow.
