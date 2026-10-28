# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
