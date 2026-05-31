# Research: Unified Master Chart & Role Notes

**Branch**: `002-master-chart-role-notes` | **Date**: 2026-05-31

---

## Decision 1: Note Storage — Separate Table vs JSON Blob

**Decision**: Separate `notes` table with one row per note.

**Rationale**: Individual note add/edit/delete events need to sync atomically — a single note changes without rebuilding the whole song record. A JSON blob in the songs row would require a read-modify-write cycle on every note operation and would cause last-writer-wins collisions when two members add notes to different lines simultaneously. A normalized row per note allows the server to insert/update/delete a single record and broadcast only the delta.

**Alternatives considered**:
- JSON column on `songs`: simpler schema, but breaks atomic note sync and causes race conditions on concurrent adds to different lines.
- Embedded in `master_chart` text (markdown-style annotations): impossible to keep notes out of the scroll line set.

---

## Decision 2: Line Indexing — Stored Index vs Computed at Read Time

**Decision**: Store `line_index` as a plain integer in the `notes` table. The client and server both derive the line set by splitting `master_chart` on `\n` at render/query time.

**Rationale**: The index only needs to be stable across the life of the chart text. When the chart is edited, the server clamps any out-of-range notes in the same transaction that writes the new chart text — so stale indices are fixed immediately on save. Computing the line set from the raw text on demand keeps the data model simple and avoids storing derived data (Principle V).

**Alternatives considered**:
- Store line content hash: more resilient to insertion/deletion but adds complexity and still needs fallback for hash misses.
- Store character offset instead of line number: harder to render and harder to explain to future maintainers.

---

## Decision 3: Scroll Line Set — All Lines vs Non-Empty Lines

**Decision**: The scroll engine counts **all lines** produced by `master_chart.split('\n')`, including blank lines. Blank lines are valid whitespace that authors use to separate sections; collapsing them would shift line indices and displace notes.

**Rationale**: If we collapse blank lines for scroll purposes, a note anchored to line 5 (after a blank line 4) would render above the wrong line on devices that collapse differently. Consistent treatment of all lines — including blank — guarantees `line_index` means the same thing everywhere.

**Alternatives considered**:
- Skip blank lines: simpler scroll, but risks index drift between devices if blank-line handling is ever inconsistent.

---

## Decision 4: Notes in state_sync vs On-Demand Fetch

**Decision**: Include all notes for the current song in the `state_sync` payload (sent when a client joins or rejoins). Notes for other songs are fetched lazily when that song is selected.

**Rationale**: `state_sync` already sends the full setlist and current scroll state; adding the current song's notes keeps the join flow as a single round trip. Sending all notes for all songs would bloat the payload unnecessarily for a band with 20+ songs. Lazy fetch per song selection is one extra event and keeps payload size proportional to what the member is actually viewing.

**Alternatives considered**:
- All notes in state_sync: unnecessary data for songs not currently viewed.
- Always fetch on song selection: extra round-trip even on initial join; complicates the reconnect flow.

---

## Decision 5: Migration — Keep Legacy Columns vs Drop Immediately

**Decision**: Add `master_chart` column (nullable). Keep the six `chart_*` columns in the database but stop writing to them after migration. A song is "unmigrated" when `master_chart IS NULL`. The migration UI sets `master_chart` from a chosen role's content; after that the old columns are cleared to NULL (not dropped — dropping columns in SQLite requires a full table rebuild).

**Rationale**: SQLite does not support `DROP COLUMN` without recreating the table (prior to SQLite 3.35). Keeping old columns as NULL after migration is the simplest path. The columns do not affect any read paths once `master_chart` is set — queries filter on `master_chart IS NULL` to detect unmigrated songs.

**Alternatives considered**:
- Full table rebuild to drop columns: technically correct but high risk and complexity for a low-stakes data volume.
- Leave old column data in place: wastes storage and could confuse future developers; clearing to NULL is cheap.

---

## Decision 6: Note Sync Events — Delta vs Full Reload

**Decision**: Broadcast individual note delta events: `note_added`, `note_updated`, `note_deleted`. Each carries only the affected note. Clients patch their local note array rather than re-fetching.

**Rationale**: Consistent with how `song_updated` and `setlist_updated` work in spec 001. Delta events are simpler to test (one event, one assertion) and produce less network traffic than sending all notes for a song on every change.

**Alternatives considered**:
- Broadcast full notes array on any change: simpler client merge logic, but O(notes) data on every single note edit.

---

## Decision 7: Note Ownership for Edit/Delete

**Decision**: Any member **of the same role** can edit or delete a note. Notes are role-scoped, not member-scoped (per spec 002 Assumptions). No per-member identity is tracked beyond `socket_id` (which changes on reconnect).

**Rationale**: The app has no persistent user accounts. The constitution's Principle V prohibits adding auth complexity not required by the current spec. Role-level ownership is sufficient for a small trust-network band.

---

## Decision 8: Scroll Compatibility — No Payload Changes

**Decision**: The existing `scroll_update` / `scroll_synced` / `scroll_stopped` event contract is unchanged. The `position` field remains absolute pixel offset from the top of the scroll container. Notes render in the same DOM flow as chart lines and do push the chart content down — but since every device that is scrolling **as a receiver** sets `scrollTop` directly from the broadcast position, pixel-accurate sync is maintained regardless of note visibility state.

**Rationale**: The absolute-position broadcast (Decision 2 from spec 001 research) already absorbs any rendering differences between devices. A device with more notes visible will have more total scroll height, but the controlling device's broadcast position is what all receivers snap to — so the same master-chart line is at the top of every screen. This is exactly the invariant FR-015/FR-016 require, and it requires no protocol change.

**Alternatives considered**:
- Line-index-based scroll (broadcast line number not pixels): would decouple scroll from note rendering entirely, but requires a different scroll engine and changes the existing tested protocol.
