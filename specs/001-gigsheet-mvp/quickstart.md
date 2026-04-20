# Quickstart & Integration Scenarios: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20

This document describes the integration test scenarios derived from the spec's user stories.
Each scenario can be used to manually validate a working build or as the basis for an
automated integration test.

---

## Prerequisites

- Server running on `localhost:3000` (or test port)
- Two browser windows / devices on the same network
- Database is empty (fresh start) OR pre-seeded with demo songs

---

## Scenario 1: Demo Content Pre-Load (US7)

**Start**: Fresh database (no songs)

1. Start the server.
2. Open the app in a browser.
3. **Verify**: Three songs appear in the setlist: "Last Call at Lindy's", "Meridian",
   "Copper Wire" — all by "The Hollow Frets".
4. Tap "Last Call at Lindy's". Verify: key = A, tempo = 112.
5. Tap the Guitar tab. Verify: chart content is present and not empty.
6. Restart the server.
7. **Verify**: Still three songs, NOT six (no re-insertion on restart).

**Pass criteria**: Demo songs present exactly once; not duplicated on restart.

---

## Scenario 2: First Join and Member Presence (US4)

**Start**: Server running, no other members connected

**Device A (fresh)**:
1. Open app. **Verify**: Join screen shown.
2. Enter name "Cody", select role "Guitar". Submit.
3. **Verify**: Setlist screen shown. "Cody (Guitar)" visible in Who's Here panel.

**Device B (fresh, simultaneously)**:
1. Open app. **Verify**: Join screen shown.
2. Enter name "Mia", select role "Vocals". Submit.
3. **Verify**: Both "Cody (Guitar)" and "Mia (Vocals)" visible in Who's Here panel.

**On Device A**:
4. **Verify**: "Mia (Vocals)" now appears in Who's Here panel (appeared without page reload).

**Device A, page reload**:
5. Reload the page. **Verify**: Join screen NOT shown. Cody is re-joined automatically.

**Pass criteria**: Presence sync <1s; join persistence works; auto-rejoin on reload.

---

## Scenario 3: Setlist CRUD and Sync (US2)

**Start**: Two members connected (Device A, Device B)

1. **Device A**: Tap "Add Song". Fill in title "Test Song", key "C", tempo 120. Save.
2. **Verify both devices**: "Test Song" appears at bottom of setlist within 1 second.
3. **Device A**: Drag "Test Song" to position 1 (top of list).
4. **Verify both devices**: New order reflected within 1 second.
5. **Device A**: Tap edit icon on "Test Song". Change title to "Test Song (Edited)". Save.
6. **Verify both devices**: Updated title shown within 1 second.
7. **Device A**: Tap delete icon on "Test Song (Edited)". Confirm deletion.
8. **Verify both devices**: Song removed within 1 second.

**Pass criteria**: All CRUD operations broadcast within 1 second to all clients.

---

## Scenario 4: Song Selection Sync (US3)

**Start**: Two members connected; one song in setlist ("Last Call at Lindy's")
- Device A: role = Guitar
- Device B: role = Vocals

1. **Device A**: Tap "Last Call at Lindy's" on the setlist.
2. **Verify both devices**: Both navigate to Song View for "Last Call at Lindy's"
   within 1 second.
3. **Verify Device A**: Guitar tab is pre-selected.
4. **Verify Device B**: Vocals tab is pre-selected.
5. **Device B**: Tap the "Guitar" tab manually.
6. **Verify Device A**: Not affected (tab selection is local only).

**Pass criteria**: Song selection sync <1s; role-based tab pre-selection works.

---

## Scenario 5: Synchronized Auto-Scroll (US1) [scroll-sync]

**Start**: Two members in Song View for the same song; song has a long chart (>2 screens)

1. **Device A**: Tap "▶ Auto-Scroll" at 1.0x.
2. **Verify Device B**: Begins scrolling within 1 second. Position matches Device A.
3. Wait 30 seconds. **Verify**: Position difference between A and B is under 50px.
4. **Device A**: Change speed to 2.0x.
5. **Verify Device B**: Scroll rate increases within 1 second.
6. **Device A**: Tap "Stop".
7. **Verify Device B**: Scroll stops within 1 second.

**Pass criteria**: Sync <1s; drift <50px; speed change propagates; stop propagates.

---

## Scenario 6: Reconnect Recovery (US6) [scroll-sync]

**Start**: Auto-scroll running on Device A, Device B in sync

1. **Device B**: Disable WiFi (or simulate disconnect in test).
2. **Device B**: **Verify**: Connection status shows "Offline". Chart still visible.
3. **Device A**: Scroll continues. Position advances significantly.
4. **Device B**: Re-enable WiFi (within 30 seconds).
5. **Verify Device B**: Reconnects automatically. Scroll position snaps to Device A's
   current position. "Connected" indicator shown. No user action required.

**Pass criteria**: App stays readable offline; auto-reconnect; state restored after reconnect.

---

## Scenario 7: Mid-Rehearsal Song Edit (US5)

**Start**: Device B is in Song View for "Last Call at Lindy's". Device A is on setlist.

1. **Device A**: Tap edit icon on "Last Call at Lindy's". Modify the Guitar chart.
   Change a chord. Save.
2. **Verify Device B**: Guitar chart updates immediately (within 1 second) without
   leaving Song View.

**Pass criteria**: Live song edit propagates to viewing clients within 1 second.

---

## Scenario 8: Song Deleted While Being Viewed (Edge Case)

**Start**: Device B is in Song View for "Meridian". Device A is on setlist.

1. **Device A**: Delete "Meridian". Confirm.
2. **Verify Device B**: Does NOT show a broken or blank screen. Instead, navigates back
   to the setlist OR shows a graceful "song no longer available" message.

**Pass criteria**: No broken UI when viewed song is deleted by another member.

---

## Automated Test Coverage Mapping

| Scenario | Integration Test File |
|---|---|
| 1 — Demo content | `server/tests/integration/setlist-crud.test.ts` |
| 2 — Join & presence | `server/tests/integration/member-presence.test.ts` |
| 3 — Setlist CRUD | `server/tests/integration/setlist-crud.test.ts` |
| 4 — Song selection sync | `server/tests/integration/setlist-crud.test.ts` |
| 5 — Auto-scroll sync | `server/tests/integration/scroll-sync.test.ts` |
| 6 — Reconnect recovery | `server/tests/integration/reconnect-recovery.test.ts` |
| 7 — Mid-rehearsal edit | `server/tests/integration/setlist-crud.test.ts` |
| 8 — Delete while viewing | `server/tests/integration/setlist-crud.test.ts` |
