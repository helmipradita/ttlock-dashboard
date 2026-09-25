# TTLOCK Dashboard — AI Context

Monitoring dashboard untuk smart lock TTLOCK (read-only). React + Express + nginx di Docker.

## Stack & Architecture

- **Backend**: Express.js + TypeScript (port 5000 internal, exposed via nginx at 5757)
- **Frontend**: React 19 + Vite 5.4 + TypeScript + shadcn/ui + TanStack Query + Tailwind CSS 4
- **Production**: nginx (reverse proxy `/api/*` → backend:5000 + static React build) + Node.js backend
- **Docker**: 2 services (`backend`, `web-nginx`), 1 port 5757

## Build Commands

```bash
# Backend
cd backend && npm run build

# Frontend
cd web && npm run build

# Docker - rebuild only changed service
docker compose up -d --build web-nginx   # frontend only
docker compose up -d --build backend     # backend only
docker compose up -d --build             # both
```

**Don't start docker compose yourself. User runs it manually.**

## Rules

- **Don't touch ngrok** (PID usually running on port 5757 for external access)
- **`frontend/` folder deleted** — legacy vanilla JS, no longer exists
- Default sort: lockboxes by hasGateway desc + lastOpen desc; gateways by isOnline desc, WiFi sortable by networkName
- RSSI colors: >-75 Strong (green), -85..-75 Medium (amber), <-85 Weak (red)
- Backend cache: topology TTL 5s single-flight; lastOpen always fresh (no cache)

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/status` | GET | Auth status |
| `/api/locks/enriched` | GET | All locks + last open (always fresh) |
| `/api/locks` | GET | All locks (raw) |
| `/api/locks/:lockId` | GET | Lock detail |
| `/api/locks/:lockId/records` | GET | Unlock history |
| `/api/locks/:lockId/gateway` | GET | Lock's gateway info |
| `/api/locks/:lockId/unlock` | POST | **Unlock lock via gateway** |
| `/api/gateways` | GET | All gateways |
| `/api/gateways/:gatewayId/topology` | GET | Gateway topology (cached 5s) |

## TTLOCK Unlock API

### POST /v3/lock/unlock

**Description**: Unlock via gateway. Requires remote unlock enabled in TTLOCK app settings.

**Request params** (form-urlencoded):

| Param | Type | Required | Description |
|---|---|---|---|
| clientId | String | Y | App ID from TTLOCK developer portal |
| accessToken | String | Y | OAuth2 access token |
| lockId | Int | Y | Lock ID |
| date | Long | Y | Current timestamp (millisecond) |

**Response**:
```json
{
  "errcode": 0,
  "errmsg": "none error message",
  "description": "none error message or means yes"
}
```

**Docs**: https://euopen.ttlock.com/doc/api/v3/lock/unlock

## TTLOCK Error Codes

**Docs**: https://euopen.ttlock.com/doc/api/error

| errcode | Description |
|---|---|
| 0 | Success |
| 1 | Failed |
| -3 | Invalid Parameter |
| -2012 | Lock not connected to any Gateway |
| -2018 | Permission Denied |
| -4043 | Function not supported (enable remote unlock in app) |
| -4056 | Run out of memory (storage full) |
| 10000 | Invalid client_id |
| 10001 | Invalid client (client_id or client_secret wrong) |
| 10002 | Invalid code |
| 10003 | Invalid token |
| 10004 | Invalid grant (token expired/revoked) |
| 10005 | Invalid grant_scope |
| 10006 | Invalid username (unapproved app) |
| 10007 | Invalid account (username/password wrong) |
| 10008 | Invalid redirect_uri |
| 10009 | Unsupported response_type |
| 10010 | Unsupported grant_type |
| 10011 | Invalid refresh_token |
| 20001 | Not lock user |
| 20002 | Not lock admin |
| 20003 | Invalid key |
| 20004 | Key not exists |
| 20005 | Backup key password error |
| 20006 | Receiver not exists |
| 20007 | Invalid keyboardPwdVersion |
| 20008 | Invalid lock name |
| 30001 | No permission (API) |
| 30002 | Invalid registered username |
| 30003 | User already exists |
| 30004 | Invalid userid to delete |
| 30005 | Not custom app user |
| 30006 | Exceeds API call number limit |
| 80000 | Date must be current time (±5 min) |
| 80002 | Invalid JSON format |
| 90000 | Internal server error |

## File Structure

```
TTLOCK/
├── AGENTS.md              # This file
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.web
├── nginx/nginx.conf
├── backend/src/
│   ├── main.ts            # Express entry point
│   ├── config.ts          # Load env vars
│   ├── services/
│   │   └── ttlock.service.ts
│   └── routes/
│       └── ttlock.routes.ts
└── web/src/
    ├── App.tsx
    ├── api/               # client.ts, types.ts
    ├── components/        # LockHistorySection, AllLockboxesSection, etc.
    ├── hooks/
    ├── lib/               # format.ts
    └── topology/          # Canvas renderer
```
