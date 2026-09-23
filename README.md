# TTLOCK Dashboard

Web dashboard untuk **monitoring** smart lock TTLOCK (read-only). Menampilkan info lock, riwayat pembukaan, status semua lockbox, dan **topologi gateway** dalam satu halaman.

> **Catatan:** Dashboard ini bersifat **ephemeral** — hanya dijalankan saat dibutuhkan, lalu dihentikan setelah selesai digunakan.

## Features

- **Auto Login** — Otomatis login ke TTLOCK API saat server start
- **Lock History** — Cek riwayat pembukaan berdasarkan Lock ID
- **All Lockboxes** — List semua lockbox dengan last open time (dari cache server, auto-refresh 5 menit)
- **Sortable Table** — Sort semua kolom ascending/descending
- **Gateway List** — List semua gateway dengan jumlah lockbox tersambung, status online/offline
- **Gateway Topology** — Visual interaktif (canvas) gateway → lockbox, animasi garis, RSSI per koneksi, refresh 1 detik, drag/pan/zoom, posisi disimpan di localStorage
- **Smart Pagination** — Pagination efisien untuk ribuan records
- **Account Info** — Info akun dan status token di header

## Tech Stack

- **Backend**: Express.js + TypeScript
- **Frontend**: HTML + CSS + Vanilla JavaScript + Canvas API
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
cp .env.example .env   # Isi credential TTLock
cd ..

# Run
docker compose up -d

# Buka browser
# http://localhost:5757
```

## Deployment Notes

Dashboard ini bersifat **temporary** — gunakan hanya saat diperlukan.

- Setelah selesai digunakan, **wajib menghentikan** service:
  ```bash
  # Docker
  docker compose down

  # Atau jika menjalankan manual
  # Ctrl+C pada terminal backend
  ```
- Jika menggunakan **ngrok**, URL bersifat rotasi/temporer dan tidak boleh dibiarkan tetap aktif.
- Credential di `backend/.env` bersifat rahasia — jangan commit atau bagikan publik.

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
├── Dockerfile
├── docker-compose.yml
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.ts       # Express entry point
│       ├── config.ts     # Load environment
│       ├── services/
│       │   └── ttlock.service.ts
│       └── routes/
│           └── ttlock.routes.ts
├── frontend/
│   ├── index.html        # Tab nav + sections + topology overlay
│   ├── style.css         # Styling + topology overlay
│   ├── app.js            # Main logic + gateway table
│   └── topology.js       # Canvas topology renderer
```

## License

MIT
