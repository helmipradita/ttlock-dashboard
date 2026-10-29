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

    subgraph External["External Services"]
        TTLockCloud["TTLOCK Open Platform API v3<br/>(https://api.sciener.com)"]
    end

    SPA -->|"HTTP Request / Polling"| NginxProxy
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
Aggregates the strongest RSSI reading per lockbox across all gateways in parallel, prioritizing online gateways, and capturing scan timestamps (`rssiUpdateDate`).

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
    Backend->>Cache: Check gateway topologies
    alt Cache Miss / Expired
        Backend->>TTLock: POST /v3/gateway/listLock (per gateway)
        Backend->>Cache: Store topology (TTL 30s)
    else Cache Hit
        Backend->>Cache: Retrieve cached topology
    end
    Backend->>Backend: Map lockId -> Best RSSI signal & Gateway online status
    Backend->>TTLock: Batch POST /v3/lockRecord/list (fetch lastOpen)
    Backend-->>Client: { list: [ { lockId, lastOpen, rssi, rssiUpdateDate, gatewayId, gatewayName, networkName, gatewayIsOnline } ] }
```

---

### D. Hardware Diagnostics Telemetry PDF Export Flow
Client-side PDF generation using `jspdf` and `jspdf-autotable`. Libraries are lazy-loaded on demand to preserve optimal initial application bundle size.

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / User
    participant Header as AppHeader.tsx
    participant PdfEngine as pdf-report.ts (Lazy Loaded)
    participant API as Backend API (:5000)

    User->>Header: Click "Download Report (PDF)"
    Header->>PdfEngine: generateTtlockPdfReport()
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
    CheckGW -- "No (hasGateway = 0)" --> Unlinked["Display 'Unlinked' (Direct BLE)"]
    CheckGW -- "Yes (hasGateway = 1)" --> CheckGWOnline{"Is connected Gateway Online?"}
    
    CheckGWOnline -- "No (isOnline = 0)" --> GWOffline["Display 'GW Offline' (Red Badge) & 'GW Down'"]
    CheckGWOnline -- "Yes (isOnline = 1)" --> CheckRSSI{"Is RSSI reading detected?"}
    
    CheckRSSI -- "Null / Undetected" --> NoSig["Display 'No signal'"]
    CheckRSSI -- "Valid dBm Value" --> CheckAge{"Is rssiUpdateDate > 15 Minutes?"}
    
    CheckAge -- "Yes (Stale)" --> StaleRender["Display dBm + Amber Clock Icon<br/>Tooltip: Stale snapshot warning"]
    CheckAge -- "No (Fresh)" --> LiveRender["Display dBm + Quality Indicator (Green / Amber / Red)"]
```

---

## 3. Frontend Component Hierarchy

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

## 4. Container Architecture & Resource Model

The application is deployed as two lightweight Docker containers:

| Service | Base Image | Internal Port | Exposed Port | Role & Responsibility |
|---|---|---|---|---|
| **`web-nginx`** | `nginx:alpine` | 5757 | **5757** | Serves static React production bundle & reverse-proxies `/api/*` to backend. |
| **`backend`** | `node:22-alpine` | 5000 | *Not directly exposed* | Express API server, OAuth2 manager, telemetry aggregator, and TTLOCK client. |
