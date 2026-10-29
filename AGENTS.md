# TTLOCK Dashboard — AI Context

Monitoring and management dashboard for TTLOCK Smart Locks and Gateways. Built with React 19 + Express + TypeScript + Nginx on Docker.

## Stack & Architecture

- **Backend**: Express.js + TypeScript (port 5000 internal, exposed via Nginx at port 5757)
- **Frontend**: React 19 + Vite 5.4 + TypeScript + shadcn/ui + TanStack Query + Tailwind CSS 4 + jsPDF
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

- **Fail-Fast Config**: Backend strictly requires `TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET`, `TTLOCK_USERNAME`, `TTLOCK_PASSWORD_MD5`. Missing variables throw an immediate error during boot.
- **Topology Cache**: Gateway topology is cached for 30s with single-flight request coalescing to protect TTLock API rate limits.
- **Enriched Telemetry**: `/api/locks/enriched` maps the best gateway signal (RSSI), scan timestamp (`rssiUpdateDate`), and gateway online status.
- **Stale Signal Rule**: Readings older than 15 minutes are flagged with an amber clock icon and descriptive snapshot tooltip.
- **Gateway Offline Rule**: If a gateway goes down, lockbox status reflects `GW Down` / `GW Offline` instead of presenting obsolete signal numbers.
- **Diagnostics PDF Export**: Generates client-side A4 telemetry reports via `jspdf` + `jspdf-autotable`, dynamically imported to preserve bundle efficiency.
- **Theme**: Auto-detects OS `prefers-color-scheme` with manual toggle stored in `localStorage`.
- **One-Time Passcode**: Generated offline via `/v3/keyboardPwd/get` with `keyboardPwdType: 1` (valid for 6 hours).

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Check current OAuth token authentication status |
| `/api/locks/enriched` | GET | All locks with real-time last open timestamp, RSSI, and gateway online status |
| `/api/locks` | GET | All raw locks (fast endpoint for autocomplete search) |
| `/api/locks/:lockId` | GET | Lock detailed specifications |
| `/api/locks/:lockId/records` | GET | Paginated unlock record logs |
| `/api/locks/:lockId/gateway` | GET | Lock's connected gateway info and signal |
| `/api/locks/:lockId/passcode` | POST | Generate algorithmic offline One-Time Passcode (6 hours) |
| `/api/locks/:lockId/unlock` | POST | Remote unlock lock via WiFi Gateway |
| `/api/gateways` | GET | All registered gateways |
| `/api/gateways/:gatewayId/topology` | GET | Gateway topology (cached 30s) |

## File Structure

```
TTLOCK/
├── .github/
│   ├── FUNDING.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── config.yml
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── assets/
│   │   ├── termius-logo.png
│   │   ├── termius-logo-white.png
│   │   └── termius-logo.svg
│   └── workflows/
│       └── docker-publish.yml
├── .dockerignore
├── LICENSE
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
├── CHANGELOG.md
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
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── test/
│   │   └── ttlock.test.ts
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
    ├── test/
    │   └── format.test.ts
    ├── public/
    │   ├── favicon.png
    │   └── ttlock-logo.webp
    └── src/
        ├── App.tsx
        ├── api/               # client.ts, types.ts
        ├── components/        # LockHistorySection, AllLockboxesSection, PasscodeModal, UnlockTerminal, InlineTopology, etc.
        ├── hooks/             # useTheme, useCountdown
        ├── lib/               # format.ts, utils.ts, pdf-report.ts
        └── topology/          # topology-canvas.ts
```
