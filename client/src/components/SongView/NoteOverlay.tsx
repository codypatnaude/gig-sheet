import type { Note, NoteVisibility, Role } from '@gig-sheets/shared';
import styles from './NoteOverlay.module.css';

const ROLE_COLORS: Record<string, string> = {
  Guitar: 'var(--color-role-guitar)',
  Bass:   'var(--color-role-bass)',
  Drums:  'var(--color-role-drums)',
  Vocals: 'var(--color-role-vocals)',
  Keys:   'var(--color-role-keys)',
  Other:  'var(--color-role-other)',
};

interface Props {
  lines: string[];
  notes: Note[];
  visibility: NoteVisibility;
  myRole: Role;
  onAddNote: (lineIndex: number) => void;
  onEditNote: (note: Note) => void;
}

export function NoteOverlay({ lines, notes, visibility, myRole, onAddNote, onEditNote }: Props) {
  const visibleNotes = notes.filter((n) => {
    if (visibility === 'none') return false;
    if (visibility === 'own') return n.role === myRole;
    return true; // 'all'
  });

  const notesByLine = new Map<number, Note[]>();
  for (const note of visibleNotes) {
    const existing = notesByLine.get(note.line_index) ?? [];
    notesByLine.set(note.line_index, [...existing, note]);
  }

  return (
    <div className={styles.root}>
      {lines.map((line, idx) => {
        const lineNotes = notesByLine.get(idx) ?? [];
        const isSectionHeader = /^\[.+\]$/.test(line.trim());
        return (
          <div key={idx} className={styles.lineGroup}>
            {/* Notes rendered ABOVE the line — not scroll targets */}
            {lineNotes.map((note) => (
              <button
                key={note.id}
                className={`${styles.note} ${note.line_index === lines.length - 1 && notes.some(n => n.id === note.id) ? '' : ''}`}
                style={{ borderLeftColor: ROLE_COLORS[note.role] ?? 'var(--color-role-other)' }}
                onClick={() => onEditNote(note)}
                aria-label={`Edit ${note.role} note`}
              >
                <span className={styles.noteRole} style={{ color: ROLE_COLORS[note.role] }}>
                  {note.role}
                </span>
                <span className={styles.noteText}>{note.text}</span>
              </button>
            ))}

            {/* The chart line itself */}
            <button
              className={`${styles.line} ${isSectionHeader ? styles.sectionHeader : ''}`}
              onClick={() => onAddNote(idx)}
              aria-label={`Add note to line ${idx + 1}`}
            >
              {line || ' ' /* preserve blank lines */}
            </button>
          </div>
        );
      })}
    </div>
  );
}
