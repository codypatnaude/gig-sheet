# Implementation Plan: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-gigsheet-mvp/spec.md`

---

## Summary

GigSheet is a real-time collaborative setlist PWA for bands, running entirely on local WiFi
from a Mac Mini. The MVP delivers: identity-persistent member join, a shared CRUD setlist
with drag-to-reorder, a song editor with six per-role plain-text chart fields, a Song View
with role tabs, synced auto-scroll across all connected clients, and offline/reconnect
resilience via service worker and Socket.IO auto-reconnect.

The backend is a Node.js/Express server with Socket.IO as the real-time bus and SQLite
(via better-sqlite3) as the sole persistence layer. The frontend is a React 18 + TypeScript
SPA built with Vite, served as a PWA. All assets are self-hosted; zero external runtime
dependencies.

The critical constraint driving all architectural decisions is **scroll sync reliability**:
broadcasts must propagate within 1 second, drift must stay under 50px over 5 minutes.
Testing infrastructure for multi-client scroll sync simulation is a first-class deliverable.

---

## Technical Context

**Language/Version**: TypeScript 5.x (both frontend and backend); Node.js LTS (22.x)
**Primary Dependencies**:
- Frontend: React 18, Vite 5, Socket.IO Client 4.x, dnd-kit (drag-and-drop)
- Backend: Express 4, Socket.IO 4.x, better-sqlite3 9.x
- Testing: Vitest (frontend unit + component), Vitest + socket.io-client (backend integration)
- Shared: TypeScript types in `shared/` package

**Storage**: SQLite via better-sqlite3 (sync driver, no ORM, raw SQL)
**Testing**: Vitest across both frontend and backend; multi-client Socket.IO integration tests
**Target Platform**: Local LAN only; iOS Safari, Android Chrome, desktop browsers; Mac Mini host
**Project Type**: Progressive Web App (SPA frontend + Node.js backend monorepo)
**Performance Goals**: Scroll sync broadcast ≤250ms interval; LAN propagation <1s; no drift >50px/5min
**Constraints**: Zero external runtime calls; fully offline-capable; SQLite only; fonts self-hosted
**Scale/Scope**: 2–8 simultaneous clients; single band; single setlist; ~100 songs max

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Testability First | Test infra (Vitest config, first passing test, scroll sync integration test harness) MUST be set up in Phase 1 before any feature work. Multi-client Socket.IO simulation must exist before scroll sync implementation. | ✅ PLANNED — test setup is Phase 1 |
| II. Synced Scroll Is Sacred | Scroll sync integration tests cover: latency <1s, drift <50px/5min, reconnect snap, stop propagation. All scroll-touching tasks tagged `[scroll-sync]`. | ✅ PLANNED — tests written before scroll impl |
| III. Local-First | No external CDN, API, or service calls at runtime. DM Sans and JetBrains Mono bundled locally. | ✅ Fonts added as local WOFF2 files in `client/src/assets/fonts/` |
| IV. Readability at Arm's Length | Min chart font 14px mobile / 16px tablet. 44px touch targets. WCAG AA contrast enforced via design tokens. | ✅ Design tokens codified in CSS custom properties |
| V. Simplicity | Monorepo with three packages (client, server, shared) — justified by TypeScript sharing. No ORMs, no state management libraries beyond React hooks + context. | ✅ No premature abstractions |

**Gate result**: ✅ PASS — no violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-gigsheet-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── websocket-events.md
│   └── rest-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (repository root)

```text
gig-sheets/
├── client/                        # React 18 + TypeScript + Vite PWA
│   ├── src/
│   │   ├── assets/
│   │   │   └── fonts/             # DM Sans + JetBrains Mono (self-hosted WOFF2)
│   │   ├── components/
│   │   │   ├── ConnectionStatus/  # Connected / Reconnecting / Offline indicator
│   │   │   ├── JoinScreen/        # First-visit name + role form
│   │   │   ├── SetlistView/       # Ordered song list + drag-to-reorder
│   │   │   ├── SongEditor/        # Metadata + 6-role chart textareas
│   │   │   ├── SongView/          # Role tabs + monospace chart + auto-scroll
│   │   │   └── WhoIsHere/         # Live connected members panel
│   │   ├── hooks/
│   │   │   ├── useSocket.ts       # Socket.IO connection + event wiring
│   │   │   ├── useSetlist.ts      # Setlist state + CRUD actions
│   │   │   ├── useSongSelection.ts
│   │   │   └── useAutoScroll.ts   # Auto-scroll controller + sync broadcast
│   │   ├── pages/
│   │   │   ├── SetlistPage.tsx
│   │   │   └── SongViewPage.tsx
│   │   ├── styles/
│   │   │   └── tokens.css         # CSS custom properties (color, type, spacing)
│   │   └── main.tsx
│   ├── public/
│   │   └── manifest.json          # PWA manifest
│   ├── vite.config.ts
│   └── vitest.config.ts
│
├── server/                        # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts          # CREATE TABLE SQL + migration runner
│   │   │   ├── songs.ts           # Song CRUD queries (better-sqlite3)
│   │   │   └── seed.ts            # Demo content insertion
│   │   ├── socket/
│   │   │   ├── index.ts           # Socket.IO server setup
│   │   │   ├── handlers/
│   │   │   │   ├── member.ts      # member_join, member_update handlers
│   │   │   │   ├── setlist.ts     # song_create, song_update, song_delete, reorder
│   │   │   │   ├── selection.ts   # song_select handler
│   │   │   │   └── scroll.ts      # scroll_update, scroll_stop [scroll-sync]
│   │   │   └── state.ts           # In-memory ServerState
│   │   ├── routes/
│   │   │   └── health.ts          # GET /health
│   │   └── index.ts               # Express + Socket.IO + serve client build
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── scroll-sync.test.ts      # [scroll-sync] Multi-client sync
│   │   │   ├── setlist-crud.test.ts
│   │   │   ├── member-presence.test.ts
│   │   │   └── reconnect-recovery.test.ts
│   │   └── unit/
│   │       ├── db-songs.test.ts
│   │       └── state.test.ts
│   ├── vitest.config.ts
│   └── tsconfig.json
│
├── shared/                        # Shared TypeScript types (zero runtime code)
│   ├── types.ts
│   └── tsconfig.json
│
├── founding-docs/
├── specs/
├── package.json                   # npm workspaces root
├── tsconfig.base.json
└── .gitignore
```

**Structure Decision**: Three-workspace monorepo (client / server / shared) using npm
workspaces. `shared/` contains only TypeScript type definitions — zero runtime code. This
is the minimum structure needed to share types between client and server without duplication.

---

## Technology Decisions

See [research.md](./research.md) for full rationale. Summary:

| Decision | Choice | Rationale |
|---|---|---|
| Drag-and-drop | dnd-kit | Lighter than React DnD, better touch support, accessible |
| Scroll sync mechanism | Absolute position broadcast | Eliminates drift accumulation |
| Auto-scroll impl | requestAnimationFrame loop | Smooth, cancellable, DOM-synchronized |
| Service worker | vite-plugin-pwa (Workbox) | Simplest correct PWA shell caching |
| Font delivery | Local WOFF2 files | Zero external runtime deps (Principle III) |
| Test framework | Vitest everywhere | Single toolchain; Node + browser |
| Socket.IO integration test | Real server in-process | No mock drift (Principle I) |
| SQLite driver | better-sqlite3 | Synchronous API; no ORM needed |

---

## Complexity Tracking

No constitution violations. No entry required.
