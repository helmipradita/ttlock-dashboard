# TTLOCK Dashboard

Web dashboard untuk monitoring dan management smart lock TTLOCK. Menampilkan info lock, riwayat pembukaan, dan status semua lockbox dalam satu halaman.

## Features

- **Auto Login** — Otomatis login ke TTLOCK API saat server start
- **Lock History** — Cek riwayat pembukaan berdasarkan Lock ID
- **All Lockboxes** — List semua lockbox dengan last open time
- **Auto Refresh** — Data refresh otomatis setiap 5 menit (bisa pause/resume)
- **Sortable Table** — Sort semua kolom ascending/descending
- **Gateway Info** — Info gateway (WiFi, status online, signal strength)
- **Smart Pagination** — Pagination efisien untuk ribuan records
- **Account Info** — Info akun dan status token di header

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: HTML + CSS + Vanilla JavaScript
- **API**: TTLOCK Open Platform API v3

## Prerequisites

- Node.js 18+
- npm
- Akun TTLOCK developer (client_id, client_secret)
- Akun TTLOCK APP (username, password MD5)

## Setup

### Manual

```bash
# Clone
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# Backend
cd backend
cp .env.example .env   # Isi credential TTLOCK
npm install
npm run dev

# Buka browser
# http://localhost:5757
```

### Docker

```bash
# Clone
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# Setup env
cd backend
cp .env.example .env   # Isi credential TTLOCK
cd ..

# Run
docker compose up -d

# Buka browser
# http://localhost:5757
```

## Environment Variables

```env
CLIENT_ID=your_app_id           # Dari TTLOCK developer portal
CLIENT_SECRET=your_app_secret   # Dari TTLOCK developer portal
USERNAME=your_ttlock_email      # Akun TTLock APP (email)
PASSWORD=your_md5_password      # Password dalam MD5 hash
PORT=5757
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Status autentikasi |
| `/api/locks` | GET | List semua lockbox |
| `/api/locks/:lockId` | GET | Detail lockbox |
| `/api/locks/:lockId/records` | GET | Riwayat pembukaan |
| `/api/locks/:lockId/gateway` | GET | Info gateway lockbox |
| `/api/gateways` | GET | List semua gateway |

## Project Structure

```
TTLOCK/
├── backend/
│   ├── .env              # Credential (jangan di-commit!)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts       # Express entry point
│       ├── config.ts     # Load environment
│       ├── services/
│       │   └── ttlock.service.ts
│       └── routes/
│           └── ttlock.routes.ts
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── docker-compose.yml
└── README.md
```

## License

MIT
