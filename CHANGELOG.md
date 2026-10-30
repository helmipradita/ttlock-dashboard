# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-29

### Added
- **Termius Open Source Program Integration**: Added official Termius sponsorship acknowledgment, backlink, and dual-theme adaptive brand assets (`.github/assets/termius-logo.png` & `termius-logo-white.png`) with explicit `#sponsors` anchor in `README.md`.
- **Open Source Community Standards**: Established full GitHub Community Health profile (100% score) including Contributor Covenant Code of Conduct, Contributing Guidelines, Security Policy, Issue Templates, and Pull Request Template.
- **Universal Documentation Standardization**: Harmonized all architecture, API reference, deployment guides, and README files in standard English.
- **Native Unit Test Suites**: Zero-dependency unit test suites for backend (`backend/test/ttlock.test.ts`) and frontend (`web/test/format.test.ts`) using the native Node.js 22 test runner, including signal staleness threshold detection tests.
- **Automated GHCR Container Publishing**: Configured automated multi-stage Docker packaging to GitHub Container Registry (`ghcr.io/helmipradita/ttlock-backend` and `ttlock-web-nginx`).

### Changed
- **Version Bump**: Promoted platform release version to `1.2.0` across frontend, backend, container labels, and documentation.
- **Production Package Optimization**: Pruned legacy icons, unreferenced UI components, and transitive lockfile dependencies; enforce strict TypeScript rules (`noUnusedLocals`, `noUnusedParameters`).
- **Passcode Lifecycle Simplification**: Refactored `PasscodeModal` state synchronization to use declarative TanStack Query with retry handling.
- **Gateway Telemetry Synchronization**: Linked `rssiUpdateDate` and `gatewayIsOnline` in topology queries to enable stale signal detection and offline gateway indicators across the Gateway Directory.

### Fixed
- **API Reference Default Alignment**: Synchronized `GET /api/locks/:lockId/records` default `pageSize` in documentation to match backend implementation (`20`).
- **Linter & React Render Warnings**: Resolved component re-declaration warnings in `AllLockboxesSection` and `GatewaysSection` by extracting `SortHeader` outside render body.
- **PDF Report Telemetry Mapping**: Fixed gateway station label fallback in `pdf-report.ts` prioritizing `gatewayName` over WiFi SSID.
- **WSL2 / Linux Native Binary Bus Error**: Upgraded `oxlint` to `1.90.0` ensuring reliable local linting execution.

## [1.1.0] - 2026-10-28

### Added
- **Fleet Telemetry & Gateway Mapping**: Parallel aggregation of best RSSI signal readings, scan timestamps (`rssiUpdateDate`), gateway name, network SSID, and gateway online status in `/api/locks/enriched`.
- **Dedicated Gateway Columns**: Added sortable `Gateway / WiFi` column in lockboxes directory displaying station name and network SSID, plus `Gateway Name` column in the gateways directory table.
- **Hardware Diagnostics PDF Export**: Client-side A4 report generator (`jspdf` + `jspdf-autotable`) lazy-loaded on demand. Summarizes offline gateways, weak signals (< -85 dBm), low batteries, and unlinked units.
- **Fleet Triage Filters**: Triage filter bar in the lockbox directory (*All*, *Needs Attention*, *Weak Signal*, *No Gateway*, *Battery ≤ 20%*, *Connected*).
- **Fast Autocomplete Search**: Dedicated lightweight `/api/locks` query for instant search matching ID, name, or alias without waiting for lastOpen enrichment.
- **Fail-Fast Environment Validation**: Strict `requireEnv()` in backend configuration enforcing `TTLOCK_*` credentials during startup.
- **Stale Signal & Gateway Down Detection**: Amber clock icon for signal readings older than 15 minutes with detailed scan tooltip, plus red `GW Down` / `GW Offline` badge when a gateway drops off.
- **Keyboard Shortcuts**: Press `/` or `Ctrl+K` from anywhere in the app to immediately focus the lockbox search bar.
- **Interactive Gateway Topology**: Dynamic Canvas renderer reflecting live/offline edge connections and RSSI quality indicators.
- **Docker Build Optimization**: Added root `.dockerignore` excluding `node_modules`, `dist`, and git metadata. Build context reduced from 300MB+ to <50KB.

### Changed
- Synchronized frontend (`web/package.json`) and backend (`backend/package.json`) versioning to `1.1.0`.
- Upgraded gateway topology cache TTL from 5s to 30s with single-flight request coalescing to protect TTLock API rate limits.
- Optimized lockbox table layout with strict single-line `SignalDot` badges.
- Standardized environment variable naming convention to `TTLOCK_*`.

### Fixed
- Fixed visual overflow bug where autocomplete suggestions were clipped by card container boundaries.
- Fixed search suggestion dropdown prematurely closing when typing or pressing Enter on alias/name queries.
- Fixed topology canvas rendering active animated edges for disconnected gateways.
