# gig-sheets Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-20

## Active Technologies

- TypeScript 5.x — frontend (React 18 + Vite) and backend (Node.js LTS 22.x)
- React 18, Vite 5, Socket.IO Client 4.x, dnd-kit (frontend)
- Express 4, Socket.IO 4.x, better-sqlite3 9.x (backend)
- Vitest (test framework, frontend + backend)
- SQLite via better-sqlite3 (sync driver, no ORM)
- PWA: vite-plugin-pwa (Workbox), self-hosted WOFF2 fonts (DM Sans + JetBrains Mono)

## Project Structure

```text
gig-sheets/
├── client/          # React 18 + TypeScript + Vite PWA
│   ├── src/
│   │   ├── assets/fonts/    # DM Sans + JetBrains Mono WOFF2
│   │   ├── components/      # ConnectionStatus, JoinScreen, SetlistView, SongEditor, SongView, WhoIsHere
│   │   ├── hooks/           # useSocket, useSetlist, useSongSelection, useAutoScroll
│   │   ├── pages/           # SetlistPage, SongViewPage
│   │   └── styles/tokens.css
│   ├── public/manifest.json
│   └── vite.config.ts / vitest.config.ts
├── server/          # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── db/      # schema.ts, songs.ts, seed.ts
│   │   ├── socket/  # handlers: member, setlist, selection, scroll [scroll-sync]
│   │   └── index.ts
│   └── tests/
│       ├── integration/  # scroll-sync.test.ts, setlist-crud.test.ts, member-presence.test.ts, reconnect-recovery.test.ts
│       └── unit/
├── shared/          # TypeScript types only (Song, Member, Role, ScrollState)
├── specs/001-gigsheet-mvp/   # plan.md, spec.md, tasks.md, data-model.md, contracts/
└── founding-docs/gigsheet-prd.md
```

## Commands

```bash
npm install          # Install all workspaces
npm test             # Run all tests (Vitest)
npm run build        # Build client + server
npm run dev          # Dev mode (client + server concurrently)
```

## Code Style

- TypeScript strict mode; no `any` without `// eslint-disable` justification comment
- No premature abstractions; three similar lines > one utility function
- All Socket.IO scroll event handlers tagged with `[scroll-sync]` in comments
- CSS via custom properties (tokens.css); no inline styles

## Constitution Principles (must re-read .specify/memory/constitution.md before planning)

- **I. Testability First**: Test infra before feature work. Agent must run `npm test` green.
- **II. Synced Scroll Is Sacred**: Any change to scroll_update/scroll_synced/ScrollState needs integration test. Tag commits `[scroll-sync]`.
- **III. Local-First**: No external runtime calls. All assets self-hosted.
- **IV. Readability**: 14px min chart font, 44px touch targets.
- **V. Simplicity**: YAGNI. No over-engineering.

## Recent Changes

- 001-gigsheet-mvp: Initial project setup, spec, plan, constitution

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
