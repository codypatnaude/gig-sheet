# WebSocket Event Contracts: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20
**Transport**: Socket.IO 4.x, single namespace `/`, single room (global)

These contracts define the complete set of Socket.IO events. They are the public API between
client and server. Any change to event names or payload shapes is a breaking change and
requires a `[scroll-sync]` tag if scroll events are involved.

---

## Client → Server Events

### `member_join`

Emitted immediately after socket connection is established. Required before any other event
is meaningful.

```typescript
// Payload
interface MemberJoinPayload {
  name: string;   // 1–30 characters, display-only
  role: Role;     // 'Guitar' | 'Bass' | 'Drums' | 'Vocals' | 'Keys' | 'Other'
}
```

**Server action**: Add member to `ServerState.members` with the socket's ID and a
`joined_at` timestamp. Broadcast `member_joined` to all other clients. Send `state_sync`
to the joining client.

**Validation**: `name` must be non-empty and ≤30 chars. `role` must be a valid Role value.
Server silently truncates or rejects invalid values with an `error` event.

---

### `member_update`

Emitted when a connected member changes their display name or role.

```typescript
interface MemberUpdatePayload {
  name: string;
  role: Role;
}
```

**Server action**: Update the member record in `ServerState.members`. Broadcast
`member_updated` to all clients (including sender).

---

### `song_select`

Emitted when any member taps a song row in the setlist to navigate to it.

```typescript
interface SongSelectPayload {
  song_id: string;  // UUID of the song to select
}
```

**Server action**: Set `ServerState.current_song_id = song_id`. Broadcast `song_selected`
to all clients.

**Note**: If `song_id` does not exist in the database, server emits `error` to sender only.

---

### `setlist_reorder`

Emitted after a drag-and-drop reorder completes. Sends the full new order.

```typescript
interface SetlistReorderPayload {
  ordered_ids: string[];  // All song IDs in the new desired order
}
```

**Server action**: Update `setlist_order` for all songs in a single SQLite transaction.
Broadcast `setlist_updated` with the full reloaded setlist.

**Validation**: `ordered_ids` must contain exactly the same IDs as currently in the database
(no additions, no deletions). If a mismatch is detected, server emits `error`.

---

### `song_create`

Emitted when a member saves a new song from the editor.

```typescript
interface SongCreatePayload {
  song: {
    title: string;        // Required, non-empty
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
  };
}
```

**Server action**: Generate UUID, set `setlist_order` to current max+1, set timestamps,
insert row. Broadcast `setlist_updated` with full updated setlist.

**Validation**: `title` must be non-empty. Server emits `error` if validation fails.

---

### `song_update`

Emitted when a member saves changes to an existing song.

```typescript
interface SongUpdatePayload {
  song: Song;  // Full Song object including id
}
```

**Server action**: Update all mutable fields in SQLite. Set `updated_at` to now. Broadcast
`song_updated` with the updated Song object.

**Validation**: `song.id` must exist. `song.title` must be non-empty.

---

### `song_delete`

Emitted when a member confirms deletion of a song.

```typescript
interface SongDeletePayload {
  song_id: string;
}
```

**Server action**: Delete the row from SQLite. Renumber `setlist_order` for remaining songs.
Broadcast `setlist_updated` with updated setlist.

---

### `scroll_update` [scroll-sync]

Emitted by the controlling client at ≤250ms intervals while auto-scroll is active.

```typescript
interface ScrollUpdatePayload {
  song_id: string;   // Which song is being scrolled
  position: number;  // Absolute pixel offset from top of chart scroll container
  speed: number;     // Current speed multiplier (0.5 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0)
}
```

**Server action**: Update `ServerState.scroll_state`. Broadcast `scroll_synced` to all
clients *except the sender*.

**Critical**: Server must relay this within the same event loop tick — no buffering, no
batching. Latency added by the server must be negligible.

---

### `scroll_stop` [scroll-sync]

Emitted by the controlling client when auto-scroll is stopped.

```typescript
// No payload
type ScrollStopPayload = Record<string, never>;
```

**Server action**: Set `ServerState.scroll_state = null`. Broadcast `scroll_stopped` to
all clients.

---

## Server → Client Events

### `state_sync`

Sent to a single client immediately after they emit `member_join`, and again on any
reconnection. Gives the client the complete current state.

```typescript
interface StateSyncPayload {
  setlist: Song[];                  // All songs in setlist_order order
  current_song_id: string | null;   // Currently selected song, or null
  scroll_state: ScrollState | null; // Active scroll session, or null
  members: Member[];                // All currently connected members
}
```

---

### `member_joined`

Broadcast to all clients (except the joining client) when a new member connects and
emits `member_join`.

```typescript
interface MemberJoinedPayload {
  member: Member;
}
```

---

### `member_left`

Broadcast to all remaining clients when a member disconnects.

```typescript
interface MemberLeftPayload {
  socket_id: string;
}
```

---

### `member_updated`

Broadcast to all clients when a member changes their name or role.

```typescript
interface MemberUpdatedPayload {
  member: Member;
}
```

---

### `song_selected`

Broadcast to all clients when any member selects a song.

```typescript
interface SongSelectedPayload {
  song_id: string;
}
```

---

### `setlist_updated`

Broadcast to all clients after any setlist mutation: song create, delete, or reorder.

```typescript
interface SetlistUpdatedPayload {
  setlist: Song[];  // Full ordered setlist
}
```

---

### `song_updated`

Broadcast to all clients when a song's content is edited and saved.

```typescript
interface SongUpdatedPayload {
  song: Song;  // The updated song object
}
```

---

### `scroll_synced` [scroll-sync]

Broadcast to all clients *except the controller* on each `scroll_update` received.

```typescript
interface ScrollSyncedPayload {
  song_id: string;
  position: number;
  speed: number;
}
```

**Client action**: Apply `position` to the chart scroll container. Use smooth scrolling
(`scrollTo({ behavior: 'smooth' })`) for positions within a reasonable snapping range;
use instant scroll for large jumps (e.g., reconnect recovery).

---

### `scroll_stopped` [scroll-sync]

Broadcast to all clients when the controller emits `scroll_stop`.

```typescript
// No payload
type ScrollStoppedPayload = Record<string, never>;
```

**Client action**: Stop any ongoing scroll animation. Freeze current position.

---

### `error`

Sent to a single client when their emitted event failed server-side validation.

```typescript
interface ErrorPayload {
  code: string;    // Machine-readable error code, e.g. "SONG_NOT_FOUND"
  message: string; // Human-readable description
}
```

---

## Event Contract Test Requirements

Per constitution Principle II (Synced Scroll Is Sacred), the following integration tests
MUST exist before scroll sync is implemented:

| Test | File | What it verifies |
|---|---|---|
| Scroll sync latency | `server/tests/integration/scroll-sync.test.ts` | scroll_synced received within 1s of scroll_update |
| Scroll drift over time | `server/tests/integration/scroll-sync.test.ts` | position drift <50px after 5 min simulation |
| Scroll stop propagation | `server/tests/integration/scroll-sync.test.ts` | scroll_stopped received by all after scroll_stop |
| Reconnect scroll snap | `server/tests/integration/reconnect-recovery.test.ts` | reconnecting client receives scroll_state via state_sync |
| state_sync on join | `server/tests/integration/member-presence.test.ts` | Full state delivered on member_join |
| Setlist CRUD broadcast | `server/tests/integration/setlist-crud.test.ts` | All mutations broadcast to all clients |
