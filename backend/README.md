# TTLOCK Dashboard — Backend Service

API Gateway service built with **Node.js + Express.js + TypeScript** managing integration and authentication with the TTLOCK Open Platform API v3.

---

## 1. Key Capabilities

- **Automated OAuth2 Lifecycle**: Autonomous login on boot and auto-refresh 24 hours prior to token expiration.
- **Enriched Lock & Signal Telemetry**: Retrieves lockbox inventories enriched with real-time `lastOpen` timestamps, best RSSI signal aggregation, and connected gateway online statuses via `/api/locks/enriched`.
- **Fast Lock Query**: Lightweight `/api/locks` endpoint designed for rapid autocomplete searching without enrichment latency.
- **Offline Passcode Generator**: Algorithmic 6-hour One-Time PIN generation via `/api/locks/:id/passcode`.
- **Remote Unlock Gateway**: Instant remote unlock dispatch via online WiFi gateways via `/api/locks/:id/unlock`.
- **Topology & Single-Flight Cache**: 30-second in-memory topology cache with request coalescing to protect TTLock API rate limits.
- **Fail-Fast Environment Validation**: Strict validation of required `TTLOCK_*` environment credentials during initialization.
- **Native Unit Testing**: High-speed, zero-dependency unit tests running via Node.js native test runner.

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config.ts              # Environment configuration loader (.env)
│   ├── main.ts                # Express server bootstrapper
│   ├── routes/
│   │   └── ttlock.routes.ts   # REST API route definitions
│   └── services/
│       └── ttlock.service.ts  # TTLOCK client, OAuth2 manager, cache
├── test/
│   └── ttlock.test.ts         # Native Node 22 unit test suites
├── .env.example               # Template environment
├── package.json
└── tsconfig.json
```

---

## 3. Local Development

```bash
# 1. Navigate to backend directory
cd backend

# 2. Configure environment file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Run unit tests
npm test

# 5. Start development server
npm run dev
# Server listens at http://localhost:5757 (or configured PORT)
```

Production build & execution:
```bash
npm run build
npm start
```
*(Note: When using Docker Compose, the build and compilation happen automatically within the container).*
