# Integration Test Quickstart: Master Chart & Role Notes

**Branch**: `002-master-chart-role-notes` | **Date**: 2026-05-31

All scenarios use in-process Socket.IO server with real `socket.io-client` connections (same pattern as spec 001 tests). See `server/tests/integration/helpers.ts` for `createTestServer()` and `connectAndJoin()` helpers.

---

## Scenario 1: Note Add / Broadcast

```
Setup: 2 clients (Guitar, Bass), 1 migrated song
Flow:
  clientA.emit('note_add', { song_id, line_index: 2, role: 'Guitar', text: 'palm mute' })
  clientB listens for 'note_added'
Assert:
  - note_added received by clientB within 1000ms
  - note_added.note.text === 'palm mute'
  - note_added.note.role === 'Guitar'
  - note_added.note.line_index === 2
  - note_added also received by clientA (broadcast to all)
```

**Test file**: `server/tests/integration/notes.test.ts`

---

## Scenario 2: Note Update / Delete

```
Setup: 2 clients, 1 note pre-created for song
Flow (update):
  clientA.emit('note_update', { note_id, text: 'updated text' })
  clientB listens for 'note_updated'
Assert: note_updated.note.text === 'updated text' on both clients within 1000ms

Flow (delete):
  clientA.emit('note_delete', { note_id })
  clientB listens for 'note_deleted'
Assert: note_deleted.note_id === note_id on both clients within 1000ms
```

**Test file**: `server/tests/integration/notes.test.ts`

---

## Scenario 3: Simultaneous Note Add Same Line

```
Setup: 2 clients, 1 song
Flow:
  clientA.emit('note_add', { line_index: 0, role: 'Guitar', text: 'A' })
  clientB.emit('note_add', { line_index: 0, role: 'Bass', text: 'B' })
Assert:
  - Both note_added events received by both clients
  - DB contains 2 notes for line_index 0
  - Neither note overwrites the other
```

---

## Scenario 4: Validation Errors

```
Setup: 1 client, 1 unmigrated song (master_chart IS NULL)
Flow:
  client.emit('note_add', { song_id: unmigrated_id, line_index: 0, role: 'Guitar', text: 'x' })
Assert: error event with code NOTE_INVALID (or SONG_NOT_MIGRATED)

Flow:
  client.emit('note_add', { song_id: migrated_id, line_index: 9999, role: 'Guitar', text: 'x' })
Assert: error event (line_index out of range)
```

---

## Scenario 5: Chart Edit Clamps Notes

```
Setup: 1 client, song with 10-line master_chart, note at line_index 8
Flow:
  clientA.emit('song_update', { song: { ...song, master_chart: 'line0\nline1\nline2' } })
Assert:
  - song_updated received with updated master_chart
  - song_updated.notes array contains clamped note with line_index === 2 (last valid)
  - DB note has line_index === 2
```

---

## Scenario 6: state_sync Includes Notes

```
Setup: song selected, 3 notes in DB for that song
Flow:
  new client connects and joins
Assert:
  - state_sync.notes.length === 3
  - notes are for current_song_id only
```

---

## Scenario 7: song_selected Includes Notes

```
Setup: 2 clients, 2 songs (A has 3 notes, B has 1 note)
Flow:
  clientA.emit('song_select', { song_id: songA.id })
  clientB listens for 'song_selected'
Assert:
  - song_selected.notes.length === 3
  - all notes belong to songA
```

---

## Scenario 8: Migration

```
Setup: 1 client, legacy song (chart_guitar='G chart', chart_bass='B chart', master_chart=NULL)
Flow:
  client.emit('migrate_song', { song_id, source_role: 'guitar' })
Assert:
  - song_updated.song.master_chart === 'G chart'
  - song_updated.song.chart_guitar === null (cleared)
  - song is now migrated (master_chart IS NOT NULL)
```

---

## Scenario 9 `[scroll-sync]`: Notes Do Not Affect Scroll

```
Setup: 2 clients (A=Guitar with 10 notes, B=Bass with 0 notes), auto-scroll running
Flow:
  clientA starts scroll; 60 tick loop at 250ms interval
Assert (at each tick):
  - scroll position broadcast is absolute pixel value
  - clientB receives scroll_synced within 1000ms of each broadcast
  - after 60 ticks, |clientA_position - clientB_received_position| < 50px
  - adding a note mid-scroll does not alter broadcast position
```

**Test file**: `server/tests/integration/scroll-sync.test.ts` (extend existing)
