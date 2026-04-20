# GigSheet — Product Requirements Document

## Overview

GigSheet is a real-time collaborative setlist app for bands. Every band member opens the app on their device, joins a shared session, and sees the same setlist. When anyone selects a song, it opens on every device simultaneously — showing role-specific charts (guitar, bass, drums, vocals) with synced auto-scroll.

## Problem Statement

Bands currently have no unified way to:
- View a shared setlist during rehearsal or performance
- Stay on the same song at the same time
- See instrument-specific charts (chords, tabs, drum notation) for the same song
- Auto-scroll through charts in sync so everyone progresses together

Existing tools (Ultimate Guitar, OnSong, BandHelper) are solo-focused, expensive, or lack real-time sync.

## Target Users

Small to mid-size bands (2–8 members) who rehearse and perform together. Members have mixed devices — iPhones, Android phones, iPads, tablets. Technical comfort ranges from "can use apps" to "can barely find the app."

## Platform & Architecture

### Cross-Platform Strategy
**Progressive Web App (PWA)** — this is the MVP platform choice.
- Works on iOS Safari, Android Chrome, desktop browsers, iPads, tablets
- "Add to Home Screen" for native-like experience
- No app store approval, no separate iOS/Android codebases
- Single URL — band members just open it in a browser

### Network & Hosting
The server runs locally on a **Mac Mini** mounted in the band's guitar rack with its own **bridged WiFi router** creating a dedicated network.
- **Custom DNS**: URL can be anything (e.g., `http://gigsheet.live`)
- **Zero external dependencies**: No cloud hosting, no internet required
- **Near-zero latency**: All devices on same local network
- **Setup for bandmates**: Connect to WiFi → open URL → done

### Real-Time Sync Architecture
Use **WebSockets** (via Socket.IO or similar) for real-time state sync.
- Single-band, single-server model — network IS the room
- All state changes broadcast to all connected clients
- Server is source of truth
- Late joiners receive current state on connect

### Tech Stack
- **Frontend**: React + TypeScript, Vite, PWA manifest + service worker
- **Backend**: Node.js + Express + Socket.IO
- **Database**: SQLite (file-based, on Mac Mini disk)
- **Hosting**: Mac Mini on local WiFi, auto-starts on boot via launchd

## Core Features (MVP)

### 1. Connecting
- First visit: enter display name + select role (persisted in localStorage)
- Returning visits: auto-connects with saved name/role
- Server persists all data via SQLite
- "Who's here" indicator shows connected members
- Everyone is equal — anyone can drive

### 2. Roles
Guitar, Bass, Drums, Vocals, Keys, Other — determines default chart view. Changeable anytime.

### 3. Setlist Management
- Ordered song list with title/artist/key/BPM cards
- Add, remove (swipe-to-delete), reorder (drag-and-drop)
- All changes sync in real-time

### 4. Song Editor
- Metadata: Title (required), Artist, Key, BPM
- One text field per role for charts (plain text, monospace-rendered)
- Any member can edit any song's charts

### 5. Song View (Core Experience)
- Tapping a song opens it on ALL connected devices
- Header with metadata, role tabs, scrollable chart area, scroll controls
- Toast shows who selected the song
- Prev/Next navigation syncs to all devices

### 6. Auto-Scroll (Synced)
- Start/stop syncs to all devices
- Adjustable speed (0.5x–3x) syncs to all
- Server broadcasts scroll-start with timestamp
- Manual scroll desyncs with "Re-sync" button

### 7. Connection Resilience
- PWA service worker caches app shell + song data
- Auto-reconnect on WiFi loss
- Visible connection status indicator

## UI Specifications

### Design Philosophy: Warm Analog
Inspired by vintage music gear — tube amp glow, aged leather, amber pilot lights.

### Color System
- **Background**: `#1A1714` (dark warm brown)
- **Accent**: `#D4A54A` (amber)
- **Primary text**: `#E8DCC8`
- **Chart body**: `rgba(200, 185, 160, 0.55)`
- **Connected**: `#7A9E6A`, **Disconnected**: `#C45A4A`

### Typography
- **Chart Text**: JetBrains Mono (monospace, configurable size S/M/L)
- **UI Text**: DM Sans

## Data Model

### Song (SQLite)
```
{ id, title, artist, key, bpm, position, charts: { guitar, bass, drums, vocals, keys, other } }
```

### Member
```
{ id, display_name, role, connected }
```

### Server State
```
{ setlist: Song[], active_song_id, scroll_state: { active, speed, started_at, started_by }, connected_members: Member[] }
```

## WebSocket Events

### Client → Server
connect, select_song, scroll_start, scroll_stop, scroll_speed, update_setlist, update_song, navigate_song, change_role

### Server → Client
state_sync, song_selected, scroll_update, setlist_updated, song_updated, member_joined, member_left, members_updated

## MVP Scope

### In Scope
PWA, local Mac Mini server, join flow, setlist CRUD, song CRUD with per-role charts, real-time sync, synced auto-scroll, role selector, dark stage-ready UI, SQLite persistence, auto-reconnect

### Out of Scope (Future)
User accounts, cloud hosting, room codes, chord DB integration, transposition, metronome, audio playback, setlist templates, bandleader lock mode, in-app chat, PDF export, multiple setlists, tablet two-column layout

## Success Criteria
1. Four members on mixed devices see same setlist
2. Song selection syncs within 1 second
3. Auto-scroll stays in sync over 5 minutes
4. Charts readable on phone at arm's length
5. No loading spinners during normal use
6. Full rehearsal possible using only this app
7. Data persists across Mac Mini reboots

## Demo Content
Pre-load 2–3 demo songs with charts for all roles using fictional content.
