# Data Model: Unified Master Chart & Role Notes

**Branch**: `002-master-chart-role-notes` | **Date**: 2026-05-31

---

## Schema Changes

### `songs` table — modified

Add `master_chart` column. Keep legacy `chart_*` columns (nullable, cleared after migration).

```sql
ALTER TABLE songs ADD COLUMN master_chart TEXT;

-- After migration per song, clear legacy columns:
-- UPDATE songs SET
--   chart_guitar=NULL, chart_bass=NULL, chart_drums=NULL,
--   chart_vocals=NULL, chart_keys=NULL, chart_other=NULL
-- WHERE id = ?
```

A song is **unmigrated** when `master_chart IS NULL AND (chart_guitar IS NOT NULL OR chart_bass IS NOT NULL OR ...)`.  
A song is **migrated** when `master_chart IS NOT NULL` (value may be empty string for blank chart).

### `notes` table — new

```sql
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  song_id     TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  line_index  INTEGER NOT NULL,   -- zero-based index into master_chart.split('\n')
  role        TEXT NOT NULL,      -- one of: Guitar|Bass|Drums|Vocals|Keys|Other
  text        TEXT NOT NULL,      -- plain text, max 280 chars
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX idx_notes_song_id ON notes(song_id);
```

---

## TypeScript Types (shared/types.ts additions)

```typescript
export interface Note {
  id: string;
  song_id: string;
  line_index: number;
  role: Role;
  text: string;
  created_at: string;
  updated_at: string;
}

export type NoteVisibility = 'own' | 'all' | 'none';

// Song interface: add master_chart, keep chart_* as optional (for migration compat)
// master_chart: string | undefined  (undefined = unmigrated)

// Updated StateSyncPayload: add notes for current song
// notes: Note[]  (notes for current_song_id, empty array if no current song)
```

### Updated `Song` interface

`master_chart?: string` replaces the six per-role fields as the primary chart content.  
The six `chart_*` fields remain in the TypeScript interface as optional for migration compatibility but are not used in any new code paths after migration.

---

## Entities

### Note

| Field | Type | Constraints |
|---|---|---|
| id | UUID string | PK, server-generated |
| song_id | string | FK → songs.id, CASCADE DELETE |
| line_index | integer | ≥ 0, clamped to `lines.length - 1` on chart edit |
| role | Role | one of the 6 valid roles |
| text | string | 1–280 characters |
| created_at | ISO8601 string | server-assigned on create |
| updated_at | ISO8601 string | server-updated on edit |

### NoteVisibility (client-only, not persisted)

| Value | Meaning |
|---|---|
| `'own'` | Show only notes whose `role === member.role` (default) |
| `'all'` | Show all notes regardless of role |
| `'none'` | Hide all notes |

---

## State Transitions

### Note lifecycle

```
(none) ──[note_add]──▶ active ──[note_update]──▶ active
                                       │
                             [note_delete]──▶ (deleted)
```

### Song migration lifecycle

```
unmigrated ──[migrate_song]──▶ migrated
(master_chart IS NULL)         (master_chart IS NOT NULL)
```

Once migrated, a song cannot return to unmigrated state.

---

## Clamping Invariant

When `master_chart` is updated and the new line count `N` < a note's `line_index`:

```
note.line_index = Math.max(0, N - 1)
note.flagged = true   // visual flag only, not stored — derived from line_index vs chart
```

A note is considered "displaced" (and rendered with a warning indicator) when:
```
note.line_index === lines.length - 1
  AND original_anchor_would_have_been_beyond_end
```

In practice: any note whose `line_index` equals the last line index, on a chart that was shortened, may be displaced. The member re-places it by tapping the note and dragging/reassigning to a new line.

---

## Index and Query Patterns

```sql
-- Get all notes for a song (state_sync or song_selected)
SELECT * FROM notes WHERE song_id = ? ORDER BY line_index ASC, created_at ASC;

-- Get notes for a song filtered by role (own-role visibility, server-side option)
-- (visibility filtering is done client-side; server always sends all notes for the song)
SELECT * FROM notes WHERE song_id = ? ORDER BY line_index ASC;

-- Clamp notes after master_chart edit
UPDATE notes
SET line_index = ?, updated_at = ?
WHERE song_id = ? AND line_index > ?;
```
