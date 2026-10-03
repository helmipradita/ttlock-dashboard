# Arsitektur Sistem TTLOCK Dashboard

Dokumen ini menjelaskan arsitektur perangkat lunak, diagram alur data, hierarki komponen, serta model deployment untuk **TTLOCK Dashboard**.

---

## 1. Diagram Arsitektur Keseluruhan

Aplikasi ini menggunakan pola arsitektur **Single Page Application (SPA)** yang dilayani oleh Nginx sebagai Reverse Proxy dan Static File Server, terhubung ke backend Express.js yang bertindak sebagai jembatan integrasi ke TTLOCK Open Platform API v3.

```mermaid
graph TB
    subgraph Klien["Browser / Klien"]
        SPA["React SPA (Vite + TypeScript)"]
        ThemeCtrl["Theme Controller (Light/Dark/System)"]
        SPA --- ThemeCtrl
    end

    subgraph ContainerProxy["Container: web-nginx (:5757)"]
        NginxProxy["Nginx Web Server"]
        StaticDist["Static Assets (HTML / JS / CSS)"]
        NginxProxy -->|"Serve Static"| StaticDist
    end

    subgraph ContainerBackend["Container: backend (:5000)"]
        ExpressApp["Express.js Server"]
        AuthService["OAuth2 Token Manager"]
        LockService["TTLock Service Client"]
        TopoCache["Topology Cache (TTL 5s)"]

        ExpressApp --> AuthService
        ExpressApp --> LockService
        LockService --> TopoCache
    end

    subgraph External["Layanan Pihak Ketiga"]
        TTLockCloud["TTLOCK Open Platform API v3<br/>(https://api.sciener.com)"]
    end

    SPA -->|"HTTP Request / Polling"| NginxProxy
    NginxProxy -->|"/api/* Proxy Pass"| ExpressApp
    LockService -->|"HTTPS / form-urlencoded"| TTLockCloud
```

---

## 2. Diagram Alur Data (Data Flow & Sequences)

### A. Alur Pembuatan Passcode One-Time (Offline PIN)
Passcode dibuat berdasarkan algoritma sinkronisasi waktu antara server TTLOCK dan unit fisik lockbox. **Tidak membutuhkan koneksi gateway internet.**

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant Web as React Web (PasscodeModal)
    participant Nginx as Nginx Proxy (:5757)
    participant Backend as Express API (:5000)
    participant TTLock as TTLOCK Cloud API

    User->>Web: Klik "Get PIN" pada Lock Detail
    Web->>Nginx: POST /api/locks/:lockId/passcode
    Nginx->>Backend: Proxy Pass
    Backend->>TTLock: POST /v3/keyboardPwd/get<br/>(lockId, keyboardPwdVersion=4, keyboardPwdType=1, startDate=now)
    TTLock-->>Backend: { keyboardPwd: "...", keyboardPwdId: 12345 }
    Backend-->>Web: { ok: true, keyboardPwd: "...", validHours: 6 }
    Web-->>User: Menampilkan PIN Monospace + Tombol Copy
```

---

### B. Alur Pembukaan Kunci Jarak Jauh (Remote Unlock)
Membutuhkan lockbox terhubung ke Gateway WiFi yang sedang Online, dan fitur *Remote Unlock* aktif pada aplikasi TTLOCK.

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant Web as React Web (UnlockTerminal)
    participant Nginx as Nginx Proxy (:5757)
    participant Backend as Express API (:5000)
    participant TTLock as TTLOCK Cloud API

    User->>Web: Klik "Unlock" & Klik "Confirm Unlock"
    Web->>Nginx: POST /api/locks/:lockId/unlock
    Nginx->>Backend: Proxy Pass
    Backend->>TTLock: POST /v3/lock/unlock<br/>(lockId, date=now)
    TTLock-->>Backend: { errcode: 0, errmsg: "none error message" }
    Backend-->>Web: { ok: true, human: "Success", ts: "..." }
    Web->>Web: Invalidate Cache TanStack Query ["locks"]
    Web-->>User: Tampilkan Banner Sukses
```

---

### C. Alur Siklus Hidup Autentikasi OAuth2 (Token Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    participant Backend as Express Service
    participant TTLock as TTLOCK OAuth2 Endpoint

    Note over Backend,TTLock: Saat Server Pertama Kali Start
    Backend->>TTLock: POST /oauth2/token (username, md5 password, client credentials)
    TTLock-->>Backend: { access_token, refresh_token, expires_in }
    Backend->>Backend: Simpan token & kalkulasi waktu kadaluarsa (expiresAt)

    Note over Backend,TTLock: Saat Request API Masuk
    Backend->>Backend: Cek apakah Date.now() >= expiresAt - 24 Jam?
    alt Token Mendekati Kadaluarsa (<= 24 Jam)
        Backend->>TTLock: POST /oauth2/token (grant_type=refresh_token)
        TTLock-->>Backend: { access_token, refresh_token, expires_in }
        Backend->>Backend: Perbarui access_token baru
    else Token Masih Valid
        Backend->>Backend: Gunakan token yang tersimpan di memori
    end
```

---

## 3. Hierarki Komponen Frontend (Component Tree)

```mermaid
graph TD
    App["App.tsx"]
    Header["AppHeader.tsx"]
    ThemeToggle["ThemeToggle.tsx"]
    TabsRoot["Tabs (shadcn/ui)"]
    
    TabLocks["TabsContent: Locks"]
    TabGateways["TabsContent: Gateways"]
    
    LockHist["LockHistorySection.tsx"]
    AutoComp["Autocomplete Dropdown"]
    UnlockTerm["UnlockTerminal.tsx (Modal)"]
    PasscodeMod["PasscodeModal.tsx (Modal)"]
    
    AllLocks["AllLockboxesSection.tsx"]
    GatewaysSec["GatewaysSection.tsx"]
    InlineTopo["InlineTopology.tsx"]
    CanvasRnd["Topology Canvas (Adaptive Renderer)"]

    App --> Header
    Header --> ThemeToggle
    App --> TabsRoot
    TabsRoot --> TabLocks
    TabsRoot --> TabGateways
    
    TabLocks --> LockHist
    LockHist --> AutoComp
    LockHist --> UnlockTerm
    LockHist --> PasscodeMod
    
    TabLocks --> AllLocks
    TabGateways --> GatewaysSec
    GatewaysSec --> InlineTopo
    InlineTopo --> CanvasRnd
```

---

## 4. Struktur Layanan Docker

Aplikasi dikemas dalam 2 container ringan:

| Layanan | Image Dasar | Port Internal | Port Publik | Fungsi Utama |
|---|---|---|---|---|
| **`web-nginx`** | `nginx:alpine` | 5757 | **5757** | Melayani aset build React & melakukan reverse proxy `/api/*` ke backend. |
| **`backend`** | `node:22-alpine` | 5000 | *Tidak diekspos langsung* | REST API server, OAuth2 manager, dan TTLOCK client. |
