# TTLOCK Dashboard

Web dashboard untuk **monitoring** smart lock TTLOCK (read-only). Menampilkan info lock, riwayat pembukaan, status semua lockbox, dan **topologi gateway** dalam satu halaman.

> **Catatan:** Dashboard ini bersifat **ephemeral** — hanya dijalankan saat dibutuhkan, lalu dihentikan setelah selesai digunakan.

## Features

- **Auto Login** — Otomatis login ke TTLOCK API saat server start
- **Lock History** — Cek riwayat pembukaan berdasarkan Lock ID
- **All Lockboxes** — List semua lockbox dengan last open time (auto-refresh 5 menit)
- **Sortable Table** — Default smart sort: lockbox by gateway-first + last open terbaru, gateways by online-first. Klik header kolom untuk ubah sort
- **Gateway List** — List semua gateway dengan jumlah lockbox tersambung, status online/offline
- **Gateway Topology** — Visual interaktif (canvas) gateway → lockbox, animasi garis, RSSI per koneksi, refresh 1 detik, drag/pan/zoom, posisi disimpan di localStorage
- **Smart Pagination** — Pagination efisien untuk ribuan records
- **Account Info** — Info akun dan status token di header

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: React + TypeScript + Vite + shadcn/ui + TanStack Query + Tailwind CSS
- **Production**: nginx (reverse proxy + static) + Node.js backend
- **API**: TTLOCK Open Platform API v3

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

**Arsitektur Docker:**
- `web-nginx` — nginx serve static React build + reverse proxy `/api/*` → backend (port 5757)
- `backend` — Express API server (listen port 5000 internal, tidak expose ke host)

**Resource limits (per service):**
- `backend`: 2 CPU / 512 MB RAM limit, 0.5 CPU / 256 MB RAM reserve
- `web-nginx`: 1 CPU / 256 MB RAM limit, 0.25 CPU / 128 MB RAM reserve

**Rebuild per-service (hemat waktu saat cuma satu bagian yang berubah):**
```bash
# Hanya frontend berubah
docker compose up -d --build web-nginx

# Hanya backend berubah
docker compose up -d --build backend

# Keduanya berubah
docker compose up -d --build
```

## Deployment Notes

Dashboard ini bersifat **temporary** — gunakan hanya saat diperlukan.

- Setelah selesai digunakan, **wajib menghentikan** service:
  ```bash
  docker compose down
  ```
- Jika menggunakan **ngrok**, URL bersifat rotasi/temporer dan tidak boleh dibiarkan tetap aktif.
- Credential di `backend/.env` bersifat rahasia — jangan commit atau bagikan publik.

## Environment Variables

```env
CLIENT_ID=your_app_id           # Dari TTLOCK developer portal
CLIENT_SECRET=your_app_secret   # Dari TTLOCK developer portal
USERNAME=your_ttlock_email      # Akun TTLock APP (email)
PASSWORD=your_md5_password      # Password dalam MD5 hash
PORT=5757                       # Default backend port (Docker override ke 5000)
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Status autentikasi |
| `/api/locks/enriched` | GET | List semua lockbox + last open (cached) |
| `/api/locks` | GET | List semua lockbox (raw) |
| `/api/locks/:lockId` | GET | Detail lockbox |
| `/api/locks/:lockId/records` | GET | Riwayat pembukaan |
| `/api/locks/:lockId/gateway` | GET | Info gateway lockbox |
| `/api/gateways` | GET | List semua gateway (paginated) |
| `/api/gateways/:gatewayId/topology` | GET | Topologi gateway + lockbox (cached 5s, single-flight) |

## Project Structure

```
TTLOCK/
├── docker-compose.yml       # nginx + backend (2 services, 1 port)
├── Dockerfile.backend       # Build backend TS → Node runtime
├── Dockerfile.web           # Build React → nginx static
├── nginx/nginx.conf         # Reverse proxy /api → backend, SPA static
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.ts          # Express entry point
│       ├── config.ts        # Load environment
│       ├── services/
│       │   └── ttlock.service.ts
│       └── routes/
│           └── ttlock.routes.ts
├── web/                     # React + Vite + shadcn/ui
│   ├── vite.config.ts
│   ├── components.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/             # Typed API client
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── topology/        # Canvas topology renderer
│   └── package.json
```

## License

MIT
