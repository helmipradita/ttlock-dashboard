# Panduan Deployment & Konfigurasi

Dokumen ini menjelaskan langkah-langkah deployment, konfigurasi environment variables, alur build Docker, cara menjalankan langsung menggunakan image Docker Hub (tanpa clone repo), dan panduan troubleshooting untuk **TTLOCK Dashboard**.

---

## 1. Konfigurasi Environment Variables (`.env`)

Konfigurasi aplikasi dikelola melalui file `backend/.env`.

Salin template konfigurasi:
```bash
cp backend/.env.example backend/.env
```

Isi variabel sesuai akun TTLOCK Developer Anda:
```env
# ID Aplikasi dari TTLOCK Developer Portal (https://open.ttlock.com)
CLIENT_ID=your_client_id

# Secret Aplikasi dari TTLOCK Developer Portal
CLIENT_SECRET=your_client_secret

# Username / Email akun TTLOCK APP
USERNAME=your_ttlock_account@domain.com

# Password akun TTLOCK dalam format MD5 Hash (huruf kecil)
PASSWORD=your_md5_hashed_password

# Port internal server (opsional, default: 5757 lokal / 5000 di docker)
PORT=5757
```

---

## 2. Cara Cepat: Menjalankan Langsung via Image Docker Hub (Tanpa Clone Source Code)

Jika Anda hanya ingin langsung memakai aplikasi di server atau komputer lokal tanpa perlu meng-clone seluruh source code, Anda dapat menggunakan image container yang sudah di-bundle (*pre-built*) dari **Docker Hub** atau **GitHub Container Registry (GHCR)**.

### Opsi A: Menggunakan File `docker-compose.yml` Sederhana (Direkomendasikan)

1. Buat direktori baru dan buat file `docker-compose.yml`:
   ```yaml
   services:
     backend:
       image: helmipradita/ttlock-backend:latest
       environment:
         - CLIENT_ID=your_client_id
         - CLIENT_SECRET=your_client_secret
         - USERNAME=your_ttlock_email
         - PASSWORD=your_md5_password
         - PORT=5000
       expose:
         - "5000"
       restart: unless-stopped

     web-nginx:
       image: helmipradita/ttlock-web-nginx:latest
       ports:
         - "5757:5757"
       depends_on:
         - backend
       restart: unless-stopped
   ```

2. Jalankan container:
   ```bash
   docker compose up -d
   ```
   Aplikasi akan otomatis mengunduh image dari Docker Hub dan langsung aktif di **`http://localhost:5757`**.

---

### Opsi B: Menggunakan Perintah `docker run` Langsung

Jika tidak ingin membuat file konfigurasi sama sekali:

```bash
# 1. Buat bridge network
docker network create ttlock-net

# 2. Jalankan Backend Container
docker run -d --name ttlock-backend --network ttlock-net \
  -e CLIENT_ID="your_client_id" \
  -e CLIENT_SECRET="your_client_secret" \
  -e USERNAME="your_ttlock_email" \
  -e PASSWORD="your_md5_password" \
  -e PORT="5000" \
  helmipradita/ttlock-backend:latest

# 3. Jalankan Web Nginx Frontend Container
docker run -d --name ttlock-web --network ttlock-net \
  -p 5757:5757 \
  helmipradita/ttlock-web-nginx:latest
```

---

## 3. Menjalankan dari Source Code (Clone Repository)

Metode ini cocok bagi pengembang yang ingin mengubah kode sumber (source code):

### A. Menjalankan Seluruh Aplikasi
```bash
# 1. Clone repository
git clone https://github.com/helmipradita/ttlock-dashboard.git
cd ttlock-dashboard

# 2. Siapkan file environment
cp backend/.env.example backend/.env

# 3. Jalankan build & start container
docker compose up -d --build
```
Aplikasi akan tersedia di: **`http://localhost:5757`**

> **Catatan Teknis Build:**
> Saat menggunakan Docker Compose, Anda **TIDAK PERLU** menjalankan `npm run build` di komputer lokal secara manual. Dockerfile (`Dockerfile.web` dan `Dockerfile.backend`) sudah menggunakan teknik **Multi-stage Build** yang otomatis meng-install dependensi dan meng-compile build produksi langsung di dalam container.

### B. Rebuild Per-Service (Efisien saat ada perubahan kode)
* **Jika hanya mengubah Frontend (Web React):**
  ```bash
  docker compose up -d --build web-nginx
  ```
* **Jika hanya mengubah Backend (Express/TypeScript):**
  ```bash
  docker compose up -d --build backend
  ```

### C. Menghentikan Layanan
```bash
docker compose down
```

---

## 4. Alokasi Resource Container

Pengaturan batas resource pada `docker-compose.yml`:

| Layanan | Batas CPU | Batas Memori | Reservasi CPU | Reservasi Memori |
|---|---|---|---|---|
| **backend** | 2 Core | 512 MB | 0.5 Core | 256 MB |
| **web-nginx** | 1 Core | 256 MB | 0.25 Core | 128 MB |

---

## 5. Troubleshooting Umum

1. **Error: Invalid Client / Invalid Account (-10001, -10007)**:
   - Pastikan nilai `CLIENT_ID`, `CLIENT_SECRET`, dan `PASSWORD` MD5 di `backend/.env` sudah benar dan tidak ada spasi di ujung teks.
2. **Error: Remote unlock not enabled (-4043)**:
   - Buka aplikasi TTLOCK di smartphone $\rightarrow$ Pilih Lockbox $\rightarrow$ Settings $\rightarrow$ Aktifkan fitur *Remote Unlock*.
3. **Port 5757 bentrok**:
   - Ganti port mapping pada `docker-compose.yml` di bagian `web-nginx`:
     ```yaml
     ports:
       - "5858:5757" # ganti 5757 pertama dengan port yang diinginkan
     ```
