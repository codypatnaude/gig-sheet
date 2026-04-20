# Research: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20

All technical decisions for GigSheet MVP are derived from the PRD and constitution.
No ambiguities remained after spec review. This document records the decisions and
their rationale for planning traceability.

---

## Decision 1: Drag-and-Drop Library

**Decision**: dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`)

**Rationale**:
- Significantly lighter bundle weight than React DnD (~10KB vs ~30KB)
- First-class touch support (critical for mobile/tablet use in rehearsal rooms)
- Accessible by default (keyboard + screen reader support)
- Sortable preset handles the setlist reorder use case directly

**Alternatives considered**:
- React DnD: heavier, older API, less touch-friendly
- HTML5 drag-and-drop native: no touch support on mobile

---

## Decision 2: Auto-Scroll Sync Mechanism — Position Broadcast vs Delta

**Decision**: Broadcast absolute scroll position (pixels from top), not deltas.

**Rationale**:
- Absolute position means any receiving client can snap to the correct position regardless
  of how many ticks it missed (e.g., during a brief WiFi stutter).
- Delta-based scrolling would require receiving clients to track and accumulate every tick —
  missing one tick creates permanent drift.
- Broadcast interval: 250ms. At this interval, position re-sync happens 4 times per second,
  giving a maximum drift window of 250ms between ground-truth broadcasts.
- This directly satisfies the constitution's Principle II: no accumulated drift.

**Alternatives considered**:
- Delta broadcast: eliminated due to drift accumulation risk
- Server-side scroll timing: over-engineered for a LAN; adds server-side complexity

---

## Decision 3: Auto-Scroll Implementation — requestAnimationFrame

**Decision**: Use a `requestAnimationFrame` loop on the controlling client to advance
scroll position, emitting the current position to the server at each 250ms tick.

**Rationale**:
- RAF gives smooth, hardware-synchronized scrolling (aligned to display refresh rate)
- Easy to cancel (store the RAF ID and cancel on stop)
- Position can be read from the DOM each frame and broadcast on the 250ms cadence
- Receiving clients: use `element.scrollTo({ top: position, behavior: 'smooth' })` or
  a RAF-based smooth snap to avoid jarring jumps

**Alternatives considered**:
- `setInterval` for scroll: less smooth (can drift from display refresh); RAF preferred
- CSS-only scroll animation: cannot be synchronized across clients

---

## Decision 4: Service Worker / PWA Caching

**Decision**: Workbox via `vite-plugin-pwa`

**Rationale**:
- Handles app shell caching with minimal custom code (Principle V: Simplicity)
- generateSW mode: Workbox generates the service worker from config; we don't hand-roll it
- Precaches Vite's output manifest (JS, CSS, fonts, HTML) automatically
- On network loss, cached shell continues serving; Socket.IO reconnects independently

**Alternatives considered**:
- Hand-rolled service worker: more control, much more code, more failure surface
- No service worker: violates FR-034 (cache requirement) and constitution Principle III

---

## Decision 5: Testing Framework

**Decision**: Vitest everywhere (client and server)

**Rationale**:
- Single toolchain reduces cognitive overhead (one config format, one CLI)
- Vitest uses Vite's transform pipeline — TypeScript and path aliases work identically in
  tests as in production code
- jsdom environment for frontend component tests
- Node environment for backend integration tests
- Supports in-process Socket.IO server instantiation for integration tests

**Alternatives considered**:
- Jest (server) + Vitest (client): two toolchains, two configs — violates Principle V
- Playwright/E2E only: valuable for future but too slow to run as a development gate

---

## Decision 6: Socket.IO Integration Test Strategy

**Decision**: Spin up a real Socket.IO server in-process within tests using `http.createServer`
and connect real Socket.IO clients in the same process.

**Rationale**:
- This is the most faithful representation of production behavior — no mocks, no stubs
- Socket.IO's own documentation recommends this pattern for integration testing
- Allows testing multi-client scenarios (2+ clients connected simultaneously)
- Allows testing scroll sync, member presence, reconnect recovery, and state_sync
- Directly satisfies constitution Principle I: agent can run tests and verify correctness

**Test pattern**:
```typescript
// In each integration test:
const httpServer = createServer(expressApp);
const io = new SocketIOServer(httpServer);
await new Promise(r => httpServer.listen(0, r)); // random port
const port = (httpServer.address() as AddressInfo).port;
const client1 = ioc(`http://localhost:${port}`);
const client2 = ioc(`http://localhost:${port}`);
// ... test ...
// cleanup: client1.disconnect(); client2.disconnect(); httpServer.close();
```

**Alternatives considered**:
- Mock Socket.IO: fast but violates "real server" requirement from constitution Principle I
- Separate test server process: slower startup, more complex test coordination

---

## Decision 7: Self-Hosted Font Delivery

**Decision**: Bundle DM Sans and JetBrains Mono as WOFF2 files in `client/src/assets/fonts/`.
Reference via `@font-face` in a global CSS file served by Vite.

**Rationale**:
- Directly satisfies constitution Principle III: zero external runtime dependencies
- WOFF2 is supported by all target browsers (iOS Safari 10+, Android Chrome 36+)
- Fonts are included in Vite's build output and cached by the service worker

**Font sources**:
- DM Sans: available on Google Fonts (download and self-host)
- JetBrains Mono: available at jetbrains.com/lp/mono/ (SIL Open Font License)

**Alternatives considered**:
- Google Fonts CDN: violates Principle III (external runtime call)
- System fonts: neither DM Sans nor JetBrains Mono are system fonts; substitutes would
  break the Warm Analog design spec and monospace chart rendering

---

## Decision 8: Monorepo Structure

**Decision**: npm workspaces with three packages: `client/`, `server/`, `shared/`

**Rationale**:
- `shared/` exists solely for TypeScript type sharing (Song, Member, Role, ScrollState,
  WebSocket event payload types). It has zero runtime code.
- Without `shared/`, types would be duplicated between client and server — a common source
  of payload drift bugs in Socket.IO applications
- npm workspaces is the simplest option (no Turborepo, no Nx required at this scale)
- Principle V compliance: three packages is the minimum needed; no fourth package exists

**Alternatives considered**:
- Copy-paste shared types: creates drift risk between client and server type definitions
- Lerna / Turborepo: over-engineered for three packages (Principle V: YAGNI)

---

## Decision 9: SQLite Driver — better-sqlite3

**Decision**: `better-sqlite3` (synchronous API)

**Rationale**:
- Synchronous API is simpler in an event-driven server — no async/await boilerplate for DB
  calls that are always fast (local SQLite on Mac Mini SSD)
- Single-process model (Mac Mini, single Node.js process) means the sync driver's
  thread-blocking behavior is a non-issue
- No ORM: raw SQL with typed helper functions is sufficient for ~5 queries (Principle V)

**Alternatives considered**:
- node-sqlite3 (async): more complex, no benefit for local single-process usage
- Prisma / Drizzle ORM: unnecessary abstraction for 1 table + simple CRUD (Principle V)
- PostgreSQL: over-engineered for a local single-band app (Principle V)
