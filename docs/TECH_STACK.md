# TTLOCK Dashboard — Tech Stack Specifications

This document outlines the software libraries, frameworks, runtime engines, and infrastructure tooling powering the **TTLOCK Dashboard**.

---

## 1. Frontend (Web Application)

| Category | Technology | Version | Purpose & Strategic Rationale |
|---|---|---|---|
| **Core Framework** | React | 19.x | Modern component-based declarative user interface library delivering optimal rendering speed. |
| **Language** | TypeScript | 5.x | Static type safety covering API contracts, telemetry payloads, and component props. |
| **Bundler & Build Tool** | Vite | 5.4.x | Rapid Hot Module Replacement (HMR) and optimized tree-shaken production builds. |
| **State & Data Fetching** | TanStack Query | v5 | Client-side caching, polling, auto-revalidation, and background data synchronization. |
| **UI Primitives** | shadcn/ui + Base UI | Latest | Accessible, unstyled headless primitives styled via modern Tailwind utility classes. |
| **Styling** | Tailwind CSS | v4.x | Utility-first CSS engine with native CSS variables for responsive light and dark themes. |
| **Iconography** | Lucide React | Latest | Clean, accessible SVG icons with consistent visual stroke weights. |
| **PDF Reporting** | jsPDF & jspdf-autotable | v4.x / v5.x | Client-side hardware diagnostics PDF generation with lazy dynamic importing to protect initial bundle size. |
| **Topology Rendering** | HTML5 Canvas API | Native | High-performance interactive graph visualization featuring animated edges and dragging without DOM overhead. |

---

## 2. Backend (API Gateway & Integration Service)

| Category | Technology | Version | Purpose & Strategic Rationale |
|---|---|---|---|
| **Runtime Environment** | Node.js | 22.x (LTS) | Asynchronous, event-driven JavaScript/TypeScript runtime on the V8 engine. |
| **HTTP Framework** | Express.js | 4.x | Lightweight, unopinionated routing engine handling REST endpoints and middleware. |
| **Language** | TypeScript | 5.x | Enforces strict type contracts across backend business logic and TTLock Sciener API payloads. |
| **Configuration** | dotenv + requireEnv | 16.x | Fail-fast environment variable validation, terminating immediately if mandatory credentials are missing. |
| **HTTP Client** | Native Fetch API | Node 22 native | Lightweight native HTTP client executing urlencoded requests without bloated third-party dependencies. |
| **Unit Testing** | Node.js Test Runner | Node 22 native | Zero-dependency native unit test runner with `--experimental-strip-types` and `node:test`. |

---

## 3. Web Server & Containerization

| Component | Technology | Role & Responsibility |
|---|---|---|
| **Reverse Proxy** | Nginx Alpine | Proxies `/api/*` requests to backend port 5000 and serves static frontend assets at port 5757 with fine-grained caching headers. |
| **Container Engine** | Docker & Docker Compose | Multi-stage build isolation and resource-constrained runtime execution (`limits` & `reservations`). |
| **Container Registry** | GitHub Container Registry (GHCR) | Automated multi-tag container builds (`latest` and semver release tags) triggered via GitHub Actions. |

---

## 4. Third-Party Integrations

| Provider | Description |
|---|---|
| **TTLOCK Open Platform API v3** | Official Sciener TTLOCK cloud service handling OAuth2 authentication, lock telemetry, unlock logs, gateway topologies, offline passcodes, and remote unlock dispatch. |
| **Termius Open Source Program** | Community developer sponsorship providing Team tooling for secure edge server console management, remote debugging, and shared configuration. |
