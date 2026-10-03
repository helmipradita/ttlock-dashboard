# TTLOCK Dashboard — AI Context

Monitoring and management dashboard for TTLOCK Smart Locks and Gateways. Built with React 19 + Express + TypeScript + Nginx on Docker.

## Stack & Architecture

- **Backend**: Express.js + TypeScript (port 5000 internal, exposed via Nginx at port 5757)
- **Frontend**: React 19 + Vite 5.4 + TypeScript + shadcn/ui + TanStack Query + Tailwind CSS 4
- **Production**: Nginx (reverse proxy `/api/*` → backend:5000 + static React build) + Node.js backend
- **Docker**: 2 services (`backend`, `web-nginx`), 1 exposed port 5757

## Build Commands

```bash
# Docker - build and run both services (Recommended)
docker compose up -d --build

# Docker - rebuild only changed service
docker compose up -d --build web-nginx   # frontend only
docker compose up -d --build backend     # backend only
```

## System Rules

- Default sort: lockboxes by hasGateway desc + lastOpen desc; gateways by isOnline desc, WiFi sortable by networkName
- RSSI signal strength: >-75 Strong (green), -85..-75 Medium (amber), <-85 Weak (red)
- Backend cache: topology TTL 5s single-flight; lastOpen always fresh (no cache)
- Theme: auto-detects OS `prefers-color-scheme` with manual toggle stored in `localStorage`
- One-Time Passcode: generated offline via `/v3/keyboardPwd/get` with `keyboardPwdType: 1` (valid for 6 hours)

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Check current OAuth token authentication status |
| `/api/locks/enriched` | GET | All locks with real-time last open timestamp |
| `/api/locks` | GET | All raw locks |
| `/api/locks/:lockId` | GET | Lock detailed specifications |
| `/api/locks/:lockId/records` | GET | Paginated unlock record logs |
| `/api/locks/:lockId/gateway` | GET | Lock's connected gateway info and signal |
| `/api/locks/:lockId/passcode` | POST | Generate algorithmic offline One-Time Passcode (6 hours) |
| `/api/locks/:lockId/unlock` | POST | Remote unlock lock via WiFi Gateway |
| `/api/gateways` | GET | All registered gateways |
| `/api/gateways/:gatewayId/topology` | GET | Gateway topology (cached 5s) |

## File Structure

```
TTLOCK/
├── LICENSE
├── README.md
├── AGENTS.md
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.web
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── README.md
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config.ts
│       ├── main.ts
│       ├── routes/
│       │   └── ttlock.routes.ts
│       └── services/
│           └── ttlock.service.ts
└── web/
    ├── README.md
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    ├── public/
    │   ├── favicon.png
    │   └── ttlock-logo.webp
    └── src/
        ├── App.tsx
        ├── api/               # client.ts, types.ts
        ├── components/        # LockHistorySection, AllLockboxesSection, PasscodeModal, UnlockTerminal, InlineTopology, etc.
        ├── hooks/             # useTheme, useCountdown
        ├── lib/               # format.ts, utils.ts
        └── topology/          # topology-canvas.ts
```
