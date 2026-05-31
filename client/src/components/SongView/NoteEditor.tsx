import { useState } from 'react';
import type { Note } from '@gig-sheets/shared';
import styles from './NoteEditor.module.css';

interface Props {
  lineIndex: number;
  existingNote?: Note;
  onSave: (text: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function NoteEditor({ lineIndex, existingNote, onSave, onDelete, onCancel }: Props) {
  const [text, setText] = useState(existingNote?.text ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <p className={styles.label}>
          {existingNote ? 'Edit note' : `Add note to line ${lineIndex + 1}`}
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Short performance note…"
            maxLength={280}
            autoFocus
            rows={3}
          />
          <p className={styles.charCount}>{text.length}/280</p>
          <div className={styles.actions}>
            {existingNote && onDelete && (
              <button type="button" className={styles.deleteBtn} onClick={onDelete}>
                Delete
              </button>
            )}
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={!text.trim()}>
              {existingNote ? 'Save' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
