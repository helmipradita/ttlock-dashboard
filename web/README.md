# TTLOCK Dashboard — Frontend (React)

React + TypeScript + Vite + shadcn/ui + TanStack Query + Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Proxy `/api` → backend di `:5757`.

## Build

```bash
npm run build
```

Output ke `dist/`, di-serve oleh nginx di Docker (`Dockerfile.web`).

## Tech

- **Vite 5.4** — bundler
- **React 19** + TypeScript
- **shadcn/ui** (base-ui) — komponen UI
- **TanStack Query** — data fetching + caching
- **Tailwind CSS 4** — styling

## Struktur

```
src/
├── api/          # API client + types
├── components/   # React components
├── hooks/        # Custom hooks (useCountdown)
├── lib/          # Utilities
└── topology/     # Canvas-based gateway topology renderer
```
