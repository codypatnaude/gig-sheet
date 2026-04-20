# GigSheet — Product Requirements Document

**Version:** 1.0  
**Status:** Founding Document  
**Last Updated:** 2026-04-20

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Target Users](#target-users)
4. [Platform](#platform)
5. [Network Architecture](#network-architecture)
6. [Real-Time Sync](#real-time-sync)
7. [Tech Stack](#tech-stack)
8. [Core Features](#core-features)
9. [UI Design](#ui-design)
10. [Data Model](#data-model)
11. [WebSocket Events](#websocket-events)
12. [User Flows](#user-flows)
13. [MVP Scope](#mvp-scope)
14. [Success Criteria](#success-criteria)
15. [Demo Content](#demo-content)

---

## Overview

GigSheet is a **real-time collaborative setlist application for bands**. It runs on a local WiFi network and allows every band member to see the same setlist, follow along during rehearsal, view role-specific charts, and stay synchronized without needing an internet connection.

The app is designed to live on a Mac Mini backstage or in a rehearsal room, serving a Progressive Web App to every band member's phone, tablet, or laptop over the local network. There is no cloud dependency, no accounts, and no subscription. It's the digital equivalent of a binder of charts — except every binder updates itself in real time.

---

## Problem Statement

Bands working through rehearsal today face a fragmented workflow:

- Setlists are shared as screenshots, texts, or printed sheets that go out of date the moment they're edited.
- Charts and lyrics live in different apps on different devices (Google Docs, GoodNotes, plain text files), with no shared source of truth.
- When a band leader changes the setlist order mid-rehearsal, each member has to manually reorder their own copy — or just gets confused.
- Role-specific content (e.g., a chord chart for guitar, a simplified chart for keys) has no standard place to live alongside the setlist.
- Auto-scroll during a song is unsynchronized — the bassist is halfway through a verse while the vocalist is still at the top.

**There is no unified, real-time, role-aware setlist tool built for the rehearsal room.**

GigSheet solves exactly this. Every member sees the same setlist. The same song is highlighted for everyone. Charts scroll at the same speed. And the band leader controls it all from their own device.

---

## Target Users

### Primary Users

**Small to mid-size working bands: 2–8 members**

- Rock, pop, country, folk, jazz — genre-agnostic
- Mix of technical and non-technical members
- Some members comfortable with smartphones; others prefer tablets or laptops
- Rehearse regularly (weekly or bi-weekly) in a consistent space

### Device Diversity

Members will connect on a mix of:

| Device Type | Common Usage |
|---|---|
| iPhone / Android phone | Most common; held in hand or on mic stand |
| iPad / Android tablet | Chart reading, propped on music stand |
| MacBook / Windows laptop | Typically used by band leader |

The app must be fully functional and readable on all of the above at arm's length (minimum ~2 feet viewing distance).

### User Roles Within the App

| Role | Typical Member |
|---|---|
| Guitar | Lead or rhythm guitarist |
| Bass | Bassist |
| Drums | Drummer |
| Vocals | Lead or backing vocalist |
| Keys | Keyboardist or pianist |
| Other | Horns, strings, percussion, etc. |

Role selection determines which chart tab is shown by default on the Song View screen. Each role can have its own chart text.

---

## Platform

**GigSheet is a Progressive Web App (PWA).**

- No app store. No install required beyond "Add to Home Screen."
- Works on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari.
- Service worker enables offline resilience and fast reload after brief network drop.
- Served over local HTTP (no HTTPS required on LAN; iOS PWA install works over HTTP with mDNS).
- The frontend is a single-page application. Navigation is handled client-side.

### Why PWA over Native?

- Cross-platform with a single codebase.
- Members can join from any device with a browser — no sideloading, no TestFlight.
- Easy to update: deploy once to the Mac Mini, every device gets the new version on next load.
- Service worker caching means a brief WiFi hiccup won't crash the view mid-song.

---

## Network Architecture

GigSheet is designed to run **entirely on local WiFi** with zero external dependencies.

### Physical Setup

```
[ Mac Mini ] ── (ethernet or WiFi) ── [ Band Router ]
                                            │
              ┌─────────────────┬──────────┴──────────┐
              │                 │                      │
         [ iPhone ]        [ iPad ]              [ Laptop ]
         (band member)   (band member)         (band leader)
```

- The Mac Mini runs the GigSheet server (Node.js process).
- A dedicated router (bridged or isolated from internet) is optional but recommended for reliability.
- Custom DNS (e.g., via `/etc/hosts` on the router or dnsmasq) resolves `gigsheet.local` → Mac Mini IP.
- Members navigate to `http://gigsheet.local:3000` in their browser.

### DNS and Discovery

| Method | How it Works | Recommended? |
|---|---|---|
| mDNS (`gigsheet.local`) | Automatic via Bonjour/Avahi | Yes — works on Mac/iOS natively |
| IP address (`192.168.x.x:3000`) | Direct, no DNS needed | Fallback |
| Custom DNS on router | dnsmasq entry pointing domain to Mac Mini | Best for stable naming |

The app should display the current server URL prominently on the "waiting room" / home screen so members can find it easily.

### Zero External Dependencies

- No Firebase, no Supabase, no Pusher, no AWS.
- No internet connection required after initial device setup.
- All assets served from the Mac Mini (fonts, icons, JS bundles).
- SQLite database lives on the Mac Mini's local filesystem.

---

## Real-Time Sync

GigSheet uses **WebSockets via Socket.IO** for all real-time communication.

### Model

- **Single band, single server.** There is one active room (the band's rehearsal). No multi-tenancy.
- All connected clients share a single Socket.IO namespace (`/`).
- The server is the source of truth. Clients do not write to a local DB — they emit events to the server, which updates SQLite and broadcasts to all connected sockets.

### Sync Guarantees

- Setlist order changes propagate to all clients within 1 second on a healthy LAN.
- Selected song (the "current song" highlighted on the setlist) is synced to all clients instantly on change.
- Auto-scroll position is broadcast from the controlling client to all others at a configurable interval (default: 250ms).
- On reconnect, clients receive the full current server state (setlist, current song, scroll state).

### Conflict Resolution

- Last-write-wins for setlist edits (band is small, conflicts are rare).
- The band leader role is soft: any member can control playback, but etiquette is enforced socially rather than technically in MVP.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI component framework |
| TypeScript | Type safety across frontend |
| Vite | Build tool and dev server |
| Socket.IO Client | Real-time WebSocket connection |
| React DnD (or dnd-kit) | Drag-and-drop setlist reordering |
| CSS Modules or Tailwind | Styling (TBD during implementation) |

### Backend

| Technology | Purpose |
|---|---|
| Node.js (LTS) | Runtime |
| Express | HTTP server, REST API |
| Socket.IO | WebSocket server |
| better-sqlite3 | Synchronous SQLite driver |
| SQLite | Persistent local database |

### Infrastructure

| Technology | Purpose |
|---|---|
| Mac Mini | Server host (always-on) |
| PM2 or launchd | Process management / auto-start on boot |
| Vite build | Static frontend assets served by Express |

### Directory Structure (Planned)

```
gig-sheets/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── main.tsx
│   ├── public/
│   │   └── manifest.json    # PWA manifest
│   └── vite.config.ts
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── db/              # SQLite setup and queries
│   │   ├── routes/          # Express REST routes
│   │   ├── socket/          # Socket.IO event handlers
│   │   └── index.ts
│   └── tsconfig.json
├── founding-docs/
└── package.json             # Monorepo root or separate workspaces
```

---

## Core Features

### 1. Connecting — Join Flow

**Purpose:** Members identify themselves when they open the app. Their identity persists across sessions.

**Behavior:**
- On first visit, members are shown a join screen asking for their name and role.
- Name and role are saved to `localStorage` — on return visits, members are automatically joined with their saved identity.
- Membership is soft: there is no authentication. If someone clears their storage, they just re-enter their name.
- All connected members are shown in a "Who's Here" panel visible on the main screen.

**Join Screen Fields:**

| Field | Type | Notes |
|---|---|---|
| Name | Text input | Required, max 30 chars |
| Role | Dropdown / button group | Guitar, Bass, Drums, Vocals, Keys, Other |

**localStorage Keys:**

```json
{
  "gigsheet_member_name": "Cody",
  "gigsheet_member_role": "Guitar"
}
```

---

### 2. Roles

**Purpose:** Allow per-member chart customization and role-aware content display.

**Supported Roles:**

| Role | Icon (planned) | Default Chart Tab |
|---|---|---|
| Guitar | 🎸 | Guitar |
| Bass | 🎸 | Bass |
| Drums | 🥁 | Drums |
| Vocals | 🎤 | Vocals |
| Keys | 🎹 | Keys |
| Other | 🎵 | All / first available |

- When viewing a song, the member's role determines which chart tab is pre-selected.
- A member can freely switch to any other role's chart tab.
- Role is displayed next to the member's name in the "Who's Here" panel.

---

### 3. Setlist Management

**Purpose:** The band leader (or any member) can build and manage the setlist for a rehearsal.

**Features:**

- **Create song:** Add a new song to the setlist with a title and optional metadata.
- **Read:** View the ordered setlist with song titles, key, tempo, and duration.
- **Update:** Edit song details (title, key, tempo, notes, per-role charts).
- **Delete:** Remove a song from the setlist (with confirmation).
- **Drag to reorder:** Songs can be dragged to a new position. Reorder is broadcast to all clients in real time.

**Setlist Display Columns:**

| Column | Notes |
|---|---|
| # | Position in setlist |
| Title | Song name |
| Key | E.g., "G", "Am", "Bb" |
| Tempo | BPM (optional) |
| Duration | MM:SS estimate (optional) |
| Actions | Edit / Delete (visible on hover or in edit mode) |

**Reorder:** Implemented with drag-and-drop. On drop, the new order is emitted to the server, which persists it and broadcasts `setlist_updated` to all clients.

---

### 4. Song Editor

**Purpose:** Define the full content of a song — metadata and per-role charts.

**Metadata Fields:**

| Field | Type | Required |
|---|---|---|
| Title | Text | Yes |
| Artist | Text | No |
| Key | Text (e.g., "G", "Am") | No |
| Tempo | Number (BPM) | No |
| Duration | Text (MM:SS) | No |
| Notes | Textarea | No |

**Per-Role Chart Fields:**

Each song has a chart text field for each role. These are **plain text, monospace-rendered** fields — not rich text. The intent is for chord charts, lyric sheets, or drum notation written in ASCII-style.

```
Guitar Chart Example:
---------------------
Verse:
G  D  Em  C  (x4)

Chorus:
C  G  D  D

Bridge:
Em  C  G  D  (x2)
```

Chart fields:

- `chart_guitar` (TEXT)
- `chart_bass` (TEXT)
- `chart_drums` (TEXT)
- `chart_vocals` (TEXT)
- `chart_keys` (TEXT)
- `chart_other` (TEXT)

The editor shows all six chart fields as labeled textareas in a tabbed or stacked layout.

---

### 5. Song View

**Purpose:** The primary in-rehearsal view. Displays the currently selected song's chart for the member's role. Syncs with all other clients.

**Layout:**

```
┌────────────────────────────────────────┐
│ ← Back    "Wagon Wheel"   Key: G   BPM: 94  │
├────────────────────────────────────────┤
│ [Guitar] [Bass] [Drums] [Vocals] [Keys] │  ← Role tabs
├────────────────────────────────────────┤
│                                        │
│  Verse:                                │
│  G    D    Em   C                      │  ← Monospace chart
│  (x4)                                  │     (scrollable)
│                                        │
│  Chorus:                               │
│  C    G    D    D                      │
│                                        │
│  ...                                   │
│                                        │
├────────────────────────────────────────┤
│  [▶ Auto-Scroll]   Speed: [1.0x ▼]    │  ← Scroll controls
└────────────────────────────────────────┘
```

**Sync Behavior:**

- When any client changes the "current song" on the setlist, all clients' Song View updates to show that song.
- Chart scroll position is broadcast from the controlling client and applied on all others during auto-scroll.

**Role Tabs:**

- Tabs shown for all 6 roles regardless of which roles are present.
- Empty chart tabs show a placeholder: *"No chart for this role yet."*
- Member's own role tab is highlighted/selected by default.

---

### 6. Auto-Scroll

**Purpose:** Allow the band to follow the chart during a song without manually scrolling.

**Controls:**

| Control | Behavior |
|---|---|
| Start / Stop button | Toggles auto-scroll on/off for the controlling device |
| Speed selector | Multiplier from 0.5x to 3.0x in 0.5x increments |
| Sync toggle | When enabled, scroll position is broadcast to all clients |

**Sync Protocol:**

1. The controlling client starts auto-scroll.
2. Every 250ms, it emits `scroll_update` with `{ song_id, position, speed }`.
3. The server broadcasts this to all other clients.
4. Other clients apply the scroll position smoothly (CSS `scroll-behavior: smooth` or `requestAnimationFrame`).

**Speed Range:**

| Speed | Use Case |
|---|---|
| 0.5x | Very slow ballad, reading-intensive |
| 1.0x | Default, moderate paced song |
| 1.5x | Faster tempo songs |
| 2.0x–3.0x | Fast songs, well-memorized charts |

**Drift Prevention:**

- Scroll position is re-synced on every broadcast tick — there is no accumulating drift.
- If a client reconnects mid-scroll, it requests current state and snaps to the current position.

---

### 7. Connection Resilience

**Purpose:** Survive brief WiFi drops without disrupting rehearsal.

**Service Worker:**

- Caches the full app shell (HTML, JS, CSS, fonts).
- On network loss, the cached shell continues to render. Members can still read their chart.
- On reconnect, the service worker re-fetches and the Socket.IO client auto-reconnects.

**Auto-Reconnect:**

Socket.IO client is configured with:

```js
const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

**Reconnect State Recovery:**

On successful reconnect, the server emits `state_sync` to the rejoining client with:
- Full setlist (ordered)
- Current song ID
- Current scroll state (position + speed)
- Connected members list

---

## UI Design

### Design Philosophy: "Warm Analog"

GigSheet's visual design is inspired by warm analog equipment — mixing boards, tape machines, guitar pedals. It should feel **purposeful, readable, and a little worn-in**. Not sterile. Not a productivity SaaS tool.

The app is used in dim rehearsal rooms and on stages. Readability at arm's length is non-negotiable.

---

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#1A1714` | Primary background (very dark warm brown) |
| `--color-surface` | `#242019` | Cards, panels, elevated surfaces |
| `--color-surface-2` | `#2E2A24` | Input backgrounds, hover states |
| `--color-border` | `#3D3830` | Subtle borders, dividers |
| `--color-accent` | `#D4A54A` | Amber — primary interactive color |
| `--color-accent-dim` | `#A07A2E` | Pressed / active accent state |
| `--color-text-primary` | `#F0E8D8` | Primary text (warm off-white) |
| `--color-text-secondary` | `#9A8F7E` | Labels, secondary info |
| `--color-text-disabled` | `#5C5347` | Disabled text, placeholders |
| `--color-success` | `#6CA86C` | Connected indicator, saved state |
| `--color-danger` | `#C05A4A` | Delete, disconnect, error |

---

### Typography

| Font | Usage |
|---|---|
| **DM Sans** | All UI elements: navigation, labels, buttons, metadata |
| **JetBrains Mono** | All chart content (monospace, fixed-width chord charts) |

**Type Scale:**

| Name | Size | Weight | Usage |
|---|---|---|---|
| `display` | 24px | 600 | Song title in Song View |
| `heading` | 18px | 600 | Section headers, setlist title |
| `body` | 15px | 400 | General UI text |
| `label` | 13px | 500 | Input labels, role tags |
| `chart` | 14px | 400 | Chart content (JetBrains Mono) |
| `chart-lg` | 16px | 400 | Chart on tablet/larger screens |

---

### Spacing and Layout

- Base unit: 4px
- Standard padding for cards/panels: 16px
- Touch targets: minimum 44×44px (iOS HIG compliant)
- Setlist rows: minimum 52px tall
- Song View chart area: full-width, vertically scrollable, padding 16px horizontal

---

### Component States

**Connection Status Indicator:**

Shown persistently in the header or corner:

| State | Color | Label |
|---|---|---|
| Connected | `--color-success` | "Connected" |
| Reconnecting | `#D4A54A` (amber pulse) | "Reconnecting…" |
| Offline | `--color-danger` | "Offline" |

**Song Row States (Setlist):**

| State | Visual |
|---|---|
| Default | Normal surface color |
| Current (active) | Amber left border + slightly brighter background |
| Hover | `--color-surface-2` |
| Dragging | Elevated shadow, slight opacity reduction |

---

## Data Model

### SQLite Schema

#### `songs` Table

```sql
CREATE TABLE songs (
  id          TEXT PRIMARY KEY,        -- UUID v4
  title       TEXT NOT NULL,
  artist      TEXT,
  key         TEXT,
  tempo       INTEGER,
  duration    TEXT,                    -- "MM:SS" format
  notes       TEXT,
  chart_guitar   TEXT,
  chart_bass     TEXT,
  chart_drums    TEXT,
  chart_vocals   TEXT,
  chart_keys     TEXT,
  chart_other    TEXT,
  setlist_order  INTEGER NOT NULL,     -- 0-indexed sort position
  created_at  TEXT NOT NULL,           -- ISO 8601
  updated_at  TEXT NOT NULL
);
```

#### In-Memory Server State

The server maintains a runtime state object (not persisted to SQLite) for ephemeral session data:

```typescript
interface ServerState {
  members: Member[];
  current_song_id: string | null;
  scroll_state: ScrollState | null;
}

interface Member {
  socket_id: string;
  name: string;
  role: Role;
  joined_at: string;  // ISO 8601
}

interface ScrollState {
  song_id: string;
  position: number;   // pixels from top
  speed: number;      // multiplier (0.5–3.0)
  controller_id: string;  // socket_id of controlling client
  updated_at: string;
}

type Role = 'Guitar' | 'Bass' | 'Drums' | 'Vocals' | 'Keys' | 'Other';
```

### TypeScript Types (Shared)

```typescript
// shared/types.ts
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

export type ChartRole = 'guitar' | 'bass' | 'drums' | 'vocals' | 'keys' | 'other';
```

---

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `member_join` | `{ name: string, role: Role }` | Member identifies themselves on connect |
| `member_update` | `{ name: string, role: Role }` | Member changes their name or role |
| `song_select` | `{ song_id: string }` | Set the current active song for all clients |
| `setlist_reorder` | `{ ordered_ids: string[] }` | New song order as array of song IDs |
| `song_create` | `{ song: Omit<Song, 'id' \| 'created_at' \| 'updated_at'> }` | Create a new song |
| `song_update` | `{ song: Song }` | Update an existing song |
| `song_delete` | `{ song_id: string }` | Delete a song |
| `scroll_update` | `{ song_id: string, position: number, speed: number }` | Broadcast scroll position during auto-scroll |
| `scroll_stop` | `{}` | Controlling client stopped auto-scroll |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `state_sync` | `{ setlist: Song[], current_song_id: string \| null, scroll_state: ScrollState \| null, members: Member[] }` | Full state sync on connect or reconnect |
| `member_joined` | `{ member: Member }` | A new member connected |
| `member_left` | `{ socket_id: string }` | A member disconnected |
| `member_updated` | `{ member: Member }` | A member changed their name/role |
| `song_selected` | `{ song_id: string }` | Current song changed |
| `setlist_updated` | `{ setlist: Song[] }` | Full setlist after any create, delete, or reorder |
| `song_updated` | `{ song: Song }` | A single song was edited |
| `scroll_synced` | `{ song_id: string, position: number, speed: number }` | Scroll position update for synced clients |
| `scroll_stopped` | `{}` | Auto-scroll ended |
| `error` | `{ code: string, message: string }` | Server-side error |

---

## User Flows

### Flow 1: First-Time Setup (Band Leader)

1. Band leader opens `http://gigsheet.local:3000` on their device.
2. Join screen appears. Leader enters name ("Cody") and selects role ("Guitar").
3. Leader is taken to the main Setlist screen. Demo songs are pre-loaded.
4. Leader creates a new song: clicks "Add Song," fills in title, key, tempo, and charts for relevant roles.
5. Leader saves. Song appears at the bottom of the setlist.
6. Leader drags it to the desired position.
7. Leader selects the song (taps the row). Song View opens.

### Flow 2: Bandmate Joining

1. Bandmate opens app on their phone.
2. Join screen: enters name ("Mia") and selects role ("Vocals").
3. Bandmate is taken to the Setlist screen, which already shows all songs in the correct order.
4. Bandmate sees "Cody (Guitar)" in the Who's Here panel.
5. Bandmate's name appears in Cody's Who's Here panel in real time.

### Flow 3: Returning Session

1. Member opens app. `localStorage` has `gigsheet_member_name` and `gigsheet_member_role`.
2. Join screen is skipped. Member is auto-joined with saved identity.
3. Member lands directly on the Setlist screen (or Song View, if a song is currently active).

### Flow 4: During Rehearsal

1. Band is rehearsing. Leader taps "Wagon Wheel" on the setlist.
2. All members' screens transition to Song View showing "Wagon Wheel."
3. Each member sees their own role's chart tab pre-selected.
4. Leader taps "▶ Auto-Scroll" at 1.0x.
5. All members' screens begin scrolling in sync.
6. Bassist needs to slow down: they tap the speed selector and change to 0.75x.
   - Because sync is controlled by the broadcaster (leader), the bassist's local speed change only affects their local scroll speed. *(MVP behavior — see future scope for shared speed control.)*
7. Song ends. Leader taps "Stop." All scroll states freeze.
8. Leader taps the next song on the setlist. All members transition.

### Flow 5: Editing Mid-Rehearsal

1. Leader notices the guitar chart for "Brown Eyed Girl" has a typo.
2. Leader taps the edit icon on the setlist row. Song Editor opens.
3. Leader updates the `chart_guitar` field and saves.
4. All members currently viewing "Brown Eyed Girl" in Song View see the updated chart immediately (via `song_updated` event).

---

## MVP Scope

### In Scope

| Feature | Notes |
|---|---|
| Join flow with localStorage persistence | Name + role, auto-rejoin |
| Setlist CRUD | Create, read, update, delete songs |
| Drag-to-reorder setlist | Broadcast to all clients |
| Song editor | All metadata + 6 per-role chart text fields |
| Song View with role tabs | Monospace chart display |
| Current song sync | Tap to select; all clients follow |
| Auto-scroll with sync | Start/stop + speed control, broadcast |
| Who's Here panel | Live list of connected members |
| Connection resilience | Socket.IO auto-reconnect + state_sync on rejoin |
| PWA service worker | App shell caching for offline resilience |
| Demo content | 2–3 pre-loaded fictional songs with full charts |
| "Warm Analog" UI | Dark theme, amber accent, correct fonts |

### Out of Scope (Future)

| Feature | Rationale |
|---|---|
| Authentication / roles-based permissions | Not needed for trusted band LAN context |
| Multiple bands / multi-tenancy | Single-band use case only in MVP |
| Cloud sync or remote access | Intentionally local-only |
| Rich text / image charts | ASCII/plain text is sufficient for MVP |
| PDF chart import | Parsing complexity; future enhancement |
| Audio playback / click track | Out of scope for v1 |
| Metronome | Out of scope for v1 |
| Tuner | Out of scope for v1 |
| Song versioning / history | Nice to have; not MVP |
| Shared speed control for auto-scroll | Broadcaster owns speed in MVP |
| Set duration timer / countdown | Future feature |
| Mobile app (native iOS/Android) | PWA is sufficient; native is future |
| Admin dashboard / analytics | Not needed for rehearsal context |

---

## Success Criteria

The MVP is considered successful when all of the following are true:

1. **Sync within 1 second:** A setlist change (reorder, song select, scroll) made on one device appears on all other connected devices within 1 second on a healthy LAN.

2. **No drift over 5 minutes:** Auto-scroll running for 5+ minutes shows no meaningful positional drift between a controlling device and a synced client (< 50px tolerance).

3. **Readable at arm's length:** All text in Song View (chart content and song metadata) is legible at approximately 2 feet / 60cm on a standard smartphone screen. Minimum chart font size: 14px.

4. **Reconnect recovery:** A device that drops WiFi and reconnects within 30 seconds automatically re-joins the session and receives the current state without any user action.

5. **Zero-install join:** A new bandmate can join a live session by navigating to the app URL in a mobile browser and entering their name — no app store, no account, no QR code required (though a QR code shortcut is welcome).

6. **Works on all target devices:** The app is functional and usable on iPhone Safari, Android Chrome, and a standard laptop browser. No layout-breaking issues on screens from 375px to 1440px wide.

7. **Stable over a full rehearsal:** A 2-hour rehearsal session with 4 connected members shows no server crashes, no memory leaks observable as slowdown, and no data loss.

---

## Demo Content

Three fictional demo songs are pre-loaded on first server run (if the database is empty). These exist so that new users can explore the app immediately without having to create content first.

---

### Demo Song 1: "Last Call at Lindy's"

**Artist:** The Hollow Frets  
**Key:** A  
**Tempo:** 112 BPM  
**Duration:** 3:45

**Guitar Chart:**
```
Verse:
A  E  F#m  D  (x4)

Pre-Chorus:
D  E  D  E

Chorus:
A  D  A  E
A  D  E  E

Bridge:
F#m  D  A  E  (x2)
F#m  D  E  E

Outro:
A  E  A  (let ring)
```

**Bass Chart:**
```
Verse: Root-5 pattern on A E F#m D
Chorus: Walk up A→D on beat 4 of bar 1

Feel: Driving eighth notes, sit behind the beat
```

**Drums Chart:**
```
Verse: Hi-hat eighths, snare 2&4, kick on 1
Chorus: Open hi-hat on beat 3, fill into chorus
Bridge: Half-time feel
```

**Vocals Chart:**
```
Verse 1:
Neon sign and a jukebox hum
Two a.m. and the night ain't done
She's got whiskey in a coffee cup
And a smile that says she's given up

Chorus:
Last call at Lindy's
Last song on the tape
Last chance for something
That we couldn't make
```

---

### Demo Song 2: "Meridian"

**Artist:** The Hollow Frets  
**Key:** Em  
**Tempo:** 76 BPM  
**Duration:** 5:10

**Guitar Chart:**
```
Intro (fingerpicked):
Em  Am  Em  Am

Verse:
Em  G  D  Am  (x4)

Chorus:
C  G  D  Em  (x2)
C  G  D  D

Bridge (half-time):
Am  C  G  D  (x4)

Outro:
Em  Am  Em  (fade)
```

**Bass Chart:**
```
Intro: Arpeggiate Em and Am — let notes ring
Verse: Long tones, minimal movement
Chorus: Moving line: C(root)→B→D walk-up
Bridge: Octaves, sparse — space is key
```

**Drums Chart:**
```
Intro: Brushes only, rim clicks
Verse: Brush roll on snare, feather kick
Chorus: Switch to sticks, full kit
Bridge: Back to brushes, half-time
Outro: Brushes fade to silence
```

**Vocals Chart:**
```
Verse 1:
Down the meridian line
Where the highway meets the pine
I've been watching for a sign
That this road has run its time

Chorus:
But the miles keep coming
And the lights keep running
And I'm somewhere in between
The life I had and where I've been
```

---

### Demo Song 3: "Copper Wire"

**Artist:** The Hollow Frets  
**Key:** G  
**Tempo:** 138 BPM  
**Duration:** 2:58

**Guitar Chart:**
```
Intro riff (electric):
e|---------------------|
B|---------------------|
G|---------------------|
D|---5-5-7-5-----------|
A|-5---------8-7-5-3---|
E|---------------------|
(x4)

Verse:
G  C  G  D  (x4)

Chorus:
C  D  Em  G  (x2)
C  D  G  G

Solo section: G  C  D  D  (x8) — same as verse
```

**Bass Chart:**
```
Intro: Lock with kick drum, palm mute feel
Verse: Root notes, eighth notes throughout
Chorus: Add the 5th on beats 3: G→D, C→G, D→A
Solo: Drive it — lock with kick, let guitarist breathe
```

**Drums Chart:**
```
Intro: Kick-snare-kick-snare, 4 bars before band enters
Verse: Driving 4/4, crash on 1 of verse
Chorus: Big open hi-hat on 2&4
Solo: Push the energy — lots of crashes
Outro: Slow roll into final hit
```

**Keys Chart:**
```
Verse: Sustained pad, G major voicing — stay out of guitar's way
Chorus: Rhodes-style comping on off-beats
Solo: Lay out (or hold root notes only)
```

---

*End of Document*

---

**GigSheet PRD v1.0** — Founding Document  
For questions or changes, update this file and commit to `main`.
