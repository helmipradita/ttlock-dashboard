# TTLOCK Dashboard — System Architecture

This document outlines the software architecture, data flow sequences, frontend component hierarchy, and container deployment model for **TTLOCK Dashboard**.

---

## 1. Overall System Architecture

The application adopts a **Single Page Application (SPA)** model served by an Nginx reverse proxy and static asset server, interfaced with an Express.js backend that acts as an API gateway to the TTLOCK Open Platform API v3.

```mermaid
graph TB
    subgraph Client["Browser / Client"]
        SPA["React 19 SPA (Vite + TypeScript)"]
        ThemeCtrl["Theme Controller (Light / Dark / System)"]
        PdfGen["PDF Telemetry Generator (jsPDF + autoTable)"]
        SPA --- ThemeCtrl
        SPA --- PdfGen
    end

    subgraph ContainerProxy["Container: web-nginx (${WEB_PORT:-5757})"]
        NginxProxy["Nginx Web Server"]
        StaticDist["Static Assets (HTML / JS / CSS)"]
        NginxProxy -->|"Serve Static"| StaticDist
    end

    subgraph ContainerBackend["Container: backend (:5000)"]
        ExpressApp["Express.js Server"]
        ConfigFailFast["Fail-Fast Config (backend/.env)"]
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

    subgraph External["External Services"]
        TTLockCloud["TTLOCK Open Platform API v3<br/>(https://api.sciener.com)"]
    end

    SPA -->|"HTTP Request / On-Demand"| NginxProxy
    NginxProxy -->|"/api/* Proxy Pass"| ExpressApp
    LockService -->|"HTTPS / form-urlencoded"| TTLockCloud
```

---

## 2. Data Flow & Sequence Diagrams

### A. One-Time Offline Passcode Generation Flow
Passcodes are computed algorithmically based on shared time synchronization between TTLOCK servers and physical lockbox firmware. **No gateway internet connectivity is required.**

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / User
    participant Web as React Web (PasscodeModal)
    participant Nginx as Nginx Proxy (:5757)
    participant Backend as Express API (:5000)
    participant TTLock as TTLOCK Cloud API

    User->>Web: Click "Get PIN" on Lock Detail
    Web->>Nginx: POST /api/locks/:lockId/passcode
    Nginx->>Backend: Proxy Pass
    Backend->>TTLock: POST /v3/keyboardPwd/get<br/>(lockId, keyboardPwdVersion=4, keyboardPwdType=1, startDate=now)
    TTLock-->>Backend: { keyboardPwd: "...", keyboardPwdId: 12345 }
    Backend-->>Web: { ok: true, keyboardPwd: "...", validHours: 6 }
    Web-->>User: Display Monospace PIN + Copy to Clipboard Button
```

---

### B. Remote Unlock Command Flow
Requires the lockbox to be connected to an Online WiFi Gateway, with the *Remote Unlock* feature enabled in TTLOCK lock settings.

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / User
    participant Web as React Web (UnlockTerminal)
    participant Nginx as Nginx Proxy (:5757)
    participant Backend as Express API (:5000)
    participant TTLock as TTLOCK Cloud API

    User->>Web: Click "Unlock" & "Confirm Unlock"
    Web->>Nginx: POST /api/locks/:lockId/unlock
    Nginx->>Backend: Proxy Pass
    Backend->>TTLock: POST /v3/lock/unlock<br/>(lockId, date=now)
    TTLock-->>Backend: { errcode: 0, errmsg: "none error message" }
    Backend-->>Web: { ok: true, human: "Success", ts: "..." }
    Web->>Web: Invalidate TanStack Query Cache ["locks"]
    Web-->>User: Display Success Confirmation Banner
```

---

### C. Signal Telemetry & Enriched Lockbox Aggregation (`/api/locks/enriched`)
Aggregates the strongest RSSI reading per lockbox across all active gateways in parallel, prioritizing online gateways, and capturing hardware scan timestamps (`rssiUpdateDate`). To prevent API rate limit exhaustion, bulk N+1 unlock record fetches are completely eliminated in favor of on-demand cached SQLite lookups.

```mermaid
sequenceDiagram
    autonumber
    participant Client as React Dashboard
    participant Backend as Express Backend
    participant Cache as Topology Cache (30s)
    participant SQLite as Node.js SQLite (telemetry.db)
    participant TTLock as TTLOCK Cloud API

    Client->>Backend: GET /api/locks/enriched
    par Fetch Lock List & Gateway List
        Backend->>TTLock: POST /v3/lock/list (all locks)
        Backend->>TTLock: POST /v3/gateway/list (all gateways)
    end
    Backend->>Cache: Check active gateway topologies (lockNum > 0)
    alt Cache Miss / Expired
        Backend->>TTLock: POST /v3/gateway/listLock (per active gateway)
        Backend->>Cache: Store topology (TTL 30s)
    else Cache Hit
        Backend->>Cache: Retrieve cached topology
    end
    Backend->>Backend: Map lockId -> Best RSSI signal & Gateway online status
    Backend->>SQLite: Query cached latest unlock timestamps (on-demand)
    Backend-->>Client: { list: [ { lockId, lastOpen, rssi, rssiUpdateDate, gatewayId, gatewayName, networkName, gatewayIsOnline } ] }
```

---

### D. Hardware Diagnostics Telemetry PDF Export Flow
Client-side PDF generation using unified `jspdf` and `jspdf-autotable` imports ensuring zero chunk-fetch failures in production containers.

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / User
    participant Header as AppHeader.tsx
    participant PdfEngine as pdf-report.ts
    participant API as Backend API (:5000)

    User->>Header: Click "Download PDF"
    Header->>PdfEngine: generateTtlockPdfReport({ locks, gateways })
    par Fetch Enriched Locks, Gateways & Topologies
        PdfEngine->>API: GET /api/locks/enriched
        PdfEngine->>API: GET /api/gateways
        PdfEngine->>API: GET /api/gateways/:id/topology
    end
    PdfEngine->>PdfEngine: Triage critical groups (Offline Gateways, Weak Signal < -85 dBm, Low Battery)
    PdfEngine->>PdfEngine: Render A4 PDF & Save Document (ttlock-signal-report-*.pdf)
    PdfEngine-->>Header: Return Generated Filename
    Header-->>User: Trigger Browser Download & Display Success Toast
```

---

### E. Signal Logic & Stale Reading Evaluation Flow

```mermaid
flowchart TD
    Start["Evaluate Lockbox Signal"] --> CheckGW{"Does lockbox have Gateway?"}
    CheckGW -- "No (hasGateway = 0)" --> Unlinked["Display 'Unlinked' (Direct Wireless)"]
    CheckGW -- "Yes (hasGateway = 1)" --> CheckGWOnline{"Is connected Gateway Online?"}
    
    CheckGWOnline -- "No (isOnline = 0)" --> GWOffline["Display 'GW Offline' (Red Badge) & 'GW Down'"]
    CheckGWOnline -- "Yes (isOnline = 1)" --> CheckRSSI{"Is RSSI reading detected?"}
    
    CheckRSSI -- "Null / Undetected" --> NoSig["Display 'No signal'"]
    CheckRSSI -- "Valid dBm Value" --> CheckAge{"Is rssiUpdateDate > 15 Minutes?"}
    
    CheckAge -- "Yes (Stale)" --> StaleRender["Display dBm + Amber Clock Icon<br/>Tooltip: Stale snapshot warning"]
    CheckAge -- "No (Fresh)" --> LiveRender["Display dBm + Quality Indicator (Green / Amber / Red)"]
```

---

### F. Targeted Gateway Live Monitoring & SQLite Deduplication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Field Engineer
    participant Web as React Frontend (GatewaysSection)
    participant API as Express Routes (/api/gateways/:id/live)
    participant TTLock as TTLOCK Cloud API (/v3/gateway/listLock)
    participant SQLite as Node.js SQLite (telemetry.db)

    Tech->>Web: Clicks "Start Live (60s)"
    loop Every 60 Seconds (Targeted Loop)
        Web->>API: GET /api/gateways/:id/live?name=...
        API->>TTLock: POST /v3/gateway/listLock (Single Gateway)
        TTLock-->>API: Return Lock Signals & Hardware rssiUpdateDate
        API->>SQLite: Query latest recorded_at for lockId
        alt Hardware Timestamp Identical (Duplicate)
            API->>SQLite: Skip Write (Deduplicated)
        else Hardware Scan Timestamp Newer
            API->>SQLite: INSERT signal_snapshots & gateway_snapshots
        end
        API-->>Web: Return 200 OK (Live locks payload & timestamp)
        Web->>Web: Update Live Table & Scan Age Indicators
    end
    Tech->>Web: Clicks "Stop Live"
    Web->>Web: Terminate interval & freeze countdown
```

---

### G. Signal Retention Timeseries & Executive PDF Export Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / User
    participant Retention as RetentionSection.tsx
    participant MultiSelect as GatewayMultiSelect.tsx
    participant DateSelect as ModernDateSelect.tsx
    participant API as Backend API (/api/telemetry/timeline)
    participant PdfEngine as pdf-retention-report.ts

    User->>MultiSelect: Select one or more Target Gateways
    User->>DateSelect: Select Capture Date (YYYY-MM-DD)
    Retention->>API: GET /api/telemetry/timeline?gatewayIds=...&date=...
    API-->>Retention: Return timeseries snapshots, lock aliases, dates & gateways
    Retention->>Retention: Compute dynamic Y-axis (-20 to -100 dBm) & 6 linear time ticks
    Retention->>Retention: Render SVG multi-line fluctuation chart & lock series cards
    User->>Retention: Clicks "Download PDF Report"
    Retention->>PdfEngine: generateRetentionPdfReport({ gateways, date, lockSeries, snapshots, svgElement })
    PdfEngine->>PdfEngine: Render 4 Executive KPI Tiles & Gateway ID Capsule
    PdfEngine->>PdfEngine: Capture high-contrast SVG vector snapshot
    PdfEngine->>PdfEngine: Render color-coded lockboxes summary table
    PdfEngine->>PdfEngine: Render Page 2+ Detailed capture logs table
    PdfEngine-->>User: Trigger browser download (ttlock-retention-report-*.pdf)
```

---

### H. Automated Background Telemetry Scheduler (Hourly Cron Loop)

```mermaid
sequenceDiagram
    autonumber
    participant Server as Express Server Boot (main.ts)
    participant Cron as Cron Service (cron.service.ts)
    participant TTLock as TTLOCK Service Client
    participant SQLite as Node.js SQLite (telemetry.db)

    Server->>Cron: startTelemetryCron(intervalMs = 3,600,000)
    Note over Cron: Delayed initial capture (10s boot grace period)
    Cron->>TTLock: getEnrichedLocks() & getAllGatewayList()
    TTLock-->>Cron: Return fleet hardware signals & active gateways
    Cron->>SQLite: saveSnapshot() with hardware timestamp deduplication
    loop Every 60 Minutes (Uninterrupted Background Job)
        Cron->>TTLock: Fetch fresh fleet signals across 96 lockboxes & 31 gateways
        TTLock-->>Cron: Return fresh signals
        Cron->>SQLite: saveSnapshot() & update lock_aliases table
    end
```

---

### I. SQLite Telemetry Storage Engine Schema (ERD)

```mermaid
erDiagram
    gateway_snapshots {
        INTEGER id PK "Auto-increment ID"
        INTEGER gateway_id "TTLOCK Gateway ID"
        TEXT gateway_name "Gateway SSID / Identifier"
        INTEGER is_online "1 = Online, 0 = Offline"
        INTEGER recorded_at "Epoch timestamp (ms)"
    }

    signal_snapshots {
        INTEGER id PK "Auto-increment ID"
        INTEGER recorded_at "Epoch timestamp (ms)"
        INTEGER lock_id "TTLOCK Lock ID"
        TEXT lock_name "Factory name or Station alias"
        INTEGER gateway_id "Connected Gateway ID"
        INTEGER rssi "Signal strength in dBm"
        INTEGER battery "Battery percentage (0-100)"
    }

    lock_aliases {
        INTEGER lock_id PK "Unique Lock ID"
        TEXT alias "Human-readable station alias"
        INTEGER updated_at "Epoch timestamp (ms)"
    }

    unlock_records {
        INTEGER id PK "Auto-increment ID"
        INTEGER lock_id "TTLOCK Lock ID"
        INTEGER lock_date "Unlock event timestamp (ms)"
        INTEGER success "1 = Success, 0 = Failed"
        TEXT username "Operator / Card / Gateway"
        INTEGER recorded_at "Record cache timestamp (ms)"
    }

    gateway_snapshots ||--o{ signal_snapshots : "bridges"
    lock_aliases ||--o{ signal_snapshots : "normalizes"
    unlock_records ||--o{ signal_snapshots : "enriches"
```

## 3. Frontend Component Hierarchy

```mermaid
graph TD
    App["App.tsx"]
    Header["AppHeader.tsx"]
    PdfBtn["Download PDF (Fleet Diagnostics)"]
    SnapshotBtn["Save Snapshot Button (SQLite)"]
    FluctModal["SignalFluctuationModal.tsx (Analytics)"]
    ThemeToggle["ThemeToggle.tsx"]
    TabsRoot["Tabs (shadcn/ui)"]
    
    TabLocks["TabsContent: Locks"]
    TabGateways["TabsContent: Gateways"]
    TabRetention["TabsContent: Signal Retention"]
    
    LockHist["LockHistorySection.tsx"]
    AutoComp["Fast Autocomplete Dropdown (/api/locks)"]
    UnlockTerm["UnlockTerminal.tsx (Modal)"]
    PasscodeMod["PasscodeModal.tsx (Modal)"]
    
    AllLocks["AllLockboxesSection.tsx"]
    TriageFilter["Triage Filter Bar (All, Needs Attention, Weak Signal, etc.)"]
    SignalCell["SignalDot Component (Single-line + Stale Tooltip)"]
    
    GatewaysSec["GatewaysSection.tsx"]
    LiveMonitor["Targeted 60s Live Monitor (Single Gateway)"]
    InlineTopo["InlineTopology.tsx"]
    CanvasRnd["Topology Canvas (Adaptive Renderer)"]

    RetentionSec["RetentionSection.tsx"]
    MultiGwSelect["GatewayMultiSelect.tsx (Popover + Search)"]
    DateSelect["ModernDateSelect.tsx (Custom Calendar Select)"]
    SvgChart["Interactive SVG Fluctuation Graph (-20 to -100 dBm)"]
    LockCards["Lockbox Series Legend Cards (Min/Max, Samples, Stale Dot)"]
    RetentionPdf["pdf-retention-report.ts (Executive A4 Report Engine)"]

    App --> Header
    Header --> PdfBtn
    Header --> SnapshotBtn
    Header --> FluctModal
    Header --> ThemeToggle
    App --> TabsRoot
    TabsRoot --> TabLocks
    TabsRoot --> TabGateways
    TabsRoot --> TabRetention
    
    TabLocks --> LockHist
    LockHist --> AutoComp
    LockHist --> UnlockTerm
    LockHist --> PasscodeMod
    
    TabLocks --> AllLocks
    AllLocks --> TriageFilter
    AllLocks --> SignalCell
    
    TabGateways --> GatewaysSec
    GatewaysSec --> LiveMonitor
    GatewaysSec --> InlineTopo
    InlineTopo --> CanvasRnd

    TabRetention --> RetentionSec
    RetentionSec --> MultiGwSelect
    RetentionSec --> DateSelect
    RetentionSec --> SvgChart
    RetentionSec --> LockCards
    RetentionSec --> RetentionPdf
```

---

## 4. Container Architecture & Resource Model

The application is deployed as two lightweight Docker containers:

| Service | Base Image | Internal Port | Exposed Port | Role & Responsibility |
|---|---|---|---|---|
| **`web-nginx`** | `nginx:alpine` | 5757 | **5757** | Serves static React production bundle & reverse-proxies `/api/*` to backend. |
| **`backend`** | `node:22-alpine` | 5000 | *Not directly exposed* | Express API server, OAuth2 manager, telemetry aggregator, and TTLOCK client. |
