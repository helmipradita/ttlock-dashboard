# TTLOCK Dashboard — Frontend (Web Application)

Aplikasi antarmuka web modern berbasis **React 19 + Vite 5.4 + TypeScript + Tailwind CSS v4 + shadcn/ui**.

---

## 1. Fitur Antarmuka

- **Dark & Light Mode**: Deteksi otomatis preferensi tema sistem operasi pengguna dengan tombol toggle switcher manual dan penyimpanan state di `localStorage`.
- **Smart Autocomplete Search**: Pencarian cepat instan dengan endpoint ringan (`/api/locks`), pintasan keyboard `/` atau `Ctrl+K`, dan pencocokan Lock ID, Nama, atau Alias.
- **Hardware Diagnostics PDF Export**: Ekspor laporan telemetri hardware sekali klik via `jspdf` + `jspdf-autotable` (lazy loaded).
- **Fleet Triage Filters**: Filter cepat status armada (*All*, *Needs Attention*, *Weak Signal*, *No Gateway*, *Battery ≤ 20%*, *Connected*).
- **Live Signal Telemetry**: Indikator kekuatan sinyal RSSI kompak (single-line) dengan deteksi snapshot basi (> 15m) dan peringatan gateway offline.
- **Passcode Modal**: Dialog pembuatan One-Time Passcode offline (6 jam) dengan tampilan kode monospace besar dan tombol 1-klik copy.
- **Remote Unlock Dialog**: Antarmuka pembukaan kunci via gateway dengan konfirmasi aman dan status respons visual.
- **Interactive Gateway Topology**: Canvas interaktif yang menampilkan hubungan Gateway $\leftrightarrow$ Lockbox dengan pewarnaan RSSI dan kemampuan adaptasi tema gelap/terang.
- **Tabel Multi-Sorting**: Kemampuan pengurutan data lockbox dan gateway berdasarkan status online, nama WiFi, alias, dan aktivitas terakhir.

---

## 2. Struktur Direktori

```
web/
├── public/
│   ├── favicon.png            # Icon tab browser
│   └── ttlock-logo.webp       # Logo TTLock
├── src/
│   ├── api/                   # Typed API client & interfaces
│   ├── components/
│   │   ├── layout/            # AppHeader, ThemeToggle
│   │   ├── ui/                # Primitif komponen shadcn/ui
│   │   ├── AllLockboxesSection.tsx
│   │   ├── GatewaysSection.tsx
│   │   ├── InlineTopology.tsx
│   │   ├── LockHistorySection.tsx
│   │   ├── PasscodeModal.tsx
│   │   ├── UnlockTerminal.tsx
│   │   └── status.tsx
│   ├── hooks/                 # useTheme, useCountdown
│   ├── lib/                   # Utility formatting, styling, pdf-report.ts
│   └── topology/              # Engine canvas renderer topologi
├── index.html
├── package.json
└── vite.config.ts
```

---

## 3. Menjalankan Secara Mandiri (Development Lokal)

```bash
# 1. Masuk ke folder web
cd web

# 2. Install dependensi
npm install

# 3. Jalankan server development
npm run dev
# Buka http://localhost:5173 (request /api otomatis di-proxy ke backend :5757)
```
*(Catatan: Jika memakai Docker, proses build sudah otomatis berjalan di dalam container).*
