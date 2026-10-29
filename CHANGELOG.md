# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-29

### Added
- **Termius Open Source Program Integration**: Added official Termius sponsorship acknowledgment and backlink in `README.md`.
- **Open Source Community Funding**: Added `.github/FUNDING.yml` to authenticate non-commercial community backing.
- **Sponsor Brand Assets**: Embedded standalone Termius vector logo in `.github/assets/termius-logo.svg`.

### Changed
- **Version Bump**: Upgraded platform release version to `1.2.0` across frontend, backend, and documentation.

## [1.1.1] - 2026-10-29

### Added
- **Native Unit Test Suites**: Zero-dependency unit tests for backend (`backend/test/ttlock.test.ts`) and frontend (`web/test/format.test.ts`) using Node.js 22 built-in test runner.
- **Timestamp Parsing Compatibility**: `formatDate` now transparently formats ISO-8601 strings, UNIX epoch millisecond numbers, and falsy inputs.

### Changed
- **Production Package Optimization**: Reclassified `shadcn` and `@tailwindcss/vite` as `devDependencies` in `web/package.json`, eliminating transitive runtime dependencies.
- **Passcode Lifecycle Simplification**: Refactored `PasscodeModal` state synchronization to use declarative TanStack Query with retry handler.

### Fixed
- **API Reference Default Alignment**: Synchronized `GET /api/locks/:lockId/records` default `pageSize` in documentation to match backend code (`20`).
- **Linter & React Render Warnings**: Resolved component re-declaration warnings in `AllLockboxesSection` and `GatewaysSection` by extracting `SortHeader` outside render body.
- **PDF Report Telemetry Mapping**: Fixed gateway station label fallback in `pdf-report.ts` prioritizing `gatewayName` over WiFi SSID.
- **WSL2 / Linux Native Binary Bus Error**: Upgraded `oxlint` to `1.90.0` ensuring seamless linting execution.

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
