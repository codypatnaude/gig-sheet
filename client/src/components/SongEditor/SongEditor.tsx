import { useState } from 'react';
import type { Song, NewSong } from '@gig-sheets/shared';
import styles from './SongEditor.module.css';

// Internal form state — all strings to avoid exactOptionalPropertyTypes friction
interface FormValues {
  title: string;
  artist: string;
  key: string;
  tempoStr: string;
  duration: string;
  notes: string;
  master_chart: string;
}

function toFormValues(song?: Song): FormValues {
  return {
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    key: song?.key ?? '',
    tempoStr: song?.tempo != null ? String(song.tempo) : '',
    duration: song?.duration ?? '',
    notes: song?.notes ?? '',
    master_chart: song?.master_chart ?? '',
  };
}

function toNewSong(f: FormValues): NewSong {
  const tempoNum = parseInt(f.tempoStr, 10);
  const base: NewSong = { title: f.title.trim() };
  if (f.artist.trim()) base.artist = f.artist.trim();
  if (f.key.trim()) base.key = f.key.trim();
  if (!isNaN(tempoNum) && tempoNum > 0) base.tempo = tempoNum;
  if (f.duration.trim()) base.duration = f.duration.trim();
  if (f.notes.trim()) base.notes = f.notes.trim();
  // master_chart is always included (even if empty) for migrated songs
  base.master_chart = f.master_chart;
  return base;
}

interface Props {
  song?: Song;
  onSave: (song: NewSong | Song) => void;
  onCancel: () => void;
}

export function SongEditor({ song, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>(() => toFormValues(song));
  const [titleError, setTitleError] = useState('');

  const set = (field: keyof FormValues, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    const newSong = toNewSong(form);
    if (song) {
      onSave({ ...song, ...newSong });
    } else {
      onSave(newSong);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{song ? 'Edit Song' : 'New Song'}</h2>
          <button className={styles.closeBtn} onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.metaGrid}>
            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Title *
              <input
                className={`${styles.input} ${titleError ? styles.inputError : ''}`}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Song title"
                autoFocus
              />
              {titleError && <span className={styles.error}>{titleError}</span>}
              <span className={styles.charCount}>{form.title.length}/100</span>
            </label>

            <label className={styles.label}>
              Artist
              <input
                className={styles.input}
                value={form.artist}
                onChange={(e) => set('artist', e.target.value)}
                placeholder="Artist / Band"
              />
            </label>

            <label className={styles.label}>
              Key
              <input
                className={styles.input}
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                placeholder="e.g. G, Am, F#"
              />
            </label>

            <label className={styles.label}>
              Tempo (BPM)
              <input
                className={styles.input}
                type="number"
                min={40}
                max={300}
                value={form.tempoStr}
                onChange={(e) => set('tempoStr', e.target.value)}
                placeholder="120"
              />
            </label>

            <label className={styles.label}>
              Duration
              <input
                className={styles.input}
                value={form.duration}
                onChange={(e) => set('duration', e.target.value)}
                placeholder="3:45"
              />
            </label>

            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Notes
              <textarea
                className={styles.textarea}
                rows={2}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Performance notes, cues, etc."
              />
            </label>
          </div>

          {/* Single master chart field — replaces 6 per-role tabs */}
          <div className={styles.chartSection}>
            <p className={styles.chartHeading}>Chart</p>
            <textarea
              className={styles.chartArea}
              rows={14}
              value={form.master_chart}
              onChange={(e) => set('master_chart', e.target.value)}
              placeholder={'Paste your chart here (words + chords, Ultimate Guitar format, etc.)\n\nAll roles will see this same chart.'}
              spellCheck={false}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              {song ? 'Save Changes' : 'Add to Setlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
