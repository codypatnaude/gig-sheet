# Feature Specification: GigSheet MVP

**Feature Branch**: `001-gigsheet-mvp`
**Created**: 2026-04-20
**Status**: Draft
**Input**: GigSheet MVP — real-time collaborative setlist PWA for bands

---

## Overview

GigSheet is a real-time collaborative setlist application for small to mid-size working bands
(2–8 members). It runs on a local WiFi network — served from a Mac Mini in the rehearsal room
— and lets every band member view the same setlist, navigate to any song, read their
role-specific chart, and scroll through it in sync with the rest of the band.

There is no internet connection required, no account creation, and no app store installation.
Members join by navigating to a URL on the local network and entering their name.

The core differentiating capability — and the one that must never degrade — is **synchronized
auto-scroll**: when the band leader starts scrolling through a chart, every member's screen
scrolls at the same rate, to the same position, in real time.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Synchronized Chart Scrolling (Priority: P1)

A band member starts auto-scroll on their device while rehearsing a song. All other connected
members' screens scroll to the same position at the same speed, in real time, with no
perceptible drift. When the controlling member stops, all screens freeze at the same position.

**Why this priority**: This is the single most important feature in GigSheet. It is the
differentiator from every alternative (printed sheets, shared docs, individual apps). Without
reliable scroll sync, the app provides no unique value. It must work perfectly every time.

**Independent Test**: Connect two devices to a running server. Member A opens a song and
starts auto-scroll. Verify that Member B's screen scrolls to the matching position within
1 second of each broadcast tick (250ms interval). Run for 5 minutes and confirm positional
drift is less than 50px. Stop scroll on Member A; confirm Member B's screen stops.

**Acceptance Scenarios**:

1. **Given** two members are connected and viewing the same song,
   **When** Member A starts auto-scroll at 1.0x speed,
   **Then** Member B's screen begins scrolling to the same position within 1 second,
   and the positional difference between the two screens remains under 50px continuously.

2. **Given** auto-scroll is running on all connected devices,
   **When** the controlling member taps "Stop",
   **Then** all connected devices' scroll positions freeze within 1 second.

3. **Given** auto-scroll is running and Member B's device loses WiFi briefly,
   **When** Member B's device reconnects within 30 seconds,
   **Then** Member B's screen automatically snaps to the current scroll position without
   any manual action by the user.

4. **Given** auto-scroll is running at 1.0x,
   **When** 5 minutes have elapsed,
   **Then** the positional difference between the controlling device and all synced devices
   is less than 50px (no accumulated drift).

5. **Given** a member selects a speed of 0.5x through 3.0x in 0.5x increments,
   **When** auto-scroll is active,
   **Then** the scroll rate visibly changes to match the selected multiplier.

---

### User Story 2 — Real-Time Setlist Management (Priority: P2)

Any band member can create, edit, reorder, or delete songs in the shared setlist. All changes
are immediately visible to every connected member without requiring a page reload.

**Why this priority**: The setlist is the top-level organizing structure of every rehearsal.
Without a shared, editable setlist that stays in sync across devices, the band cannot
effectively use GigSheet to run a rehearsal.

**Independent Test**: Connect two devices. On Device A, add a new song. Verify it appears
on Device B's setlist within 1 second. Drag the song to a new position on Device A; verify
the new order appears on Device B. Delete the song on Device A; verify it disappears on
Device B.

**Acceptance Scenarios**:

1. **Given** two members are connected and viewing the setlist,
   **When** Member A adds a new song with a title,
   **Then** the new song appears at the bottom of both members' setlists within 1 second.

2. **Given** a setlist has at least two songs,
   **When** a member drags Song X to a new position in the list,
   **Then** all connected members' setlists reflect the new order within 1 second.

3. **Given** a song exists in the setlist,
   **When** a member edits the song's title and saves,
   **Then** the updated title is visible to all connected members within 1 second.

4. **Given** a song exists in the setlist,
   **When** a member taps Delete and confirms,
   **Then** the song is removed from all connected members' setlists within 1 second.

5. **Given** a member attempts to save a song with no title,
   **When** they submit the form,
   **Then** the save is rejected and an error message identifies the missing field.

---

### User Story 3 — Song Selection Sync (Priority: P3)

When any member taps a song on the setlist, all connected members' views transition to
Song View for that song. Every member sees their role's chart tab pre-selected.

**Why this priority**: The ability to navigate the rehearsal collaboratively — everyone moving
to the next song together — is the backbone of in-rehearsal use. It is only less critical than
scroll sync because it requires less ongoing precision.

**Independent Test**: Connect two devices with different roles. On Device A, tap a song.
Confirm that Device B's view transitions to Song View for that song within 1 second. Confirm
Device A's role tab is pre-selected on Device A and Device B's role tab is pre-selected on
Device B.

**Acceptance Scenarios**:

1. **Given** two members are connected (one Guitar, one Vocals),
   **When** the Guitar member taps a song on the setlist,
   **Then** both members' views display Song View for that song within 1 second.

2. **Given** a member's role is set to "Vocals",
   **When** they arrive at Song View for any song,
   **Then** the Vocals chart tab is pre-selected by default.

3. **Given** a member is in Song View,
   **When** they manually tap the "Bass" tab,
   **Then** the bass chart is displayed; their tab selection does not change any other
   member's view.

4. **Given** a song has no content entered for the "Drums" role,
   **When** a member views the Drums tab,
   **Then** a placeholder message "No chart for this role yet." is displayed.

---

### User Story 4 — Join Flow and Member Presence (Priority: P4)

A band member opens the app for the first time, enters their name and role, and is immediately
connected to the shared session. Their identity persists across sessions so they are not
prompted again on return visits. All connected members are visible to each other in a
live-updated panel.

**Why this priority**: The join flow is a prerequisite for all other features, but it is
simple and has no complex sync requirements. Its correctness is less fragile than the sync
features above.

**Independent Test**: Open the app on a fresh device (no localStorage). Verify the join
screen is shown. Enter a name and role. Verify the member appears in the Who's Here panel
on all other connected devices. Reload the page; verify the join screen is skipped and the
member is re-joined automatically.

**Acceptance Scenarios**:

1. **Given** a device has no saved session data,
   **When** a member opens the app,
   **Then** the join screen is shown with a name field (required, max 30 characters) and
   a role selector (Guitar, Bass, Drums, Vocals, Keys, Other).

2. **Given** a member submits the join form with a valid name and role,
   **When** they are connected,
   **Then** their name and role appear in the Who's Here panel on all connected devices
   within 1 second.

3. **Given** a member has previously joined and their device has saved session data,
   **When** they open the app,
   **Then** the join screen is skipped and they are connected automatically with their
   saved name and role.

4. **Given** a connected member closes the app or loses connection,
   **When** their connection is lost,
   **Then** they are removed from the Who's Here panel on all remaining connected devices
   within 5 seconds.

5. **Given** a member submits the join form with a name longer than 30 characters,
   **When** they attempt to submit,
   **Then** the input is rejected with an error message before submission.

---

### User Story 5 — Song Editor with Per-Role Charts (Priority: P5)

A member can open any song in the editor and enter or modify metadata (title, artist, key,
tempo, duration, notes) as well as chart text for each of the six roles. Chart content is
rendered in a fixed-width font suitable for chord charts and lyric sheets.

**Why this priority**: The song editor is essential for building the setlist content, but it
is a single-user interaction (one person edits at a time) and does not require the same
real-time precision as sync features.

**Independent Test**: Create a song. Enter metadata for all fields. Enter chart text for
Guitar and Vocals roles. Save. Open Song View and verify the Guitar chart and Vocals chart
are displayed correctly in monospace. Confirm other role tabs are empty with the placeholder
message.

**Acceptance Scenarios**:

1. **Given** a member opens the song editor for a new song,
   **When** they fill in title, artist, key, tempo, duration, and notes and save,
   **Then** all fields are persisted and displayed correctly in Song View.

2. **Given** the song editor is open,
   **When** a member enters chart text for a role (e.g., Guitar),
   **Then** the chart text is displayed in a fixed-width (monospace) font in the editor.

3. **Given** chart text has been saved for a role,
   **When** a member views that role's tab in Song View,
   **Then** the text is rendered in monospace, preserving all whitespace and line breaks
   exactly as entered.

4. **Given** a member opens the editor for an existing song with saved chart data,
   **When** they update the Guitar chart and save,
   **Then** any member currently viewing that song in Song View sees the updated chart
   within 1 second.

---

### User Story 6 — Connection Resilience and Offline Tolerance (Priority: P6)

A member's device can lose WiFi briefly during rehearsal and automatically reconnect,
restoring the full current session state — setlist, current song, scroll position — without
any manual action. When offline, the member can still read the last-rendered chart.

**Why this priority**: WiFi reliability in rehearsal rooms is not guaranteed. Resilience is
a quality requirement rather than a headline feature, but it is critical for the app to be
trusted in a live rehearsal context.

**Independent Test**: Connect a device, navigate to a song in Song View. Disable WiFi for
15 seconds. Verify the chart remains visible (service worker cached shell). Re-enable WiFi.
Verify the device reconnects automatically and the Who's Here panel and setlist reflect
current state without any user action.

**Acceptance Scenarios**:

1. **Given** a member is in Song View and the device loses WiFi,
   **When** the network is unavailable,
   **Then** the chart text remains visible and readable (served from cache).

2. **Given** a device has lost and then regained WiFi,
   **When** the connection is restored within 30 seconds,
   **Then** the app automatically reconnects and receives the current setlist, current
   song, and scroll state without any user action.

3. **Given** auto-scroll was running when a device lost connection,
   **When** the device reconnects,
   **Then** the device's scroll position snaps to the current position of the active
   auto-scroll session.

4. **Given** a member's device is offline,
   **When** the connection status indicator is visible,
   **Then** it clearly shows "Offline" (distinct from "Connected" and "Reconnecting").

---

### User Story 7 — Demo Content Pre-Load (Priority: P7)

When the app is launched for the first time with an empty database, three pre-loaded demo
songs are available in the setlist. Each demo song has full metadata and charts for the
relevant roles, allowing any new user to explore the full Song View experience immediately.

**Why this priority**: Demo content removes the barrier to exploration for new setups. It is
not a core rehearsal feature, but it substantially improves the out-of-the-box experience.

**Independent Test**: Start the server with a fresh (empty) database. Open the app. Verify
three songs are present in the setlist. Open each song's Song View and verify at least one
role tab has chart content.

**Acceptance Scenarios**:

1. **Given** the server is started with an empty database,
   **When** a member opens the app,
   **Then** three demo songs ("Last Call at Lindy's", "Meridian", "Copper Wire") are
   present in the setlist with correct metadata (artist, key, tempo, duration).

2. **Given** the demo songs are loaded,
   **When** a member opens any demo song in Song View,
   **Then** at least the Guitar chart tab contains visible content.

3. **Given** demo songs exist in the database,
   **When** a member adds, edits, or deletes any song,
   **Then** demo songs are treated exactly like any other song (no special protection).

4. **Given** the server has been used before (database not empty),
   **When** the server restarts,
   **Then** demo songs are NOT re-inserted (no duplication on restart).

---

### Edge Cases

- **Empty setlist**: A new member arrives when no songs exist. The setlist screen must show
  a clear empty-state message rather than a blank or broken layout.

- **All chart fields empty**: A song with no chart content in any role must still render a
  valid Song View for all tabs, each showing the placeholder message.

- **Member with role "Other" in Song View**: The "Other" tab is pre-selected on arrival.
  If empty, the placeholder is shown (no automatic fallback to a different tab in MVP).

- **Name collision**: Two members submit the same display name. Both are accepted — names
  are display-only identifiers; socket ID is the real key server-side.

- **Rapid reorder**: A member drags songs in quick succession before the first reorder
  is broadcast. Last-write-wins applies; the server's last-received order is authoritative.

- **Song deleted while being viewed**: A member in Song View for a song that another member
  deletes must see a graceful fallback (return to setlist or a "song no longer available"
  notice) rather than a broken screen.

- **Reconnect during active auto-scroll**: The reconnecting client snaps to the current
  scroll position immediately and does not cause a visible jump on other clients.

- **Very small screen (320px width)**: The setlist and Song View remain usable; text does
  not overflow or become unreadably truncated.

- **Server restart mid-session**: All members lose their connection. On reconnect, they see
  the persisted setlist (from the database) but ephemeral state (current song, scroll
  position, member list) is reset to empty.

- **Very long chart**: A chart with hundreds of lines scrolls correctly and auto-scroll
  performs without degradation.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Join & Presence

- **FR-001**: The system MUST display a join screen on first visit, requiring a name
  (1–30 characters, required) and a role (one of: Guitar, Bass, Drums, Vocals, Keys, Other).
- **FR-002**: The system MUST persist the member's name and role in browser-local storage
  after a successful join.
- **FR-003**: The system MUST skip the join screen on return visits when valid saved
  session data exists, and auto-join the member with their saved identity.
- **FR-004**: The system MUST display a "Who's Here" panel showing the name and role of
  every currently connected member, updating in real time as members join and leave.
- **FR-005**: The system MUST remove a member from the Who's Here panel within 5 seconds
  of their disconnection.
- **FR-006**: The system MUST accept duplicate display names; names are for display only
  and are not used as unique identifiers.

#### Setlist Management

- **FR-007**: The system MUST display all songs in the setlist in their current order,
  showing at minimum: position number, title, key, tempo, and duration.
- **FR-008**: The system MUST allow any connected member to add a new song with a title
  (required) and optional metadata (artist, key, tempo, duration, notes).
- **FR-009**: The system MUST allow any connected member to edit any existing song's
  metadata and chart content, with changes persisted to the database.
- **FR-010**: The system MUST allow any connected member to delete any song from the
  setlist, with a confirmation step before deletion is executed.
- **FR-011**: The system MUST allow any connected member to reorder songs by drag-and-drop,
  and persist the new order to the database immediately.
- **FR-012**: The system MUST broadcast all setlist changes (add, edit, delete, reorder)
  to all connected clients within 1 second of the change being made.
- **FR-013**: The system MUST display an empty-state message when the setlist contains
  no songs.
- **FR-014**: The system MUST gracefully handle the case where a member is viewing a song
  that is deleted by another member, navigating them away without showing a broken screen.

#### Song Editor

- **FR-015**: The song editor MUST provide text input fields for all song metadata:
  title (required), artist, key, tempo (numeric, BPM), duration (MM:SS format), and notes.
- **FR-016**: The song editor MUST provide a plain-text input area for each of the six
  roles: Guitar, Bass, Drums, Vocals, Keys, Other.
- **FR-017**: Chart text input areas MUST render their content in a fixed-width (monospace)
  font, preserving all whitespace and line breaks.
- **FR-018**: The system MUST reject a save attempt if the title field is empty, and
  display a clear error message identifying the missing required field.

#### Song View

- **FR-019**: The system MUST display Song View for the currently selected song on all
  connected clients simultaneously, within 1 second of any member tapping a song on
  the setlist.
- **FR-020**: Song View MUST display the song title, key, and tempo in a persistent
  header area.
- **FR-021**: Song View MUST display role tabs for all six roles (Guitar, Bass, Drums,
  Vocals, Keys, Other), regardless of which tabs have chart content.
- **FR-022**: Song View MUST pre-select the tab matching the viewing member's own role
  upon arrival.
- **FR-023**: Song View MUST display "No chart for this role yet." on any tab whose chart
  field is empty.
- **FR-024**: Chart content in Song View MUST be rendered in a fixed-width (monospace)
  font, preserving all whitespace and line breaks exactly as saved.
- **FR-025**: Chart content MUST be displayed at a minimum font size of 14px on mobile
  viewports and 16px on tablet viewports (768px wide or wider).

#### Auto-Scroll Sync

- **FR-026**: Song View MUST provide a clearly labelled Start/Stop button to toggle
  auto-scroll.
- **FR-027**: Song View MUST provide a speed selector offering these values in order:
  0.5x, 1.0x (default), 1.5x, 2.0x, 2.5x, 3.0x.
- **FR-028**: When auto-scroll is active, the controlling client MUST broadcast its
  current scroll position and speed to the server at an interval of no more than 250ms.
- **FR-029**: The server MUST relay each scroll broadcast to all other connected clients
  immediately upon receipt, without buffering or delay.
- **FR-030**: All receiving clients MUST apply the broadcast scroll position such that
  their visible scroll position matches the controlling client's position within 1 second
  of each broadcast.
- **FR-031**: The positional difference between the controlling client and any synced
  client MUST remain under 50px after 5 continuous minutes of auto-scroll on a healthy
  local network.
- **FR-032**: When the controlling client emits a stop event, all connected clients MUST
  cease auto-scroll within 1 second.
- **FR-033**: A client that reconnects while auto-scroll is active MUST receive the
  current scroll position and speed and immediately snap to that position.

#### Connection Resilience

- **FR-034**: The app MUST cache its full shell (HTML, JavaScript, CSS, fonts) via a
  service worker so the last-rendered view remains visible during a network outage.
- **FR-035**: The app MUST attempt to reconnect automatically and indefinitely after a
  connection loss, with a backoff delay between 1 and 5 seconds between attempts.
- **FR-036**: Upon successful reconnect, the server MUST send the reconnecting client
  the full current state: ordered setlist, current song ID, current scroll state, and
  connected member list.
- **FR-037**: The app MUST display a persistent connection status indicator with three
  distinct visible states: "Connected", "Reconnecting…", and "Offline".

#### Demo Content

- **FR-038**: On first server start with an empty database, the system MUST pre-load
  exactly three demo songs: "Last Call at Lindy's", "Meridian", and "Copper Wire"
  (all by "The Hollow Frets"), each with full metadata and charts for at least the
  Guitar role.
- **FR-039**: Demo songs MUST NOT be re-inserted on subsequent server starts if songs
  already exist in the database.

#### Platform & Network

- **FR-040**: The app MUST be served as a Progressive Web App with a valid web app
  manifest, installable via "Add to Home Screen" on iOS Safari and Android Chrome.
- **FR-041**: The app MUST be fully functional with no internet connection, relying
  solely on the local server and service worker cache for all assets.
- **FR-042**: The current server URL (hostname and port) MUST be displayed prominently
  on the setlist screen to aid member discovery.

---

### Key Entities

- **Song**: The core persistent data unit. Has a unique identifier, a required title,
  optional metadata (artist, key, tempo in BPM, duration in MM:SS, free-text notes),
  six per-role plain-text chart fields (Guitar, Bass, Drums, Vocals, Keys, Other),
  an integer setlist order position, and creation/update timestamps. Songs survive
  server restarts.

- **Member**: A connected band member. Has a display name, a role (one of six values),
  a connection identifier assigned by the server on connect, and a join timestamp.
  Member state is ephemeral — it exists only in server memory while the connection is
  active and is not persisted across server restarts.

- **Setlist**: The globally ordered collection of all Songs, defined by each song's
  order position. There is exactly one setlist. Setlist order is persisted to the
  database.

- **Session State**: Ephemeral server-side state tracking the currently selected song
  and the current auto-scroll parameters. Lost on server restart. Includes: currently
  selected song ID (nullable) and current ScrollState (nullable).

- **ScrollState**: The in-progress auto-scroll parameters, held in server memory while
  auto-scroll is active. Contains: which song is scrolling, the current pixel offset
  from the top of the chart area, the speed multiplier (0.5–3.0), the connection
  identifier of the controlling member, and a timestamp of the last update.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Scroll Sync Accuracy**: When auto-scroll is running, the positional
  difference between the controlling device and any synced device is less than 50px
  at all times during a 5-minute continuous scroll session on a local WiFi network.

- **SC-002 — Scroll Sync Latency**: A scroll position broadcast is reflected on all
  connected devices within 1 second of being emitted by the controlling device.

- **SC-003 — Setlist Change Propagation**: Any setlist mutation (add, edit, delete,
  reorder, song selection) is visible on all connected devices within 1 second on a
  local WiFi network.

- **SC-004 — Reconnect Recovery**: A device that loses its connection and reconnects
  within 30 seconds automatically restores the full session state (setlist, current
  song, scroll position) with zero user action required.

- **SC-005 — Zero-Install Onboarding**: A new band member can open the app in a mobile
  browser, enter their name, and be viewing the live setlist within 60 seconds — with
  no app download, account creation, or QR code required.

- **SC-006 — Cross-Device Readability**: All chart text is legible at arm's length
  (~60cm / 2 feet) on screens from 375px to 1440px wide, with no text overflow,
  truncation, or layout breakage across iPhone Safari, Android Chrome, and desktop
  browsers.

- **SC-007 — Session Stability**: A 2-hour rehearsal session with 4 simultaneously
  connected members completes with no application crashes, no data loss, and no
  perceptible slowdown from start to finish.

- **SC-008 — Scroll Drift**: After 5 consecutive minutes of uninterrupted auto-scroll,
  the cumulative positional drift between the controlling device and all receiving
  devices is under 50px (the scroll runs continuously for the full duration with no
  manual resets).

---

## Assumptions

- **Single band, single setlist**: There is exactly one band and one global setlist at
  any time. No multi-tenancy or multiple concurrent setlists are required in MVP.

- **Trusted local network**: All users on the local WiFi are band members. No
  authentication, authorization, or rate limiting is required.

- **Last-write-wins for edits**: Concurrent edits are resolved by last-write-wins.
  Given the small team size and social coordination expected in a rehearsal setting,
  a conflict resolution UI is not needed.

- **Broadcaster owns scroll speed**: Only the controlling client's speed setting governs
  the broadcast. Receiving clients may not override the broadcast speed in MVP; they
  receive and apply the speed as broadcast.

- **Plain text charts only**: Chart fields accept any plain text. Formatting is the
  responsibility of the person entering the chart. No parsing or validation of chart
  content is performed.

- **Mac Mini is always-on**: The server is assumed to be running before members connect.
  Server startup and process management are infrastructure concerns outside the app's scope.

- **Fonts served locally**: Both DM Sans (UI) and JetBrains Mono (charts) must be
  bundled with the app and served from the local server. No external font CDN calls.

- **No server-side session persistence**: Member presence and scroll state are not
  persisted. A server restart clears all ephemeral state; only the song database
  survives.

---

## Out of Scope (MVP)

The following are explicitly excluded from this specification.

| Excluded Feature | Reason |
|---|---|
| User authentication / permissions | Single trusted LAN; not needed |
| Multiple bands / multi-tenancy | Single-band model only |
| Cloud sync or internet access at runtime | Intentionally local-only |
| Rich text or image chart content | Plain text is sufficient for MVP |
| PDF chart import | Significant parsing complexity; deferred |
| Audio playback / click track | Not a chart or setlist concern |
| Metronome / tuner | Out of scope for v1 |
| Song version history | Nice-to-have; deferred |
| Shared speed control (receiving clients override speed) | Broadcaster controls speed in MVP |
| Set duration timer / countdown | Future feature |
| Native iOS or Android app | PWA is sufficient |
| Admin dashboard or analytics | Not relevant for rehearsal context |
| QR code for joining | Welcome shortcut but not required |
