// [scroll-sync] SongView — master chart + NoteOverlay + visibility toggle
import { useRef, useState } from 'react';
import type { Song, Note, Role, ScrollSpeed, NoteVisibility } from '@gig-sheets/shared';
import { SPEED_VALUES } from '@gig-sheets/shared';
import { useAutoScroll } from '../../hooks/useAutoScroll.js';
import { NoteOverlay } from './NoteOverlay.js';
import { NoteEditor } from './NoteEditor.js';
import type { Socket } from 'socket.io-client';
import styles from './SongView.module.css';

interface NoteEditorState {
  lineIndex: number;
  existingNote?: Note;
}

interface Props {
  song: Song;
  notes: Note[];
  myRole: Role;
  socket: React.MutableRefObject<Socket | null>;
  onBack: () => void;
}

const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  own: 'My Notes',
  all: 'All Notes',
  none: 'No Notes',
};
const VISIBILITY_CYCLE: NoteVisibility[] = ['own', 'all', 'none'];

export function SongView({ song, notes, myRole, socket, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isScrolling, speed, startScroll, stopScroll, changeSpeed } = useAutoScroll(
    socket,
    containerRef
  );

  const [visibility, setVisibility] = useState<NoteVisibility>('own');
  const [editorState, setEditorState] = useState<NoteEditorState | null>(null);

  const masterChart = song.master_chart ?? '';
  // [scroll-sync] Lines are the scroll target set — all lines including blank
  const lines = masterChart.length > 0 ? masterChart.split('\n') : [];

  const cycleVisibility = () => {
    setVisibility((v) => {
      const idx = VISIBILITY_CYCLE.indexOf(v);
      return VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length] ?? 'own';
    });
  };

  const handleAddNote = (lineIndex: number) => {
    setEditorState({ lineIndex });
  };

  const handleEditNote = (note: Note) => {
    setEditorState({ lineIndex: note.line_index, existingNote: note });
  };

  const handleSaveNote = (text: string) => {
    if (!editorState) return;
    if (editorState.existingNote) {
      socket.current?.emit('note_update', { note_id: editorState.existingNote.id, text });
    } else {
      socket.current?.emit('note_add', {
        song_id: song.id,
        line_index: editorState.lineIndex,
        role: myRole,
        text,
      });
    }
    setEditorState(null);
  };

  const handleDeleteNote = () => {
    if (!editorState?.existingNote) return;
    socket.current?.emit('note_delete', { note_id: editorState.existingNote.id });
    setEditorState(null);
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to setlist">
          ‹
        </button>
        <div className={styles.songInfo}>
          <h1 className={styles.songTitle}>{song.title}</h1>
          <p className={styles.songMeta}>
            {[song.key, song.tempo ? `${song.tempo} bpm` : null, song.duration]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Visibility toggle (replaces role tabs) */}
      <div className={styles.visibilityBar}>
        <button className={styles.visibilityBtn} onClick={cycleVisibility}>
          {VISIBILITY_LABELS[visibility]}
        </button>
        <span className={styles.roleChip}>{myRole}</span>
      </div>

      {/* [scroll-sync] Chart container — only lines are scroll targets */}
      <div className={styles.chartContainer} ref={containerRef}>
        {lines.length > 0 ? (
          <NoteOverlay
            lines={lines}
            notes={notes}
            visibility={visibility}
            myRole={myRole}
            onAddNote={handleAddNote}
            onEditNote={handleEditNote}
          />
        ) : (
          <div className={styles.noChart}>
            <p>No chart</p>
          </div>
        )}
        <div style={{ height: '120px' }} />
      </div>

      {/* Auto-scroll controls */}
      <div className={styles.scrollBar}>
        <button
          className={`${styles.scrollToggle} ${isScrolling ? styles.scrollActive : ''}`}
          onClick={() => (isScrolling ? stopScroll() : startScroll(song.id))}
          disabled={lines.length === 0}
        >
          {isScrolling ? '■ Stop' : '▶ Scroll'}
        </button>

        <div className={styles.speedPicker}>
          {SPEED_VALUES.map((s) => (
            <button
              key={s}
              className={`${styles.speedBtn} ${speed === s ? styles.speedActive : ''}`}
              onClick={() => changeSpeed(s as ScrollSpeed)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Inline note editor */}
      {editorState && !editorState.existingNote && (
        <NoteEditor
          lineIndex={editorState.lineIndex}
          onSave={handleSaveNote}
          onCancel={() => setEditorState(null)}
        />
      )}
      {editorState?.existingNote && (
        <NoteEditor
          lineIndex={editorState.lineIndex}
          existingNote={editorState.existingNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onCancel={() => setEditorState(null)}
        />
      )}
    </div>
  );
}
