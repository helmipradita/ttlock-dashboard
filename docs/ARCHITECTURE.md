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
        PdfGen["PDF Telemetry Generator (jsPDF + autoTable)"]
        SPA --- ThemeCtrl
        SPA --- PdfGen
    end

    subgraph ContainerProxy["Container: web-nginx (:5757)"]
        NginxProxy["Nginx Web Server"]
        StaticDist["Static Assets (HTML / JS / CSS)"]
        NginxProxy -->|"Serve Static"| StaticDist
    end

    subgraph ContainerBackend["Container: backend (:5000)"]
        ExpressApp["Express.js Server"]
        ConfigFailFast["Fail-Fast Config (requireEnv)"]
        AuthService["OAuth2 Token Manager"]
        LockService["TTLock Service Client"]
        SignalMapper["Gateway Signal & Telemetry Mapper"]
        TopoCache["Topology Cache (TTL 30s)"]

        ExpressApp --> ConfigFailFast
        ExpressApp --> AuthService
        ExpressApp --> LockService
        LockService --> SignalMapper
        SignalMapper --> TopoCache
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

### C. Alur Telemetri Sinyal & Enrich Lockbox (`/api/locks/enriched`)
Mengagregasi sinyal RSSI terbaik dari seluruh gateway secara paralel, memprioritaskan gateway yang online, dan menyertakan timestamp pembacaan sinyal (`rssiUpdateDate`).

```mermaid
sequenceDiagram
    autonumber
    participant Client as React Dashboard
    participant Backend as Express Backend
    participant Cache as Topology Cache (30s)
    participant TTLock as TTLOCK Cloud API

    Client->>Backend: GET /api/locks/enriched
    par Fetch Lock List & Gateway List
        Backend->>TTLock: POST /v3/lock/list (all locks)
        Backend->>TTLock: POST /v3/gateway/list (all gateways)
    end
    Backend->>Cache: Cek topologi gateway
    alt Cache Miss / Expired
        Backend->>TTLock: POST /v3/gateway/listLock (per gateway)
        Backend->>Cache: Simpan topologi (TTL 30 detik)
    else Cache Hit
        Backend->>Cache: Ambil data topologi tersimpan
    end
    Backend->>Backend: Map lockId -> Sinyal RSSI terbaik & status Gateway
    Backend->>TTLock: Batch POST /v3/lockRecord/list (fetch lastOpen)
    Backend-->>Client: { list: [ { lockId, lastOpen, rssi, rssiUpdateDate, gatewayId, gatewayName, networkName, gatewayIsOnline } ] }
```

---

### D. Alur Ekspor Laporan Diagnostik Telemetri (PDF)
Laporan hardware diagnostik dibuat secara client-side menggunakan `jspdf` dan `jspdf-autotable`. Library diimpor secara dinamis (*lazy load*) agar tidak membebani ukuran bundle awal aplikasi.

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant Header as AppHeader.tsx
    participant PdfEngine as pdf-report.ts (Lazy Loaded)
    participant API as Backend API (:5000)

    User->>Header: Klik "Download Report (PDF)"
    Header->>PdfEngine: generateTtlockPdfReport()
    par Fetch Enriched Locks & Gateways & Topology
        PdfEngine->>API: GET /api/locks/enriched
        PdfEngine->>API: GET /api/gateways
        PdfEngine->>API: GET /api/gateways/:id/topology
    end
    PdfEngine->>PdfEngine: Filter grup kritis (Gateway Offline, Sinyal Lemah < -85 dBm, Low Battery)
    PdfEngine->>PdfEngine: Render A4 PDF & Simpan File (ttlock-signal-report-*.pdf)
    PdfEngine-->>Header: Return Nama File
    Header-->>User: Trigger Browser Download + Tampilkan Notifikasi Sukses
```

---

### E. Aturan Logika Sinyal & Stale Signal

```mermaid
flowchart TD
    Start["Evaluasi Sinyal Lockbox"] --> CheckGW{"Apakah Lockbox memiliki Gateway?"}
    CheckGW -- "Tidak (hasGateway = 0)" --> Unlinked["Tampilkan 'Unlinked' (Direct BLE)"]
    CheckGW -- "Ya (hasGateway = 1)" --> CheckGWOnline{"Apakah Gateway Online?"}
    
    CheckGWOnline -- "Tidak (isOnline = 0)" --> GWOffline["Tampilkan 'GW Offline' (Merah) & 'GW Down'"]
    CheckGWOnline -- "Ya (isOnline = 1)" --> CheckRSSI{"Apakah RSSI terdeteksi?"}
    
    CheckRSSI -- "Null / Tidak ada" --> NoSig["Tampilkan 'No signal'"]
    CheckRSSI -- "Ada nilai dBm" --> CheckAge{"Apakah rssiUpdateDate > 15 Menit?"}
    
    CheckAge -- "Ya (Stale)" --> StaleRender["Tampilkan dBm + Icon Jam Amber<br/>Tooltip: Snapshot lama / Stale"]
    CheckAge -- "Tidak (Aktual)" --> LiveRender["Tampilkan dBm + Kualitas Sinyal (Hijau/Kuning/Merah)"]
```

---

## 3. Hierarki Komponen Frontend (Component Tree)

```mermaid
graph TD
    App["App.tsx"]
    Header["AppHeader.tsx"]
    PdfBtn["Download Report Button"]
    ThemeToggle["ThemeToggle.tsx"]
    TabsRoot["Tabs (shadcn/ui)"]
    
    TabLocks["TabsContent: Locks"]
    TabGateways["TabsContent: Gateways"]
    
    LockHist["LockHistorySection.tsx"]
    AutoComp["Fast Autocomplete Dropdown (/api/locks)"]
    UnlockTerm["UnlockTerminal.tsx (Modal)"]
    PasscodeMod["PasscodeModal.tsx (Modal)"]
    
    AllLocks["AllLockboxesSection.tsx"]
    TriageFilter["Triage Filter Bar (All, Needs Attention, Weak Signal, etc.)"]
    SignalCell["SignalDot Component (Single-line + Stale Tooltip)"]
    
    GatewaysSec["GatewaysSection.tsx"]
    InlineTopo["InlineTopology.tsx"]
    CanvasRnd["Topology Canvas (Adaptive Renderer)"]

    App --> Header
    Header --> PdfBtn
    Header --> ThemeToggle
    App --> TabsRoot
    TabsRoot --> TabLocks
    TabsRoot --> TabGateways
    
    TabLocks --> LockHist
    LockHist --> AutoComp
    LockHist --> UnlockTerm
    LockHist --> PasscodeMod
    
    TabLocks --> AllLocks
    AllLocks --> TriageFilter
    AllLocks --> SignalCell
    
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
| **`backend`** | `node:22-alpine` | 5000 | *Tidak diekspos langsung* | REST API server, OAuth2 manager, telemetry aggregator, dan TTLOCK client. |
