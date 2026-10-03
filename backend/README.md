# TTLOCK Dashboard — Backend Service

Service API Gateway berbasis **Node.js + Express.js + TypeScript** yang menangani komunikasi dan otentikasi dengan TTLOCK Open Platform API v3.

---

## 1. Fitur Utama

- **Otentikasi Otomatis (OAuth2)**: Login otomatis saat startup dan pembaruan token (*auto refresh*) otomatis 24 jam sebelum masa berlaku habis.
- **Enriched Lock Query**: Pengambilan daftar lockbox dengan status waktu buka kunci terakhir secara realtime.
- **Offline Passcode Generator**: Pembuatan One-Time PIN (6 jam) secara offline via endpoint `/api/locks/:id/passcode`.
- **Remote Unlock Gateway**: Pengiriman instruksi buka kunci jarak jauh ke Gateway WiFi via endpoint `/api/locks/:id/unlock`.
- **Topology & Single-Flight Cache**: Cache memory 5 detik untuk data topologi gateway demi menghindari throttling API TTLOCK.

---

## 2. Struktur Direktori

```
backend/
├── src/
│   ├── config.ts              # Pemuat variabel environment (.env)
│   ├── main.ts                # Entry point server Express
│   ├── routes/
│   │   └── ttlock.routes.ts   # Definisi route REST API
│   └── services/
│       └── ttlock.service.ts  # TTLOCK client, OAuth2 manager, cache
├── .env.example               # Template environment
├── package.json
└── tsconfig.json
```

---

## 3. Menjalankan Secara Mandiri (Development Lokal)

```bash
# 1. Masuk ke folder backend
cd backend

# 2. Salin dan isi file .env
cp .env.example .env

# 3. Install dependensi
npm install

# 4. Jalankan mode pengembangan
npm run dev
# Server akan aktif di http://localhost:5757 (atau port di .env)
```

Untuk build produksi mandiri:
```bash
npm run build
npm start
```
*(Catatan: Jika memakai Docker, proses build sudah otomatis berjalan di dalam container).*
