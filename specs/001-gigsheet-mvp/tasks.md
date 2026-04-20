# Tasks: GigSheet MVP

**Input**: Design documents from `/specs/001-gigsheet-mvp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Constitution**: Testability First (Principle I) — test infrastructure is Phase 1.
Synced Scroll Is Sacred (Principle II) — scroll sync integration tests precede scroll implementation.

---

## Phase 1: Setup & Test Infrastructure (Constitution Principle I)

**Purpose**: Monorepo scaffolding, dependency installation, and test harness — BEFORE any feature code.
The agent must be able to run `npm test` and see green before moving to Phase 2.

- [ ] T001 Initialize npm workspaces monorepo: create root `package.json` with workspaces `["client","server","shared"]` at `/package.json`
- [ ] T002 Create `shared/` package: `shared/package.json`, `shared/tsconfig.json`, `shared/types.ts` with all types from data-model.md
- [ ] T003 Scaffold `server/` package: `server/package.json` (express, socket.io, better-sqlite3, vitest, tsx, uuid), `server/tsconfig.json`
- [ ] T004 Scaffold `client/` package: `client/package.json` (react, vite, socket.io-client, dnd-kit, vite-plugin-pwa, vitest), `client/tsconfig.json`, `client/vite.config.ts`
- [ ] T005 Create root `tsconfig.base.json` with strict TypeScript settings shared by all packages
- [ ] T006 Configure Vitest for server: `server/vitest.config.ts` with Node environment; add `test` script to `server/package.json`
- [ ] T007 Configure Vitest for client: `client/vitest.config.ts` with jsdom environment; add `test` script to `client/package.json`
- [ ] T008 Write first passing server test (smoke test) to verify Vitest config works: `server/tests/unit/smoke.test.ts`
- [ ] T009 Write first passing client test (smoke test) to verify Vitest + jsdom works: `client/src/components/__tests__/smoke.test.ts`
- [ ] T010 Add root `test` script to `package.json` that runs `npm test --workspaces`; verify `npm test` passes green from repo root
- [ ] T011 [P] Create `.gitignore` with Node.js/TypeScript patterns: `node_modules/`, `dist/`, `build/`, `*.db`, `.env*`, `coverage/`
- [ ] T012 [P] Create `server/src/index.ts` stub (Express app, no routes yet) and `server/src/socket/state.ts` with `ServerState` initial value

**Checkpoint**: `npm test` runs and passes. All three packages compile with `tsc --noEmit`.

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

**Purpose**: Database layer, Socket.IO server setup, and shared infrastructure that every user story depends on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete and tests pass.

- [ ] T013 Implement SQLite schema: `server/src/db/schema.ts` — `CREATE TABLE IF NOT EXISTS songs` per data-model.md; export `initDb(dbPath)` function
- [ ] T014 Implement Song CRUD queries: `server/src/db/songs.ts` — `getAllSongs()`, `getSongById()`, `createSong()`, `updateSong()`, `deleteSong()`, `reorderSongs()` using better-sqlite3
- [ ] T015 Implement demo seed: `server/src/db/seed.ts` — inserts "Last Call at Lindy's", "Meridian", "Copper Wire" only if `song_count = 0`; export `seedIfEmpty(db)`
- [ ] T016 Write unit tests for db/songs.ts: `server/tests/unit/db-songs.test.ts` — tests for all 6 CRUD operations using in-memory SQLite (`:memory:`)
- [ ] T017 Write unit tests for seed: verify seed inserts 3 songs on empty db; verify no re-insertion when songs exist; in `server/tests/unit/db-songs.test.ts`
- [ ] T018 Implement `ServerState` with mutations: `server/src/socket/state.ts` — `addMember()`, `removeMember()`, `setCurrentSong()`, `setScrollState()`, `clearScrollState()`, `getState()`
- [ ] T019 Write unit tests for state.ts: `server/tests/unit/state.test.ts` — test all mutations and getters
- [ ] T020 Wire up Express + Socket.IO server: update `server/src/index.ts` — create HTTP server, attach Socket.IO, serve `../client/dist` static files, `GET /health` endpoint
- [ ] T021 [P] Create CSS design tokens: `client/src/styles/tokens.css` — all color, typography, spacing tokens from PRD UI section
- [ ] T022 [P] Add self-hosted fonts: create `client/src/assets/fonts/` directory; add `@font-face` declarations for DM Sans and JetBrains Mono in `client/src/styles/fonts.css`; import in `client/src/main.tsx`

**Checkpoint**: `npm test` green. Server starts (`tsx server/src/index.ts`). `/health` returns 200.

---

## Phase 3: US1 — Synchronized Chart Scrolling (Priority: P1) 🎯 Sacred Feature

**Goal**: Scroll sync integration tests exist AND pass. Auto-scroll controller broadcasts; receivers sync.
This phase implements the constitution's Principle II requirement end-to-end.

**Independent Test**: Two in-process Socket.IO clients. Client A emits `scroll_update` at 250ms interval
for 5 seconds. Client B receives `scroll_synced`. Assert: every broadcast received within 1s; final
position matches; stop event halts both.

### Integration Tests for Scroll Sync [scroll-sync] — WRITE FIRST, VERIFY THEY FAIL

- [ ] T023 [US1] Write scroll sync integration test harness: `server/tests/integration/scroll-sync.test.ts` — helper to spin up in-process Socket.IO server + two clients (pattern from research.md Decision 6)
- [ ] T024 [US1] Write test: `scroll_synced` received by non-controller within 1000ms of `scroll_update` emit
- [ ] T025 [US1] Write test: position drift <50px after 60 `scroll_update` emissions at 250ms interval (simulates 15s)
- [ ] T026 [US1] Write test: `scroll_stopped` broadcast to all clients within 1000ms of `scroll_stop` emit
- [ ] T027 [US1] Write test: reconnecting client receives `scroll_state` in `state_sync` payload

### Implementation for US1 [scroll-sync]

- [ ] T028 [US1] Implement scroll Socket.IO handler: `server/src/socket/handlers/scroll.ts` — handle `scroll_update` (update state, broadcast `scroll_synced` to all-except-sender), handle `scroll_stop` (clear state, broadcast `scroll_stopped`)
- [ ] T029 [US1] Wire scroll handlers into Socket.IO server in `server/src/socket/index.ts`
- [ ] T030 [US1] Implement `useAutoScroll` hook: `client/src/hooks/useAutoScroll.ts` — RAF loop, emits `scroll_update` at 250ms cadence, applies `scroll_synced` position to scroll container ref, handles `scroll_stopped`
- [ ] T031 [US1] Build `SongView` component shell: `client/src/components/SongView/SongView.tsx` — header (title, key, tempo), role tabs (all 6), monospace chart area (scrollable div with ref), auto-scroll controls (start/stop button, speed selector 0.5x–3.0x)
- [ ] T032 [US1] Wire `useAutoScroll` into `SongView` component; integrate scroll container ref
- [ ] T033 [US1] Run `npm test` — verify all T023–T027 tests now pass [scroll-sync verified]

**Checkpoint**: All scroll sync integration tests pass. Two browser windows demonstrate live scroll sync.

---

## Phase 4: US2 — Real-Time Setlist Management (Priority: P2)

**Goal**: Any member can add/edit/delete/reorder songs; all changes broadcast to all clients within 1s.

**Independent Test**: Two in-process clients. Client A emits `song_create`. Assert Client B receives
`setlist_updated` with new song within 1000ms. Test all four CRUD operations.

### Integration Tests for Setlist — WRITE FIRST

- [ ] T034 [US2] Write setlist integration tests: `server/tests/integration/setlist-crud.test.ts` — in-process server + two clients; test `song_create` → `setlist_updated` on both; test `song_update` → `song_updated`; test `song_delete` → `setlist_updated`; test `setlist_reorder` → `setlist_updated` in new order; test broadcast within 1000ms

### Implementation for US2

- [ ] T035 [US2] Implement setlist Socket.IO handlers: `server/src/socket/handlers/setlist.ts` — `song_create`, `song_update`, `song_delete`, `setlist_reorder`; each persists to SQLite then broadcasts
- [ ] T036 [US2] Implement selection handler: `server/src/socket/handlers/selection.ts` — `song_select` updates `current_song_id`, broadcasts `song_selected`
- [ ] T037 [US2] Wire setlist + selection handlers into `server/src/socket/index.ts`
- [ ] T038 [US2] Implement `useSetlist` hook: `client/src/hooks/useSetlist.ts` — holds `Song[]` state; emits `song_create`, `song_update`, `song_delete`, `setlist_reorder`; handles `setlist_updated`, `song_updated` events
- [ ] T039 [US2] Build `SetlistView` component: `client/src/components/SetlistView/SetlistView.tsx` — ordered song rows (position, title, key, tempo, duration), drag-to-reorder with dnd-kit, "Add Song" button, edit/delete actions per row, active song highlight
- [ ] T040 [US2] Build `SongEditor` component: `client/src/components/SongEditor/SongEditor.tsx` — all metadata fields (title required, artist, key, tempo, duration, notes) + six role chart textareas (monospace font), save/cancel buttons, validation error on empty title
- [ ] T041 [US2] Build `SetlistPage`: `client/src/pages/SetlistPage.tsx` — composes SetlistView + SongEditor modal/panel + WhoIsHere panel + ConnectionStatus; handles navigation to SongView on song tap

**Checkpoint**: All setlist CRUD tests pass. Setlist changes reflect on both browser windows within 1s.

---

## Phase 5: US3 — Song Selection Sync (Priority: P3)

**Goal**: Tapping a song transitions all connected clients to SongView for that song.

**Independent Test**: Two clients with different roles. Client A emits `song_select`. Assert both clients
receive `song_selected` within 1000ms. Assert correct role tab pre-selected per client.

- [ ] T042 [US3] Add song selection tests to `server/tests/integration/setlist-crud.test.ts`: `song_select` → `song_selected` on both clients within 1000ms
- [ ] T043 [US3] Implement `useSongSelection` hook: `client/src/hooks/useSongSelection.ts` — tracks `currentSongId`; emits `song_select`; handles `song_selected` event; exposes `selectSong(id)` and `currentSongId`
- [ ] T044 [US3] Build `SongViewPage`: `client/src/pages/SongViewPage.tsx` — receives `song` prop; renders `SongView` component; back button to SetlistPage
- [ ] T045 [US3] Wire song selection into `SetlistPage` and `SongViewPage`: tapping a setlist row calls `selectSong(id)`; `currentSongId` change triggers navigation to `SongViewPage`
- [ ] T046 [US3] Implement role tab pre-selection in `SongView`: on mount, pre-select tab matching `member.role` from localStorage; tabs are independently controlled per client

**Checkpoint**: Tapping song on one device navigates all connected devices to SongView.

---

## Phase 6: US4 — Join Flow and Member Presence (Priority: P4)

**Goal**: Join screen on first visit; localStorage persistence; Who's Here panel syncs in real time.

**Independent Test**: Two in-process clients. Client A emits `member_join`. Assert Client B receives
`member_joined` within 1000ms. Client A disconnects. Assert Client B receives `member_left`.

### Integration Tests for Member Presence

- [ ] T047 [US4] Write member presence integration tests: `server/tests/integration/member-presence.test.ts` — `member_join` → `member_joined` on other clients; disconnect → `member_left`; `state_sync` payload on join includes all current members

### Implementation for US4

- [ ] T048 [US4] Implement member Socket.IO handlers: `server/src/socket/handlers/member.ts` — `member_join` (add to state, broadcast `member_joined`, send `state_sync` to joining client), `member_update` (update state, broadcast `member_updated`), `disconnect` (remove from state, broadcast `member_left`)
- [ ] T049 [US4] Wire member handlers in `server/src/socket/index.ts`; implement `state_sync` send with full payload from data-model.md
- [ ] T050 [US4] Implement `useSocket` hook: `client/src/hooks/useSocket.ts` — creates Socket.IO client connection; emits `member_join` on connect; handles `state_sync`; exposes socket and connection status; manages localStorage persistence (`gigsheet_member_name`, `gigsheet_member_role`)
- [ ] T051 [US4] Build `JoinScreen` component: `client/src/components/JoinScreen/JoinScreen.tsx` — name input (required, max 30 chars, validation), role selector (6 buttons), submit handler; renders only when no localStorage data
- [ ] T052 [US4] Build `WhoIsHere` component: `client/src/components/WhoIsHere/WhoIsHere.tsx` — list of connected members with name + role; updates from `member_joined`/`member_left`/`member_updated` events
- [ ] T053 [US4] Build `ConnectionStatus` component: `client/src/components/ConnectionStatus/ConnectionStatus.tsx` — three states: Connected (green), Reconnecting (amber pulse), Offline (red); driven by Socket.IO connection events

**Checkpoint**: Join flow works. Who's Here panel updates in real time on both devices.

---

## Phase 7: US5 — Song Editor with Per-Role Charts (Priority: P5)

**Goal**: Full-featured song editor: all metadata fields + six per-role monospace chart textareas.

**Independent Test**: Create song via editor. Verify all fields persisted correctly to DB. Verify chart
text in Song View renders in monospace with preserved whitespace.

- [ ] T054 [US5] Add song editor validation tests to `server/tests/unit/db-songs.test.ts`: test that empty title is rejected; test that all chart fields are stored and retrieved correctly
- [ ] T055 [US5] Complete `SongEditor` component (from T040): add all six per-role chart textareas with `font-family: var(--font-mono)` style; tab-switching between role chart fields; character counter for title; proper form validation feedback

**Checkpoint**: Songs can be created and edited with full metadata and charts. Charts display correctly in Song View.

---

## Phase 8: US6 — Connection Resilience and Offline Tolerance (Priority: P6)

**Goal**: Service worker caches app shell. Auto-reconnect restores full state after WiFi drop.

**Independent Test**: In-process client: emit `member_join`, disconnect socket, reconnect. Assert `state_sync`
received on reconnect with correct setlist and current_song_id.

### Integration Tests for Reconnect

- [ ] T056 [US6] Write reconnect recovery integration tests: `server/tests/integration/reconnect-recovery.test.ts` — client disconnects and reconnects; asserts full `state_sync` received; asserts scroll_state included if active

### Implementation for US6

- [ ] T057 [US6] Configure Socket.IO client reconnection in `useSocket.ts`: `reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 5000`
- [ ] T058 [US6] Configure `vite-plugin-pwa` in `client/vite.config.ts`: `generateSW` strategy; precache all static assets; update `client/public/manifest.json` with correct app metadata (`name: "GigSheet"`, `theme_color: "#1A1714"`, `background_color: "#1A1714"`, `display: "standalone"`)
- [ ] T059 [US6] Wire `ConnectionStatus` component to socket connection events in `useSocket.ts`; expose connection state (`connected` | `reconnecting` | `offline`)

**Checkpoint**: Reconnect tests pass. Disconnecting and reconnecting restores state without user action.

---

## Phase 9: US7 — Demo Content Pre-Load (Priority: P7)

**Goal**: Three demo songs on first run; no duplication on restart.

- [ ] T060 [US7] Verify demo seed tests from T017 pass and cover both cases (empty DB and populated DB)
- [ ] T061 [US7] Call `seedIfEmpty(db)` from `server/src/index.ts` during server startup, after `initDb()` is called

**Checkpoint**: Fresh server has three demo songs. Restarting does not duplicate them.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, root dev/build scripts, `.gitignore` completion, and validation.

- [ ] T062 Add root `dev` script to `package.json`: runs `client` Vite dev server and `server` tsx watch concurrently (use `concurrently` package)
- [ ] T063 Add root `build` script: `vite build` in client, `tsc` in server; server `index.ts` serves `client/dist`
- [ ] T064 [P] Add `dev:server` and `dev:client` scripts to respective package.json files
- [ ] T065 [P] Verify server URL display in `SetlistPage`: show `window.location.host` prominently to help new members find the app
- [ ] T066 Run full `npm test` and confirm all integration and unit tests pass — produce final green test run
- [ ] T067 Manually verify Quickstart Scenarios 1–4 (demo content, join, setlist CRUD, song selection) work end-to-end in browser
- [ ] T068 Manually verify Quickstart Scenario 5 (auto-scroll sync) across two browser tabs
- [ ] T069 [P] Update `specs/001-gigsheet-mvp/checklists/requirements.md` to reflect implementation complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phases 3–9 (User Stories)**: All depend on Phase 2; execute sequentially in priority order
- **Phase 10 (Polish)**: Depends on all user story phases complete

### Within Each Phase

- Tests written FIRST, verify they FAIL, then implement until they PASS
- T023–T027 (scroll sync tests) must fail before T028–T032 (scroll implementation)
- T034 (setlist tests) must fail before T035–T041 (setlist implementation)

### Parallel Opportunities

- Within Phase 1: T011, T012 can run in parallel with other setup tasks
- Within Phase 2: T021, T022 can run in parallel with server-side foundational work
- Within Phase 10: T064, T065, T069 can run in parallel

---

## Parallel Example: Phase 3 (Scroll Sync)

```bash
# Step 1 — Write tests first (T023–T027), all in same file, sequential:
Task: "Write scroll sync test harness in server/tests/integration/scroll-sync.test.ts"
Task: "Write scroll_synced latency test"
Task: "Write drift <50px test"
Task: "Write scroll_stopped broadcast test"
Task: "Write reconnect scroll_state test"

# Step 2 — Verify tests FAIL (server handler not yet implemented)
# Step 3 — Implement (T028–T032), then verify tests PASS
```

---

## Implementation Strategy

### MVP Slice (US1 + US2 only)

1. Complete Phase 1 (Setup) ✓
2. Complete Phase 2 (Foundation) ✓
3. Complete Phase 3 (US1: Scroll Sync — Sacred) ✓ → **scroll sync works**
4. Complete Phase 4 (US2: Setlist CRUD) ✓ → **minimal usable setlist**
5. STOP and demo: basic setlist with scroll sync is already more valuable than any existing tool

### Full MVP Delivery

Continue Phases 5–9 in priority order, then Phase 10 polish.
Each phase adds one independently testable user story.

---

## Notes

- `[scroll-sync]` tag required in commit message for any task touching scroll events or state
- Mark tasks complete with `[x]` checkbox as each is done
- Run `npm test` after every phase to verify no regressions
- Constitution Principle I: agent MUST be able to run `npm test` green before any task is "done"
