# Spesifikasi Tech Stack & Tools

Dokumen ini memuat rincian lengkap teknologi, pustaka (libraries), dan peralatan pengembangan yang digunakan dalam **TTLOCK Dashboard**.

---

## 1. Frontend (Web Application)

| Kategori | Teknologi | Versi | Alasan Penggunaan & Peran |
|---|---|---|---|
| **Core Framework** | React | 19.x | Library antarmuka komponen modern dengan performa tinggi. |
| **Language** | TypeScript | 5.x | Keamanan tipe statis untuk kontrak data API dan properti komponen. |
| **Bundler / Build** | Vite | 5.4.x | Fast HMR (Hot Module Replacement) dan optimalisasi bundle produksi. |
| **State & Data Fetching** | TanStack Query | v5 | Manajemen cache server-state, auto polling, dan revalidasi instan. |
| **UI Components** | shadcn/ui + Radix / Base UI | Latest | Komponen UI aksesibel berbasis headless primitives. |
| **Styling** | Tailwind CSS | v4.x | Utility-first CSS dengan dukungan native custom themes dan color variables. |
| **Icons** | Lucide React | Latest | Kumpulan icon SVG modern dan konsisten. |
| **PDF Reporting** | jsPDF & jspdf-autotable | v4.x / v5.x | Ekspor laporan diagnostik perangkat keras ke format PDF A4 secara client-side (lazy loaded). |
| **Grafis Topologi** | HTML5 Canvas API | Native | Rendering interaktif grafis topologi dengan animasi rotasi & dragging tanpa overhead DOM. |

---

## 2. Backend (API Gateway & Integration Service)

| Kategori | Teknologi | Versi | Alasan Penggunaan & Peran |
|---|---|---|---|
| **Runtime** | Node.js | 22.x (LTS) | Runtime JavaScript asynchronous berbasis V8 engine. |
| **Framework** | Express.js | 4.x | Minimalist & fast HTTP web server routing framework. |
| **Language** | TypeScript | 5.x | Type checking dan kompilasi modul backend yang andal. |
| **Konfigurasi** | dotenv + requireEnv | 16.x | Fail-fast environment variable validation. Boot gagal langsung jika env wajib hilang. |
| **HTTP Client** | Native Fetch API | Node 22 native | Melakukan request HTTP form-urlencoded ke TTLOCK Cloud API tanpa dependensi eksternal berat. |

---

## 3. Web Server & Kontainerisasi

| Komponen | Teknologi | Peran |
|---|---|---|
| **Reverse Proxy** | Nginx Alpine | Meneruskan request `/api/*` ke backend port 5000 dan melayani file statis frontend di port 5757. |
| **Container Engine** | Docker & Docker Compose | Standardisasi lingkungan build (multi-stage) dan runtime terisolasi. |
| **CI/CD Registry** | GitHub Container Registry (GHCR) | Otomatisasi build & publish multi-tag image container (`latest` & tag rilis) via GitHub Actions. |

---

## 4. Layanan Pihak Ketiga

| Layanan | Deskripsi |
|---|---|
| **TTLOCK Open Platform API v3** | REST API resmi dari TTLOCK (Sciener) untuk otentikasi OAuth2, monitoring lockbox, riwayat buka kunci, pembacaan gateway, pembuatan PIN keyboardPwd, dan perintah remote unlock. |
