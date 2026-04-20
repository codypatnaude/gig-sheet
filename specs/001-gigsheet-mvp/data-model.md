# Data Model: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20

---

## Entities

### 1. Song (Persisted — SQLite)

The core data entity. Represents one song in the band's setlist.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | string (UUID v4) | Yes | PRIMARY KEY | Generated server-side on create |
| `title` | string | Yes | NOT NULL, max 200 chars | Displayed in setlist row |
| `artist` | string | No | nullable | Optional display info |
| `key` | string | No | nullable, max 10 chars | E.g. "G", "Am", "Bb" |
| `tempo` | integer | No | nullable, > 0 | BPM |
| `duration` | string | No | nullable, format "MM:SS" | Estimated duration |
| `notes` | string | No | nullable | Free-text band notes |
| `chart_guitar` | string | No | nullable | Plain text chart |
| `chart_bass` | string | No | nullable | Plain text chart |
| `chart_drums` | string | No | nullable | Plain text chart |
| `chart_vocals` | string | No | nullable | Plain text chart |
| `chart_keys` | string | No | nullable | Plain text chart |
| `chart_other` | string | No | nullable | Plain text chart |
| `setlist_order` | integer | Yes | NOT NULL, ≥ 0 | 0-indexed position in setlist |
| `created_at` | string (ISO 8601) | Yes | NOT NULL | Set on insert |
| `updated_at` | string (ISO 8601) | Yes | NOT NULL | Updated on every write |

**Validation rules**:
- `title` must not be empty string or whitespace-only
- `tempo` must be a positive integer if provided
- `setlist_order` must be non-negative; values are contiguous 0..N-1 after any reorder
- `id` is generated server-side (UUID v4); clients do not supply IDs on creation

**SQLite schema**:
```sql
CREATE TABLE IF NOT EXISTS songs (
  id           TEXT    PRIMARY KEY,
  title        TEXT    NOT NULL,
  artist       TEXT,
  key          TEXT,
  tempo        INTEGER,
  duration     TEXT,
  notes        TEXT,
  chart_guitar  TEXT,
  chart_bass    TEXT,
  chart_drums   TEXT,
  chart_vocals  TEXT,
  chart_keys    TEXT,
  chart_other   TEXT,
  setlist_order INTEGER NOT NULL,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);
```

---

### 2. Member (Ephemeral — In-Memory)

A currently connected band member. Lives only in server RAM while the Socket.IO connection
is active. Not persisted; lost on server restart.

| Field | Type | Notes |
|---|---|---|
| `socket_id` | string | Assigned by Socket.IO on connect; used as unique key |
| `name` | string | Display name, 1–30 characters, not unique |
| `role` | Role (enum) | One of: Guitar, Bass, Drums, Vocals, Keys, Other |
| `joined_at` | string (ISO 8601) | Timestamp when `member_join` was received |

**TypeScript**:
```typescript
type Role = 'Guitar' | 'Bass' | 'Drums' | 'Vocals' | 'Keys' | 'Other';

interface Member {
  socket_id: string;
  name: string;
  role: Role;
  joined_at: string;
}
```

---

### 3. ScrollState (Ephemeral — In-Memory)

Represents an active auto-scroll session. Null when no auto-scroll is running.
Lives in server RAM; not persisted.

| Field | Type | Notes |
|---|---|---|
| `song_id` | string | The song currently being scrolled |
| `position` | number | Absolute pixel offset from top of chart area |
| `speed` | number | Multiplier: one of 0.5, 1.0, 1.5, 2.0, 2.5, 3.0 |
| `controller_id` | string | socket_id of the client controlling the scroll |
| `updated_at` | string (ISO 8601) | Timestamp of last position update |

**TypeScript**:
```typescript
interface ScrollState {
  song_id: string;
  position: number;
  speed: number;
  controller_id: string;
  updated_at: string;
}
```

---

### 4. ServerState (Ephemeral — In-Memory)

Top-level in-memory state held by the server process. One instance per running server.

| Field | Type | Notes |
|---|---|---|
| `members` | Member[] | All currently connected members |
| `current_song_id` | string \| null | The song currently selected / being rehearsed |
| `scroll_state` | ScrollState \| null | Active auto-scroll session, or null |

**TypeScript**:
```typescript
interface ServerState {
  members: Member[];
  current_song_id: string | null;
  scroll_state: ScrollState | null;
}
```

**Initialization**: On server start, `members = []`, `current_song_id = null`,
`scroll_state = null`.

---

### 5. Shared Types (shared/types.ts)

Canonical type definitions shared between client and server packages.

```typescript
export type Role = 'Guitar' | 'Bass' | 'Drums' | 'Vocals' | 'Keys' | 'Other';
export type ChartRole = 'guitar' | 'bass' | 'drums' | 'vocals' | 'keys' | 'other';

export const ROLES: Role[] = ['Guitar', 'Bass', 'Drums', 'Vocals', 'Keys', 'Other'];
export const CHART_ROLES: ChartRole[] = ['guitar', 'bass', 'drums', 'vocals', 'keys', 'other'];

export interface Song {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  duration?: string;
  notes?: string;
  chart_guitar?: string;
  chart_bass?: string;
  chart_drums?: string;
  chart_vocals?: string;
  chart_keys?: string;
  chart_other?: string;
  setlist_order: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  socket_id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export interface ScrollState {
  song_id: string;
  position: number;
  speed: number;
  controller_id: string;
  updated_at: string;
}

export interface ServerState {
  members: Member[];
  current_song_id: string | null;
  scroll_state: ScrollState | null;
}
```

---

## State Transitions

### Song Lifecycle

```
[None] --song_create--> [In Setlist]
[In Setlist] --song_update--> [In Setlist] (updated)
[In Setlist] --song_delete--> [Deleted]
[In Setlist] --setlist_reorder--> [In Setlist] (new position)
```

### Session State

```
Server start → members=[], current_song_id=null, scroll_state=null

member_join received → member added to members[]
socket disconnect → member removed from members[]

song_select received → current_song_id = song_id

scroll_update received → scroll_state = { song_id, position, speed, controller_id, updated_at }
scroll_stop received → scroll_state = null
```

### Client Connection Lifecycle

```
Socket connects → server sends state_sync (full state)
Socket disconnects → server broadcasts member_left, removes from members[]
Socket reconnects → treated as new connection → state_sync sent again
```

---

## Setlist Ordering

Songs have a `setlist_order` integer field. Invariants:
- Values are contiguous: after any reorder, values are 0, 1, 2, … N-1
- On create: new song appended at position N (last)
- On delete: remaining songs are renumbered to maintain contiguity
- On reorder: all N songs' `setlist_order` values are updated atomically

**Reorder implementation**: The client sends `{ ordered_ids: string[] }` — the full ordered
array of all song IDs. The server updates all rows in a single transaction.
