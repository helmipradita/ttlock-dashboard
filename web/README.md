# TTLOCK Dashboard — Frontend (Web Application)

Modern frontend web interface powered by **React 19 + Vite 5.4 + TypeScript + Tailwind CSS v4 + shadcn/ui**.

---

## 1. Key Interface Features

- **Dark & Light Mode**: Automatic system OS color scheme detection with manual toggle persisted in `localStorage`.
- **Smart Autocomplete Search**: Sub-millisecond lockbox search via lightweight `/api/locks`, keyboard shortcuts (`/` or `Ctrl+K`), and matching across Lock ID, Name, or Alias.
- **Hardware Diagnostics PDF Export**: Client-side A4 telemetry report generation with one-click export powered by `jspdf` + `jspdf-autotable` (lazy loaded).
- **Fleet Triage Filters**: One-click fleet triage filtering (*All*, *Needs Attention*, *Weak Signal*, *No Gateway*, *Battery ≤ 20%*, *Connected*).
- **Live Signal Telemetry**: Compact single-line RSSI badges with stale snapshot flags (> 15m) and gateway offline warnings.
- **Passcode Modal**: 6-hour offline One-Time Passcode modal featuring large monospace digits, one-click clipboard copying, and retry handling.
- **Remote Unlock Console**: Safe two-step remote unlock modal with immediate feedback and TanStack Query cache invalidation.
- **Interactive Gateway Topology**: Dynamic Canvas graph illustrating Gateway $\leftrightarrow$ Lockbox associations with adaptive theme palettes and animated edge links.
- **Multi-Column Sorting**: Comprehensive table sorting across online statuses, gateway names, battery levels, RSSI, and last unlock activity.

---

## 2. Directory Structure

```
web/
├── public/
│   ├── favicon.png            # Browser tab favicon
│   └── ttlock-logo.webp       # Brand logo
├── src/
│   ├── api/                   # Typed API client & response interfaces
│   ├── components/
│   │   ├── layout/            # AppHeader, ThemeToggle
│   │   ├── ui/                # Accessible shadcn/ui primitives
│   │   ├── AllLockboxesSection.tsx
│   │   ├── GatewaysSection.tsx
│   │   ├── InlineTopology.tsx
│   │   ├── LockHistorySection.tsx
│   │   ├── PasscodeModal.tsx
│   │   ├── UnlockTerminal.tsx
│   │   └── status.tsx
│   ├── hooks/                 # useTheme, useCountdown
│   ├── lib/                   # Formatting utilities, styling, pdf-report.ts
│   └── topology/              # Dynamic Canvas topology graph renderer
├── test/
│   └── format.test.ts         # Native Node 22 unit test suites
├── index.html
├── package.json
└── vite.config.ts
```

---

## 3. Local Development

```bash
# 1. Navigate to web directory
cd web

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Run linter
npm run lint

# 5. Start development server
npm run dev
# Open http://localhost:5173 (requests to /api are automatically proxied to backend :5757)
```
*(Note: When using Docker Compose, compilation and Nginx static serving occur automatically inside the container).*
