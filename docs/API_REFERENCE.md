# TTLOCK Dashboard — API Reference

This document provides complete technical specifications for the internal REST API endpoints exposed by the TTLOCK Dashboard Backend and their integration with the TTLOCK Open Platform API v3.

---

## 1. Authentication Endpoints

### `GET /api/auth/status`
Checks the current TTLOCK OAuth2 token authentication status and metadata.

**Example Response:**
```json
{
  "authenticated": true,
  "uid": 1234567,
  "expiresAt": "2026-12-08T03:56:40.900Z",
  "scope": "user,key,room",
  "username": "user@example.com"
}
```

---

## 2. Lockbox Endpoints

### `GET /api/locks/enriched`
Retrieves all lockboxes enriched with real-time last open timestamp (`lastOpen`), optimal gateway RSSI signal reading (`rssi`), signal scan timestamp (`rssiUpdateDate`), and connected gateway online telemetry (`gatewayIsOnline`, `gatewayId`, `gatewayName`, `networkName`).

**Example Response:**
```json
{
  "list": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "lockMac": "78:36:63:FF:7F:B2",
      "electricQuantity": 20,
      "hasGateway": 1,
      "lastOpen": 1793066951000,
      "rssi": -82,
      "rssiUpdateDate": 1793071899000,
      "gatewayId": 1902010,
      "gatewayName": "DEV GATEWAY 01",
      "networkName": "STATION_NET_01",
      "gatewayIsOnline": 1
    }
  ]
}
```

---

### `GET /api/locks`
Fast lightweight endpoint retrieving raw lock records without `lastOpen` and signal calculations. Specially designed for high-speed autocomplete searching.

**Example Response:**
```json
{
  "list": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "lockMac": "78:36:63:FF:7F:B2",
      "electricQuantity": 20,
      "hasGateway": 1
    }
  ],
  "total": 84
}
```

---

### `GET /api/locks/:lockId`
Retrieves detailed technical specifications for a single lockbox (firmware revision, model number, battery, feature value, passage mode, etc.).

---

### `GET /api/locks/:lockId/records?pageNo=1&pageSize=20`
Retrieves paginated lock unlock event logs.

**Query Parameters:**
- `pageNo` (optional, default: `1`): Page number.
- `pageSize` (optional, default: `20`): Number of logs per page.

**Example Response:**
```json
{
  "list": [
    {
      "recordId": 98214,
      "lockDate": 1790573929000,
      "recordType": 1,
      "username": "Admin",
      "success": 1
    }
  ],
  "total": 45,
  "pages": 3,
  "pageNo": 1,
  "pageSize": 20
}
```

---

### `GET /api/locks/:lockId/gateway`
Retrieves information about gateways in communication range of the lockbox along with RSSI signal levels and last scan timestamps.

**Example Response:**
```json
{
  "list": [
    {
      "gatewayId": 1902010,
      "gatewayName": "DEV GATEWAY 01",
      "gatewayMac": "34:34:30:BB:99:39",
      "rssi": -82,
      "rssiUpdateDate": 1793071899000,
      "networkName": "STATION_NET_01",
      "isOnline": 1,
      "lockNum": 2,
      "gatewayVersion": 2
    }
  ]
}
```

---

### `POST /api/locks/:lockId/passcode`
Generates an algorithmic One-Time Passcode (6-10 digits) valid for 6 hours from request time. Passcodes are generated via offline time-sync formulas and **can be entered directly on the physical lockbox keypad without requiring gateway or internet connectivity**.

**Example Response:**
```json
{
  "ok": true,
  "keyboardPwd": "12345678",
  "keyboardPwdId": 9876543,
  "lockId": 26136614,
  "type": 1,
  "typeName": "One-time",
  "validHours": 6,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

---

### `POST /api/locks/:lockId/unlock`
Sends an instantaneous remote unlock instruction to the lockbox via connected WiFi Gateways.

**Prerequisites:**
1. The lockbox must be connected to an Online WiFi Gateway.
2. The *Remote Unlock* setting must be toggled on inside the official TTLOCK mobile application.

**Success Response:**
```json
{
  "ok": true,
  "errcode": 0,
  "errmsg": "none error message",
  "description": null,
  "human": "Success",
  "lockId": 26136614,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

**Failure Response (e.g., Gateway Offline / Not Connected):**
```json
{
  "ok": false,
  "errcode": -2012,
  "errmsg": "Lock not connected to any Gateway",
  "description": null,
  "human": "Lock not connected to any Gateway",
  "lockId": 26136614,
  "ts": "2026-10-27T04:00:00.000Z"
}
```

---

## 3. Gateway & Topology Endpoints

### `GET /api/gateways`
Retrieves all registered gateways linked to the developer account.

**Example Response:**
```json
{
  "list": [
    {
      "gatewayId": 1902010,
      "gatewayName": "DEV GATEWAY 01",
      "gatewayMac": "34:34:30:BB:99:39",
      "networkName": "STATION_NET_01",
      "isOnline": 1,
      "lockNum": 2,
      "gatewayVersion": 2
    }
  ]
}
```

---

### `GET /api/gateways/:gatewayId/topology`
Retrieves the communication topology of a single gateway, including in-range lockboxes and their respective RSSI dBm values.

### `GET /api/gateways/:gatewayId/live?name=...`
Performs fresh single-call live telemetry polling for a targeted gateway (60s loop) and automatically persists readings into local SQLite with deduplication.

**Query Parameters:**
- `name` (optional): Human-readable gateway identifier or network name.

**Response:**
```json
{
  "gatewayId": 2422312,
  "locks": [
    {
      "lockId": 35350422,
      "lockName": "Facility Unit - 3",
      "rssi": -66,
      "rssiUpdateDate": 1730388900000
    }
  ],
  "timestamp": 1730388900000
}
```

## 4. Telemetry Retention & Analysis Endpoints

### `POST /api/telemetry/snapshot`
Saves an instantaneous snapshot of all online gateways and lockbox signals to the local SQLite database.

### `GET /api/telemetry/fluctuations`
Returns aggregated historical variance metrics ($\Delta\text{ RSSI}$, sample count, min/max, average) for triage of unstable lockboxes.

### `GET /api/telemetry/timeline`
Retrieves filtered chronological timeseries snapshots, available capture dates, and distinct gateway lists from local SQLite database.

**Query Parameters:**
- `gatewayId` (optional): Filter snapshots by target gateway ID.
- `gatewayIds` (optional): Comma-separated list of target gateway IDs for multi-gateway inspection (e.g. `?gatewayIds=2422968,2425106`).
- `date` (optional): Filter snapshots by capture date (`YYYY-MM-DD`).
- `lockId` (optional): Filter snapshots by specific lockbox ID.
- `limit` (optional): Maximum rows to return (default: 300).

### `GET /api/telemetry/export`
Exports raw SQLite historical signal snapshots in CSV format. Supports optional filtering by `gatewayId` and `date`.

**Query Parameters:**
- `gatewayId` (optional): Export only records matching the target gateway ID.
- `date` (optional): Export only records captured on the specified date (`YYYY-MM-DD`).

> **Caching Behavior:** Results are cached in-memory for **30 seconds** with single-flight request coalescing to protect TTLOCK API rate limits.

**Example Response:**
```json
{
  "gateway": {
    "gatewayId": 1902010,
    "gatewayName": "DEV GATEWAY 01",
    "networkName": "STATION_NET_01",
    "isOnline": 1
  },
  "locks": [
    {
      "lockId": 26136614,
      "lockName": "K3BLE_b27fff",
      "lockAlias": "Dev Lockbox",
      "rssi": -82,
      "updateDate": 1793071899000
    }
  ]
}
```
