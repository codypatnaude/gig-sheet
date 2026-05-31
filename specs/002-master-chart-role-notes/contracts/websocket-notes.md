# WebSocket Event Contract: Notes & Master Chart

**Branch**: `002-master-chart-role-notes` | **Date**: 2026-05-31

Extends the event contract defined in `specs/001-gigsheet-mvp/contracts/websocket-events.md`.
All existing events are unchanged. This document specifies new and modified events only.

---

## Modified Events

### `state_sync` (Server → Client) — MODIFIED

`notes` array added for current song. Existing fields unchanged.

```typescript
// Updated StateSyncPayload
interface StateSyncPayload {
  setlist: Song[];              // unchanged
  current_song_id: string | null; // unchanged
  scroll_state: ScrollState | null; // unchanged
  members: Member[];            // unchanged
  notes: Note[];                // NEW: notes for current_song_id (empty if none)
}
```

### `song_updated` (Server → Client) — MODIFIED

When master_chart is updated and notes are clamped, the updated song AND the clamped notes are broadcast together.

```typescript
interface SongUpdatedPayload {
  song: Song;       // unchanged; song.master_chart now carries new content
  notes?: Note[];   // NEW: present only when notes were clamped by this edit
}
```

### `song_selected` (Server → Client) — MODIFIED

Notes for the newly selected song are sent alongside the selection event.

```typescript
interface SongSelectedPayload {
  song_id: string;  // unchanged
  notes: Note[];    // NEW: all notes for song_id
}
```

---

## New Events: Client → Server

### `note_add`

A member adds a note to a master-chart line.

```typescript
interface NoteAddPayload {
  song_id: string;
  line_index: number;   // zero-based index into master_chart.split('\n')
  role: Role;           // authoring role
  text: string;         // 1–280 chars
}
```

**Validation**:
- `song_id` must exist in the database
- `line_index` must be ≥ 0 and < number of lines in master_chart
- `role` must be a valid Role
- `text` must be 1–280 characters (trimmed)
- `master_chart` must not be NULL (unmigrated songs reject notes)

**On success**: server emits `note_added` to all clients (including sender).  
**On failure**: server emits `error` to sender with code `NOTE_INVALID`.

---

### `note_update`

A member edits an existing note's text.

```typescript
interface NoteUpdatePayload {
  note_id: string;
  text: string;    // 1–280 chars
}
```

**Validation**:
- `note_id` must exist
- `text` must be 1–280 characters (trimmed)

**On success**: server emits `note_updated` to all clients.  
**On failure**: server emits `error` with code `NOTE_NOT_FOUND` or `NOTE_INVALID`.

---

### `note_delete`

A member deletes a note.

```typescript
interface NoteDeletePayload {
  note_id: string;
}
```

**Validation**: `note_id` must exist.

**On success**: server emits `note_deleted` to all clients.  
**On failure**: server emits `error` with code `NOTE_NOT_FOUND`.

---

### `migrate_song`

A member confirms a migration by choosing one legacy role chart as the master.

```typescript
interface MigrateSongPayload {
  song_id: string;
  source_role: 'guitar' | 'bass' | 'drums' | 'vocals' | 'keys' | 'other';
}
```

**Validation**:
- `song_id` must exist and have `master_chart IS NULL`
- `source_role` must name a non-empty chart field on the song

**On success**: server sets `master_chart` from the chosen field, clears all `chart_*` fields, emits `song_updated` to all clients.  
**On failure**: server emits `error` with code `SONG_NOT_FOUND` or `MIGRATION_INVALID`.

---

## New Events: Server → Client

### `note_added`

```typescript
interface NoteAddedPayload {
  note: Note;
}
```

Broadcast to **all** clients (including sender). Client appends note to its local notes array.

---

### `note_updated`

```typescript
interface NoteUpdatedPayload {
  note: Note;   // full updated note
}
```

Broadcast to **all** clients. Client replaces the matching note by id.

---

### `note_deleted`

```typescript
interface NoteDeletedPayload {
  note_id: string;
}
```

Broadcast to **all** clients. Client removes note with matching id.

---

## Integration Test Requirements

| Test | Priority | Description |
|---|---|---|
| `note_add` → `note_added` latency | High | Receiver gets `note_added` within 1000ms |
| `note_update` → `note_updated` broadcast | High | All clients receive updated note within 1000ms |
| `note_delete` → `note_deleted` broadcast | High | All clients remove note within 1000ms |
| Simultaneous `note_add` same line | High | Both notes preserved, no overwrite |
| `note_add` on unmigrated song rejected | Medium | Server emits `error` |
| `note_add` invalid line_index rejected | Medium | Server emits `error` |
| `migrate_song` → `song_updated` | Medium | master_chart set, chart_* cleared |
| `song_selected` includes notes | High | Notes array in payload |
| `state_sync` includes notes for current song | High | Notes present on join |
| Chart edit clamps out-of-range notes | High | `song_updated` includes clamped notes array |
| `[scroll-sync]` Notes do not affect scroll position | Critical | Two clients with diff note counts stay within 50px |
