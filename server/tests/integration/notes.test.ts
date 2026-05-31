// Integration tests for note CRUD events
// Written BEFORE handler implementation (constitution Principle I)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Socket as ClientSocket } from 'socket.io-client';
import {
  createTestServer,
  connectAndJoin,
  waitForEvent,
  disconnectAll,
  type TestServer,
} from './helpers.js';
import { createSong } from '../../src/db/songs.js';
import { addNote } from '../../src/db/notes.js';
import type {
  NoteAddedPayload,
  NoteUpdatedPayload,
  NoteDeletedPayload,
  SongSelectedPayload,
  SongUpdatedPayload,
  StateSyncPayload,
  ErrorPayload,
} from '@gig-sheets/shared';

let server: TestServer;
let clientA: ClientSocket;
let clientB: ClientSocket;

beforeEach(async () => {
  server = await createTestServer();
  const [a, b] = await Promise.all([
    connectAndJoin(server.port, 'Alice', 'Guitar'),
    connectAndJoin(server.port, 'Bob', 'Bass'),
  ]);
  clientA = a.client;
  clientB = b.client;
});

afterEach(async () => {
  disconnectAll(clientA, clientB);
  await server.close();
});

// Helper: create a migrated song (master_chart IS NOT NULL)
function makeSong(masterChart = 'line0\nline1\nline2\nline3\nline4') {
  return createSong(server.db, { title: 'Test Song', master_chart: masterChart });
}

describe('note_add broadcast', () => {
  it('broadcasts note_added to all clients within 1000ms', async () => {
    const song = makeSong();
    const aPromise = waitForEvent<NoteAddedPayload>(clientA, 'note_added', 1000);
    const bPromise = waitForEvent<NoteAddedPayload>(clientB, 'note_added', 1000);
    clientA.emit('note_add', { song_id: song.id, line_index: 2, role: 'Guitar', text: 'palm mute' });
    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.note.text).toBe('palm mute');
    expect(a.note.line_index).toBe(2);
    expect(a.note.role).toBe('Guitar');
    expect(b.note.id).toBe(a.note.id);
    expect(b.note.text).toBe('palm mute');
  });

  it('preserves both notes when two clients add to the same line simultaneously', async () => {
    const song = makeSong();
    const aNotes: NoteAddedPayload[] = [];
    const bNotes: NoteAddedPayload[] = [];
    clientA.on('note_added', (p: NoteAddedPayload) => aNotes.push(p));
    clientB.on('note_added', (p: NoteAddedPayload) => bNotes.push(p));

    clientA.emit('note_add', { song_id: song.id, line_index: 0, role: 'Guitar', text: 'A' });
    clientB.emit('note_add', { song_id: song.id, line_index: 0, role: 'Bass', text: 'B' });

    // Wait for both adds to propagate
    await new Promise((r) => setTimeout(r, 400));
    expect(aNotes.length).toBe(2);
    expect(bNotes.length).toBe(2);
    const texts = aNotes.map((n) => n.note.text).sort();
    expect(texts).toEqual(['A', 'B']);
  });

  it('rejects note_add on unmigrated song with error event', async () => {
    const unmigrated = createSong(server.db, { title: 'Legacy' }); // master_chart = null
    const errPromise = waitForEvent<ErrorPayload>(clientA, 'error', 1000);
    clientA.emit('note_add', { song_id: unmigrated.id, line_index: 0, role: 'Guitar', text: 'x' });
    const err = await errPromise;
    expect(err.code).toBeTruthy();
  });

  it('rejects note_add with out-of-range line_index', async () => {
    const song = makeSong('line0\nline1\nline2'); // 3 lines (indices 0-2)
    const errPromise = waitForEvent<ErrorPayload>(clientA, 'error', 1000);
    clientA.emit('note_add', { song_id: song.id, line_index: 99, role: 'Guitar', text: 'x' });
    const err = await errPromise;
    expect(err.code).toBeTruthy();
  });
});

describe('note_update broadcast', () => {
  it('broadcasts note_updated to all clients within 1000ms', async () => {
    const song = makeSong();
    const note = addNote(server.db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'orig' });
    const aPromise = waitForEvent<NoteUpdatedPayload>(clientA, 'note_updated', 1000);
    const bPromise = waitForEvent<NoteUpdatedPayload>(clientB, 'note_updated', 1000);
    clientA.emit('note_update', { note_id: note.id, text: 'revised' });
    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.note.text).toBe('revised');
    expect(b.note.id).toBe(note.id);
    expect(b.note.text).toBe('revised');
  });
});

describe('note_delete broadcast', () => {
  it('broadcasts note_deleted to all clients within 1000ms', async () => {
    const song = makeSong();
    const note = addNote(server.db, { song_id: song.id, line_index: 1, role: 'Bass', text: 'del me' });
    const aPromise = waitForEvent<NoteDeletedPayload>(clientA, 'note_deleted', 1000);
    const bPromise = waitForEvent<NoteDeletedPayload>(clientB, 'note_deleted', 1000);
    clientA.emit('note_delete', { note_id: note.id });
    const [a, b] = await Promise.all([aPromise, bPromise]);
    expect(a.note_id).toBe(note.id);
    expect(b.note_id).toBe(note.id);
  });
});

describe('chart edit clamps notes', () => {
  it('song_updated includes clamped notes when chart shrinks', async () => {
    const song = makeSong('line0\nline1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9');
    addNote(server.db, { song_id: song.id, line_index: 8, role: 'Guitar', text: 'deep' });
    addNote(server.db, { song_id: song.id, line_index: 2, role: 'Bass', text: 'safe' });

    const aPromise = waitForEvent<SongUpdatedPayload>(clientA, 'song_updated', 1000);
    clientA.emit('song_update', {
      song: { ...song, master_chart: 'line0\nline1\nline2' }, // shrink to 3 lines
    });
    const result = await aPromise;
    expect(result.song.master_chart).toBe('line0\nline1\nline2');
    // Clamped notes should be included
    expect(result.notes).toBeDefined();
    const clamped = result.notes?.find((n) => n.role === 'Guitar');
    expect(clamped?.line_index).toBe(2); // clamped to last valid line
    // Safe note should not appear in clamped list
    const safeNote = result.notes?.find((n) => n.role === 'Bass');
    expect(safeNote).toBeUndefined();
  });
});

describe('state_sync includes notes', () => {
  it('new client receives notes for current song in state_sync', async () => {
    const song = makeSong();
    // Select a song first so current_song_id is set
    clientA.emit('song_select', { song_id: song.id });
    await new Promise((r) => setTimeout(r, 200));
    // Add a note
    addNote(server.db, { song_id: song.id, line_index: 0, role: 'Guitar', text: 'synced note' });

    // New client joins and should get notes in state_sync
    const { stateSync } = await connectAndJoin(server.port, 'Newbie', 'Drums');
    expect(stateSync.notes).toBeDefined();
    expect(stateSync.notes.some((n) => n.text === 'synced note')).toBe(true);
  });

  it('state_sync has empty notes array when no song is selected', async () => {
    const { stateSync } = await connectAndJoin(server.port, 'Loner', 'Keys');
    expect(stateSync.notes).toEqual([]);
  });
});

describe('song_selected includes notes', () => {
  it('song_selected payload includes notes for the selected song', async () => {
    const song = makeSong();
    addNote(server.db, { song_id: song.id, line_index: 1, role: 'Guitar', text: 'riff here' });
    addNote(server.db, { song_id: song.id, line_index: 3, role: 'Bass', text: 'lock in' });

    const bPromise = waitForEvent<SongSelectedPayload>(clientB, 'song_selected', 1000);
    clientA.emit('song_select', { song_id: song.id });
    const payload = await bPromise;
    expect(payload.song_id).toBe(song.id);
    expect(payload.notes).toHaveLength(2);
  });
});

describe('migrate_song', () => {
  it('sets master_chart from chosen role and clears legacy fields', async () => {
    // Create a song directly in DB with legacy chart content
    const legacy = createSong(server.db, {
      title: 'Legacy',
      chart_guitar: 'G chart content',
      chart_bass: 'B chart content',
    });

    const updatePromise = waitForEvent<SongUpdatedPayload>(clientA, 'song_updated', 1000);
    clientA.emit('migrate_song', { song_id: legacy.id, source_role: 'guitar' });
    const result = await updatePromise;
    expect(result.song.master_chart).toBe('G chart content');
    expect(result.song.chart_guitar).toBeFalsy();
    expect(result.song.chart_bass).toBeFalsy();
  });
});
