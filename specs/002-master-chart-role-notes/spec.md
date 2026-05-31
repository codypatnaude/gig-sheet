# Feature Specification: Unified Master Chart & Role Notes

**Feature Branch**: `002-master-chart-role-notes`
**Created**: 2026-05-31
**Status**: Draft
**Input**: Replace per-role chart fields with a single master chart per song plus role-scoped annotations anchored to master-chart lines.

---

## Overview

This feature replaces GigSheet's six per-role chart text fields with a single **master chart**
shared by all roles, plus a system of short **role notes** that any member can attach to
specific lines of that chart.

The root motivation is scroll sync fidelity. When each role has its own chart with a different
line count, synced auto-scroll silently drifts because positions are measured in lines and
different roles have different line sets. A single master chart eliminates that source of drift
entirely: every device scrolls the same line sequence regardless of role, and notes — which
are rendered as visual overlays but never counted as scroll lines — cannot introduce drift.

This spec supersedes the per-role chart sections of spec 001 (FR-005, FR-006, FR-007,
FR-010, FR-011, FR-012). All other behavior from spec 001 — setlist management, member
presence, song selection sync, connection resilience, and the scroll sync protocol — is
unchanged.

---

## User Scenarios & Testing

### User Story 1 — Master Chart Authoring (Priority: P1)

Any band member opens the song editor and sees a single chart field where they previously
saw six per-role tabs. They paste or type the chord chart — words and chords together, the
same chart the whole band reads — and save. The updated chart appears on every connected
device immediately.

**Why this priority**: The master chart is the foundation everything else rests on. Without
it, role notes have nowhere to anchor, scroll sync has no canonical line set, and the editing
experience is still broken. This must work end-to-end before any other story can be tested.

**Independent Test**: Open the song editor for any song. Confirm one chart field is present
(no role tabs). Type chart content and save. Verify the updated chart appears on a second
connected device within one second.

**Acceptance Scenarios**:

1. **Given** a member opens the song editor,
   **When** they view the chart section,
   **Then** they see exactly one chart textarea, with no role-selector tabs above it.

2. **Given** a member types new content into the master chart field and saves,
   **When** the save is confirmed,
   **Then** every other connected device displays the updated chart within one second.

3. **Given** a member edits the master chart while another member is viewing the song,
   **When** the edit is saved,
   **Then** the viewing member's screen refreshes to show the new chart without requiring
   a manual page reload.

4. **Given** a song with no chart content yet,
   **When** a member saves an empty chart field,
   **Then** the song view displays a "No chart" placeholder and no scrollable content.

5. **Given** a song with a master chart containing section headers such as `[Verse]` or `[Chorus]`,
   **When** any member views the song,
   **Then** section headers render visually distinct from lyric/chord lines, consistent with
   the rendering rules from spec 001.

---

### User Story 2 — Role Notes (Priority: P2)

A guitarist reading a chart taps a specific line — say the bridge entry — and adds a short
note: "palm mute, swell in on beat 3." The note appears above that line, in the guitarist's
role accent color, indented from the chart text. Other members see their own role's notes
(or all notes, or none) depending on their visibility setting.

**Why this priority**: Notes are the mechanism by which each role personalises the shared
chart. Without notes the master chart is a read-only simplification; with notes it is a full
replacement for the per-role chart system.

**Independent Test**: With two members connected (different roles), Member A taps a chart
line and adds a note. Verify the note appears above that line on Member A's screen in the
correct role color. Verify Member B, filtered to "own role," does not see Member A's note.
Switch Member B to "all roles" view and verify the note appears.

**Acceptance Scenarios**:

1. **Given** a member is viewing a song's chart,
   **When** they tap any master-chart line,
   **Then** an input appears allowing them to type a short note, with a save and cancel action.

2. **Given** a member saves a note on line N,
   **When** any device views that song with "all roles" visibility,
   **Then** the note appears above line N, indented, in the authoring role's accent color.

3. **Given** Member A (Guitar) adds a note and Member B (Bass) has "own role" visibility,
   **When** Member B views the song,
   **Then** Member B does not see Member A's Guitar note.

4. **Given** Member B switches to "all roles" visibility,
   **When** they view the chart,
   **Then** all notes for all roles appear above their respective lines.

5. **Given** a member taps an existing note they authored,
   **When** they edit and save it,
   **Then** the updated note text appears on all devices within one second.

6. **Given** a member taps an existing note they authored,
   **When** they choose to delete it,
   **Then** the note is removed from all devices within one second.

7. **Given** two members simultaneously add notes to the same line,
   **When** both saves complete,
   **Then** both notes are preserved and both appear above that line; neither overwrites the other.

---

### User Story 3 — Note Visibility Toggle (Priority: P3)

A drummer who finds other roles' notes distracting wants to see only their own. A band leader
doing a full review wants to see everyone's. The visibility control — where the role tabs
used to be — lets each member choose independently: **Own role** (default), **All roles**,
or **None**.

**Why this priority**: Visibility filtering makes notes practical on a real setlist. Without
it, a chart annotated by four roles becomes unreadable. It does not block the core authoring
or scroll features, so it sits at P3.

**Independent Test**: With notes from two different roles attached to a song, cycle through
all three visibility states on one device. Verify only the correct notes are shown in each
state. Verify the other device's visibility is unaffected.

**Acceptance Scenarios**:

1. **Given** a member opens a song view for the first time,
   **When** notes exist for their role and for other roles,
   **Then** only their own role's notes are visible (default: "Own role").

2. **Given** a member selects "All roles" visibility,
   **When** they view the chart,
   **Then** notes from every role are shown, each in its authoring role's accent color.

3. **Given** a member selects "None" visibility,
   **When** they view the chart,
   **Then** no notes are shown; only the master chart lines are visible.

4. **Given** Member A changes their visibility setting,
   **When** Member B views the same song simultaneously,
   **Then** Member B's visibility setting is unaffected.

5. **Given** a member's visibility is set to "Own role,"
   **When** another member adds a new note for a different role,
   **Then** the new note does not appear on the first member's screen.

---

### User Story 4 — Scroll Sync on Master Lines Only `[scroll-sync]` (Priority: P4)

Auto-scroll advances through master-chart lines. Every connected device — regardless of role,
regardless of how many notes that role has attached — scrolls to the same master-chart line
at the same time. Notes occupy vertical space on screen but are never scroll targets and never
introduce positional drift between devices.

**Why this priority**: This is the core invariant that justifies the entire architecture
change. Notes must be provably invisible to the scroll engine; if they were scroll targets
the drift problem would return in a different form. This story codifies the guarantee that
makes the whole system work. See constitution Principle II.

**Independent Test**: Connect two devices: Member A (Guitar, 6 notes attached) and Member B
(Bass, 0 notes). Member A starts auto-scroll. After 60 continuous broadcast ticks, verify
the same master-chart line is at the top of both screens, and the positional delta is under
50px throughout. Switch Member A to "All roles" visibility mid-scroll; verify no position jump.

**Acceptance Scenarios**:

1. **Given** Member A has 10 notes attached to various lines and Member B has 0 notes,
   **When** auto-scroll is running,
   **Then** both devices display the same master-chart line in the same scroll position,
   and the positional delta between them remains under 50px continuously.

2. **Given** auto-scroll is advancing,
   **When** the scroll engine moves to the next position,
   **Then** it targets the next master-chart line; any notes rendered between lines are
   passed over without altering the scroll step size.

3. **Given** a member adds a note to a chart line while auto-scroll is running,
   **When** the note is saved and synced,
   **Then** scroll position on all devices is unchanged by the note insertion.

4. **Given** auto-scroll is running and one device has "All roles" visibility while another
   has "None" visibility,
   **When** both devices receive the same scroll broadcast,
   **Then** both arrive at the same master-chart line position within one second.

5. **Given** auto-scroll reaches the last master-chart line and stops,
   **When** all devices receive the stop event,
   **Then** all devices rest at the same final line, regardless of note counts.

6. **Given** a device reconnects mid-scroll,
   **When** it receives the current scroll state,
   **Then** it snaps to the current master-chart line position within one second.

---

### User Story 5 — Migration of Existing Songs (Priority: P5)

Songs created before this feature shipped have per-role chart fields but no master chart.
When a member opens such a song's editor, they are prompted to choose which existing role
chart becomes the master chart. The remaining per-role content is discarded after confirmation.

**Why this priority**: Migration only affects songs that exist before the feature lands. At
current data volume this is a small number of songs, and the migration is a one-time manual
step per song. It does not block any other story, so it sits at P5.

**Independent Test**: Create a song with content in the Guitar and Bass chart fields using
the old schema. Open the song editor with the new feature enabled. Verify the migration
prompt appears. Choose Guitar. Verify the master chart contains the Guitar content and the
Bass content is no longer accessible.

**Acceptance Scenarios**:

1. **Given** a song has content in one or more per-role chart fields and no master chart,
   **When** any member opens that song's editor,
   **Then** a migration prompt appears listing the populated role fields and asking the
   member to choose one as the master chart.

2. **Given** a member selects a role chart as the master and confirms,
   **When** the migration is saved,
   **Then** the chosen content becomes the master chart and the per-role fields are removed.

3. **Given** a member dismisses the migration prompt without choosing,
   **When** they view the song,
   **Then** the song opens read-only with a banner indicating migration is needed, and
   auto-scroll is disabled until migration is completed.

4. **Given** a song has no content in any per-role chart field,
   **When** a member opens the editor,
   **Then** no migration prompt appears; the editor opens normally with an empty master chart.

---

### Edge Cases

- **Empty master chart**: A song with no chart content still loads in song view; the scroll engine handles zero lines gracefully; auto-scroll start is a no-op when there are no lines.
- **Note anchor out of range after chart edit**: If a master chart edit reduces the line count such that a note's line index now exceeds the last valid line, the note is clamped to the last valid line and visually flagged as displaced. The note text is never lost.
- **Simultaneous master chart edits from two members**: The later-arriving save wins (last-writer-wins, consistent with song metadata in spec 001). Neither edit is silently dropped; the final state is deterministic and the chart on all devices converges to the winning version within one second.
- **Simultaneous note add on the same line by different roles**: Both notes are created and both appear above the same line. Creation order is preserved by server-assigned timestamp; neither note overwrites the other.
- **Member disconnects during note edit**: The partially-typed note is discarded on disconnect (it was never saved). On reconnect the member sees the current chart and notes without any orphaned draft.
- **Auto-scroll active when master chart is edited by another member**: The scrolling device refreshes its line set on receipt of the chart update. If the new chart has fewer lines than the current scroll position, scroll stops at the new last line and the stop event is broadcast to all devices.
- **Note visibility state across song navigation**: If a member sets visibility to "All roles" and navigates to the setlist and back to the same song, the visibility preference is retained for the duration of the session.

---

## Requirements

### Functional Requirements

**Song Data**

- **FR-001**: A song MUST have exactly one master chart field, replacing all six per-role chart fields from spec 001 (`chart_guitar`, `chart_bass`, `chart_drums`, `chart_vocals`, `chart_keys`, `chart_other`).
- **FR-002**: The master chart MUST be plain text. Section headers matching the pattern `[Anything]` MUST render visually distinct from lyric and chord lines.
- **FR-003**: Any connected member MUST be able to edit the master chart; edits MUST sync to all connected devices within one second.

**Role Notes**

- **FR-004**: A note MUST carry: a song identifier, a zero-based master-chart line index, an authoring role, and text content.
- **FR-005**: Note text MUST be plain text with a maximum length of 280 characters.
- **FR-006**: Any connected member MUST be able to add a note to any line of the master chart; the note is authored under their current role.
- **FR-007**: Any member MUST be able to edit or delete a note they authored. Edits and deletes MUST sync to all connected devices within one second.
- **FR-008**: When a master chart edit causes a note's line index to exceed the new line count, the note MUST be clamped to the last valid line index. The note MUST NOT be deleted.
- **FR-009**: Clamped notes MUST be visually flagged to indicate they need re-placement.

**Rendering**

- **FR-010**: Every member MUST see the same master chart lines in the same order, regardless of role.
- **FR-011**: Notes MUST render above their anchored master-chart line, indented, in the accent color associated with the authoring role.
- **FR-012**: The default note visibility on entering a song view MUST be "Own role."
- **FR-013**: A visibility control MUST offer three states: **Own role**, **All roles**, **None**.
- **FR-014**: Visibility state MUST be per-device and per-session; it MUST NOT sync across devices.

**Scroll Sync** `[scroll-sync]`

- **FR-015**: The set of scroll targets MUST consist exclusively of master-chart lines. Notes MUST NOT be scroll targets.
- **FR-016** `[scroll-sync]`: Scroll position MUST be computed using only the master-chart line set; note count and note visibility state on any device MUST NOT affect scroll position calculation.
- **FR-017** `[scroll-sync]`: The `scroll_update` / `scroll_synced` / `scroll_stopped` event payloads from spec 001 are unchanged by this feature. No new scroll events are introduced.
- **FR-018** `[scroll-sync]`: Adding, editing, or deleting a note while auto-scroll is running MUST NOT alter the current scroll position on any device.
- **FR-019** `[scroll-sync]`: Positional drift between any two devices MUST remain below 50px after 5 continuous minutes of auto-scroll, regardless of the note counts or visibility states on each device.

**Migration**

- **FR-020**: When a song with legacy per-role chart fields and no master chart is opened for editing, the member MUST be prompted to select one role's content as the master chart before editing proceeds.
- **FR-021**: After a migration is confirmed, per-role chart fields MUST be removed from the song record.
- **FR-022**: A song awaiting migration MUST be viewable in read-only mode, but auto-scroll MUST be disabled until migration is completed.

### Key Entities

- **Master Chart**: A single ordered body of plain text associated with one song, divided into lines for rendering and scroll purposes. Shared identically across all roles.
- **Chart Line**: One line of the master chart, identified by its zero-based position within the full text. The atomic unit of scroll positioning and note anchoring.
- **Role Note**: A short plain-text annotation authored by a member under a specific role, anchored to a chart line by index, rendered above that line. Never a scroll target.
- **Note Visibility State**: A per-device, per-session setting — own / all / none — controlling which role notes are shown. Not persisted to the server.

---

## Success Criteria

### Measurable Outcomes

- **SC-001** `[scroll-sync]`: With auto-scroll running for 5 continuous minutes across two devices — one with role notes visible, one with none — the positional difference between the two screens remains under 50px throughout.
- **SC-002**: A master chart edit by one member appears on all other connected devices within 1 second of the save action.
- **SC-003**: A note add, edit, or delete by one member appears on all other connected devices within 1 second.
- **SC-004**: A member can add a note to a chart line in under 15 seconds from first tap to confirmed save.
- **SC-005**: The song editor exposes exactly one chart field; a usability check with any band member confirms the editing flow requires fewer steps than the six-tab approach it replaces.
- **SC-006**: A song with 20 notes across all roles renders the chart view with no perceptible lag on a mid-range smartphone.
- **SC-007**: After migrating any legacy song, auto-scroll resumes and positional sync is verified within one rehearsal session.

---

## Dependencies

- **Supersedes** FR-005, FR-006, FR-007, FR-010, FR-011, FR-012 from spec 001 (the six per-role chart fields are removed).
- **Extends** User Story 1 (Synchronized Chart Scrolling) from spec 001 — the scroll protocol payload is unchanged but the scroll target set changes from a per-role line count to the shared master-chart line count.
- **Requires** spec 001 to be fully implemented (Socket.IO infrastructure, setlist, presence, song selection sync) before this feature is built on top of it.

---

## Assumptions

- **Last-writer-wins for master chart edits**: If two members save conflicting edits within milliseconds, the server accepts the later-arriving write and broadcasts it. No merge UI is needed at current band sizes (2–8 members).
- **Notes are clamped, never deleted, on chart edit**: A note whose anchor is displaced by a chart edit is moved to the nearest valid line and flagged; it is never silently discarded.
- **Migration is per-song and manual**: There is no bulk migration. Each legacy song is migrated the first time its editor is opened after the feature ships.
- **Notes are role-scoped, not member-scoped**: Any member with the same role can see and re-place notes authored by any other member of that role.
- **Plain text only for notes**: No markdown, no line breaks within a note, no rich text. 280-character cap covers all practical performance cues.
- **Visibility preference is session-scoped**: It does not persist across browser refreshes or reconnects. The default "Own role" is always the starting state for a new session.
- **Scroll protocol payload is unchanged**: The existing absolute-pixel-position broadcast is sufficient for master-chart-line-only scroll. No new payload fields are needed.

---

## Out of Scope

- Per-role chart transposition or key changes.
- Note attribution to a specific individual (notes are role-scoped, not person-scoped).
- Note threading, replies, or reactions.
- Rich text, markdown, or multi-line notes.
- Bulk or automated migration tooling.
- Conflict resolution UI for simultaneous master chart edits.
- Any change to the roles list, setlist management, connection flow, member presence, or PWA behavior.
