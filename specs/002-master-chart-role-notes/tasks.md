# Tasks: Unified Master Chart & Role Notes

**Input**: Design documents from `/specs/002-master-chart-role-notes/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Constitution**: Testability First (Principle I) — integration tests for note CRUD written before handlers.
Synced Scroll Is Sacred (Principle II) — scroll protocol unchanged; `[scroll-sync]` on any scroll-adjacent commit.

---

## Phase 1: Shared Types & Schema (Blocking Prerequisites)

**Purpose**: All downstream code depends on the updated types and database schema. Nothing else starts until this is done and tests pass.

- [ ] T001 Update `shared/types.ts`: add `Note` interface, `NoteVisibility` type, `master_chart` to `Song`, add `notes` to `StateSyncPayload` and `SongSelectedPayload`, add optional `notes` to `SongUpdatedPayload`; add `NoteAddPayload`, `NoteUpdatePayload`, `NoteDeletePayload`, `MigrateSongPayload`, `NoteAddedPayload`, `NoteUpdatedPayload`, `NoteDeletedPayload` event payload interfaces
- [ ] T002 Update `server/src/db/schema.ts`: add `ALTER TABLE songs ADD COLUMN master_chart TEXT` (idempotent — check column exists first); add `CREATE TABLE IF NOT EXISTS notes (...)` with index on `song_id`
- [ ] T003 [P] Rebuild shared package: `cd shared && npx tsc` to emit updated `dist/types.js` and `dist/types.d.ts`
- [ ] T004 [P] Verify server still compiles: `cd server && npm run build` — fix any type errors from updated shared types

**Checkpoint**: `npm test` green; `npm run build --workspace=server` clean.

---

## Phase 2: Server — Notes DB Layer + Unit Tests (Principle I)

**Purpose**: Data layer before socket handlers. Unit-tested in isolation.

- [ ] T005 Implement `server/src/db/notes.ts`: export `getNotesForSong(db, songId): Note[]`, `addNote(db, data): Note`, `updateNote(db, noteId, text): Note`, `deleteNote(db, noteId): void`, `clampNotes(db, songId, newLineCount): Note[]` (returns clamped notes)
- [ ] T006 Update `server/src/db/songs.ts`: add `migrateSong(db, songId, sourceRole)` function that sets `master_chart` from chosen field, clears all `chart_*` to NULL, returns updated `Song`
- [ ] T007 Write `server/tests/unit/db-notes.test.ts`: tests for all 5 functions in `notes.ts` using `:memory:` SQLite — addNote, getNotesForSong, updateNote, deleteNote, clampNotes (clamps note at line 8 when chart shrinks to 3 lines), addNote rejected on unmigrated song

**Checkpoint**: `npm test --workspace=server` — all unit tests green.

---

## Phase 3: US2+US1 — Note Socket Handlers + Integration Tests (Principle I first)

**Purpose**: Write integration tests for all note events before implementing handlers, per constitution Principle I.

### Integration Tests — Write First

- [ ] T008 Write `server/tests/integration/notes.test.ts`: implement all 9 scenarios from `quickstart.md` — note_add broadcast, note_update broadcast, note_delete broadcast, simultaneous add same line (both preserved), unmigrated song rejects note_add, invalid line_index rejected, chart edit clamps notes (song_updated includes notes array), state_sync includes current song notes, song_selected includes notes
- [ ] T009 Extend `server/tests/integration/scroll-sync.test.ts`: add scenario 9 from quickstart — verify adding a note mid-scroll does not change broadcast position; verify two clients with different note counts stay within 50px `[scroll-sync]`

### Implementation

- [ ] T010 Implement `server/src/socket/handlers/notes.ts`: handle `note_add` (validate song_id exists + migrated + line_index in range + text ≤ 280 chars, insert, broadcast `note_added` to all), `note_update` (validate, update, broadcast `note_updated`), `note_delete` (validate, delete, broadcast `note_deleted`), `migrate_song` (validate, call migrateSong(), broadcast `song_updated`)
- [ ] T011 Update `server/src/socket/handlers/setlist.ts`: in `song_update` handler, after saving master_chart, call `clampNotes()` and include clamped notes in `song_updated` broadcast if any were clamped
- [ ] T012 Update `server/src/socket/handlers/selection.ts`: in `song_select` handler, fetch notes for the selected song and include them in `song_selected` payload
- [ ] T013 Update `server/src/socket/handlers/member.ts`: in `state_sync` send, include `notes: getNotesForSong(db, current_song_id)` (empty array if no current song)
- [ ] T014 Register notes handler in `server/src/socket/index.ts`: call `registerNotesHandlers(io, socket, db)` alongside existing handlers

**Checkpoint**: `npm test --workspace=server` — all 9 note integration tests + scroll-sync extension green. Full suite green.

---

## Phase 4: US1 — Client Types + useSocket Notes State

**Purpose**: Wire note events into client state before building UI.

- [ ] T015 Update `client/src/hooks/useSocket.ts`: add `notes: Note[]` to `AppState`; handle `note_added` (append to notes), `note_updated` (replace by id), `note_deleted` (remove by id); populate notes from `state_sync.notes` on join; update notes from `song_selected.notes` on song change; update notes from `song_updated.notes` if present (clamped notes)
- [ ] T016 Add `emitNoteAdd`, `emitNoteUpdate`, `emitNoteDelete` emit helpers to `useSocket` return value (or expose `socket.current` directly — keep it simple per Principle V)

**Checkpoint**: Client TypeScript compiles clean (`npm run typecheck --workspace=client`).

---

## Phase 5: US1+US3 — SongView: Master Chart Rendering + Note Overlay

**Purpose**: Replace role tabs with visibility toggle; render notes above chart lines; tap to annotate.

- [ ] T017 Create `client/src/components/SongView/NoteOverlay.tsx`: given `lines: string[]`, `notes: Note[]`, `visibility: NoteVisibility`, `myRole: Role` — renders each line with any visible notes above it (filtered by visibility); each note is a `<div>` with role accent color, indented, tap-to-edit triggers callback; displaced notes (line_index === last line, chart recently shortened) show a ⚠ badge
- [ ] T018 Create `client/src/components/SongView/NoteEditor.tsx`: inline popover — text input (max 280 chars), save/cancel/delete buttons; used for both add (no existing note) and edit (existing note passed as prop); 44px touch targets
- [ ] T019 Update `client/src/components/SongView/SongView.tsx`: remove 6 role tabs; add visibility toggle (Own / All / None) where tabs were; pass `containerRef` to `NoteOverlay` instead of raw `<pre>`; wire tap-on-line → `NoteEditor` for add; tap-on-note → `NoteEditor` for edit/delete; pass `notes` and `visibility` from props

**Checkpoint**: `npm run build --workspace=client` clean. Open song view — single chart renders, visibility toggle works.

---

## Phase 6: US1 (editor) — SongEditor: Single Master Chart Field

**Purpose**: Replace the six-tab chart editor with one master_chart textarea.

- [ ] T020 Update `client/src/components/SongEditor/SongEditor.tsx`: remove six per-role chart tab UI (CHART_ROLES loop, activeChartTab state, chartTabs/chartArea section); add a single `master_chart` textarea in its place using the same `chartArea` CSS class; update `FormValues` to use `masterChart: string` instead of six chart fields; update `toNewSong()` and `toFormValues()` accordingly

**Checkpoint**: `npm run build --workspace=client` clean.

---

## Phase 7: US5 — Migration Prompt

**Purpose**: Detect unmigrated songs and show one-time migration UI.

- [ ] T021 Create `client/src/components/MigrationPrompt/MigrationPrompt.tsx`: modal overlay shown when `song.master_chart === undefined` and any `chart_*` field has content; lists populated role fields as radio options; confirm button emits `migrate_song`; dismiss button closes with read-only banner (auto-scroll disabled); same overlay CSS pattern as `SongEditor`
- [ ] T022 Wire `MigrationPrompt` into `SetlistPage.tsx`: when `editingSong` is set and `song.master_chart === undefined` and has legacy chart content, render `MigrationPrompt` instead of `SongEditor`

**Checkpoint**: `npm run build --workspace=client` clean.

---

## Phase 8: Polish & Validation

- [ ] T023 Run full test suite `npm test` — verify all 55 existing tests still pass + new note tests; fix any regressions
- [ ] T024 Run `npm run build` — verify both client and server build clean
- [ ] T025 Run `cd shared && npx tsc` — verify shared types compile
- [ ] T026 [P] Manual smoke test: start server (`node server/dist/index.js`), open browser at localhost:3000, verify join screen → setlist → song view renders with single chart textarea in editor and visibility toggle in song view
- [ ] T027 Update `specs/002-master-chart-role-notes/tasks.md` — mark all completed tasks [x]

**Checkpoint**: All tests green. Build clean. Feature complete.
