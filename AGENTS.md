# TTLOCK Dashboard — AI Operational Context & Guidelines

Comprehensive operational guidelines, architectural rules, and decision workflows for AI agents working in this repository.

---

## 1. Project Overview & Program Standards

- **Purpose**: Real-time IoT fleet telemetry, remote control, and hardware diagnostics for TTLOCK Smart Locks and WiFi Gateways.
- **Sponsorship Program**: Maintained under the **Termius for Open Source Program** (MIT License, non-commercial, 100% English documentation).
- **Termius Branding Requirements**:
  - `README.md` must feature the official Termius adaptive logo via `<picture>` (`.github/assets/termius-logo-white.png` for dark mode, `termius-logo.png` for light mode).
  - Explicit navigation anchor `<a id="sponsors"></a><a id="sponsors--backers"></a>` must precede the sponsor section.
- **GitHub Community Standards**: Mandatory 100% Community Health Score (`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, Issue & PR templates).

---

## 2. AI Decision Protocol: Versioning & Release Workflow (MANDATORY)

Whenever code, documentation, or infrastructure changes occur, the AI agent **MUST NOT** arbitrarily bump the platform version. The agent **MUST STOP AND ASK** the user with clear options and a concrete recommendation:
- **Option A (Consolidate Milestone)**: Retain the current release version (e.g., `1.2.0`) and merge changes into the existing release notes.
- **Option B (SemVer Bump)**: Bump patch (`1.2.1`) for bugfixes/telemetry adjustments, or bump minor (`1.3.0`) for breaking or major feature sets.
- Always provide a concrete recommendation based on SemVer principles to prevent version churn.

---

## 3. GHCR Container Packaging Protocol

The repository automatically publishes two separate container packages via GitHub Actions (`.github/workflows/docker-publish.yml`):
1. `ghcr.io/helmipradita/ttlock-backend`
2. `ghcr.io/helmipradita/ttlock-web-nginx`

**Rules:**
- Both images must always share identical tag pairs: `:vX.Y.Z` (release tag) and `:latest`.
- Public documentation (`README.md`, `docs/DEPLOYMENT.md`) must document both `:latest` and explicit version pinning (e.g., `:v1.2.0`).

---

## 4. Architecture & Clean Code Enforcement

### Backend (Express.js + TypeScript)
- **Layering**: `routes/ttlock.routes.ts` (Controller) → `services/ttlock.service.ts` (Business Logic & Sciener API Client) → `config.ts` (Fail-Fast Env Loader).
- **Fail-Fast**: Mandatory credentials (`TTLOCK_CLIENT_ID`, `TTLOCK_CLIENT_SECRET`, `TTLOCK_USERNAME`, `TTLOCK_PASSWORD_MD5`) must throw immediately on boot if undefined.
- **Topology Coalescing**: 30-second TTL cache with single-flight inflight map to protect TTLock API rate limits.
- **Strict Typing**: `"noUnusedLocals": true` and `"noUnusedParameters": true` enforced in `tsconfig.json`.

### Frontend (React 19 + Vite + Tailwind CSS 4 + shadcn/ui)
- **Base Nova Style**: Built on headless `@base-ui/react` primitives and compiled `cn` utility.
- **Strict Typing**: `"noUnusedLocals": true` and `"noUnusedParameters": true` enforced in `tsconfig.app.json`.
- **Zero Dead Code**: Any unreferenced component, icon, or helper function must be deleted immediately.
- **Dynamic Imports**: Client-side heavy generators (`jspdf`, `jspdf-autotable`) must be dynamically imported to maintain light initial bundle weight.

### Telemetry Consistency
- `rssiUpdateDate` and `gatewayIsOnline` must remain unified across backend topology responses and frontend `GatewayLock` interfaces.
- **Stale Signal Rule**: Readings older than 15 minutes display an amber clock icon with snapshot tooltip.
- **Gateway Offline Rule**: When `isOnline === 0`, lock status must display `GW Offline` / `GW Down`.
- **Mermaid Diagrams**: All sequence, flowchart, and architecture diagrams in `docs/ARCHITECTURE.md` and `README.md` must be kept strictly synchronized with live API contracts and React component trees.

---

## 5. Git & Commit Guidelines

- **Branches**: `dev` is the Single Source of Truth. Feature/fix PRs target `dev`. Releases promote `dev` → `main`. Both branches must remain in sync.
- **Commit Messages**: Conventional commits only (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **Forbidden Word**: The word `"audit"` is **STRICTLY PROHIBITED** from all commit messages, PR titles, and git logs.
- **Language**: 100% English across all documentation, comments, commit messages, and UI text.
- **Working Tree**: Working directory must be 100% clean after task completion.

---

## 6. Testing & Quality Verification

Before committing changes, both test suites and linters must pass cleanly:
```bash
# Backend tests & compilation
cd backend && npm test && npm run build

# Frontend tests, linting & build
cd web && npm test && npm run lint && npm run build
```
- **Test Runner**: Zero external testing frameworks. Use Node.js 22 built-in runner (`node:test`, `node:assert/strict`).
- **Linter**: `oxlint` (zero warnings, zero errors).

---

## 7. API Endpoints Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Check current OAuth token authentication status |
| `/api/locks/enriched` | GET | All locks with real-time last open timestamp, RSSI, and gateway online status |
| `/api/locks` | GET | All raw locks (fast endpoint for autocomplete search) |
| `/api/locks/:lockId` | GET | Lock detailed specifications |
| `/api/locks/:lockId/records` | GET | Paginated unlock record logs |
| `/api/locks/:lockId/gateway` | GET | Lock's connected gateway info and signal |
| `/api/locks/:lockId/passcode` | POST | Generate algorithmic offline One-Time Passcode (6 hours) |
| `/api/locks/:lockId/unlock` | POST | Remote unlock lock via WiFi Gateway |
| `/api/gateways` | GET | All registered gateways |
| `/api/gateways/:gatewayId/topology` | GET | Gateway topology (cached 30s) |

---

## 8. Directory Structure

```
TTLOCK/
├── .github/
│   ├── FUNDING.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── config.yml
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── assets/
│   │   ├── termius-logo.png
│   │   ├── termius-logo-white.png
│   │   └── termius-logo.svg
│   └── workflows/
│       └── docker-publish.yml
├── .dockerignore
├── LICENSE
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
├── CHANGELOG.md
├── AGENTS.md
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.web
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── README.md
│   ├── .gitignore
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── test/
│   │   └── ttlock.test.ts
│   └── src/
│       ├── config.ts
│       ├── main.ts
│       ├── routes/
│       │   └── ttlock.routes.ts
│       └── services/
│           └── ttlock.service.ts
└── web/
    ├── README.md
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── components.json
    ├── index.html
    ├── test/
    │   └── format.test.ts
    ├── public/
    │   ├── favicon.png
    │   └── ttlock-logo.webp
    └── src/
        ├── App.tsx
        ├── api/               # client.ts, types.ts
        ├── components/        # LockHistorySection, AllLockboxesSection, PasscodeModal, UnlockTerminal, InlineTopology, etc.
        ├── hooks/             # useTheme, useCountdown
        ├── lib/               # format.ts, utils.ts, pdf-report.ts
        └── topology/          # topology-canvas.ts
```
