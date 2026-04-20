import { useState } from 'react';
import type { Song, NewSong } from '@gig-sheets/shared';
import { CHART_ROLES } from '@gig-sheets/shared';
import styles from './SongEditor.module.css';

const CHART_LABELS: Record<string, string> = {
  guitar: 'Guitar',
  bass: 'Bass',
  drums: 'Drums',
  vocals: 'Vocals',
  keys: 'Keys',
  other: 'Other',
};

// Internal form state — all strings to avoid exactOptionalPropertyTypes friction
interface FormValues {
  title: string;
  artist: string;
  key: string;
  tempoStr: string;
  duration: string;
  notes: string;
  chart_guitar: string;
  chart_bass: string;
  chart_drums: string;
  chart_vocals: string;
  chart_keys: string;
  chart_other: string;
}

function toFormValues(song?: Song): FormValues {
  return {
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    key: song?.key ?? '',
    tempoStr: song?.tempo != null ? String(song.tempo) : '',
    duration: song?.duration ?? '',
    notes: song?.notes ?? '',
    chart_guitar: song?.chart_guitar ?? '',
    chart_bass: song?.chart_bass ?? '',
    chart_drums: song?.chart_drums ?? '',
    chart_vocals: song?.chart_vocals ?? '',
    chart_keys: song?.chart_keys ?? '',
    chart_other: song?.chart_other ?? '',
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
  if (f.chart_guitar.trim()) base.chart_guitar = f.chart_guitar;
  if (f.chart_bass.trim()) base.chart_bass = f.chart_bass;
  if (f.chart_drums.trim()) base.chart_drums = f.chart_drums;
  if (f.chart_vocals.trim()) base.chart_vocals = f.chart_vocals;
  if (f.chart_keys.trim()) base.chart_keys = f.chart_keys;
  if (f.chart_other.trim()) base.chart_other = f.chart_other;
  return base;
}

interface Props {
  song?: Song;
  onSave: (song: NewSong | Song) => void;
  onCancel: () => void;
}

export function SongEditor({ song, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>(() => toFormValues(song));
  const [activeChartTab, setActiveChartTab] = useState<string>('guitar');
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

  const activeChartField = `chart_${activeChartTab}` as keyof FormValues;

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

          <div className={styles.chartSection}>
            <p className={styles.chartHeading}>Charts</p>
            <div className={styles.chartTabs}>
              {CHART_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.chartTab} ${activeChartTab === r ? styles.chartTabActive : ''}`}
                  onClick={() => setActiveChartTab(r)}
                >
                  {CHART_LABELS[r]}
                </button>
              ))}
            </div>
            <textarea
              className={styles.chartArea}
              rows={12}
              value={form[activeChartField] as string}
              onChange={(e) => set(activeChartField, e.target.value)}
              placeholder={`${CHART_LABELS[activeChartTab]} chart / chord sheet…`}
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
