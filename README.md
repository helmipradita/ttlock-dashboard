# TTLOCK Dashboard

Web dashboard untuk **monitoring** smart lock TTLOCK (read-only). Menampilkan info lock, riwayat pembukaan, status semua lockbox, dan **topologi gateway** dalam satu halaman.

> **Catatan:** Dashboard ini bersifat **ephemeral** — hanya dijalankan saat dibutuhkan, lalu dihentikan setelah selesai digunakan.

## Architecture

```mermaid
graph TB
    subgraph Browser
        A[React SPA] --> B[AppHeader]
        B --> C[Lockboxes Tab]
        B --> D[Gateways Tab]
        C --> E[LockHistorySection]
        C --> F[AllLockboxesSection]
        D --> G[GatewaysSection]
        G --> H[InlineTopology]
        E --> I[UnlockTerminal]
    end

    subgraph "Docker: port 5757"
        J[nginx] -->|"/api/* proxy"| K[Express Backend :5000]
        J -->|"static assets"| L[React Build]
    end

    A -.->|axios + polling| J
    K -.->|TTLOCK API v3| M[TTLOCK Cloud]
```

## Data Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant NG as nginx :5757
    participant BE as Backend :5000
    participant TT as TTLOCK API

    Note over FE: Polling /api/locks/enriched (auto)
    FE->>NG: GET /api/locks/enriched
    NG->>BE: proxy_pass :5000
    BE->>TT: v3/lock/list + v3/lock/openRecord
    TT-->>BE: lock data + lastOpen
    BE-->>FE: enriched locks

    Note over FE: User clicks Lock ID
    FE->>NG: GET /api/locks/:id/records
    NG->>BE: proxy_pass
    BE->>TT: v3/lock/openRecord (paginated)
    TT-->>BE: unlock history
    BE-->>FE: records

    Note over FE: User clicks Unlock
    FE->>NG: POST /api/locks/:id/unlock
    NG->>BE: proxy_pass
    BE->>TT: POST v3/lock/unlock
    TT-->>BE: errcode 0 = success
    BE-->>FE: unlock result
    FE->>FE: invalidateQueries(["locks"])
```

## Docker Architecture

```mermaid
graph LR
    subgraph Host
        P[":5757"]
    end

    subgraph "web-nginx container"
        N[nginx] --> S[Static Build]
        N -->|"/api/*"| B
    end

    subgraph "backend container"
        B[Express :5000] -->|HTTP| T[TTLOCK Cloud]
    end

    P --> N
```

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|-------------|-------------|----------------|
| backend | 2 | 512M | 0.5 | 256M |
| web-nginx | 1 | 256M | 0.25 | 128M |

## Component Tree

```mermaid
graph LR
    App --> AppHeader
    App --> Tabs
    Tabs -->|"locks"| LockHistorySection
    Tabs -->|"locks"| AllLockboxesSection
    Tabs -->|"gateways"| GatewaysSection
    LockHistorySection --> StatusBadge
    LockHistorySection --> SignalDot
    LockHistorySection --> UnlockTerminal
    AllLockboxesSection --> StatusBadge
    AllLockboxesSection --> InlineGateway
    GatewaysSection --> InlineTopology
    GatewaysSection --> SignalDot
    InlineTopology --> Canvas[Canvas Renderer]
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Express.js + TypeScript |
| Frontend | React 19 + Vite 5.4 + TypeScript |
| UI | shadcn/ui + Radix UI + Lucide Icons |
| State | TanStack Query (polling, cache invalidation) |
| Styling | Tailwind CSS 4 |
| Production | nginx (reverse proxy + static) + Node.js |
| API | TTLOCK Open Platform API v3 |

## Features

- **Auto Login** — Otomatis login ke TTLOCK API saat server start
- **Lock History** — Cek riwayat pembukaan berdasarkan Lock ID
- **All Lockboxes** — List semua lockbox dengan last open time (always fresh, no cache)
- **Sortable Table** — Default smart sort: lockbox by gateway-first + last open terbaru, gateways by online-first + WiFi sortable
- **Gateway List** — List semua gateway dengan jumlah lockbox tersambung, status online/offline, expandable lockbox list (tampilkan alias duluan)
- **Gateway Topology** — Visual interaktif (canvas) gateway → lockbox, animasi garis, RSSI per koneksi, refresh 1 detik, drag/pan/zoom
- **Inline Topology** — Topologi inline di bawah tabel, bukan modal overlay
- **Unlock Terminal** — Remote unlock via gateway (TTLOCK API v3)
- **WiFi Signal Icons** — Icon WiFi berdasarkan kekuatan sinyal (Strong/Medium/Weak)
- **Smart Pagination** — Pagination efisien untuk ribuan records

## Prerequisites

- Node.js 18+ (development) / Node.js 22 (Docker)
- npm
- Docker & Docker Compose (untuk production)
- Akun TTLOCK developer (client_id, client_secret)
- Akun TTLOCK APP (username, password MD5)

## Setup

### Development (2 terminal)

```bash
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# Terminal 1: Backend
cd backend
cp .env.example .env   # Isi credential TTLOCK
npm install
npm run dev            # http://localhost:5757

# Terminal 2: Frontend
cd web
npm install
npm run dev            # http://localhost:5173 (proxy /api → :5757)
```

### Docker (production)

```bash
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# Setup env
cp backend/.env.example backend/.env   # Isi credential TTLock

# Build & run (nginx expose port 5757)
docker compose up -d --build

# Buka browser
# http://localhost:5757
```

**Rebuild per-service:**
```bash
docker compose up -d --build web-nginx   # frontend only
docker compose up -d --build backend     # backend only
docker compose up -d --build             # both
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Status autentikasi |
| `/api/locks/enriched` | GET | List semua lockbox + last open (always fresh) |
| `/api/locks` | GET | List semua lockbox (raw) |
| `/api/locks/:lockId` | GET | Detail lockbox |
| `/api/locks/:lockId/records` | GET | Riwayat pembukaan (paginated) |
| `/api/locks/:lockId/gateway` | GET | Info gateway lockbox |
| `/api/locks/:lockId/unlock` | POST | Remote unlock via gateway |
| `/api/locks/:lockId/passcode` | POST | Generate offline One-Time Passcode (6 jam) |
| `/api/gateways` | GET | List semua gateway |
| `/api/gateways/:gatewayId/topology` | GET | Topologi gateway + lockbox (cached 5s, single-flight) |

## RSSI & WiFi Signal

| Threshold | Label | Icon | Color |
|---|---|---|---|
| > -75 | Strong | `WifiHigh` | Green |
| -75 .. -85 | Medium | `Wifi` | Amber |
| < -85 | Weak | `WifiLow` | Red |
| null | Unknown | `WifiZero` | Gray |
| Disconnected | — | `WifiOff` | Gray |

Helper: `wifiIconForRssi()` dan `wifiIconForOnline()` di `status.tsx`.

## Project Structure

```
TTLOCK/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.web
├── nginx/nginx.conf
├── README.md
├── AGENTS.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.ts              # Express entry + TTLock init
│       ├── config.ts            # Env loader
│       ├── services/
│       │   └── ttlock.service.ts
│       └── routes/
│           └── ttlock.routes.ts
└── web/
    ├── vite.config.ts
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx              # Tabs: Lockboxes + Gateways
        ├── api/                 # Typed API client + types
        ├── components/
        │   ├── layout/          # AppHeader
        │   ├── ui/              # shadcn/ui primitives
        │   ├── status.tsx       # StatusBadge + SignalDot + wifi helpers
        │   ├── LockHistorySection.tsx
        │   ├── AllLockboxesSection.tsx
        │   ├── GatewaysSection.tsx
        │   └── InlineTopology.tsx
        ├── hooks/
        ├── lib/                 # format.ts, utils.ts
        └── topology/
            └── topology-canvas.ts  # Canvas renderer
```

## Environment Variables

```env
CLIENT_ID=your_app_id           # Dari TTLOCK developer portal
CLIENT_SECRET=your_app_secret   # Dari TTLOCK developer portal
USERNAME=your_ttlock_email      # Akun TTLock APP (email)
PASSWORD=your_md5_password      # Password dalam MD5 hash
PORT=5757                       # Default backend port (Docker override ke 5000)
```

## Deployment Notes

- Dashboard bersifat **temporary** — `docker compose down` setelah selesai
- **Jangan sentuh ngrok** jika ada process yang berjalan
- Credential di `backend/.env` rahasia — jangan commit

## License

MIT
