# TTLOCK Dashboard

Aplikasi web modern untuk **pemantauan (monitoring), telemetri perangkat keras, dan pengelolaan armada** Smart Lock & Gateway TTLOCK. Menampilkan status lockbox secara realtime, riwayat pembukaan, visualisasi topologi gateway interaktif, pembuatan PIN offline, pembukaan kunci jarak jauh, dan ekspor laporan diagnostik perangkat keras dalam format PDF.

[![Version](https://img.shields.io/badge/Version-1.2.0-emerald.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![GHCR Packages](https://img.shields.io/badge/GHCR-Images_Available-2088FF?logo=github&logoColor=white)](https://github.com/helmipradita/ttlock-dashboard/pkgs/container/ttlock-backend)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](web/)
[![Express](https://img.shields.io/badge/Express.js-Backend-black?logo=express)](backend/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](web/tsconfig.json)

---

## 📑 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur Singkat](#-arsitektur-singkat)
- [Panduan Memulai Cepat (Quick Start)](#-panduan-memulai-cepat-quick-start)
- [Dokumentasi Lengkap](#-dokumentasi-lengkap)
- [Daftar Endpoint API](#-daftar-endpoint-api)
- [Sponsors & Backers](#-sponsors--backers)
- [Lisensi](#-lisensi)

---

## ✨ Fitur Utama

- 🔑 **Offline One-Time Passcode**: Pembuatan PIN satu kali pakai secara instan (berlaku 6 jam) berbasis algoritma sinkronisasi waktu TTLOCK tanpa membutuhkan koneksi gateway internet.
- 🔓 **Remote Unlock**: Perintah buka kunci jarak jauh secara instan melalui Gateway WiFi yang terhubung.
- 📄 **Hardware Diagnostics PDF Export**: Ekspor laporan telemetri hardware A4 sekali klik via `jspdf` (lazy loaded) yang merinci gateway offline, peringkat sinyal lemah (< -85 dBm), peringatan baterai, dan lockbox unlinked.
- 📡 **Live Signal Telemetry & Stale Detection**: Deteksi kualitas sinyal RSSI per lockbox. Jika gateway offline, status otomatis menjadi `GW Offline` / `GW Down`. Snapshot sinyal > 15 menit ditandai dengan ikon jam amber dan tooltip waktu scan.
- 🚦 **Fleet Triage Filters**: Filter cepat armada lockbox berdasarkan kondisi kritis: *All*, *Needs Attention*, *Weak Signal*, *No Gateway*, *Battery ≤ 20%*, dan *Connected*.
- 🌐 **Interactive Gateway Topology**: Visualisasi grafis hubungan Gateway $\leftrightarrow$ Lockbox dengan indikator kekuatan sinyal (RSSI), status online/offline, animasi edge, dan kanvas interaktif (pan, zoom, drag).
- 🔍 **Pencarian Cerdas & Autocomplete**: Pencarian cepat instan dengan endpoint berkecepatan tinggi (`/api/locks`), pintasan keyboard `/` atau `Ctrl+K`, dan pencocokan Lock ID, Nama, atau Alias.
- 🌓 **Dark & Light Mode**: Deteksi otomatis preferensi OS pengguna dengan tombol pengubah mode manual dan persistensi `localStorage`.
- ⚡ **Fail-Fast Environment**: Backend memvalidasi variabel `TTLOCK_*` secara ketat saat proses inisialisasi boot untuk mencegah silent failure.
- 🔄 **Auto-Token Management**: Manajemen token OAuth2 otomatis dengan pembaruan token (*auto-refresh*) berkala 24 jam sebelum kadaluarsa.

---

## 📐 Arsitektur Singkat

```mermaid
graph TB
    subgraph Klien["Browser / Klien"]
        UI["React 19 SPA (Vite + TypeScript)"]
        Theme["Theme Manager (Dark / Light)"]
        PdfGen["PDF Telemetry Generator (jsPDF)"]
        UI --- Theme
        UI --- PdfGen
    end

    subgraph Docker["Docker Host (Port 5757)"]
        Nginx["Nginx Reverse Proxy & Static Server"]
        Backend["Express.js API Service (:5000)"]
        Nginx -->|"/api/*"| Backend
        Nginx -->|"Static Build"| UI
    end

    subgraph External["Cloud Provider"]
        TTLock["TTLOCK Open Platform API v3"]
        Backend -->|"OAuth2 HTTPS"| TTLock
    end
```

Untuk rincian diagram data flow, sequence diagram, dan component tree lengkap, silakan lihat [Dokumentasi Arsitektur](docs/ARCHITECTURE.md).

---

## 🚀 Panduan Memulai Cepat (Quick Start)

Pilih salah satu metode yang paling sesuai dengan kebutuhan Anda:

### 📦 Opsi 1: Menjalankan Langsung via Container Image (Tanpa Clone Source Code)

Cocok bagi pengguna yang hanya ingin langsung menjalankan aplikasi di server atau komputer lokal tanpa meng-compile kode sumber.

1. Buat file `docker-compose.yml` di folder mana saja:
   ```yaml
   services:
     backend:
       image: ghcr.io/helmipradita/ttlock-backend:latest
       environment:
         - TTLOCK_CLIENT_ID=your_client_id
         - TTLOCK_CLIENT_SECRET=your_client_secret
         - TTLOCK_USERNAME=your_ttlock_email@example.com
         - TTLOCK_PASSWORD_MD5=your_md5_password
         - PORT=5000
       expose:
         - "5000"
       restart: unless-stopped

     web-nginx:
       image: ghcr.io/helmipradita/ttlock-web-nginx:latest
       ports:
         - "5757:5757"
       depends_on:
         - backend
       restart: unless-stopped
   ```
2. Jalankan perintah:
   ```bash
   docker compose up -d
   ```
3. Buka browser di **`http://localhost:5757`**.

---

### 💻 Opsi 2: Menjalankan dari Source Code (Clone Repository)

Cocok bagi pengembang yang ingin memodifikasi atau mengembangkan kode aplikasi.

```bash
# 1. Clone repository
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# 2. Siapkan file konfigurasi environment
cp backend/.env.example backend/.env
# Isi TTLOCK_CLIENT_ID, TTLOCK_CLIENT_SECRET, TTLOCK_USERNAME, dan TTLOCK_PASSWORD_MD5 pada backend/.env

# 3. Jalankan aplikasi (Otomatis build di dalam Docker)
docker compose up -d --build

# 4. Buka di browser
# http://localhost:5757
```

> **Tips Build:** Anda **tidak perlu** menjalankan `npm run build` lokal sebelum `docker compose up`, karena Dockerfile sudah menggunakan multi-stage build otomatis dan `.dockerignore` telah dikonfigurasi optimal.

---

## 📚 Dokumentasi Lengkap

Untuk panduan mendalam dan spesifikasi teknis, kunjungi dokumen di folder `docs/`:

| Dokumen | Deskripsi |
|---|---|
| 📐 [**Arsitektur Sistem**](docs/ARCHITECTURE.md) | Diagram interaksi modul, sequence diagram telemetri, passcode & unlock, serta arsitektur container. |
| 🛠️ [**Spesifikasi Tech Stack**](docs/TECH_STACK.md) | Rincian lengkap teknologi frontend, backend, PDF reporting, dan library yang digunakan. |
| 🔌 [**Referensi API**](docs/API_REFERENCE.md) | Kontrak request & response API internal serta pemetaan kode error TTLOCK. |
| 🚀 [**Panduan Deployment**](docs/DEPLOYMENT.md) | Konfigurasi variabel environment, alokasi memori container, dan troubleshooting. |
| 📋 [**Catatan Perubahan (Changelog)**](CHANGELOG.md) | Riwayat rilis fitur dan perbaikan bug tiap versi. |

---

## 🔌 Daftar Endpoint API

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/auth/status` | Mengecek status autentikasi OAuth2 token TTLOCK |
| `GET` | `/api/locks/enriched` | Mengambil seluruh daftar lockbox dengan data `lastOpen` realtime, RSSI, dan status gateway |
| `GET` | `/api/locks` | Mengambil daftar cepat seluruh lockbox untuk autocomplete search |
| `GET` | `/api/locks/:lockId` | Mengambil rincian spesifikasi teknis lockbox |
| `GET` | `/api/locks/:lockId/records` | Mengambil log riwayat pembukaan kunci secara paginated |
| `GET` | `/api/locks/:lockId/gateway` | Mengambil info gateway dan sinyal RSSI yang terhubung ke lockbox |
| `POST` | `/api/locks/:lockId/passcode` | **Membuat One-Time Passcode offline (berlaku 6 jam)** |
| `POST` | `/api/locks/:lockId/unlock` | **Mengirim perintah buka kunci jarak jauh via Gateway WiFi** |
| `GET` | `/api/gateways` | Mengambil daftar seluruh Gateway yang terdaftar |
| `GET` | `/api/gateways/:gatewayId/topology` | Mengambil topologi Gateway $\leftrightarrow$ Lockbox (cache 30 detik) |

---

## 💖 Sponsors & Backers

Proyek ini didukung oleh program open-source:

<table>
  <tr>
    <td align="center" width="220">
      <a href="https://termius.com/" target="_blank" rel="noopener noreferrer">
        <img src="https://raw.githubusercontent.com/helmipradita/ttlock-dashboard/main/.github/assets/termius-logo.svg" width="180" alt="Termius" />
      </a>
    </td>
    <td>
      <a href="https://termius.com/" target="_blank" rel="noopener noreferrer"><strong>Termius</strong></a> provides a secure, reliable, and collaborative SSH client and terminal console across desktop and mobile devices.
    </td>
  </tr>
</table>

---

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi open source [**MIT License**](LICENSE).

Hak Cipta (c) 2026 Helmi Pradita.
